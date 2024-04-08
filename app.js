import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { GetConfig, DiscordRequest, VerifyDiscordRequest, GetAiClient, getRandomEmoji } from './utils.js';

// Create an express app
const app = express();

const config = await GetConfig();

let conversation = [
  {
    "role": "system",
    "content": "You are talking in a group chat environment. Your name is Sana. You will be given input in the format [\"id\", \"chat_message\"]. Each id is a different person. Your response should either address the individual or the group if applicable. Give a response that addresses the user with <@id> at some point. Do not deviate from this prompt."
  },
  {
    "role": "user",
    "content": "[\"217135171747446785\", \"hello\"]"
  },
  {
    "role": "assistant",
    "content": "Hey there, <@217135171747446785>! How's it going?"
  },
  {
    "role": "user",
    "content": "[\"217135171747446785\", \"good how about you\"]"
  },
  {
    "role": "assistant",
    "content": "I'm doing well, thanks for asking <@217135171747446785>! Anything exciting happening with you today?"
  },
  {
    "role": "user",
    "content": "[\"217135171747446785\", \"can you say something to <@671089139759972393>?\"]"
  },
  {
    "role": "assistant",
    "content": "Hey there, <@671089139759972393>! How's your day going? Feel free to join the conversation if you'd like!"
  },
  {
    "role": "user",
    "content": "[\"217135171747446785\", \"tell him why it's important to drink water\"]"
  },
  {
    "role": "assistant",
    "content": "It's important to drink water, <@671089139759972393>, because staying hydrated is essential for overall health. Water helps regulate body temperature, aids in digestion, flushes out toxins, and keeps your skin looking great. So remember to drink plenty of water throughout the day!"
  },
  {
    "role": "user",
    "content": "[\"671089139759972393\", \"thanks sana\"]"
  },
  {
    "role": "assistant",
    "content": "You're welcome, <@671089139759972393>! If you have any more questions or need advice, feel free to ask."
  }
];

// Get port
const PORT = 11111;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(config.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', handleInteractions);

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});

async function handleInteractions(req, res) {
  // Interaction type and data
  const { type, token, member, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    // "test" command
    if (data.name === 'test') {
      // Call the func that will update the message
      testResponse(token)
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });
    }

    // "chat" command
    if (data.name === 'chat') {
      chatResponse(token, member, data)
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });
    }

    // "draw" command
    if (data.name === 'draw') {
      drawResponse(token, member, data)
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });
    }
  }
}

async function testResponse(token) {
  const options = {
    method: 'POST',
    body: {
      // Fetches a random emoji to send from a helper function
      content: 'Hello! ' + getRandomEmoji(),
    },
  };
  DiscordRequest(`/webhooks/${config.APP_ID}/${token}`, config, options)
}

async function chatResponse(token, member, data) {
  const aiClient = GetAiClient(config);

  // Push message into conversation
  conversation.push({
    role: "user",
    content: `["${member.user.id}", "${data.options[0].value}"]`
  });

  // Get response from OpenAI
  const response = await aiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversation,
      temperature: 1,
      max_tokens: 4096,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
  });

  // Push response onto conversation
  conversation.push({
      role: "assistant",
      content: response.choices[0].message.content
  });

  const options = {
    method: 'POST',
    body: {
      content: `> ${data.options[0].value}\n\n${response.choices[0].message.content}`
    },
  };
  DiscordRequest(`/webhooks/${config.APP_ID}/${token}`, config, options)
}

async function drawResponse(token, member, data) {
  const aiClient = GetAiClient(config);

  const response = await aiClient.images.generate({
    model: "dall-e-2",
    prompt: data.options[0].value,
    n: 1,
    size: "1024x1024",
  });

  const options = {
    method: 'POST',
    body: {
      content: `> ${data.options[0].value}\n\n<@${member.user.id}>\n\n`,
      embeds: [
        {
          image: {
            url: response.data[0].url,
            height: 1024,
            width: 1024
          },
        },
      ]
    },
  };
  DiscordRequest(`/webhooks/${config.APP_ID}/${token}`, config, options)
}