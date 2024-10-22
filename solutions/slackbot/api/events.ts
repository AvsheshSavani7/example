import crypto from 'crypto'
import { sendGPTResponse } from './_chat'

export const config = {
  maxDuration: 90,
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

      // Handle the 'app_mention' event
      if (eventType === 'app_mention') {
        // Wait for sendGPTResponse to finish before returning the response
        try {
          await sendGPTResponse(body.event)
        } catch (error) {
          console.error('Error in sendGPTResponse:', error)
        }

        // Return success only after processing the event
        return new Response('Success!', { status: 200 })
      }
    }
  }

  // Default response for any other cases
  return new Response('OK', { status: 200 })
}
