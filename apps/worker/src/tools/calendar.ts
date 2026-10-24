import { google } from 'googleapis'
import { z } from 'zod'
import { env, googleClientFor } from '@app/shared'
import { defineTool } from './types'

const isoDate = (v: string) => !Number.isNaN(Date.parse(v))

export const createCalendarEvent = defineTool({
  name: 'create_calendar_event',
  description: 'Create a Google Calendar event with a Google Meet link. Invites attendees by email.',
  schema: z
    .object({
      title: z.string().min(1),
      start: z.string().refine(isoDate, 'Invalid date').describe('Local start time, ISO 8601, e.g. 2025-03-14T15:00:00'),
      end: z.string().refine(isoDate, 'Invalid date').describe('Local end time, ISO 8601'),
      timezone: z.string().optional().describe(`IANA timezone. Default ${env.TIMEZONE}`),
      attendees: z.array(z.email()).default([]).describe('Attendee email addresses'),
      description: z.string().optional(),
    })
    .refine((a) => Date.parse(a.end) > Date.parse(a.start), 'end must be after start'),

  confirm: (args) =>
    args.attendees.length
      ? `Create "${args.title}" (${args.start} – ${args.end}) and invite ${args.attendees.join(', ')}?`
      : null,

  async run(args, ctx) {
    const calendar = google.calendar({ version: 'v3', auth: await googleClientFor(ctx.task.userId) })
    const timeZone = args.timezone ?? env.TIMEZONE
    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: args.attendees.length ? 'all' : 'none',
      requestBody: {
        summary: args.title,
        description: args.description,
        start: { dateTime: args.start, timeZone },
        end: { dateTime: args.end, timeZone },
        attendees: args.attendees.map((email) => ({ email })),
        conferenceData: { createRequest: { requestId: ctx.key, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      },
    })
    ctx.notes.push(`📅 Event: ${data.htmlLink}${data.hangoutLink ? `\n🎥 Meet: ${data.hangoutLink}` : ''}`)
    return {
      externalId: data.id ?? undefined,
      output: { event_id: data.id, link: data.htmlLink, meet_link: data.hangoutLink },
    }
  },
})
