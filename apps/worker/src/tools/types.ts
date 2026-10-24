import type { z } from 'zod'
import type { Task } from '@app/shared'

export type ToolContext = {
  task: Task
  /** Lines appended to the final reply (report links, refusals). */
  notes: string[]
}

export type RunContext = ToolContext & {
  /** Idempotency key "taskId:stepIndex:tool", stable across retries. */
  key: string
}

export type ToolResult = { output: unknown; externalId?: string }

export interface Tool<S extends z.ZodType = z.ZodType> {
  name: string
  description: string
  schema: S
  /** Permission check. Return a reason to refuse, or null. */
  check?: (args: z.infer<S>, ctx: ToolContext) => Promise<string | null>
  /** Return a question to ask the user before running, or null. */
  confirm?: (args: z.infer<S>) => string | null
  run: (args: z.infer<S>, ctx: RunContext) => Promise<ToolResult>
}

/** Helper that keeps the argument types of each tool. */
export function defineTool<S extends z.ZodType>(tool: Tool<S>): Tool {
  return tool as unknown as Tool
}
