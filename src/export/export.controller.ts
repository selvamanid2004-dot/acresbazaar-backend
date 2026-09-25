import { Controller, Get, Param, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';

@Controller('export')
export class ExportController {
  constructor(
    private exportService: ExportService,
    private jwtService: JwtService
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

    try {
      const payload = this.jwtService.verify(token);
      // JWT payload uses type:'admin' (set in auth.service.ts adminLogin)
      if (!payload || payload.type !== 'admin') {
        throw new UnauthorizedException('Admin access required');
      }
    } catch (err: any) {
      if (err?.name === 'UnauthorizedException') throw err;
      throw new UnauthorizedException('Invalid or expired admin token');
    }

    const result = await this.exportService.exportData(entity, format, filter);
    res.setHeader('Content-Type', result.type);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.send(result.buffer);
  }
}
