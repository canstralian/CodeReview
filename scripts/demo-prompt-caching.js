#!/usr/bin/env node

/**
 * Demo script to show Anthropic Prompt Caching in action
 * 
 * This script demonstrates how prompt caching works by:
 * 1. Making an initial API call that creates a cache
 * 2. Making a second call that reads from the cache
 * 3. Comparing the usage statistics
 * 
 * Run: node scripts/demo-prompt-caching.js
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SAMPLE_CODE = `function authenticateUser(username, password) {
  const query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'";
  return database.query(query);
}`;

async function demonstrateCaching() {
  console.log('='.repeat(80));
  console.log('Anthropic Prompt Caching Demo');
  console.log('='.repeat(80));
  console.log();

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'test_key_not_set') {
    console.error('ERROR: Please set ANTHROPIC_API_KEY in your .env file');
    process.exit(1);
  }

  const systemInstructions = `You are an AI assistant tasked with analyzing code and providing detailed suggestions for improvement. Your goal is to provide insightful commentary on code quality, security, performance, and best practices.

Focus on:
1. Security vulnerabilities and fixes
2. Performance optimizations
3. Code quality improvements
4. Bug detection and fixes
5. Best practices and refactoring opportunities

Respond with a JSON object containing an array of suggestions.`;

  console.log('📝 First Request - Creating Cache...');
  console.log('-'.repeat(80));

  const response1 = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemInstructions,
      },
      {
        type: "text",
        text: "Language: JavaScript",
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [
      {
        role: "user",
        content: `Analyze the following JavaScript code:\n\n\`\`\`javascript\n${SAMPLE_CODE}\n\`\`\``
      }
    ]
  });

  console.log('✅ First request completed');
  console.log('\nUsage Stats:');
  console.log(JSON.stringify(response1.usage, null, 2));
  console.log();
  
  if (response1.usage.cache_creation_input_tokens && response1.usage.cache_creation_input_tokens > 0) {
    console.log(`✨ Cache created with ${response1.usage.cache_creation_input_tokens} tokens`);
  }

  console.log();
  console.log('⏳ Waiting 2 seconds before second request...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log();

  console.log('📝 Second Request - Using Cache...');
  console.log('-'.repeat(80));

  const response2 = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemInstructions,
      },
      {
        type: "text",
        text: "Language: JavaScript",
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [
      {
        role: "user",
        content: `Analyze the following JavaScript code:\n\n\`\`\`javascript\n${SAMPLE_CODE}\n\`\`\``
      }
    ]
  });

  console.log('✅ Second request completed');
  console.log('\nUsage Stats:');
  console.log(JSON.stringify(response2.usage, null, 2));
  console.log();

  if (response2.usage.cache_read_input_tokens && response2.usage.cache_read_input_tokens > 0) {
    console.log(`✨ Cache hit! Read ${response2.usage.cache_read_input_tokens} tokens from cache`);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`First Request:`);
  console.log(`  - Input tokens: ${response1.usage.input_tokens}`);
  console.log(`  - Cache creation: ${response1.usage.cache_creation_input_tokens || 0} tokens`);
  console.log(`  - Output tokens: ${response1.usage.output_tokens}`);
  console.log();
  console.log(`Second Request:`);
  console.log(`  - Input tokens: ${response2.usage.input_tokens}`);
  console.log(`  - Cache reads: ${response2.usage.cache_read_input_tokens || 0} tokens`);
  console.log(`  - Output tokens: ${response2.usage.output_tokens}`);
  console.log();
  
  if (response2.usage.cache_read_input_tokens && response2.usage.cache_read_input_tokens > 0) {
    console.log('💰 Cost Savings:');
    console.log(`  Cached tokens are ~10% of regular cost`);
    console.log(`  Saved: ~${Math.round(response2.usage.cache_read_input_tokens * 0.9)} token equivalents`);
  }
  console.log();
}

demonstrateCaching().catch(error => {
  console.error('Error:', error.message);
  if (error.status) {
    console.error('Status:', error.status);
  }
  process.exit(1);
});
