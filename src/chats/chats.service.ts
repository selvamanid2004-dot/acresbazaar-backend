import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  private normalizeChat(chat: any) {
    return {
      id: chat.id,
      userName: chat.userName,
      userEmail: chat.userEmail || '',
      lastMessage: chat.previewMessage || '',
      lastMessageAt: chat.lastMessageAt,
      unread: !chat.isRead,
      propertyTitle: chat.propertyTitle || null,
      messages: []
    };
  }

  async findAll() {
    const chats = await this.prisma.chat.findMany({
      orderBy: { lastMessageAt: 'desc' }
    });
    return { success: true, count: chats.length, chats: chats.map(c => this.normalizeChat(c)) };
  }

  async findRecent() {
    const chats = await this.prisma.chat.findMany({
      take: 3,
      orderBy: { lastMessageAt: 'desc' }
    });
    return { success: true, count: chats.length, chats: chats.map(c => this.normalizeChat(c)) };
  }

  async findOne(id: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id } });
    if (!chat) {
      throw new NotFoundException('Chat conversation not found');
    }
    // Parse messages and normalize to admin panel expected format
    const rawMessages = chat.messages ? JSON.parse(chat.messages) : [];
    const messages = rawMessages.map((m: any) => ({
      id: m.id || ('msg_' + Date.now()),
      senderId: m.sender === 'admin' ? 'admin' : 'user',
      senderRole: m.sender === 'admin' ? 'admin' : 'user',
      message: m.text || m.message || '',
      createdAt: m.createdAt || new Date().toISOString()
    }));
    const lastMessage = messages.length > 0 ? messages[messages.length - 1].message : chat.previewMessage;
    return { success: true, chat: { 
      ...chat, 
      lastMessage: chat.previewMessage,
      lastMessageAt: chat.lastMessageAt,
      unread: !chat.isRead,
      userName: chat.userName,
      userEmail: chat.userEmail,
      messages 
    } };
  }

  async markAsRead(id: string) {
    const updated = await this.prisma.chat.update({
      where: { id },
      data: { isRead: true }
    });
    return { success: true, chat: updated };
  }

  async sendMessage(id: string, text: string, sender: 'admin' | 'user') {
    const chat = await this.prisma.chat.findUnique({ where: { id } });
    if (!chat) {
      throw new NotFoundException('Chat conversation not found');
    }
    const rawMessages = chat.messages ? JSON.parse(chat.messages) : [];
    const newMsg = {
      id: 'msg_' + Date.now(),
      sender,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };
    rawMessages.push(newMsg);

    const updated = await this.prisma.chat.update({
      where: { id },
      data: {
        previewMessage: text.trim(),
        lastMessageAt: new Date(),
        isRead: sender === 'admin',
        messages: JSON.stringify(rawMessages)
      }
    });

    // Return normalized message format for admin panel
    const normalizedMsg = {
      id: newMsg.id,
      senderId: sender,
      senderRole: sender,
      message: newMsg.text,
      createdAt: newMsg.createdAt
    };

    return { success: true, message: normalizedMsg, chat: { ...updated, messages: rawMessages } };
  }

  async createChat(userName: string, userEmail: string, initialMessage: string) {
    const messages = [
      {
        id: 'msg_' + Date.now(),
        sender: 'user',
        text: initialMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
      }
    ];
    const chat = await this.prisma.chat.create({
      data: {
        userName,
        userEmail,
        previewMessage: initialMessage,
        isRead: false,
        messages: JSON.stringify(messages)
      }
    });
    return { success: true, chat };
  }

  // AI Assistant: Intelligent Knowledge & Customer Problem Resolution Engine
  async processAiAssistantQuery(data: {
    message: string;
    chatId?: string;
    userName?: string;
    userEmail?: string;
  }) {
    const q = (data.message || '').trim().toLowerCase();
    const userName = data.userName || 'Guest Visitor';
    const userEmail = data.userEmail || '';

    // Fetch dynamic platform stats, contact settings, and plans from database
    let totalPropsCount = 0;
    let contactInfo: any = {};
    let dbPlans: any[] = [];
    try {
      totalPropsCount = await this.prisma.property.count({ where: { status: 'APPROVED' } });
      const contactSettings = await this.prisma.websiteSetting.findMany({ where: { group: 'contact' } });
      contactSettings.forEach(s => {
        if (s.key === 'contact_phone') contactInfo.phone = s.value;
        if (s.key === 'contact_email') contactInfo.email = s.value;
        if (s.key === 'contact_address') contactInfo.address = s.value;
      });
      dbPlans = await this.prisma.plan.findMany({ orderBy: { price: 'asc' } });
    } catch {}

    const goldPlan = dbPlans.find(p => p.planId === 'gold') || {
      name: 'Gold Plan',
      price: 49,
      content: '{"period":"month"}'
    };
    const platPlan = dbPlans.find(p => p.planId === 'platinum') || {
      name: 'Platinum VIP Plan',
      price: 129,
      content: '{"period":"month"}'
    };

    let goldPeriod = 'month';
    try {
      if (goldPlan.content && goldPlan.content.startsWith('{')) {
        const extra = JSON.parse(goldPlan.content);
        if (extra.period) goldPeriod = extra.period;
      }
    } catch {}

    let platPeriod = 'month';
    try {
      if (platPlan.content && platPlan.content.startsWith('{')) {
        const extra = JSON.parse(platPlan.content);
        if (extra.period) platPeriod = extra.period;
      }
    } catch {}

    const supportPhone = contactInfo.phone || '+91 8000-123-456';
    const supportEmail = contactInfo.email || 'support@acresbazaar.com';
    const officeAddr = contactInfo.address || 'AcresBazaar Corporate Towers, MG Road, Bangalore - 560001';

    let answer = '';
    let actions: Array<{ label: string; route: string; icon?: string }> = [];

    // 1. CUSTOMER PROBLEMS & SUPPORT RESOLUTION
    if (
      q.includes('problem') || 
      q.includes('issue') || 
      q.includes('password') || 
      q.includes('forgot') || 
      q.includes('complaint') || 
      q.includes('helpline') || 
      q.includes('refund') || 
      q.includes('not working') || 
      q.includes('error') ||
      (q.includes('support') && !q.includes('spot'))
    ) {
      answer = `🛠️ **Customer Support & Problem Resolution:**\n\n` +
        `We are here to resolve any issue quickly:\n\n` +
        `• **Login / Password Troubles**:\n` +
        `  If you forgot your password, click **Forgot Password** on the login page to receive a reset OTP instantly.\n\n` +
        `• **Property Approval & Review Time**:\n` +
        `  Submitted properties and TO-LET snaps are reviewed by our audit team within **2 to 6 hours**.\n\n` +
        `• **Reward Payout & Bank Details**:\n` +
        `  Once you reach 1,000 points, submit your bank details on the Snap Dashboard. Payouts are transferred via NEFT/IMPS/UPI within **24 business hours**.\n\n` +
        `• **Corporate Helpline & Support Desk**:\n` +
        `  📞 **Phone Helpline**: ${supportPhone}\n` +
        `  ✉️ **Email Support**: ${supportEmail}\n` +
        `  🏢 **Headquarters**: ${officeAddr}\n\n` +
        `I have also recorded this inquiry for our admin team to review. How else may I assist you?`;
      actions = [
        { label: '🔑 Reset Password', route: '/forgot-password', icon: 'key' },
        { label: '👤 Buyer Sign In', route: '/login', icon: 'user' },
        { label: '📞 Contact Support Desk', route: '/about', icon: 'phone' }
      ];

    // 2. SNAP PROPERTY & REWARDS SYSTEM
    } else if (
      q.includes('snap') || 
      q.includes('tolet') || 
      q.includes('to-let') || 
      q.includes('point') || 
      q.includes('reward') || 
      q.includes('bank') || 
      q.includes('payout') || 
      q.includes('disburse') || 
      q.includes('camera') || 
      q.includes('spot') || 
      q.includes('100') || 
      q.includes('1000')
    ) {
      answer = `📸 **How the Snap Property & 1,000-Point Reward System Works:**\n\n` +
        `AcresBazaar rewards our community spotters for capturing real-world property availability:\n\n` +
        `1. **Snap & Upload**: Whenever you spot a **TO-LET** or **FOR SALE** board in your neighborhood, click **Snap Property**, capture its photo using your phone camera, and auto-detect your GPS location.\n` +
        `2. **Earn 100 Points per Snap**: Every verified board upload instantly earns you **+100 Reward Points**.\n` +
        `3. **1,000 Points Milestone**: Once you reach **1,000 Points** (10 uploads), you unlock a guaranteed **₹1,000 Cash Reward**!\n` +
        `4. **Submit Bank Account Details**: On your **Snap Dashboard**, enter your Bank Name, Account Number, IFSC Code, Holder Name, and optional UPI ID.\n` +
        `5. **Direct Bank Transfer**: Our Admin reviews the bank details and transfers the ₹1,000 reward directly to your bank account, marking the status as **PAID** with full confirmation.\n\n` +
        `Would you like to snap a property now or check your current points?`;
      actions = [
        { label: '📸 Snap New Property', route: '/snap-property/upload', icon: 'camera' },
        { label: '🏆 My Snaps & Rewards Dashboard', route: '/snap-property/dashboard', icon: 'award' },
        { label: '🔑 Spotter Sign In', route: '/snap-property/login', icon: 'login' }
      ];

    // 3. BUYER MEMBERSHIPS (GOLD & PLATINUM)
    } else if (
      q.includes('gold') || 
      q.includes('platinum') || 
      q.includes('plan') || 
      q.includes('membership') || 
      q.includes('tier') || 
      q.includes('pricing') || 
      q.includes('dossier') || 
      q.includes('unlock')
    ) {
      answer = `⭐ **AcresBazaar Buyer Membership Plans:**\n\n` +
        `While browsing listings is 100% free, our membership plans grant exclusive direct contact access to verified owners and legal dossiers:\n\n` +
        `• **${goldPlan.name} (₹${Number(goldPlan.price).toLocaleString('en-IN')} / ${goldPeriod})**:\n` +
        `  - Unlocks **verified direct owner contact numbers**.\n` +
        `  - Access to full property specifications and verified price insights.\n` +
        `  - Dedicated buyer WhatsApp assistance.\n\n` +
        `• **${platPlan.name} (₹${Number(platPlan.price).toLocaleString('en-IN')} / ${platPeriod})**:\n` +
        `  - **Unlimited VIP access** to all direct seller & dealer contacts.\n` +
        `  - Complete **RERA legal verification dossiers** & title deed checks.\n` +
        `  - Priority site visit bookings & dedicated property scout concierge.\n\n` +
        `Choose your plan to start unlocking verified property dossiers today:`;
      actions = [
        { label: `⭐ View ${goldPlan.name} (₹${goldPlan.price})`, route: '/plans/gold', icon: 'star' },
        { label: `👑 View ${platPlan.name} (₹${platPlan.price})`, route: '/plans/platinum', icon: 'shield' },
        { label: '👤 Buyer Registration', route: '/register/buyer', icon: 'user-plus' }
      ];

    // 4. SELLER MODULE & LISTING PROPERTY
    } else if (
      q.includes('sell') || 
      q.includes('seller') || 
      q.includes('post property') || 
      q.includes('add property') || 
      q.includes('listing') || 
      q.includes('publish')
    ) {
      answer = `🏠 **How to Sell Your Property on AcresBazaar:**\n\n` +
        `Listing your property reaches thousands of pre-qualified buyers and investors:\n\n` +
        `1. **Register as a Seller**: Create your free account under the **Seller Portal**.\n` +
        `2. **Submit Property Details**: Select category (Residential, Plot, Villa, Apartment, Commercial, Farm Land), upload high-resolution photos, specify price, location, and key features.\n` +
        `3. **Admin Verification**: Our team reviews the listing for RERA and authenticity compliance.\n` +
        `4. **Live & Promoted**: Once approved, your property goes live across our marketplace and is featured in premium search results.\n\n` +
        `Ready to sell or manage your properties?`;
      actions = [
        { label: '🏠 Seller Registration', route: '/seller/register', icon: 'home' },
        { label: '🔑 Seller Login', route: '/seller/login', icon: 'login' },
        { label: '📋 Manage Properties', route: '/seller/properties', icon: 'list' }
      ];

    // 5. DEALER & AGENCY MODULE
    } else if (
      q.includes('dealer') || 
      q.includes('agency') || 
      q.includes('broker') || 
      q.includes('firm') || 
      q.includes('commercial spaces')
    ) {
      answer = `🏢 **Dealer & Real Estate Agency Portal:**\n\n` +
        `Certified real estate agencies and brokers receive a dedicated commercial suite:\n\n` +
        `• **Agency Dashboard**: Track multi-unit inventory, commercial spaces, and retail developments.\n` +
        `• **Bulk Listing Management**: Upload and synchronize multiple properties in minutes.\n` +
        `• **Verified Partner Badge**: Boost buyer confidence with verified dealer accreditation.\n` +
        `• **Lead Inquiries**: Direct messaging and buyer dossier match alerts.`;
      actions = [
        { label: '🏢 Dealer Registration', route: '/dealer/register', icon: 'briefcase' },
        { label: '🔑 Dealer Login', route: '/dealer/login', icon: 'login' }
      ];

    // 6. PROPERTY CATEGORIES & SEARCH
    } else if (
      q.includes('category') || 
      q.includes('plot') || 
      q.includes('villa') || 
      q.includes('apartment') || 
      q.includes('flat') || 
      q.includes('house') || 
      q.includes('commercial') || 
      q.includes('farm') || 
      q.includes('search') || 
      q.includes('buy')
    ) {
      answer = `🔍 **Explore Verified Property Categories:**\n\n` +
        `We feature over **${totalPropsCount > 0 ? totalPropsCount + '+' : 'verified'}** curated properties across 7 major asset classes:\n\n` +
        `1. **Plots & Land**: RERA-approved residential layouts, corner plots, and gated community parcels.\n` +
        `2. **Villas & Estates**: Luxury duplexes, private villas, and landscaped estates.\n` +
        `3. **Apartments / Flats**: 1, 2, 3 & 4 BHK high-rise residences with clubhouse amenities.\n` +
        `4. **Independent Houses**: Individual homes with freehold ownership.\n` +
        `5. **Commercial Spaces**: Grade-A IT offices, retail shops, showrooms, and co-working floors.\n` +
        `6. **Farm Lands**: Agricultural tracts, weekend farmhouses, and agro-forestry lands.\n\n` +
        `Use our floating search bar to filter by budget, location, and plan tier!`;
      actions = [
        { label: '📍 Plots & Land', route: '/plots', icon: 'map' },
        { label: '🏰 Luxury Villas', route: '/villas', icon: 'building' },
        { label: '🏢 Modern Apartments', route: '/apartments', icon: 'layers' },
        { label: '🏪 Commercial Spaces', route: '/commercial', icon: 'briefcase' }
      ];

    // 7. GENERAL PLATFORM INTRODUCTION
    } else {
      answer = `👋 **Hello ${userName}! Welcome to AcresBazaar.**\n\n` +
        `I am your intelligent real estate assistant. AcresBazaar is India's premium property marketplace for verified residential, commercial, and agricultural properties.\n\n` +
        `Here is how I can assist you right now:\n` +
        `• **Snap Property**: Spot a TO-LET board, upload a snap, and earn **100 points** (Claim **₹1,000 Cash** at 1,000 pts).\n` +
        `• **Buy Property**: Unlock direct owner contacts and legal dossiers with **Gold & Platinum** plans.\n` +
        `• **Sell or Rent**: List your property as a **Seller** or **Dealer** to reach verified buyers.\n` +
        `• **Customer Support**: Instant troubleshooting for accounts, listings, and payments.\n\n` +
        `What would you like to explore?`;
      actions = [
        { label: '📸 Snap & Earn Rewards', route: '/snap-property/upload', icon: 'camera' },
        { label: '⭐ Membership Plans', route: '/plans/gold', icon: 'star' },
        { label: '🔍 Browse Properties', route: '/all-residential', icon: 'search' },
        { label: '📞 Help & Support', route: '/about', icon: 'help-circle' }
      ];
    }

    // Persist chat conversation in database so Admin can review customer support tickets
    let chatId = data.chatId;
    try {
      if (chatId) {
        const existing = await this.prisma.chat.findUnique({ where: { id: chatId } });
        if (existing) {
          const msgs = existing.messages ? JSON.parse(existing.messages) : [];
          msgs.push({
            id: 'msg_' + Date.now() + '_u',
            sender: 'user',
            text: data.message.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
          });
          msgs.push({
            id: 'msg_' + Date.now() + '_a',
            sender: 'admin',
            text: answer,
            actions,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
          });

          await this.prisma.chat.update({
            where: { id: chatId },
            data: {
              previewMessage: data.message.trim(),
              lastMessageAt: new Date(),
              isRead: false,
              messages: JSON.stringify(msgs)
            }
          });
        }
      } else {
        const initialMsgs = [
          {
            id: 'msg_' + Date.now() + '_u',
            sender: 'user',
            text: data.message.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
          },
          {
            id: 'msg_' + Date.now() + '_a',
            sender: 'admin',
            text: answer,
            actions,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
          }
        ];
        const newChat = await this.prisma.chat.create({
          data: {
            userName,
            userEmail,
            previewMessage: data.message.trim(),
            isRead: false,
            messages: JSON.stringify(initialMsgs)
          }
        });
        chatId = newChat.id;
      }
    } catch (e) {
      console.error('Error recording AI assistant chat log:', e);
    }

    return {
      success: true,
      chatId,
      reply: answer,
      actions,
      timestamp: new Date().toISOString()
    };
  }
}

