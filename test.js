import { GetAiClient, GetConfig } from './utils.js';

const config = await GetConfig();
const aiClient = await GetAiClient(config);

await testChat(aiClient)
await testDraw(aiClient)

async function testChat(aiClient) {
  const chat = await aiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Hello!"
      },
    ],
    temperature: 1,
    max_tokens: 4096,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  console.log(chat.choices[0].message.content);
}

async function testDraw(aiClient) {
    const draw = await aiClient.images.generate({
        model: "dall-e-3",
        prompt: "A helpful assistant",
        n: 1,
        size: "1024x1024",
    });
    console.log(draw.data[0].url);
}