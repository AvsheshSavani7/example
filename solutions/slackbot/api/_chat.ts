import { WebClient } from '@slack/web-api'
import { getGPTResponse, generatePromptFromThread } from './_openai'

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

type Event = {
  channel: string
  ts: string
  thread_ts?: string
  user?: string
  bot_id?: string // Add bot_id to detect bot messages
}

export async function sendHTTPRequestUsingFetch(
  url: string,
  data: any
): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()
  return result
}

const processedEvents = new Set<string>() // Store processed events in memory

export async function sendGPTResponse(event: Event) {
  const { channel, ts, thread_ts, user, bot_id } = event

  // Check if the event was already processed
  if (processedEvents.has(ts)) {
    console.log('Event already processed, skipping.')
    return
  }

  // Mark this event as processed
  processedEvents.add(ts)

  // Check if the message was sent by a bot (including itself) to prevent loops
  if (bot_id) {
    console.log('Message sent by bot, skipping processing to prevent loop.')
    return
  }

  try {
    // Fetch the Slack conversation thread
    const thread = await slack.conversations.replies({
      channel,
      ts: thread_ts ?? ts,
      inclusive: true,
    })

    // Extract the message prompts
    const prompts = await generatePromptFromThread(thread)

    console.log('thread', thread)
    console.log('prompts', prompts)

    // Make the external API request using fetch
    const apiResponse = await sendHTTPRequestUsingFetch(
      'http://lead-source-api.kasawalkthrough.com/api/lead/chat/db',
      {
        question: prompts[0]?.content,
      }
    )

    console.log('apiResponse', apiResponse)

    // Send the response back to Slack in the thread
    await slack.chat.postMessage({
      channel,
      thread_ts: ts,
      text: apiResponse.entity || 'No response from external API',
    })
  } catch (error) {
    if (error instanceof Error) {
      await slack.chat.postMessage({
        channel,
        thread_ts: ts,
        text: `<@${process.env.SLACK_ADMIN_MEMBER_ID}> Error: ${error.message}`,
      })
    }
  }
}
