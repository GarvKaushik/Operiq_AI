import { required } from '../env'
import { TelegramAdapter } from './telegram'
import type { MessagingAdapter } from './types'

export type { IncomingMessage, MessagingAdapter } from './types'

const adapters = new Map<string, MessagingAdapter>()

/** Adapter for a channel. Add new channels (e.g. WhatsApp) here. */
export function getMessaging(channel = 'telegram'): MessagingAdapter {
  let adapter = adapters.get(channel)
  if (!adapter) {
    if (channel !== 'telegram') throw new Error(`Unknown channel: ${channel}`)
    adapter = new TelegramAdapter(required('TELEGRAM_BOT_TOKEN'))
    adapters.set(channel, adapter)
  }
  return adapter
}
