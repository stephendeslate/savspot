import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SavSpotApiClient } from '../api-client.js';
import { registerDiscoverBusinesses } from './discover-businesses.js';
import { registerListServices } from './list-services.js';
import { registerCheckAvailability } from './check-availability.js';
import { registerCreateBooking } from './create-booking.js';
import { registerGetBooking } from './get-booking.js';
import { registerCancelBooking } from './cancel-booking.js';

export function registerTools(server: McpServer, apiClient: SavSpotApiClient): void {
  registerDiscoverBusinesses(server, apiClient);
  registerListServices(server, apiClient);
  registerCheckAvailability(server, apiClient);
  registerCreateBooking(server, apiClient);
  registerGetBooking(server, apiClient);
  registerCancelBooking(server, apiClient);
}
