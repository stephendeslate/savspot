import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SavSpotApiClient } from '../api-client.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerListServices(
  server: McpServer,
  apiClient: SavSpotApiClient,
): void {
  server.tool(
    'list_services',
    'List available services for a business',
    {
      business_id: z.string().describe('UUID of the business'),
    },
    async (params) => {
      if (!UUID_REGEX.test(params.business_id)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: business_id must be a valid UUID',
            },
          ],
          isError: true,
        };
      }

      try {
        const services = await apiClient.listServices(params.business_id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(services, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error listing services: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
