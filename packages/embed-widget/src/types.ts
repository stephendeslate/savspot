export interface BookingResult {
  bookingId: string;
  serviceName: string;
  dateTime: string;
}

export interface SavSpotConfig {
  slug: string;
  mode: 'button' | 'popup' | 'inline';
  container?: string;
  service?: string;
  source?: string;
  theme?: { primaryColor?: string; borderRadius?: string };
  onBooked?: (booking: BookingResult) => void;
  onClose?: () => void;
}

export interface PostMessageData {
  type: string;
  payload?: Record<string, unknown>;
}
