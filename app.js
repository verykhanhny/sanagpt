import express from 'express';
import fs from 'fs';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
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
  console.error('Error reading file or parsing JSON:', err);
}

// Get port, or default to 3000
const PORT = 11111;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(config.PUBLIC_KEY) }));

// Simple test command
const TEST_COMMAND = {
    name: 'test',
    description: 'Basic command',
    type: 1,
  };
  
const ALL_COMMANDS = [TEST_COMMAND];
  
InstallGlobalCommands(config.APP_ID, config.DISCORD_TOKEN, ALL_COMMANDS);

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

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
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: 'Hello! ' + getRandomEmoji(),
        },
      });
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});