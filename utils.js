import fetch from 'node-fetch';
import OpenAI from 'openai';
import { readFile }  from 'fs/promises';

let aiClient = null;

export async function GetConfig() {
  // Read config json
  const payload = await readFile('/data/config.json', 'utf8');
  const config = JSON.parse(payload);
  console.log('JSON data loaded successfully on startup.');
  return config;
}

export function GetAiClient(config) {
  if (aiClient === undefined || aiClient === null) {
    aiClient = new OpenAI({
      apiKey: config.OPENAI_KEY,
    });
  }
  return aiClient;
}

export async function DiscordRequest(endpoint, config, options) {
  // append endpoint to root API URL
  const url = `https://discord.com/api/v10/${endpoint}`;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use node-fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${config.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'Sana (https://github.com/verykhanhny/sanagpt, 1.0.0)',
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(config, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${config.APP_ID}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, config, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭', '😄', '😌', '🤓', '😎', '😤', '🤖', '😶‍🌫️', '🌏', '📸', '💿', '👋', '🌊', '✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
