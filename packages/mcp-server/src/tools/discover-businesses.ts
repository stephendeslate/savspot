import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SavSpotApiClient } from '../api-client.js';

export function registerDiscoverBusinesses(
  server: McpServer,
  apiClient: SavSpotApiClient,
): void {
  server.tool(
    'discover_businesses',
    'Search for service businesses by category, location, or name',
    {
      category: z
        .string()
        .optional()
        .describe('Business category (e.g., "VENUE", "SALON", "STUDIO", "FITNESS", "PROFESSIONAL", "OTHER")'),
      lat: z.number().optional().describe('Latitude for location-based search'),
      lng: z.number().optional().describe('Longitude for location-based search'),
      radius_km: z
        .number()
        .optional()
        .default(25)
        .describe('Search radius in kilometers (default: 25)'),
      query: z.string().optional().describe('Search by business name'),
    },
    async (params) => {
      try {
        const response = await apiClient.listBusinesses({
          category: params.category,
          lat: params.lat,
          lng: params.lng,
          radiusKm: params.radius_km,
          query: params.query,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { businesses: response.data, pagination: response.pagination },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error searching businesses: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
