import crypto from 'crypto'
import { sendGPTResponse } from './_chat'

export const config = {
  maxDuration: 30,
}

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

const processedEvents = new Set<string>()

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

      // Check if this event has already been processed
      if (processedEvents.has(eventId)) {
        console.log(`Event ${eventId} already processed, skipping.`)
        return new Response('Event already processed', { status: 200 })
      }

      // Add event to processed set
      processedEvents.add(eventId)

      // Handle the 'app_mention' event
      if (eventType === 'app_mention') {
        // Immediately return a 200 OK to Slack
        const response = new Response('Success!', { status: 200 })

        // Process the event asynchronously
        sendGPTResponse(body.event).catch((error) =>
          console.error('Error in sendGPTResponse:', error)
        )

        // Return 200 OK immediately
        return response
      }
    }
  }

  // Default response for any other cases
  return new Response('OK', { status: 200 })
}
