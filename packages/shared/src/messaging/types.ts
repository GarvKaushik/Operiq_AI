/** A message from any chat channel, normalised. */
export interface IncomingMessage {
  channel: string
  chatId: string
  /** Channel-specific unique id of the update, used to ignore duplicates. */
  updateId: string
  text?: string
  file?: { name: string; mimeType?: string; download(): Promise<Buffer> }
  /** Set when the user pressed a confirm / cancel button. */
  confirmation?: { taskId: string; approved: boolean }
}

/** Every chat channel (Telegram today, WhatsApp later) implements this. */
export interface MessagingAdapter {
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void
  sendText(chatId: string, text: string): Promise<void>
  sendFile(chatId: string, file: { name: string; data: Buffer }, caption?: string): Promise<void>
  sendConfirmation(chatId: string, text: string, taskId: string): Promise<void>
  /** Start receiving messages (only the process that handles incoming messages calls this). */
  start(): Promise<void>
}
