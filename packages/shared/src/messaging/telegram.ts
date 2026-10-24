import { Bot, InlineKeyboard, InputFile } from 'grammy'
import type { IncomingMessage, MessagingAdapter } from './types'

const MAX_TEXT = 4000 // Telegram limit is 4096

export class TelegramAdapter implements MessagingAdapter {
  private bot: Bot

  constructor(private token: string) {
    this.bot = new Bot(token)
  }

  onMessage(handler: (message: IncomingMessage) => Promise<void>) {
    const base = (chatId: number, updateId: number) => ({
      channel: 'telegram',
      chatId: String(chatId),
      updateId: `telegram:${updateId}`,
    })

    this.bot.on('message', async (ctx) => {
      const msg = ctx.message
      const doc = msg.document
      await handler({
        ...base(msg.chat.id, ctx.update.update_id),
        text: msg.text ?? msg.caption,
        file: doc && {
          name: doc.file_name ?? 'upload',
          mimeType: doc.mime_type,
          download: async () => {
            const file = await ctx.api.getFile(doc.file_id)
            const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${file.file_path}`)
            if (!res.ok) throw new Error(`Telegram file download failed (${res.status})`)
            return Buffer.from(await res.arrayBuffer())
          },
        },
      })
    })

    // Button data format: "confirm:<taskId>:yes" | "confirm:<taskId>:no"
    this.bot.on('callback_query:data', async (ctx) => {
      const [kind, taskId, answer] = ctx.callbackQuery.data.split(':')
      await ctx.answerCallbackQuery()
      const chatId = ctx.chat?.id
      if (kind !== 'confirm' || !taskId || chatId === undefined) return
      await ctx.editMessageReplyMarkup().catch(() => {}) // remove buttons
      await handler({ ...base(chatId, ctx.update.update_id), confirmation: { taskId, approved: answer === 'yes' } })
    })

    this.bot.catch((err) => console.error('telegram handler error', err.error))
  }

  async sendText(chatId: string, text: string) {
    await this.bot.api.sendMessage(chatId, text.slice(0, MAX_TEXT))
  }

  async sendFile(chatId: string, file: { name: string; data: Buffer }, caption?: string) {
    const input = new InputFile(file.data, file.name)
    // Images show inline in the chat; everything else is an attachment
    if (/\.(png|jpe?g)$/i.test(file.name)) await this.bot.api.sendPhoto(chatId, input, { caption })
    else await this.bot.api.sendDocument(chatId, input, { caption })
  }

  async sendConfirmation(chatId: string, text: string, taskId: string) {
    const keyboard = new InlineKeyboard()
      .text('✅ Confirm', `confirm:${taskId}:yes`)
      .text('❌ Cancel', `confirm:${taskId}:no`)
    await this.bot.api.sendMessage(chatId, text.slice(0, MAX_TEXT), { reply_markup: keyboard })
  }

  async start() {
    await this.bot.start({ onStart: (me) => console.log(`telegram bot @${me.username} polling`) })
  }
}
