import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    ExportModule
  ]
})
export class AppModule {}
