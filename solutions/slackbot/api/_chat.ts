import { WebClient } from '@slack/web-api'
import { getGPTResponse, generatePromptFromThread } from './_openai'

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

type Event = {
  channel: string
  ts: string
  thread_ts?: string
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
  console.log('REPOSME', response)
  const result = await response.json()
  return result
}

export async function sendGPTResponse(event: Event) {
  const { channel, ts, thread_ts } = event
  console.log('Event Received:', event)

  try {
    console.log('Fetching Slack conversation thread...')
    // Fetch the Slack conversation thread
    const thread = await slack.conversations.replies({
      channel,
      ts: thread_ts ?? ts,
      inclusive: true,
    })

    // Check if the thread is null or undefined
    if (!thread || !thread.messages) {
      console.error(
        'No messages found in the thread or invalid thread:',
        thread
      )
    } else {
      console.log('Thread Fetched:', thread)
    }

    // Extract the message prompts
    const prompts = await generatePromptFromThread(thread)

    console.log('prompts', prompts, thread)

    // Make the external API request using fetch
    const apiResponse = await sendHTTPRequestUsingFetch(
      'http://lead-source-api.kasawalkthrough.com/api/lead/chat/zoho',
      {
        question: prompts?.[0]?.content,
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
    console.error('Error processing event:', error)
    await slack.chat.postMessage({
      channel,
      thread_ts: ts,
      text: `<@${process.env.SLACK_ADMIN_MEMBER_ID}> Error: }`,
    })
  }
}
