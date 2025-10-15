# Anthropic Prompt Caching Implementation

This document describes how prompt caching is implemented in the CodeReview application to reduce API costs and latency when analyzing code with Claude AI.

## Overview

Prompt caching allows you to cache frequently-used context (like system instructions) between API calls. This significantly reduces:
- **Cost**: Cached tokens are ~10% of the cost of regular tokens
- **Latency**: Cached content doesn't need to be reprocessed

## Implementation

The code analysis endpoint (`/api/analyze-code`) uses prompt caching with the following structure:

```typescript
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 4000,
  system: [
    {
      type: "text",
      text: systemInstructions,  // General instructions (not cached)
    },
    {
      type: "text",
      text: `Language: ${detectedLanguage}`,  // Language context (cached)
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [
    {
      role: "user",
      content: `Analyze the following ${detectedLanguage} code:\n\n...`
    }
  ]
});
```

## Cache Strategy

1. **System Instructions**: The general analysis instructions are included in the system message
2. **Language Context**: The detected language is marked with `cache_control: { type: "ephemeral" }` to enable caching
3. **Code Content**: The actual code to analyze is passed in the user message (not cached, as it changes frequently)

## Usage Tracking

The implementation logs cache usage statistics to help monitor performance:

```typescript
console.log("API Usage:", JSON.stringify(response.usage, null, 2));
```

Example output:
```json
{
  "input_tokens": 1234,
  "cache_creation_input_tokens": 500,
  "cache_read_input_tokens": 0,
  "output_tokens": 256
}
```

On subsequent requests with the same language:
```json
{
  "input_tokens": 1234,
  "cache_creation_input_tokens": 0,
  "cache_read_input_tokens": 500,
  "output_tokens": 256
}
```

## Benefits

- **First Request**: Creates cache for the language context
- **Subsequent Requests**: Reads from cache, reducing latency and cost
- **Multiple Languages**: Each language gets its own cache entry
- **Automatic Expiration**: Cache expires after 5 minutes of inactivity (Anthropic's default)

## Model Support

Prompt caching is supported on:
- Claude 3.5 Sonnet (claude-3-5-sonnet-20241022) ✅ Currently used
- Claude 3.5 Haiku (claude-3-5-haiku-20241022)
- Claude 3 Opus (claude-3-opus-20240229)
- Claude 3 Haiku (claude-3-haiku-20240307)

## Best Practices

1. **Cache Long Context**: Put the longest, most reusable content at the end of your system message
2. **Mark with cache_control**: Only add `cache_control` to blocks you want cached
3. **Monitor Usage**: Check the usage statistics to ensure caching is working
4. **Cache TTL**: Remember that caches expire after 5 minutes of inactivity

## References

- [Anthropic Prompt Caching Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [SDK Documentation](https://github.com/anthropics/anthropic-sdk-typescript)
