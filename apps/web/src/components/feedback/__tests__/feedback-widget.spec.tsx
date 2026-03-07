import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackWidget } from '../feedback-widget';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/use-tenant', () => ({
  useTenant: vi.fn(() => ({ tenantId: 'tenant-001' })),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { useTenant } from '@/hooks/use-tenant';
import { apiClient } from '@/lib/api-client';

const mockUseTenant = useTenant as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FeedbackWidget', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTenant.mockReturnValue({ tenantId: 'tenant-001' });
  });

  it('should render the trigger button', () => {
    render(<FeedbackWidget />);
    expect(screen.getByLabelText('Send feedback')).toBeInTheDocument();
  });

  it('should open dialog when trigger is clicked', async () => {
    render(<FeedbackWidget />);
    await user.click(screen.getByLabelText('Send feedback'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should render feedback type selector with 4 options', async () => {
    render(<FeedbackWidget />);
    await user.click(screen.getByLabelText('Send feedback'));

    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByText('Feature Request')).toBeInTheDocument();
    expect(screen.getByText('UX Friction')).toBeInTheDocument();
    expect(screen.getByText('Comparison Note')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('should render textarea for feedback body', async () => {
    render(<FeedbackWidget />);
    await user.click(screen.getByLabelText('Send feedback'));
    expect(screen.getByLabelText('Your Feedback')).toBeInTheDocument();
  });

  it('should disable submit when type or body is empty', async () => {
    render(<FeedbackWidget />);
    await user.click(screen.getByLabelText('Send feedback'));

    const submitBtn = screen.getByRole('button', { name: 'Send Feedback' });
    expect(submitBtn).toBeDisabled();
  });

  it('should enable submit when type and body are filled', async () => {
    render(<FeedbackWidget />);
    await user.click(screen.getByLabelText('Send feedback'));

    await user.selectOptions(screen.getByLabelText('Type'), 'FEATURE_REQUEST');
    await user.type(
      screen.getByLabelText('Your Feedback'),
      'Please add dark mode',
    );

    const submitBtn = screen.getByRole('button', { name: 'Send Feedback' });
    expect(submitBtn).toBeEnabled();
  });

  it('should submit feedback and show success message', async () => {
    mockPost.mockResolvedValue({ id: 'fb-1' });

    render(<FeedbackWidget />);
    await user.click(screen.getByLabelText('Send feedback'));

    await user.selectOptions(screen.getByLabelText('Type'), 'GENERAL');
    await user.type(screen.getByLabelText('Your Feedback'), 'Great app!');
    await user.click(screen.getByRole('button', { name: 'Send Feedback' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Thank you for your feedback/),
      ).toBeInTheDocument();
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/tenants/tenant-001/feedback',
      expect.objectContaining({
        type: 'GENERAL',
        body: 'Great app!',
      }),
    );
  });

  it('should allow sending more feedback after success', async () => {
    mockPost.mockResolvedValue({ id: 'fb-1' });

    render(<FeedbackWidget />);
    await user.click(screen.getByLabelText('Send feedback'));

    await user.selectOptions(screen.getByLabelText('Type'), 'GENERAL');
    await user.type(screen.getByLabelText('Your Feedback'), 'Nice!');
    await user.click(screen.getByRole('button', { name: 'Send Feedback' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Thank you for your feedback/),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: 'Send More Feedback' }),
    );

    // Form should be visible again
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Your Feedback')).toBeInTheDocument();
  });

  it('should show error on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Server error'));

    render(<FeedbackWidget />);
    await user.click(screen.getByLabelText('Send feedback'));

    await user.selectOptions(screen.getByLabelText('Type'), 'FEATURE_REQUEST');
    await user.type(screen.getByLabelText('Your Feedback'), 'Bug report');
    await user.click(screen.getByRole('button', { name: 'Send Feedback' }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
