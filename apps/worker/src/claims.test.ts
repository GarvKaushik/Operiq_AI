import { describe, expect, it } from 'vitest'
import { unverifiedClaims } from './claims'

const tools = (...names: string[]) => new Set(names)

describe('unverifiedClaims', () => {
  it('catches a Slack post that never happened (real failed reply)', () => {
    const text = "Report ready! I've generated a Regional Sales Summary PDF. The report has been posted to the **#all-demo-chat** Slack channel as you requested."
    expect(unverifiedClaims(text, tools('read_sheet', 'analyze_data', 'generate_report')).map((c) => c.tool)).toEqual(['send_slack_message'])
  })

  it('accepts the claim when the tool was called', () => {
    expect(unverifiedClaims('Posted to #sales on Slack.', tools('send_slack_message'))).toEqual([])
  })

  it('catches Hinglish claims and calendar claims', () => {
    expect(unverifiedClaims('Report #sales me bhej diya!', tools())).toHaveLength(1)
    expect(unverifiedClaims('I scheduled the meeting for 3pm tomorrow.', tools())[0].tool).toBe('create_calendar_event')
  })

  it('ignores refusals and negations', () => {
    expect(unverifiedClaims("I can't post to #social because it isn't approved.", tools())).toEqual([])
    expect(unverifiedClaims('The report was not sent to Slack.', tools())).toEqual([])
  })

  it('ignores replies that claim no external action', () => {
    expect(unverifiedClaims('Revenue is up 12% this month, led by North.', tools('analyze_data'))).toEqual([])
  })
})
