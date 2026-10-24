import { readFile } from 'node:fs/promises'
import { WebClient } from '@slack/web-api'
import { z } from 'zod'
import { db, loadTokens } from '@app/shared'
import { defineTool } from './types'

type Destination = { destinationId: string; name: string }

/** Find a channel (by id, "name" or "#name") on the user's allowlist. */
export function matchChannel(allowed: Destination[], channel: string): Destination | null {
  const raw = channel.trim()
  const name = raw.replace(/^#/, '').toLowerCase()
  return allowed.find((d) => d.destinationId === raw || d.name.toLowerCase() === name) ?? null
}

async function findAllowed(userId: string, channel: string) {
  const allowed = await db.allowedDestination.findMany({ where: { userId, provider: 'slack' } })
  return matchChannel(allowed, channel)
}

export const sendSlackMessage = defineTool({
  name: 'send_slack_message',
  description:
    'Post a message to a Slack channel, optionally with a file attached (e.g. a PDF report). ' +
    'Only channels the user approved in the dashboard are allowed.',
  schema: z.object({
    channel: z.string().min(1).describe('Channel name like "#sales"'),
    text: z.string().min(1).max(3000).describe('Message text'),
    file_id: z.string().optional().describe('ID of a file to attach, from list_files or generate_report'),
  }),

  async check(args, ctx) {
    if (await findAllowed(ctx.task.userId, args.channel)) return null
    return `Slack channel ${args.channel} is not on your approved list. Approve it in the dashboard first.`
  },

  confirm: (args) => `Post this to Slack ${args.channel}${args.file_id ? ' with the file attached' : ''}?\n\n${args.text}`,

  async run(args, ctx) {
    const { userId } = ctx.task
    const tokens = await loadTokens<{ access_token: string }>(userId, 'slack')
    if (!tokens) throw new Error('Slack is not connected. Connect it in the dashboard.')
    const destination = await findAllowed(userId, args.channel)
    if (!destination) throw new Error(`Slack channel ${args.channel} is not approved`)
    const file = args.file_id ? await db.file.findFirst({ where: { id: args.file_id, userId } }) : null
    if (args.file_id && !file) throw new Error(`File ${args.file_id} not found. Use list_files to see available files.`)

    // The client waits out Slack rate limits using Retry-After
    const slack = new WebClient(tokens.access_token, { retryConfig: { retries: 2 } })
    const channel = destination.destinationId

    if (!file) {
      const res = await slack.chat.postMessage({ channel, text: args.text })
      ctx.notes.push(`💬 Posted to Slack #${destination.name}`)
      return { externalId: res.ts, output: { channel: destination.name, ts: res.ts } }
    }

    await slack.conversations.join({ channel }) // sharing files requires membership; no-op if already joined
    const res = await slack.filesUploadV2({
      channel_id: channel,
      initial_comment: args.text,
      file: await readFile(file.path),
      filename: file.name,
      title: file.name,
    })
    const slackFileId = (res.files as { files?: { id?: string }[] }[] | undefined)?.[0]?.files?.[0]?.id
    ctx.notes.push(`💬 Posted to Slack #${destination.name} with ${file.name}`)
    return { externalId: slackFileId, output: { channel: destination.name, file: file.name, slack_file_id: slackFileId } }
  },
})
