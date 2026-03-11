import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SavSpotApiClient } from '../api-client.js';
import { registerBusinessResource } from './business-info.js';

export function registerResources(server: McpServer, apiClient: SavSpotApiClient): void {
  registerBusinessResource(server, apiClient);
}
