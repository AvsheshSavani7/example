import axios from 'axios'
import { WebClient } from '@slack/web-api'
// Define the type for the API response
interface BotApiResponse {
  status: boolean
  entity?: string
  message?: string
}

interface BotMessage {
  text: string
  sender: string
}

let api = 'http://lead-source-api.kasawalkthrough.com/api/lead'

// Function to fetch response from another API
export const fetchBotResponse = async (
  userMessage: string
): Promise<BotMessage> => {
  try {
    // Make the API call (replace `your-api-endpoint` with the actual API)
    const response = await axios.post<BotApiResponse>(
      `${process.env.API_URL}${api}`,
      {
        question: userMessage,
      }
    )

    const data = response.data

    // Check if the API returned a successful response
    if (data.status) {
      const botMessage = data?.entity || '' // Use your conversion logic here
      return { text: botMessage, sender: 'bot' }
    } else {
      return {
        text: data?.message || 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
      }
    }
  } catch (error) {
    // Handle any errors that occurred during the API call
    return {
      text: 'Error fetching bot response.',
      sender: 'bot',
    }
  }
}

// Slack event type
interface Event {
  channel: string
  ts: string
  thread_ts?: string
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

export async function sendGPTResponse(event: Event): Promise<void> {
  const { channel, ts, thread_ts } = event

  try {
    // Fetch the Slack thread
    const thread = await slack.conversations.replies({
      channel,
      ts: thread_ts ?? ts,
      inclusive: true,
    })

    const userMessage = thread.messages?.[0]?.text || ''

    // Fetch the bot response from the external API
    const botResponse = await fetchBotResponse(userMessage)

    // Send the response back to Slack
    await slack.chat.postMessage({
      channel,
      thread_ts: ts,
      text: botResponse.text,
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

const persistMessages = (messages: BotMessage[]): void => {
  // Implement your persistence logic here (e.g., save to a database)
  console.log('Persisting messages:', messages)
}
