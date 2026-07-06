import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import type { TelegramWebhookDto } from './dto/integrations.dto';

type TelegramMessage = NonNullable<TelegramWebhookDto['message']>;

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token: string;
  private readonly username: string;
  private readonly mode: string;
  private polling = false;
  private offset = 0;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private auth: AuthService,
    private crypto: EncryptionService,
  ) {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
    this.username = (this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? '').replace(/^@/, '');
    this.mode = this.config.get<string>('TELEGRAM_MODE') ?? 'polling';
  }

  onModuleInit() {
    if (this.token && this.mode === 'polling') {
      this.polling = true;
      void this.poll();
    }
  }

  onModuleDestroy() {
    this.polling = false;
  }

  status() {
    return {
      enabled: Boolean(this.token && this.username),
      linkedByBot: this.username ? `@${this.username}` : null,
      mode: this.mode,
    };
  }

  async getLink(userId: string) {
    const link = await this.prisma.telegramLink.findUnique({ where: { userId } });
    return {
      ...this.status(),
      linked: Boolean(link),
      account: link
        ? {
            username: link.username,
            firstName: link.firstName,
            lastName: link.lastName,
            linkedAt: link.linkedAt,
            lastActiveAt: link.lastActiveAt,
          }
        : null,
    };
  }

  async createLinkToken(userId: string) {
    if (!this.token || !this.username) throw new BadRequestException('Telegram-бот не настроен');
    await this.prisma.telegramToken.deleteMany({ where: { userId, purpose: 'link', usedAt: null } });
    const plain = randomBytes(24).toString('base64url');
    await this.prisma.telegramToken.create({
      data: {
        userId,
        purpose: 'link',
        tokenHash: this.hash(plain),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    return {
      url: `https://t.me/${this.username}?start=link_${plain}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  async unlink(userId: string) {
    await this.prisma.telegramLink.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async sendToUser(userId: string, text: string) {
    const link = await this.prisma.telegramLink.findUnique({ where: { userId } });
    if (!link) throw new BadRequestException('Telegram не привязан');
    await this.send(link.chatId, text);
    return { ok: true };
  }

  async exchangeLoginToken(plain: string) {
    const token = await this.prisma.telegramToken.findUnique({ where: { tokenHash: this.hash(plain) } });
    if (!token || token.purpose !== 'login' || token.usedAt || token.expiresAt < new Date()) {
      throw new BadRequestException('Ссылка входа недействительна или истекла');
    }
    const user = await this.prisma.user.findUnique({ where: { id: token.userId } });
    if (!user) throw new BadRequestException('Пользователь не найден');
    await this.prisma.telegramToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    return { token: this.auth.createToken(user.id, user.email) };
  }

  async handleUpdate(update: TelegramWebhookDto) {
    if (!update.message?.text || update.message.chat.type !== 'private' || !update.message.from) return { ok: true };
    await this.handleMessage(update.message);
    return { ok: true };
  }

  private async handleMessage(message: TelegramMessage) {
    const text = (message.text ?? '').trim();
    const from = message.from!;
    if (text.startsWith('/start link_')) {
      const plain = text.slice('/start link_'.length).split(/\s/)[0];
      const token = await this.prisma.telegramToken.findUnique({ where: { tokenHash: this.hash(plain) } });
      if (!token || token.purpose !== 'link' || token.usedAt || token.expiresAt < new Date()) {
        await this.send(message.chat.id, 'Ссылка привязки недействительна или истекла.');
        return;
      }
      const existing = await this.prisma.telegramLink.findUnique({ where: { telegramId: String(from.id) } });
      if (existing && existing.userId !== token.userId) {
        await this.send(message.chat.id, 'Этот Telegram уже связан с другим аккаунтом.');
        return;
      }
      await this.prisma.$transaction([
        this.prisma.telegramLink.deleteMany({ where: { userId: token.userId } }),
        this.prisma.telegramLink.upsert({
          where: { telegramId: String(from.id) },
          create: {
            telegramId: String(from.id),
            chatId: String(message.chat.id),
            username: from.username,
            firstName: from.first_name,
            lastName: from.last_name,
            userId: token.userId,
          },
          update: {
            chatId: String(message.chat.id),
            username: from.username,
            firstName: from.first_name,
            lastName: from.last_name,
            userId: token.userId,
            lastActiveAt: new Date(),
          },
        }),
        this.prisma.telegramToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
      ]);
      await this.send(message.chat.id, 'Telegram привязан к Sysadmin Notes. Отправьте /help, чтобы увидеть команды.');
      return;
    }

    const link = await this.prisma.telegramLink.findUnique({ where: { telegramId: String(from.id) } });
    if (!link) {
      await this.send(message.chat.id, 'Сначала привяжите Telegram в настройках Sysadmin Notes.');
      return;
    }
    await this.prisma.telegramLink.update({ where: { id: link.id }, data: { lastActiveAt: new Date() } });
    await this.runCommand(link.userId, message.chat.id, text);
  }

  private async runCommand(userId: string, chatId: number, text: string) {
    const [rawCommand, ...rest] = text.split(' ');
    const command = rawCommand.toLowerCase().split('@')[0];
    const payload = rest.join(' ').trim();
    const project = await this.prisma.project.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    if (!project) return this.send(chatId, 'У аккаунта нет проектов.');

    if (command === '/start' || command === '/help') {
      return this.send(chatId, this.help());
    }
    if (command === '/projects') {
      const projects = await this.prisma.project.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
      return this.send(chatId, projects.map((item) => `• ${item.name} — ${item.id}`).join('\n'));
    }
    if (command === '/newnote') {
      const [title, body = ''] = this.parts(payload);
      if (!title) return this.send(chatId, 'Формат: /newnote Заголовок | текст');
      const note = await this.prisma.note.create({
        data: {
          projectId: project.id,
          title,
          type: 'instruction',
          category: 'Telegram',
          tags: '["telegram"]',
          content: JSON.stringify(this.doc(body)),
        },
      });
      return this.send(chatId, `Заметка создана: ${note.title}\nID: ${note.id}`);
    }
    if (command === '/newpassword') {
      const [title, login = '', password = '', url = ''] = this.parts(payload);
      if (!title || !password) return this.send(chatId, 'Формат: /newpassword Название | логин | пароль | URL');
      const encrypted = this.crypto.encryptNoteData({ password }, userId);
      const note = await this.prisma.note.create({
        data: {
          projectId: project.id,
          title,
          type: 'credential',
          category: 'Доступы',
          login,
          password: encrypted.password,
          url,
          tags: '["telegram"]',
          content: JSON.stringify(this.doc('')),
        },
      });
      return this.send(chatId, `Пароль сохранён в зашифрованном виде: ${note.title}\nID: ${note.id}`);
    }
    if (command === '/newtask') {
      const [title, description = ''] = this.parts(payload);
      if (!title) return this.send(chatId, 'Формат: /newtask Заголовок | описание');
      const max = await this.prisma.task.aggregate({ where: { projectId: project.id, status: 'todo' }, _max: { sortOrder: true } });
      const task = await this.prisma.task.create({
        data: { projectId: project.id, title, description, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      });
      return this.send(chatId, `Задача создана: ${task.title}\nID: ${task.id}`);
    }
    if (command === '/notes') {
      const notes = await this.prisma.note.findMany({ where: { project: { userId } }, orderBy: { updatedAt: 'desc' }, take: 10 });
      return this.send(chatId, notes.length ? notes.map((n) => `• ${n.title} [${n.id}]`).join('\n') : 'Заметок нет.');
    }
    if (command === '/tasks') {
      const tasks = await this.prisma.task.findMany({ where: { project: { userId } }, orderBy: { updatedAt: 'desc' }, take: 10 });
      return this.send(chatId, tasks.length ? tasks.map((t) => `• ${t.status}: ${t.title} [${t.id}]`).join('\n') : 'Задач нет.');
    }
    if (command === '/note' || command === '/password') {
      const note = await this.prisma.note.findFirst({ where: { id: payload, project: { userId } } });
      if (!note) return this.send(chatId, 'Заметка не найдена.');
      const decrypted = this.crypto.decryptNote(note, userId);
      const body = this.textFromDoc(note.content);
      const secret = command === '/password' && note.type === 'credential' ? `\nПароль: ${decrypted.password ?? '—'}` : '';
      return this.send(chatId, `${note.title}\nЛогин: ${note.login ?? '—'}\nURL: ${note.url ?? note.host ?? '—'}${secret}${body ? `\n\n${body}` : ''}`);
    }
    if (command === '/editnote') {
      const [id, title, body] = this.parts(payload);
      const note = await this.prisma.note.findFirst({ where: { id, project: { userId } } });
      if (!note || !title) return this.send(chatId, 'Формат: /editnote ID | новый заголовок | новый текст');
      await this.prisma.note.update({
        where: { id },
        data: { title, content: body !== undefined ? JSON.stringify(this.doc(body)) : undefined },
      });
      return this.send(chatId, `Заметка обновлена: ${title}`);
    }
    if (command === '/editpassword') {
      const [id, login, password, url] = this.parts(payload);
      const note = await this.prisma.note.findFirst({ where: { id, type: 'credential', project: { userId } } });
      if (!note || !password) return this.send(chatId, 'Формат: /editpassword ID | логин | пароль | URL');
      const encrypted = this.crypto.encryptNoteData({ password }, userId);
      await this.prisma.note.update({
        where: { id },
        data: { login: login || undefined, password: encrypted.password, url: url || undefined },
      });
      return this.send(chatId, `Пароль обновлён: ${note.title}`);
    }
    if (command === '/edittask') {
      const [id, status, title] = this.parts(payload);
      const task = await this.prisma.task.findFirst({ where: { id, project: { userId } } });
      if (!task || !['todo', 'in_progress', 'done'].includes(status ?? '')) {
        return this.send(chatId, 'Формат: /edittask ID | todo/in_progress/done | новый заголовок');
      }
      await this.prisma.task.update({ where: { id }, data: { status, title: title || undefined } });
      return this.send(chatId, `Задача обновлена: ${title || task.title} — ${status}`);
    }
    if (command === '/login') {
      const plain = randomBytes(24).toString('base64url');
      await this.prisma.telegramToken.create({
        data: {
          userId,
          purpose: 'login',
          tokenHash: this.hash(plain),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
      return this.send(chatId, `Одноразовый вход (5 минут):\n${frontend}/api/integrations/telegram/login?token=${plain}`);
    }
    return this.send(chatId, `Неизвестная команда.\n\n${this.help()}`);
  }

  private async poll() {
    while (this.polling) {
      try {
        const result = await this.call<{ ok: boolean; result: TelegramWebhookDto[] }>('getUpdates', {
          offset: this.offset,
          timeout: 25,
          allowed_updates: ['message'],
        });
        for (const update of result.result ?? []) {
          this.offset = Math.max(this.offset, (update.update_id ?? 0) + 1);
          await this.handleUpdate(update);
        }
      } catch (error) {
        this.logger.error(`Telegram polling: ${error instanceof Error ? error.message : String(error)}`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  private async send(chatId: number | string, text: string) {
    if (!this.token) return;
    await this.call('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
  }

  private async call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Bot API ${response.status}`);
    return response.json() as Promise<T>;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private parts(value: string) {
    return value.split('|').map((part) => part.trim());
  }

  private doc(text: string) {
    return { type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] };
  }

  private textFromDoc(value: string) {
    try {
      const doc = JSON.parse(value) as { content?: { content?: { text?: string }[] }[] };
      return (doc.content ?? []).flatMap((node) => node.content ?? []).map((node) => node.text ?? '').join(' ').trim();
    } catch {
      return '';
    }
  }

  private help() {
    return [
      'Sysadmin Notes Bot',
      '/newnote Заголовок | текст',
      '/newpassword Название | логин | пароль | URL',
      '/newtask Заголовок | описание',
      '/notes, /tasks, /projects',
      '/note ID — показать заметку',
      '/password ID — показать пароль',
      '/editnote ID | заголовок | текст',
      '/editpassword ID | логин | пароль | URL',
      '/edittask ID | todo/in_progress/done | заголовок',
      '/login — одноразовый вход в приложение',
    ].join('\n');
  }
}
