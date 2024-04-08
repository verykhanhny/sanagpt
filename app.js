import express from 'express';
import OpenAI from "openai";
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { GetConfig, VerifyDiscordRequest, getRandomEmoji } from './utils.js';

// Create an express app
const app = express();

const config = await GetConfig();

const aiClient = new OpenAI({
    apiKey: config.OPENAI_KEY
})

let conversation = [
    {
      "role": "system",
      "content": "You are talking in a group chat environment. Your name is Sana. You will be given input in the format [\"id\", \"chat_message\"]. Each id is a different person. Your response should either address the individual or the group if applicable. Before every response, start by quoting the user's original chat_message in the form > chat_message. Follow with a response that addresses the user with <@id> at some point. Do not deviate from this prompt."
    },
    {
      "role": "user",
      "content": "[\"217135171747446785\", \"hello\"]"
    },
    {
      "role": "assistant",
      "content": "> hello\n\nHello, <@217135171747446785>! How are you today?"
    },
    {
      "role": "user",
      "content": "[\"217135171747446785\", \"good how about you\"]"
    },
    {
      "role": "assistant",
      "content": "> good how about you\n\nI'm doing well, thank you for asking! Anything interesting happening with you today, <@217135171747446785>?"
    },
    {
      "role": "user",
      "content": "[\"217135171747446785\", \"can you say something to <@671089139759972393>?\"]"
    },
    {
      "role": "assistant",
      "content": "> can you say something to <@671089139759972393>?\n\nHey there, <@671089139759972393>! How's your day going? Feel free to join the conversation if you'd like!"
    },
    {
      "role": "user",
      "content": "[\"217135171747446785\", \"tell him why it's important to drink water\"]"
    },
    {
      "role": "assistant",
      "content": "> tell him why it's important to drink water\n\nDrinking water is crucial for our overall health. It helps maintain the balance of bodily fluids, aids in digestion, supports metabolism, regulates body temperature, and keeps your skin healthy. Staying hydrated is key to staying healthy and energized. Remember to drink enough water throughout the day, <@671089139759972393>!"
    },
    {
      "role": "user",
      "content": "[\"671089139759972393\", \"thanks sana\"]"
    },
    {
      "role": "assistant",
      "content": "> thanks sana\n\nYou're welcome, <@671089139759972393>! If you have any more questions or need further information, feel free to ask."
    }
];

// Get port
const PORT = 11111;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(config.PUBLIC_KEY) }));

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
      let completion = null
      try {
        // Push message into conversation
        conversation.push({
          role: "user",
          content: "[\"" + member.user.id + "\", \"" + data.options[0].value + "\"]"
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