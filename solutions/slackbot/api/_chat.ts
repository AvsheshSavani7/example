import { WebClient } from '@slack/web-api'
import { getGPTResponse, generatePromptFromThread } from './_openai'

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
    const gptResponse = await getGPTResponse(prompts)

    // Extract channel mentions from the GPT response
    const channelMentions = gptResponse.choices[0].message.content.match(/<#[A-Z0-9]+\|[^>]+>/g);

    if (channelMentions && channelMentions.length >= 2) {
      const sourceChannelMention = channelMentions[0];
      const targetChannelMention = channelMentions[1];

      const sourceChannelId = await getChannelId(sourceChannelMention);
      const targetChannelId = await getChannelId(targetChannelMention);

      if (sourceChannelId && targetChannelId) {
        const messages = await readMessagesFromChannel(sourceChannelId);

        for (const message of messages) {
          await postMessageToChannel(targetChannelId, message.text);
        }

        // Inform about the transfer in the original channel
        await slack.chat.postMessage({
          channel,
          thread_ts: ts,
          text: `Messages transferred from ${sourceChannelMention} to ${targetChannelMention}.`,
        });
      } else {
        throw new Error('Could not find one or both of the specified channels.');
      }
    } else {
      // If no channel mentions found, just post the GPT response
      await slack.chat.postMessage({
        channel,
        thread_ts: ts,
        text: `${gptResponse.choices[0].message.content}`,
      });
    }
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


export async function readMessagesFromChannel(channelId: string, limit: number = 10) {
  try {
    const result = await slack.conversations.history({
      channel: channelId,
      limit: limit
    });
    return result.messages;
  } catch (error) {
    console.error('Error reading messages:', error);
    throw error;
  }
}

export async function postMessageToChannel(channelId: string, text: string) {
  try {
    await slack.chat.postMessage({
      channel: channelId,
      text: text
    });
  } catch (error) {
    console.error('Error posting message:', error);
    throw error;
  }
}

async function getChannelId(channelMention: string): Promise<string | undefined> {
  // Remove the < > characters from the channel mention
  const channelName = channelMention.replace(/[<>]/g, '');
  
  try {
    const result = await slack.conversations.list({
      types: 'public_channel,private_channel'
    });
    
    const channel = result.channels?.find(c => c.name === channelName.replace('#', '') || c.id === channelName);
    return channel?.id;
  } catch (error) {
    console.error('Error getting channel ID:', error);
    throw error;
  }
}