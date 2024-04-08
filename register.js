import { GetConfig, InstallGlobalCommands } from './utils.js';

// Simple test command
const TEST_COMMAND = {
    name: 'test',
    description: 'Test command',
    type: 1,
};

// Chat with Sana using ChatGPT
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

// Draw with Sana using Dall-E
const DRAW_COMMAND = {
    name: 'draw',
    description: 'Draw with Sana',
    type: 1,
    options: [
        {
            name: "prompt",
            description: "Your prompt to Sana",
            type: 3,
            required: true,
        }
    ]
}

const ALL_COMMANDS = [TEST_COMMAND, CHAT_COMMAND, DRAW_COMMAND];

const config = await GetConfig();
  
InstallGlobalCommands(config, ALL_COMMANDS);
