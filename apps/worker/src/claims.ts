// Models sometimes say they did something without calling the tool. These checks catch
// claims of external actions in the final answer that no tool call in the task backs up.

const DONE = /\b(posted|sent|shared|forwarded|delivered|bhej(a|i|e)?|bhej diya|kar diya)\b/i
// "I couldn't post…", "not posted", "nahi bheja" are not claims
const NEGATED = /\b(not|cannot|unable|nahi|nahin)\b|n't\b/i

const CLAIMS = [
  {
    tool: 'send_slack_message',
    what: 'posted to Slack',
    warning: 'Nothing was posted to Slack in this task.',
    test: (t: string) => /slack|#[\w-]+/i.test(t) && DONE.test(t),
  },
  {
    tool: 'create_calendar_event',
    what: 'created a calendar event',
    warning: 'No calendar event was created in this task.',
    test: (t: string) => /\b(scheduled|booked|created|added|set up)\b.{0,60}\b(meeting|event|calendar|invite)\b/i.test(t),
  },
]

/** Actions the text claims were done, whose tool was never called. */
export function unverifiedClaims(text: string, calledTools: Set<string>) {
  if (NEGATED.test(text)) return []
  return CLAIMS.filter((c) => c.test(text) && !calledTools.has(c.tool))
}
