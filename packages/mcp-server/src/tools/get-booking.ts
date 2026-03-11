import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SavSpotApiClient } from '../api-client.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerGetBooking(
  server: McpServer,
  apiClient: SavSpotApiClient,
): void {
  server.tool(
    'get_booking',
    'Get details of an existing booking by ID',
    {
      booking_id: z.string().describe('UUID of the booking'),
    },
    async (params) => {
      if (!UUID_REGEX.test(params.booking_id)) {
        return {
          content: [
            { type: 'text' as const, text: 'Error: booking_id must be a valid UUID' },
          ],
          isError: true,
        };
      }

      try {
        const booking = await apiClient.getBooking(params.booking_id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(booking, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting booking: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
