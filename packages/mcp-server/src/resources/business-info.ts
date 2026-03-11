import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SavSpotApiClient } from '../api-client.js';

export function registerBusinessResource(
  server: McpServer,
  apiClient: SavSpotApiClient,
): void {
  server.resource(
    'business',
    'business://{id}',
    async (uri) => {
      const id = uri.pathname.replace(/^\/\//, '');

      if (!id) {
        throw new Error('Business ID is required in the URI');
      }

      const business = await apiClient.getBusiness(id);

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(business, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    },
  );
}
