import express from 'express';
import OpenAI from "openai";
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { VerifyDiscordRequest, getRandomEmoji, InstallGlobalCommands, DiscordRequest } from './utils.js';

// Create an express app
const app = express();

// Read config json
let payload = null;
try {
    const client = new SecretManagerServiceClient();
    const [accessResponse] = await client.accessSecretVersion({
        name: 'projects/87051143114/secrets/discord-config/versions/latest',
    });
    payload = accessResponse.payload.data.toString('utf8');
} catch (err) {
    console.error('Error getting discord config secret:', err)
}

let config = null;
try {
  config = JSON.parse(payload);
  console.log('JSON data loaded successfully on startup.');
} catch (err) {
  console.error('Error parsing JSON:', err);
}

const aiClient = new OpenAI({
    apiKey: config.OPENAI_KEY
})


let conversation = [
    {
      "role": "system",
      "content": "You are talking in a group chat environment. Your name is Sana. You will be given input in the format [\"username\", \"chat_message\"]. Each username is a different person. Your response should either address the individual or the group if applicable. Before every response, start by quoting the user's original chat_message in the form > chat_message. Follow with a response that addresses the user with @username at some point."
    },
    {
      "role": "user",
      "content": "[\"gwiyomi_chan\", \"hello\"]"
    },
    {
      "role": "assistant",
      "content": "> hello\n\nHello, @gwiyomi_chan! How are you today?"
    },
    {
      "role": "user",
      "content": "[\"gwiyomi_chan\", \"good how about you\"]"
    },
    {
      "role": "assistant",
      "content": "> good how about you\n\nI'm doing well, thank you for asking! Anything interesting happening with you today, @gwiyomi_chan?"
    }
];

// Get port, or default to 3000
const PORT = 11111;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(config.PUBLIC_KEY) }));

// Simple test command
const TEST_COMMAND = {
    name: 'test',
    description: 'Test command',
    type: 1,
  };

// Simple test command
const CHAT_COMMAND = {
    name: 'chat',
    description: 'Chat with Sana',
    type: 1,
    options: [
        {
            name: "message",
            description: "Your message to Sana",
            type: 3,
            required: true,
        }
    ]
  };

const ALL_COMMANDS = [TEST_COMMAND, CHAT_COMMAND];
  
InstallGlobalCommands(config.APP_ID, config.DISCORD_TOKEN, ALL_COMMANDS);

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, member, data } = req.body;

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
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: 'Hello! ' + getRandomEmoji(),
        },
      });
    }

    // "chat" command
    if (data.name === 'chat') {
      let username = member.nick;
      if (username === null) {
        username = member.user.username;
      }

      let completion = null
      try {
        // Push message into conversation
        conversation.push({
          role: "user",
          content: "[\"" + username + "\", \"" + data.options[0].value + "\"]"
        });

        // Get response from OpenAI
        completion = await aiClient.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: conversation,
            temperature: 1,
            max_tokens: 4096,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        // Push response onto conversion
        conversation.push({
            role: "assistant",
            content: completion.choices[0].message.content
        });
      } catch (err) {
        console.error('Error calling OpenAI:', err);
      }

      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: completion.choices[0].message.content,
        },
      });
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});