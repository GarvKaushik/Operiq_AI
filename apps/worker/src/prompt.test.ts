import { describe, expect, it } from 'vitest'
import { systemPrompt } from './prompt'

describe('systemPrompt', () => {
  it('uses the agent persona when configured', () => {
    const prompt = systemPrompt({ fileId: null, agent: { name: 'Riya', personality: 'Warm and friendly.' } })
    expect(prompt).toContain('You are Riya')
    expect(prompt).toContain('Personality and tone: Warm and friendly.')
  })

  it('falls back to a generic assistant without an agent', () => {
    const prompt = systemPrompt({ fileId: null })
    expect(prompt).toContain('You are a business assistant')
    expect(prompt).not.toContain('Personality')
  })

  it('mentions the attached file and saved sheets', () => {
    const prompt = systemPrompt({ fileId: 'f1', sheets: [{ name: 'sales', title: 'Sales 2026', isDefault: true }] })
    expect(prompt).toContain('file_id "f1"')
    expect(prompt).toContain('sales ("Sales 2026") [default]')
  })
})
