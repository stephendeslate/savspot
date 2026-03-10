import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketForm } from '../ticket-form';

// Mock the apiClient module
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

// Get reference to mock
import { apiClient } from '@/lib/api-client';
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;

/**
 * Helper to select a value from a Radix Select.
 * Opens the combobox trigger, waits for the option role, then clicks it.
 */
async function selectRadixOption(
  user: ReturnType<typeof userEvent.setup>,
  triggerLabel: string,
  optionText: string,
) {
  const trigger = screen.getByLabelText(triggerLabel);
  await user.click(trigger);
  await waitFor(() => {
    expect(screen.getByRole('option', { name: optionText })).toBeInTheDocument();
  });
  await user.click(screen.getByRole('option', { name: optionText }));
}

describe('TicketForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockPost.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render all form fields', () => {
    render(<TicketForm />);

    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText(/screenshot/i)).toBeInTheDocument();
  });

  it('should render submit button', () => {
    render(<TicketForm />);
    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeInTheDocument();
  });

  it('should disable submit button when required fields are empty', () => {
    render(<TicketForm />);
    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeDisabled();
  });

  it('should enable submit button when required fields are filled', async () => {
    render(<TicketForm />);

    await selectRadixOption(user, 'Category', 'Bug Report');
    await user.type(screen.getByLabelText('Subject'), 'Test subject');
    await user.type(screen.getByLabelText('Description'), 'Test description');

    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeEnabled();
  });

  it('should render all category options', async () => {
    render(<TicketForm />);

    // Open the select to see all options
    await user.click(screen.getByLabelText('Category'));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Bug Report' })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Feature Request' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Question' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Account Issue' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Payment Issue' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
  });

  it('should submit the form and show success message', async () => {
    mockPost.mockResolvedValue({ id: 'ticket-1' });
    const onSuccess = vi.fn();

    render(<TicketForm onSuccess={onSuccess} />);

    await selectRadixOption(user, 'Category', 'Bug Report');
    await user.type(screen.getByLabelText('Subject'), 'App crashes');
    await user.type(
      screen.getByLabelText('Description'),
      'The app crashes when I open settings',
    );
    await user.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(
        screen.getByText(/submitted successfully/i),
      ).toBeInTheDocument();
    });

    expect(mockPost).toHaveBeenCalledWith('/api/support/tickets', {
      category: 'BUG',
      subject: 'App crashes',
      body: 'The app crashes when I open settings',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should include screenshotUrl when provided', async () => {
    mockPost.mockResolvedValue({ id: 'ticket-2' });

    render(<TicketForm />);

    await selectRadixOption(user, 'Category', 'Bug Report');
    await user.type(screen.getByLabelText('Subject'), 'Visual bug');
    await user.type(screen.getByLabelText('Description'), 'UI is broken');
    await user.type(
      screen.getByLabelText(/screenshot/i),
      'https://imgur.com/abc',
    );
    await user.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/support/tickets',
        expect.objectContaining({
          screenshotUrl: 'https://imgur.com/abc',
        }),
      );
    });
  });

  it('should show error message on submission failure', async () => {
    mockPost.mockRejectedValue(new Error('Server error'));

    render(<TicketForm />);

    await selectRadixOption(user, 'Category', 'Other');
    await user.type(screen.getByLabelText('Subject'), 'Help');
    await user.type(screen.getByLabelText('Description'), 'Need help');
    await user.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('should allow submitting another ticket after success', async () => {
    mockPost.mockResolvedValue({ id: 'ticket-3' });

    render(<TicketForm />);

    await selectRadixOption(user, 'Category', 'Question');
    await user.type(screen.getByLabelText('Subject'), 'How to?');
    await user.type(screen.getByLabelText('Description'), 'How do I do X?');
    await user.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(
        screen.getByText(/submitted successfully/i),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: 'Submit Another Ticket' }),
    );

    // Form should be visible again with empty fields
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toHaveValue('');
  });
});
