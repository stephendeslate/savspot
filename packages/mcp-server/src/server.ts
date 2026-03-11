import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SavSpotApiClient } from './api-client.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'savspot',
    version: '1.0.0',
  });

  const apiClient = new SavSpotApiClient();

  registerTools(server, apiClient);
  registerResources(server, apiClient);
  registerPrompts(server);

  return server;
}
