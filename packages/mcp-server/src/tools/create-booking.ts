import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SavSpotApiClient } from '../api-client.js';
import { UUID_REGEX, DATE_REGEX, TIME_REGEX, EMAIL_REGEX } from '../validation.js';

export function registerCreateBooking(
  server: McpServer,
  apiClient: SavSpotApiClient,
): void {
  server.tool(
    'create_booking',
    'Create a new booking for a service. Requires explicit client consent before proceeding.',
    {
      service_id: z.string().describe('UUID of the service to book'),
      date: z.string().describe('Booking date in YYYY-MM-DD format'),
      time_slot: z.string().describe('Start time in HH:MM format (24-hour)'),
      client_name: z.string().describe('Full name of the client'),
      client_email: z.string().describe('Email address of the client'),
      guest_count: z.number().optional().describe('Number of guests (optional, default: 1)'),
      client_consent: z
        .boolean()
        .describe('Client has confirmed they want to proceed with the booking (must be true)'),
    },
    async (params) => {
      if (!params.client_consent) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Booking not created: client_consent must be true. Please confirm with the client before booking.',
            },
          ],
          isError: true,
        };
      }

      if (!UUID_REGEX.test(params.service_id)) {
        return {
          content: [{ type: 'text' as const, text: 'Error: service_id must be a valid UUID' }],
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

      if (!TIME_REGEX.test(params.time_slot)) {
        return {
          content: [
            { type: 'text' as const, text: 'Error: time_slot must be in HH:MM format (24-hour)' },
          ],
          isError: true,
        };
      }

      if (!EMAIL_REGEX.test(params.client_email)) {
        return {
          content: [
            { type: 'text' as const, text: 'Error: client_email must be a valid email address' },
          ],
          isError: true,
        };
      }

      if (!params.client_name.trim()) {
        return {
          content: [
            { type: 'text' as const, text: 'Error: client_name must not be empty' },
          ],
          isError: true,
        };
      }

      try {
        const session = await apiClient.createBookingSession({
          serviceId: params.service_id,
          clientEmail: params.client_email,
          clientName: params.client_name,
          date: params.date,
          timeSlot: params.time_slot,
          guestCount: params.guest_count,
          clientConsent: params.client_consent,
        });

        const booking = await apiClient.completeBookingSession(session.id);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  message: 'Booking created successfully',
                  booking,
                },
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
              text: `Error creating booking: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
