import {
  Prisma,
  approvePendingAction,
  db,
  enqueueTask,
  getMessaging,
  saveFile,
  transition,
  type IncomingMessage,
  type MessagingAdapter,
} from '@app/shared'

const SUPPORTED_FILES: Record<string, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
const DEFAULT_FILE_INSTRUCTION = 'Analyze this file and generate a PDF report with a chart.'

/** Receives chat messages, turns instructions into tasks and handles confirmations. */
export function startBot() {
  const messaging = getMessaging('telegram')
  messaging.onMessage((msg) => handleMessage(messaging, msg))
  messaging.start().catch((err) => console.error('bot stopped', err))
}

async function handleMessage(messaging: MessagingAdapter, msg: IncomingMessage) {
  const text = msg.text?.trim() ?? ''
  if (text.startsWith('/start')) return linkChat(messaging, msg.chatId, text.split(/\s+/)[1])

  const link = await db.telegramLink.findUnique({ where: { chatId: msg.chatId } })
  if (!link) {
    return messaging.sendText(msg.chatId, 'This chat is not linked yet. Open the dashboard and click "Link Telegram".')
  }
  if (msg.confirmation) return handleConfirmation(messaging, msg.chatId, link.userId, msg.confirmation)

  // Telegram may deliver the same update twice
  if (await db.task.findUnique({ where: { updateId: msg.updateId } })) return

  let fileId: string | undefined
  if (msg.file) {
    const ext = msg.file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!SUPPORTED_FILES[ext]) return messaging.sendText(msg.chatId, 'Please send a CSV or XLSX file.')
    const file = await saveFile({
      userId: link.userId,
      name: msg.file.name,
      mimeType: SUPPORTED_FILES[ext],
      kind: 'upload',
      data: await msg.file.download(),
    })
    fileId = file.id
  }
  if (!text && !fileId) return messaging.sendText(msg.chatId, 'Send me an instruction or a CSV/XLSX file.')

  try {
    const task = await db.task.create({
      data: {
        userId: link.userId,
        channel: msg.channel,
        chatId: msg.chatId,
        instruction: text || DEFAULT_FILE_INSTRUCTION,
        fileId,
        updateId: msg.updateId,
      },
    })
    await enqueueTask(task.id)
    await messaging.sendText(msg.chatId, `👍 Got it, working on it. (task ${task.id.slice(-6)})`)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return // duplicate update
    throw err
  }
}

async function linkChat(messaging: MessagingAdapter, chatId: string, token?: string) {
  const link = token && (await db.telegramLink.findUnique({ where: { token } }))
  if (!link || link.linkedAt || link.expiresAt < new Date()) {
    return messaging.sendText(chatId, 'This link is invalid or expired. Create a new one in the dashboard.')
  }
  await db.$transaction([
    db.telegramLink.updateMany({ where: { chatId }, data: { chatId: null } }), // unlink any previous account
    db.telegramLink.update({ where: { id: link.id }, data: { chatId, linkedAt: new Date() } }),
  ])
  await messaging.sendText(chatId, '✅ Linked! Send me an instruction, e.g. "Summarize my sales sheet".')
}

async function handleConfirmation(
  messaging: MessagingAdapter,
  chatId: string,
  userId: string,
  { taskId, approved }: { taskId: string; approved: boolean },
) {
  const task = await db.task.findFirst({ where: { id: taskId, userId } })
  if (!task || task.status !== 'awaiting_confirmation') return

  if (!approved) {
    if (await transition(taskId, 'failed', { error: 'Cancelled by user' })) await messaging.sendText(chatId, 'Cancelled.')
    return
  }
  if (await approvePendingAction(taskId)) {
    await enqueueTask(taskId)
    await messaging.sendText(chatId, 'Confirmed, continuing…')
  }
}
