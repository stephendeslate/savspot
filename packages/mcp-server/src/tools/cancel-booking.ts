import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SavSpotApiClient } from '../api-client.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerCancelBooking(
  server: McpServer,
  apiClient: SavSpotApiClient,
): void {
  server.tool(
    'cancel_booking',
    'Cancel an existing booking. Returns cancellation details including any refund information.',
    {
      booking_id: z.string().describe('UUID of the booking to cancel'),
      reason: z.string().optional().describe('Reason for cancellation (optional)'),
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
        const result = await apiClient.cancelBooking(params.booking_id, params.reason);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error cancelling booking: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
