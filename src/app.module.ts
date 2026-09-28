import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/winston.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomersModule } from './customers/customers.module';
import { PropertiesModule } from './properties/properties.module';
import { CategoriesModule } from './categories/categories.module';
import { PlansModule } from './plans/plans.module';
import { RewardsModule } from './rewards/rewards.module';
import { ReportsModule } from './reports/reports.module';
import { PartnersModule } from './partners/partners.module';
import { SettingsModule } from './settings/settings.module';
import { ChatsModule } from './chats/chats.module';
import { CalendarModule } from './calendar/calendar.module';
import { ExportModule } from './export/export.module';
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot(winstonConfig),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute window
        limit: 120, // 120 requests per minute per IP
      },
    ]),
    PrismaModule,
    AuthModule,
    DashboardModule,
    CustomersModule,
    PropertiesModule,
    CategoriesModule,
    PlansModule,
    RewardsModule,
    ReportsModule,
    PartnersModule,
    SettingsModule,
    ChatsModule,
    CalendarModule,
    ExportModule,
    ActivitiesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
