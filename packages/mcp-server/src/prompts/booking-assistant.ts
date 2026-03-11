import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerBookingAssistantPrompt(server: McpServer): void {
  server.prompt(
    'booking_assistant',
    'System prompt for an AI assistant that helps users find and book appointments',
    async () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'You are a booking assistant for SavSpot.',
              'You help users find service businesses, check availability, and book appointments.',
              'Always confirm details with the user before creating a booking.',
              'If payment is required, inform the user of the total amount before proceeding.',
              'When searching for businesses, ask about location preferences and service type.',
              'Present available time slots clearly and let the user choose.',
              'After a booking is created, provide the confirmation code and booking details.',
            ].join(' '),
          },
        },
      ],
    }),
  );
}
