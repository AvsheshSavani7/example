import { WebClient } from '@slack/web-api'
import { getGPTResponse, generatePromptFromThread } from './_openai'
import axios from 'axios'

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

type Event = {
  channel: string
  ts: string
  thread_ts?: string
}

export async function sendGPTResponse(event: Event) {
  const { channel, ts, thread_ts } = event

  try {
    const thread = await slack.conversations.replies({
      channel,
      ts: thread_ts ?? ts,
      inclusive: true,
    })

    const prompts = await generatePromptFromThread(thread)

    // Make an external API call (send the message to another Node.js API)
    const externalApiResponse = await axios.post(
      `${process.env.EXTERNAL_API_URL}`,
      {
        question: prompts.map((prompt) => prompt.content).join(' '),
      }
    )

    // Use the response from the external API to post a message in Slack
    const responseMessage =
      externalApiResponse.data?.message || 'No response from external API'
    const gptResponse = await getGPTResponse(prompts)

    await slack.chat.postMessage({
      channel,
      thread_ts: ts,
      text: `${gptResponse.choices[0].message.content}`,
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
