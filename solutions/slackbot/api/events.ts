import crypto from 'crypto'
import { sendGPTResponse } from './_chat'

export const config = {
  maxDuration: 30,
}
const processedEvents = new Set<string>()

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
      const eventId = body.event_id

      // Return 200 OK immediately to prevent Slack from retrying
      const response = new Response('Success!', { status: 200 })

      // Check if the event has already been processed
      if (processedEvents.has(eventId)) {
        console.log(`Event ${eventId} has already been processed, skipping.`)
        return response
      }

      // Add eventId to processed set to avoid processing it again
      processedEvents.add(eventId)

      // Process the event asynchronously
      sendGPTResponse(body.event)
        .then(() => console.log('Event processed successfully'))
        .catch((error) => console.error('Error processing event:', error))

      // Return 200 OK immediately
      return response
    }
  }

  return new Response('OK', { status: 200 })
}
