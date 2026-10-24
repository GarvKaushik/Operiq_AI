import { z } from 'zod'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import { analyzeData } from './analyzeData'
import { createCalendarEvent } from './calendar'
import { generateReport } from './generateReport'
import { listFiles } from './listFiles'
import { readSheet } from './readSheet'
import { sendSlackMessage } from './slack'
import type { Tool } from './types'

export const tools: Record<string, Tool> = Object.fromEntries(
  [readSheet, analyzeData, createCalendarEvent, sendSlackMessage, generateReport, listFiles].map((t) => [t.name, t]),
)

/** Tool definitions in the OpenAI function-calling format. */
export function toolDefinitions(): ChatCompletionTool[] {
  return Object.values(tools).map((tool) => {
    const { $schema, ...parameters } = z.toJSONSchema(tool.schema, { io: 'input' })
    return { type: 'function', function: { name: tool.name, description: tool.description, parameters } }
  })
}
