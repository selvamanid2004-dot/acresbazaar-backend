import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
const PDFDocument = require('pdfkit');

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportData(entity: string, format: 'csv' | 'pdf', filter?: string) {
    let rows: any[] = [];
    let title = '';
    let headers: string[] = [];

    switch (entity.toLowerCase()) {
      case 'buyers':
        rows = await this.prisma.user.findMany({ where: { role: 'BUYER' } });
        title = 'Buyers Report';
        headers = ['ID', 'Name', 'Email', 'Mobile', 'Status', 'Registered At'];
        rows = rows.map(r => [r.id, r.name, r.email, r.mobile, r.isActive ? 'Active' : 'Inactive', r.createdAt.toISOString()]);
        break;

      case 'sellers':
        rows = await this.prisma.user.findMany({ where: { role: 'SELLER' } });
        title = 'Sellers Report';
        headers = ['ID', 'Name', 'Email', 'Mobile', 'Status', 'Registered At'];
        rows = rows.map(r => [r.id, r.name, r.email, r.mobile, r.isActive ? 'Active' : 'Inactive', r.createdAt.toISOString()]);
        break;

      case 'dealers':
        rows = await this.prisma.user.findMany({ where: { role: 'DEALER' } });
        title = 'Dealers Report';
        headers = ['ID', 'Name', 'Email', 'Mobile', 'Status', 'Registered At'];
        rows = rows.map(r => [r.id, r.name, r.email, r.mobile, r.isActive ? 'Active' : 'Inactive', r.createdAt.toISOString()]);
        break;

      case 'customers':
        const userWhere: any = {};
        if (filter && filter !== 'ALL') userWhere.role = filter.toUpperCase();
        rows = await this.prisma.user.findMany({ where: userWhere });
        title = 'All Customers Directory';
        headers = ['ID', 'Name', 'Email', 'Mobile', 'Role', 'Status', 'Created At'];
        rows = rows.map(r => [r.id, r.name, r.email, r.mobile, r.role, r.isActive ? 'Active' : 'Inactive', r.createdAt.toISOString()]);
        break;

      case 'properties':
        const propWhere: any = {};
        if (filter && filter !== 'ALL') propWhere.status = filter.toUpperCase();
        const props = await this.prisma.property.findMany({ where: propWhere });
        title = 'Properties Report';
        headers = ['ID', 'Title', 'Category', 'Price', 'Location', 'Status', 'Plan', 'Created At'];
        rows = props.map(p => [p.id, p.title, p.category, p.price, `${p.location}, ${p.city || ''}`, p.status, p.planType, p.createdAt.toISOString()]);
        break;

      case 'categories':
        const cats = await this.prisma.category.findMany({ orderBy: { displayOrder: 'asc' } });
        title = 'Categories Report';
        headers = ['ID', 'Name', 'Slug', 'Active', 'Display Order'];
        rows = cats.map(c => [c.id, c.name, c.slug, c.isActive ? 'Yes' : 'No', c.displayOrder]);
        break;

      case 'reports':
        const repWhere: any = {};
        if (filter && filter !== 'ALL') repWhere.status = filter.toUpperCase();
        const reps = await this.prisma.report.findMany({ where: repWhere });
        title = 'Submitted Complaints & Reports';
        headers = ['ID', 'Property', 'User Name', 'Email', 'Reason', 'Status', 'Date'];
        rows = reps.map(r => [r.id, r.propertyTitle || 'N/A', r.userName || 'N/A', r.userEmail || 'N/A', r.reason, r.status, r.createdAt.toISOString()]);
        break;

      case 'rewards':
        const rewWhere: any = {};
        if (filter && filter !== 'ALL') rewWhere.status = filter.toUpperCase();
        const rews = await this.prisma.reward.findMany({ where: rewWhere });
        title = 'Customer Rewards Ledger';
        headers = ['ID', 'User Name', 'Reward Title', 'Points', 'Amount', 'Status', 'Date'];
        rows = rews.map(rw => [rw.id, rw.userName, rw.rewardTitle, rw.points, rw.amount, rw.status, rw.date.toISOString()]);
        break;

      default:
        throw new BadRequestException(`Unknown export entity: ${entity}`);
    }

    if (format === 'csv') {
      const csvContent = this.generateCSV(headers, rows);
      return {
        type: 'text/csv',
        filename: `${entity}_export_${Date.now()}.csv`,
        buffer: Buffer.from(csvContent, 'utf-8')
      };
    } else {
      const pdfBuffer = await this.generatePDF(title, headers, rows);
      return {
        type: 'application/pdf',
        filename: `${entity}_export_${Date.now()}.pdf`,
        buffer: pdfBuffer
      };
    }
  }

  private generateCSV(headers: string[], rows: any[][]): string {
    const escapeCsv = (val: any) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };
    const headerLine = headers.map(escapeCsv).join(',');
    const dataLines = rows.map(row => row.map(escapeCsv).join(','));
    return [headerLine, ...dataLines].join('\n');
  }

  private getColumnWeights(headers: string[]): number[] {
    return headers.map(h => {
      const clean = h.toLowerCase().trim();
      if (clean === 'id') return 0.75;
      if (['status', 'role', 'active', 'plan', 'display order'].includes(clean)) return 0.8;
      if (['price', 'points', 'amount'].includes(clean)) return 0.9;
      if (['mobile', 'category', 'date', 'registered at', 'created at'].includes(clean)) return 1.0;
      if (['name', 'user name', 'email', 'location', 'slug', 'reason', 'reward title'].includes(clean)) return 1.4;
      if (['title', 'property', 'property title'].includes(clean)) return 1.8;
      return 1.0;
    });
  }

  private generatePDF(title: string, headers: string[], rows: any[][]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 35, bottom: 35, left: 35, right: 35 },
        bufferPages: true
      });

      const buffers: Buffer[] = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const pageWidth = 841.89;
      const pageHeight = 595.28;
      const leftMargin = 35;
      const usableWidth = pageWidth - leftMargin * 2; // 771.89 pt
      const maxY = pageHeight - 45;

      // Calculate proportional column widths
      const weights = this.getColumnWeights(headers);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const colWidths = weights.map(w => (w / totalWeight) * usableWidth);

      const colX: number[] = [];
      let accX = leftMargin;
      for (let i = 0; i < colWidths.length; i++) {
        colX.push(accX);
        accX += colWidths[i];
      }

      let currentY = 35;

      const renderReportHeader = () => {
        // Gold accent bar
        doc.rect(leftMargin, currentY, usableWidth, 4).fill('#D97706');
        currentY += 10;

        // Brand Banner
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F172A').text('ACRESBAZAAR', leftMargin, currentY);
        doc.font('Helvetica').fontSize(9).fillColor('#64748B').text('EXECUTIVE REAL ESTATE REPORTING ENGINE', leftMargin + 130, currentY + 5);

        // Date on right
        doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(
          `Generated: ${new Date().toLocaleString('en-IN')}`,
          leftMargin,
          currentY + 5,
          { width: usableWidth, align: 'right' }
        );
        currentY += 24;

        // Title and Total Records Badge
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1E293B').text(title, leftMargin, currentY);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0369A1').text(
          `Total Records: ${rows.length}`,
          leftMargin,
          currentY + 2,
          { width: usableWidth, align: 'right' }
        );
        currentY += 20;
      };

      const renderTableHeader = () => {
        const headerHeight = 22;
        // Dark Header Background
        doc.rect(leftMargin, currentY, usableWidth, headerHeight).fill('#0F172A');

        // Header Labels
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
        headers.forEach((h, idx) => {
          doc.text(
            h.toUpperCase(),
            colX[idx] + 5,
            currentY + 6,
            { width: colWidths[idx] - 10, ellipsis: true, align: 'left' }
          );
        });

        currentY += headerHeight;
      };

      // Initial Top Header on Page 1
      renderReportHeader();
      renderTableHeader();

      // Render ALL data rows with auto-pagination
      rows.forEach((row, rIdx) => {
        doc.font('Helvetica').fontSize(8);
        let maxCellHeight = 14;

        row.forEach((cell, cIdx) => {
          if (cIdx >= headers.length) return;
          const text = String(cell ?? '');
          const textHeight = doc.heightOfString(text, { width: colWidths[cIdx] - 10 });
          if (textHeight > maxCellHeight) {
            maxCellHeight = textHeight;
          }
        });

        const rowHeight = Math.max(maxCellHeight + 8, 20);

        // Automatic page break when filling the page
        if (currentY + rowHeight > maxY) {
          doc.addPage();
          currentY = 35;
          // Continuation title & repeat table header
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(`${title} (Continued)`, leftMargin, currentY);
          currentY += 16;
          renderTableHeader();
        }

        // Zebra striping background
        const bgColor = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(leftMargin, currentY, usableWidth, rowHeight).fill(bgColor);

        // Render Cell text with proper alignments and clean ID handling
        doc.font('Helvetica').fontSize(8).fillColor('#1E293B');
        row.forEach((cell, cIdx) => {
          if (cIdx >= headers.length) return;
          let text = String(cell ?? '');
          // If ID is a long UUID, display short prefix to prevent clutter
          if (headers[cIdx]?.toLowerCase() === 'id' && text.length > 12) {
            text = text.substring(0, 8) + '...';
          }
          doc.text(
            text,
            colX[cIdx] + 5,
            currentY + 5,
            { width: colWidths[cIdx] - 10, ellipsis: true }
          );
        });

        // Bottom row divider line
        doc.rect(leftMargin, currentY + rowHeight, usableWidth, 0.5).fill('#E2E8F0');

        currentY += rowHeight;
      });

      // Stamp Page Numbers and Confidential Footer across all generated pages
      const pageRange = doc.bufferedPageRange();
      for (let p = 0; p < pageRange.count; p++) {
        doc.switchToPage(p);
        doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text(
          `Page ${p + 1} of ${pageRange.count}  |  AcresBazaar Real Estate Platform  |  Confidential`,
          leftMargin,
          pageHeight - 25,
          { width: usableWidth, align: 'center' }
        );
      }

      doc.end();
    });
  }
}
