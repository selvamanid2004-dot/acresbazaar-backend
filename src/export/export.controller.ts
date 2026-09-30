import { Controller, Get, Param, Query, Req, Res, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Response, Request } from 'express';

@Controller('export')
export class ExportController {
  constructor(
    private exportService: ExportService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  @Get(':entity')
  async export(
    @Param('entity') entity: string,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
    @Query('filter') filter: string,
    @Query('token') queryToken: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    // Accept token from Authorization header OR ?token= query param (needed for browser download links)
    let token = queryToken;
    if (!token) {
      const authHeader = req.headers['authorization'] || '';
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
      if (!payload || payload.type !== 'admin') {
        throw new UnauthorizedException('Admin access required');
      }
    } catch (err: any) {
      if (err?.name === 'UnauthorizedException') throw err;
      throw new UnauthorizedException('Invalid or expired admin token');
    }

    // Verify admin in DB
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub || payload.id }
    });

    if (!admin || admin.isActive === false) {
      throw new UnauthorizedException('Admin account is inactive or not found');
    }

    if (admin.role !== 'SUPER_ADMIN') {
      let permissions: string[] = [];
      try {
        permissions = admin.permissions ? JSON.parse(admin.permissions) : [];
      } catch {
        permissions = [];
      }

      const hasExportPermission = permissions.includes('data_export');
      const hasEntityPermission = permissions.includes(entity) || 
        (entity.includes('properties') && permissions.includes('properties')) ||
        (entity.includes('customers') && (permissions.includes('buyers') || permissions.includes('sellers') || permissions.includes('dealers')));

      if (!hasExportPermission && !hasEntityPermission) {
        throw new ForbiddenException('Access Denied: You do not have permission to download/export data (data_export)');
      }
    }

    const result = await this.exportService.exportData(entity, format, filter);
    res.setHeader('Content-Type', result.type);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.send(result.buffer);
  }
}
