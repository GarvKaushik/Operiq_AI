import { z } from 'zod'
import { NeedsConfirmation, errorMessage, isTransient } from './errors'
import { findCompletedStep, saveStep } from './steps'
import { tools as defaultTools } from './tools'
import type { Tool, ToolContext } from './tools/types'

export type ToolCall = { id: string; function: { name: string; arguments: string } }

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text || '{}')
  } catch {
    return text
  }
}

/**
 * Run one tool call as an audited step. Returns the text sent back to the model.
 * Order: validate -> already done? -> permission check -> confirmation -> run.
 */
export async function runTool(
  call: ToolCall,
  stepIndex: number,
  ctx: ToolContext,
  confirmed: boolean,
  registry: Record<string, Tool> = defaultTools,
): Promise<string> {
  const name = call.function.name
  const key = { taskId: ctx.task.id, stepIndex, tool: name }
  const record = (update: Parameters<typeof saveStep>[1]) => saveStep(key, update)
  const tool = registry[name]
  const rawArgs = parseJson(call.function.arguments)

  if (!tool) {
    const error = `Unknown tool "${name}". Available: ${Object.keys(registry).join(', ')}`
    await record({ status: 'failed', input: rawArgs, error })
    return `Error: ${error}`
  }

  const parsed = tool.schema.safeParse(rawArgs)
  if (!parsed.success) {
    const error = `Invalid arguments:\n${z.prettifyError(parsed.error)}`
    await record({ status: 'failed', input: rawArgs, error })
    return `${error}\nFix the arguments and call ${name} again.`
  }
  const args = parsed.data

  // Idempotency: this exact action already happened (e.g. before a retry)
  const done = await findCompletedStep(key)
  if (done) return JSON.stringify(done.output)

  const refusal = await tool.check?.(args, ctx)
  if (refusal) {
    await record({ status: 'rejected', input: args, error: refusal })
    ctx.notes.push(`⛔ ${refusal}`)
    return `Refused: ${refusal}`
  }

  const question = tool.confirm?.(args)
  if (question && !confirmed) {
    await record({ status: 'awaiting_confirmation', input: args })
    throw new NeedsConfirmation(question)
  }

  await record({ status: 'running', input: args })
  try {
    const { output, externalId } = await tool.run(args, { ...ctx, key: `${key.taskId}:${stepIndex}:${name}` })
    await record({ status: 'completed', input: args, output, externalId })
    return JSON.stringify(output)
  } catch (err) {
    await record({ status: 'failed', input: args, error: errorMessage(err) })
    if (isTransient(err)) throw err // the job retries and resumes at this step
    return `Error: ${errorMessage(err)}`
  }
}
