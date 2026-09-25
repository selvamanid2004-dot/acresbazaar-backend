import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

@Controller('chats')
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @UseGuards(AdminGuard)
  @Get()
  async findAll() {
    return this.chatsService.findAll();
  }

  @UseGuards(AdminGuard)
  @Get('recent')
  async findRecent() {
    return this.chatsService.findRecent();
  }

  @UseGuards(AdminGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.chatsService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.chatsService.markAsRead(id);
  }

  @UseGuards(AdminGuard)
  @Post(':id/reply')
  async sendReply(@Param('id') id: string, @Body() body: { text: string }) {
    return this.chatsService.sendMessage(id, body.text, 'admin');
  }

  // Public: Start conversation
  @Post('start')
  async startChat(@Body() body: { userName: string; userEmail: string; message: string }) {
    return this.chatsService.createChat(body.userName, body.userEmail, body.message);
  }

  // Public: AI Assistant Chatbot Query
  @Post('ai-assistant')
  async aiAssistant(@Body() body: {
    message: string;
    chatId?: string;
    userName?: string;
    userEmail?: string;
  }) {
    return this.chatsService.processAiAssistantQuery(body);
  }
}
