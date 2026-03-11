import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SavSpotApiClient } from '../api-client.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS_AHEAD = 90;

export function registerCheckAvailability(
  server: McpServer,
  apiClient: SavSpotApiClient,
): void {
  server.tool(
    'check_availability',
    'Check available time slots for a service on a specific date',
    {
      service_id: z.string().describe('UUID of the service'),
      date: z.string().describe('Date in YYYY-MM-DD format (today or up to 90 days ahead)'),
      staff_id: z.string().optional().describe('UUID of a specific staff member (optional)'),
      guest_count: z.number().optional().describe('Number of guests (optional)'),
    },
    async (params) => {
      if (!UUID_REGEX.test(params.service_id)) {
        return {
          content: [{ type: 'text' as const, text: 'Error: service_id must be a valid UUID' }],
          isError: true,
        };
      }

      if (params.staff_id && !UUID_REGEX.test(params.staff_id)) {
        return {
          content: [{ type: 'text' as const, text: 'Error: staff_id must be a valid UUID' }],
          isError: true,
        };
      }

      if (!DATE_REGEX.test(params.date)) {
        return {
          content: [
            { type: 'text' as const, text: 'Error: date must be in YYYY-MM-DD format' },
          ],
          isError: true,
        };
      }

      const requestedDate = new Date(params.date + 'T00:00:00Z');
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      if (requestedDate < today) {
        return {
          content: [
            { type: 'text' as const, text: 'Error: date must be today or in the future' },
          ],
          isError: true,
        };
      }

      const maxDate = new Date(today);
      maxDate.setUTCDate(maxDate.getUTCDate() + MAX_DAYS_AHEAD);

      if (requestedDate > maxDate) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: date must be within ${MAX_DAYS_AHEAD} days from today`,
            },
          ],
          isError: true,
        };
      }

      try {
        const slots = await apiClient.checkAvailability({
          serviceId: params.service_id,
          date: params.date,
          staffId: params.staff_id,
          guestCount: params.guest_count,
        });

        if (slots.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No available time slots for ${params.date}. Try a different date or check another service.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(slots, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error checking availability: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
