
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function main() {
  const response = await client.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: "Are there an infinite number of prime numbers such that n mod 4 == 3?"
    }]
  });

  console.log(response.content);
}

main();
