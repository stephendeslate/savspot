import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationPreferencesPage from '../page';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    request: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockRequest = apiClient.request as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('NotificationPreferencesPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ preferences: null });
  });

  it('should render the heading', async () => {
    render(<NotificationPreferencesPage />);
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('should render all 4 notification category cards', async () => {
    render(<NotificationPreferencesPage />);

    await waitFor(() => {
      expect(screen.getByText('Booking Notifications')).toBeInTheDocument();
    });

    expect(screen.getByText('Payment Notifications')).toBeInTheDocument();
    expect(screen.getByText('System Notifications')).toBeInTheDocument();
    expect(screen.getByText('Calendar Notifications')).toBeInTheDocument();
  });

  it('should render 8 toggle switches (2 per category)', async () => {
    render(<NotificationPreferencesPage />);

    await waitFor(() => {
      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(8);
    });
  });

  it('should use default preferences when API returns null', async () => {
    mockGet.mockResolvedValue({ preferences: null });
    render(<NotificationPreferencesPage />);

    await waitFor(() => {
      const switches = screen.getAllByRole('switch');
      // Default: BOOKING email=true, push=true, PAYMENT email=true, push=true
      // SYSTEM email=true, push=false, CALENDAR email=false, push=true
      // So 6 checked, 2 unchecked
      const checked = switches.filter(
        (s) => s.getAttribute('aria-checked') === 'true',
      );
      expect(checked).toHaveLength(6);
    });
  });

  it('should load preferences from API on mount', async () => {
    mockGet.mockResolvedValue({
      preferences: {
        BOOKING: { email: false, push: false },
        PAYMENT: { email: false, push: false },
        SYSTEM: { email: false, push: false },
        CALENDAR: { email: false, push: false },
      },
    });

    render(<NotificationPreferencesPage />);

    await waitFor(() => {
      const switches = screen.getAllByRole('switch');
      const checked = switches.filter(
        (s) => s.getAttribute('aria-checked') === 'true',
      );
      expect(checked).toHaveLength(0);
    });
  });

  it('should toggle a preference when switch is clicked', async () => {
    mockGet.mockResolvedValue({ preferences: null });

    render(<NotificationPreferencesPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('switch')).toHaveLength(8);
    });

    const switches = screen.getAllByRole('switch');
    // First switch is BOOKING email (default: true)
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');

    await user.click(switches[0]!);
    expect(switches[0]).toHaveAttribute('aria-checked', 'false');

    // Click again to toggle back
    await user.click(switches[0]!);
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('should render save button', async () => {
    render(<NotificationPreferencesPage />);
    expect(
      screen.getByRole('button', { name: 'Save Preferences' }),
    ).toBeInTheDocument();
  });

  it('should call PUT on save', async () => {
    mockGet.mockResolvedValue({ preferences: null });
    mockRequest.mockResolvedValue({});

    render(<NotificationPreferencesPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('switch')).toHaveLength(8);
    });

    await user.click(
      screen.getByRole('button', { name: 'Save Preferences' }),
    );

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        '/api/users/me/notification-preferences',
        expect.objectContaining({
          method: 'PUT',
        }),
      );
    });
  });

  it('should show success message on save', async () => {
    mockGet.mockResolvedValue({ preferences: null });
    mockRequest.mockResolvedValue({});

    render(<NotificationPreferencesPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('switch')).toHaveLength(8);
    });

    await user.click(
      screen.getByRole('button', { name: 'Save Preferences' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText('Preferences saved successfully.'),
      ).toBeInTheDocument();
    });
  });

  it('should not show success message on save failure', async () => {
    mockGet.mockResolvedValue({ preferences: null });
    mockRequest.mockRejectedValue(new Error('Failed to save preferences'));

    render(<NotificationPreferencesPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('switch')).toHaveLength(8);
    });

    await user.click(
      screen.getByRole('button', { name: 'Save Preferences' }),
    );

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });

    // Button should return to normal state (not stuck on "Saving...")
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Save Preferences' }),
      ).toBeInTheDocument();
    });

    // Success message should NOT appear on failure
    expect(
      screen.queryByText('Preferences saved successfully.'),
    ).not.toBeInTheDocument();
  });
});
