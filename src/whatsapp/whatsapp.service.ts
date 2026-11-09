import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import * as qrcodeTerminal from 'qrcode-terminal';
import * as path from 'path';
import * as fs from 'fs';
import pino from 'pino';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);
  private sock: WASocket | null = null;
  private isConnected = false;
  private qrCodeDataUrl: string | null = null;
  private qrRaw: string | null = null;
  private botPhoneNumber: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly sessionDir = path.join(process.cwd(), 'auth_info_baileys');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Initializing AcresBazaar WhatsApp Service (@whiskeysockets/baileys)...');
    await this.initSocket();
  }

  onModuleDestroy() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (err) {
        // ignore error on shutdown
      }
    }
  }

  /**
   * Initializes or re-initializes the Baileys WebSocket connection
   */
  async initSocket() {
    try {
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);

      const silentLogger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        auth: state,
        logger: silentLogger,
        browser: ['AcresBazaar Bot', 'Chrome', '110.0.0'],
        printQRInTerminal: false, // We'll handle terminal printing cleanly ourselves
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
      });

      // Handle credentials update (e.g. key refresh, token save)
      this.sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrRaw = qr;
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr);
          } catch (e) {
            this.logger.error('Failed to generate QR data URL', e);
          }

          console.log('\n===============================================================');
          console.log('📲 ACRESBAZAAR WHATSAPP BOT QR CODE (SCAN WITH WHATSAPP)');
          console.log('===============================================================');
          console.log('Open WhatsApp > Linked Devices > Link a Device > Scan QR Below:\n');
          try {
            qrcodeTerminal.generate(qr, { small: true });
          } catch {
            // fallback
          }
          console.log('===============================================================\n');
        }

        if (connection === 'close') {
          this.isConnected = false;
          this.botPhoneNumber = null;

          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.logger.warn(
            `WhatsApp connection closed (Status: ${statusCode}). Reconnect: ${shouldReconnect}`
          );

          if (shouldReconnect) {
            this.scheduleReconnect(5000);
          } else {
            this.logger.warn('WhatsApp session logged out. Clearing auth credentials...');
            this.clearSession();
            this.scheduleReconnect(3000);
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.qrCodeDataUrl = null;
          this.qrRaw = null;

          const userJid = this.sock?.user?.id || '';
          this.botPhoneNumber = userJid.split(':')[0] || userJid.split('@')[0];

          this.logger.log(`✅ WhatsApp Bot Connected Successfully! (Active Phone: +${this.botPhoneNumber})`);
        }
      });
    } catch (error) {
      this.logger.error('Failed to start WhatsApp socket', error);
      this.scheduleReconnect(10000);
    }
  }

  private scheduleReconnect(ms: number) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.initSocket();
    }, ms);
  }

  private clearSession() {
    try {
      if (fs.existsSync(this.sessionDir)) {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
      }
    } catch (err) {
      this.logger.error('Error clearing WhatsApp session directory', err);
    }
  }

  // =========================================================================
  // PHONE NUMBER UTILITIES & FORMATTING
  // =========================================================================

  /**
   * Cleans any phone string to international WhatsApp format (e.g. 919876543210@s.whatsapp.net)
   */
  formatToJid(phone: string): string | null {
    if (!phone || typeof phone !== 'string') return null;

    let clean = phone.replace(/\D/g, ''); // strip all non-numeric characters
    if (!clean) return null;

    // Handle leading zero: 09876543210 -> 9876543210
    if (clean.startsWith('0') && clean.length === 11) {
      clean = clean.slice(1);
    }

    // Standard 10-digit Indian Mobile Number -> prepend 91
    if (clean.length === 10) {
      clean = `91${clean}`;
    }

    return `${clean}@s.whatsapp.net`;
  }

  /**
   * Resolves configured Admin WhatsApp number (from .env or WebsiteSetting)
   */
  async getAdminPhoneNumber(): Promise<string | null> {
    if (process.env.ADMIN_WHATSAPP_NUMBER && process.env.ADMIN_WHATSAPP_NUMBER.trim()) {
      return process.env.ADMIN_WHATSAPP_NUMBER.trim();
    }

    try {
      const setting = await this.prisma.websiteSetting.findFirst({
        where: {
          key: { in: ['admin_whatsapp_number', 'whatsapp_number', 'contact_phone', 'phone'] },
        },
      });

      if (setting && setting.value && setting.value.trim()) {
        return setting.value.trim();
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Low-level method to send a WhatsApp text message
   */
  async sendTextMessage(toPhone: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.sock || !this.isConnected) {
      this.logger.warn(`WhatsApp not connected. Message to ${toPhone} skipped.`);
      return { success: false, error: 'WhatsApp is not connected. Please scan QR in Admin Panel.' };
    }

    const jid = this.formatToJid(toPhone);
    if (!jid) {
      return { success: false, error: 'Invalid phone number format' };
    }

    try {
      const result = await this.sock.sendMessage(jid, { text });
      this.logger.log(`WhatsApp message sent to ${jid} (ID: ${result?.key?.id})`);
      return { success: true, messageId: result?.key?.id };
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message to ${jid}`, error);
      return { success: false, error: error?.message || 'Send error' };
    }
  }

  /**
   * Sends an automated alert to the configured Admin WhatsApp phone number
   */
  async sendAdminAlert(text: string): Promise<{ success: boolean; error?: string }> {
    const adminPhone = await this.getAdminPhoneNumber();
    if (!adminPhone) {
      this.logger.warn('Admin WhatsApp number not configured in .env (ADMIN_WHATSAPP_NUMBER) or WebsiteSettings');
      return { success: false, error: 'Admin WhatsApp number not configured' };
    }

    return this.sendTextMessage(adminPhone, text);
  }

  // =========================================================================
  // 1. NOTIFICATION: USER REGISTRATION (Buyer, Seller, Dealer, Partner)
  // =========================================================================

  async notifyUserRegistration(user: { name: string; email: string; mobile?: string; role: string }) {
    try {
      const message =
`🔔 *New User Registration Alert — AcresBazaar*

A new user just registered on the platform:

👤 *Name:* ${user.name}
🏷️ *Role:* ${user.role}
📱 *Mobile:* ${user.mobile || 'Not provided'}
📧 *Email:* ${user.email}
🕒 *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

👉 *Admin Action:* Review in Admin Dashboard:
https://acresbazaar-admin.onrender.com/customers`;

      await this.sendAdminAlert(message);
    } catch (err) {
      this.logger.error('Failed to send user registration WhatsApp alert', err);
    }
  }

  // =========================================================================
  // 2. NOTIFICATION: PROPERTY LISTED BY ANYONE -> ADMIN ALERT
  // =========================================================================

  async notifyPropertyUploaded(property: any) {
    try {
      const priceFormatted = property.priceDisplay || (property.price ? `₹${Number(property.price).toLocaleString('en-IN')}` : 'N/A');
      const location = [property.locality, property.location, property.city].filter(Boolean).join(', ') || 'Tamil Nadu';

      const message =
`🏡 *New Property Uploaded — Pending Review*

A new property has been submitted and is awaiting approval:

🏷️ *Title:* ${property.title}
📂 *Category:* ${property.category}
💰 *Price:* ${priceFormatted}
📍 *Location:* ${location}
👤 *Submitted By:* ${property.sellerName || 'N/A'}
🏷️ *Role:* ${property.sellerRole || 'PARTNER'}
📱 *Phone:* ${property.sellerPhone || 'N/A'}
📧 *Email:* ${property.sellerEmail || 'N/A'}

👉 *Admin Action:* Review & Approve Listing:
https://acresbazaar-admin.onrender.com/properties`;

      await this.sendAdminAlert(message);
    } catch (err) {
      this.logger.error('Failed to send property upload WhatsApp alert', err);
    }
  }

  // =========================================================================
  // 3. NOTIFICATION: REWARD CLAIM SUBMITTED -> ADMIN ALERT
  // =========================================================================

  async notifyRewardClaimSubmitted(claim: any) {
    try {
      const message =
`🎁 *New Reward Claim Alert — AcresBazaar*

A partner has submitted a cash reward payout claim:

📋 *Claim #:* ${claim.claimNumber}
👤 *Partner:* ${claim.partnerName} (${claim.partnerRole || 'PARTNER'})
📱 *Phone:* ${claim.partnerPhone || 'N/A'}
📧 *Email:* ${claim.partnerEmail}
⭐ *Points Claimed:* ${claim.redeemedPoints} Points
💵 *Reward Amount:* ₹${Number(claim.rewardAmount).toLocaleString('en-IN')}

🏦 *Bank Account Details:*
• Bank: ${claim.bankName}
• A/C No: ${claim.bankAccountNumber}
• IFSC: ${claim.ifscCode}
• Holder: ${claim.bankAccountHolder}
${claim.upiId ? `• UPI ID: ${claim.upiId}` : ''}

👉 *Admin Action:* Process Payment & Settle:
https://acresbazaar-admin.onrender.com/rewards`;

      await this.sendAdminAlert(message);
    } catch (err) {
      this.logger.error('Failed to send reward claim WhatsApp alert', err);
    }
  }

  // =========================================================================
  // 4. NOTIFICATION: ADMIN APPROVES SELLER PROPERTY -> NOTIFY SELLER
  // =========================================================================

  async notifySellerPropertyApproved(property: any) {
    try {
      const sellerPhone = property.sellerPhone;
      if (!sellerPhone) return;

      const priceFormatted = property.priceDisplay || (property.price ? `₹${Number(property.price).toLocaleString('en-IN')}` : '');
      const location = [property.locality, property.location, property.city].filter(Boolean).join(', ') || '';

      const message =
`🎉 *Your Property is Live on AcresBazaar!*

Dear ${property.sellerName || 'Seller'},

Great news! Your property listing has been verified and *APPROVED* by our team:

🏡 *Property:* ${property.title}
📂 *Category:* ${property.category}
${priceFormatted ? `💰 *Price:* ${priceFormatted}\n` : ''}${location ? `📍 *Location:* ${location}\n` : ''}
Your property is now actively displayed to buyers and investors across the platform.

🌐 *View Your Live Listing:*
https://acresbazaar.com/property/${property.id}

Thank you for choosing AcresBazaar!`;

      await this.sendTextMessage(sellerPhone, message);
    } catch (err) {
      this.logger.error('Failed to send seller approval WhatsApp message', err);
    }
  }

  // =========================================================================
  // 5. NOTIFICATION: PARTNER/DEALER PROPERTY APPROVED -> REWARD POINTS UPDATED
  // =========================================================================

  async notifyPartnerPointsAwarded(partner: {
    name: string;
    phone: string;
    email: string;
    role?: string;
    propertyTitle: string;
    propertyId: string;
    pointsAwarded: number;
    newAvailableBalance: number;
  }) {
    try {
      if (!partner.phone) return;

      const message =
`🌟 *Congratulations! Property Approved & Points Credited!*

Dear ${partner.name},

Your property listing *" ${partner.propertyTitle} "* has been *APPROVED* by the AcresBazaar Admin!

⭐ *Reward Points Earned:* +${partner.pointsAwarded} Points
💰 *Current Available Balance:* ${partner.newAvailableBalance} Points

You can redeem your points for real cash payouts whenever you reach the claim threshold.

👉 *Check Your Wallet & Claim Rewards:*
https://acresbazaar.com/partner-dashboard

Keep uploading verified properties to earn more rewards! 🚀`;

      await this.sendTextMessage(partner.phone, message);
    } catch (err) {
      this.logger.error('Failed to send partner points WhatsApp message', err);
    }
  }

  // =========================================================================
  // 6. NOTIFICATION: ADMIN APPROVES DEALER OR PARTNER ACCOUNT
  // =========================================================================

  async notifyPartnerOrDealerApproved(partner: {
    name: string;
    phone?: string;
    email: string;
    type?: string;
    company?: string;
  }) {
    try {
      if (!partner.phone) return;

      const partnerType = partner.type || 'Partner';

      const message =
`✅ *AcresBazaar Verified ${partnerType} Account Approved!*

Dear ${partner.name},

Congratulations! Your verification application as an official *AcresBazaar ${partnerType}* has been *APPROVED* by the Administrator!

🎯 *What you can do now:*
1. Upload and list unlimited verified properties
2. Earn reward points for every approved property listing
3. Convert your reward points into instant cash payouts

👉 *Log In to Partner Dashboard:*
https://acresbazaar.com/partner-login

Welcome to the AcresBazaar Partner Network! 🤝`;

      await this.sendTextMessage(partner.phone, message);
    } catch (err) {
      this.logger.error('Failed to send partner/dealer verification WhatsApp message', err);
    }
  }

  // =========================================================================
  // 7. NOTIFICATION: REWARD CLAIM STATUS UPDATE (PAID / REJECTED)
  // =========================================================================

  async notifyRewardClaimStatusUpdate(claim: any, status: string, notes?: string) {
    try {
      if (!claim.partnerPhone) return;

      if (status === 'PAID') {
        const message =
`💸 *Reward Payout Successful — AcresBazaar*

Dear ${claim.partnerName},

Your reward claim *#${claim.claimNumber}* for *₹${Number(claim.rewardAmount).toLocaleString('en-IN')}* has been successfully processed and transferred!

${claim.paymentReference ? `🔖 *UTR / Payment Ref:* ${claim.paymentReference}\n` : ''}🏦 *Credited To:* ${claim.bankName} (A/C: ${claim.bankAccountNumber})
🕒 *Settled On:* ${new Date().toLocaleDateString('en-IN')}

Thank you for being a valued Partner with AcresBazaar. Keep listing to earn more! 🌟`;

        await this.sendTextMessage(claim.partnerPhone, message);
      } else if (status === 'REJECTED') {
        const message =
`⚠️ *Reward Claim Update — AcresBazaar*

Dear ${claim.partnerName},

Your reward claim *#${claim.claimNumber}* could not be processed at this time.

❌ *Reason:* ${claim.rejectionReason || notes || 'Bank details verification failed'}
🔄 *Points Refunded:* ${claim.redeemedPoints} points have been credited back to your available balance.

Please verify your bank details in your dashboard and resubmit:
https://acresbazaar.com/partner-dashboard`;

        await this.sendTextMessage(claim.partnerPhone, message);
      }
    } catch (err) {
      this.logger.error('Failed to send reward claim status WhatsApp message', err);
    }
  }

  // =========================================================================
  // 8. STATUS & DIAGNOSTICS FOR ADMIN DASHBOARD
  // =========================================================================

  async getStatus() {
    const adminPhone = await this.getAdminPhoneNumber();
    return {
      isConnected: this.isConnected,
      botPhoneNumber: this.botPhoneNumber,
      qrCodeDataUrl: this.qrCodeDataUrl,
      adminPhoneNumber: adminPhone,
      sessionDirExists: fs.existsSync(this.sessionDir),
    };
  }

  async restartSocket() {
    this.logger.log('Admin requested WhatsApp socket restart...');
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {}
    }
    await this.initSocket();
    return { success: true, message: 'WhatsApp socket restarting' };
  }

  async logoutAndReset() {
    this.logger.log('Admin requested WhatsApp logout and session reset...');
    this.isConnected = false;
    this.botPhoneNumber = null;
    this.qrCodeDataUrl = null;
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {}
      try {
        this.sock.end(undefined);
      } catch {}
    }
    this.clearSession();
    await this.initSocket();
    return { success: true, message: 'WhatsApp session reset. Please scan new QR code.' };
  }
}
