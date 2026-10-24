import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { env } from '@app/shared'
import { toolDefinitions } from './tools'

// Any OpenAI-compatible endpoint (Ollama Cloud, local Ollama, ...), configured via env
const client = new OpenAI({ baseURL: env.OPENAI_BASE_URL, apiKey: env.OPENAI_API_KEY || 'ollama' })

export async function chat(messages: ChatCompletionMessageParam[]) {
  const res = await client.chat.completions.create({
    model: env.LLM_MODEL,
    temperature: 0.1,
    messages,
    tools: toolDefinitions(),
  })
  return res.choices[0].message
}
