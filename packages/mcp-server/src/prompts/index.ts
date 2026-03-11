import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBookingAssistantPrompt } from './booking-assistant.js';

export function registerPrompts(server: McpServer): void {
  registerBookingAssistantPrompt(server);
}
