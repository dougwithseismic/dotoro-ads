# Message Inbox Plugin System

A simple message router that receives JSON payloads and dispatches them to configured plugins.

## Quick Start

```bash
# Set environment variables
INBOX_API_KEY=your-secret-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Send a message
curl -X POST http://localhost:3000/api/inbox \
  -H "X-Inbox-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Form Submitted",
    "body": "New signup from john@example.com",
    "severity": "info"
  }'
```

## Payload Format

```typescript
{
  id?: string;           // Auto-generated if not provided
  type?: string;         // Message type (default: "message")
  title?: string;        // Message title
  body?: string;         // Message body
  severity?: "info" | "warning" | "error" | "critical";
  fields?: Record<string, unknown>;  // Additional structured data
  metadata?: Record<string, unknown>; // Extra metadata
}
```

## Built-in Plugins

### SlackPlugin
Sends messages to Slack via webhook with Block Kit formatting.
- Severity-based color coding
- Supports title, body, and fields
- 5s timeout with graceful error handling

### LoggingPlugin
Logs all messages to console (useful for debugging).

### WebhookPlugin
Forwards messages to arbitrary HTTP endpoints.

## Creating a Plugin

```typescript
import type { Plugin, MessagePayload, PluginContext } from './types';

export const myPlugin: Plugin = {
  name: 'my-plugin',

  async onMessage(payload: MessagePayload, context: PluginContext): Promise<void> {
    // Handle the message
    console.log(`Received: ${payload.title}`);
  },

  async onError(error: Error, payload: MessagePayload, context: PluginContext): Promise<void> {
    // Handle errors (optional)
    console.error(`Error processing ${payload.id}:`, error);
  }
};
```

## Registering Plugins

```typescript
import { pluginRegistry, SlackPlugin } from './plugins';

// Register at startup
const slack = new SlackPlugin({ webhookUrl: process.env.SLACK_WEBHOOK_URL });
pluginRegistry.register(slack);
```

## Architecture

```
POST /api/inbox
     │
     ▼
[Validate & Auth]
     │
     ▼
[PluginDispatcher]
     │
     ├──▶ SlackPlugin.onMessage()
     ├──▶ LoggingPlugin.onMessage()
     └──▶ WebhookPlugin.onMessage()
```

- Plugins execute in parallel
- Errors are isolated (one plugin failure doesn't affect others)
- Configurable timeout per dispatch (default: 30s)
