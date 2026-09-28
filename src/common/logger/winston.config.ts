import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { join } from 'path';
import * as fs from 'fs';

const logsDir = join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format for file output
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Custom log format for console output
const consoleLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, stack }) => {
    return `[${timestamp}] [${level}] ${context ? `[${context}] ` : ''}${message}${stack ? `\n${stack}` : ''}`;
  })
);

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    new winston.transports.Console({
      format: consoleLogFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    new winston.transports.DailyRotateFile({
      filename: join(logsDir, 'app-combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileLogFormat,
      level: 'info',
    }),
    new winston.transports.DailyRotateFile({
      filename: join(logsDir, 'app-error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: fileLogFormat,
      level: 'error',
    }),
  ],
};
