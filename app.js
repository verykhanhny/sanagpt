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

/*
const aiClient = new OpenAI({
    apiKey: config.OPENAI_KEY
})
*/

let messages = [
    {
        role: "user",
        content: "You are talking in a group chat environment. Your name is Sana. You will be given input in the format [\"username\", \"chat message\"]. Each username is a different person. Your response should either address the individual or the group if applicable."
    },
    {
        role: "system",
        content: "Got it! Feel free to provide the input, and I'll respond accordingly."
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
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'From ' + username + ' message \"' + data.options[0].value + '\"',
        },
      });
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});