import crypto from 'crypto'
import { sendGPTResponse } from './_chat'

// In-memory cache for tracking processed events (you can use a DB or Redis for persistence)
const processedEventIds = new Set<string>()

export const config = {
  maxDuration: 30,
}

// Function to validate Slack request
async function isValidSlackRequest(request: Request, body: any) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET!
  const timestamp = request.headers.get('X-Slack-Request-Timestamp')!
  const slackSignature = request.headers.get('X-Slack-Signature')!
  const base = `v0:${timestamp}:${JSON.stringify(body)}`
  const hmac = crypto
    .createHmac('sha256', signingSecret)
    .update(base)
    .digest('hex')
  const computedSignature = `v0=${hmac}`
  return computedSignature === slackSignature
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const body = JSON.parse(rawBody)
  const requestType = body.type

  // Handle Slack's URL verification challenge
  if (requestType === 'url_verification') {
    return new Response(body.challenge, { status: 200 })
  }

  // Validate Slack's request
  if (await isValidSlackRequest(request, body)) {
    if (requestType === 'event_callback') {
      const eventType = body.event.type
      const eventId = body.event_id // Unique event ID from Slack
      const retryNum = request.headers.get('X-Slack-Retry-Num') // Check if it's a retry

      // Check if we've already processed this event
      if (processedEventIds.has(eventId)) {
        console.log(`Event ${eventId} has already been processed, skipping.`)
        return new Response('Event already processed', { status: 200 })
      }

      // Mark this event as processed
      processedEventIds.add(eventId)

      // Handle the 'app_mention' event
      if (eventType === 'app_mention') {
        // Log retry attempts
        if (retryNum) {
          console.log(`Retry attempt #${retryNum} for event ${eventId}`)
        }

        // Acknowledge the event immediately
        const response = new Response('Success!', { status: 200 })

        // Process the event asynchronously
        sendGPTResponse(body.event).catch((error) =>
          console.error(`Error in sendGPTResponse: ${error}`)
        )

        // Return the acknowledgment response
        return response
      }
    }
  }

  // Default response for any other cases
  return new Response('OK', { status: 200 })
}
