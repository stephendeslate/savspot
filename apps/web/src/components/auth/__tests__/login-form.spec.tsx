import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../login-form';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockLogin = vi.fn();
const mockLoadUser = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ login: mockLogin, loadUser: mockLoadUser }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: { setTokens: vi.fn() },
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('../google-button', () => ({
  GoogleButton: () => <div data-testid="google-button">Google</div>,
}));

vi.mock('../apple-button', () => ({
  AppleButton: () => <div data-testid="apple-button">Apple</div>,
}));

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('LoginForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should render sign in button', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('should render social login buttons', () => {
    render(<LoginForm />);
    expect(screen.getByTestId('google-button')).toBeInTheDocument();
    expect(screen.getByTestId('apple-button')).toBeInTheDocument();
  });

  it('should render link to register page', () => {
    render(<LoginForm />);
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  it('should render forgot password link', () => {
    render(<LoginForm />);
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('should not call login when email is invalid', async () => {
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'invalid');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // Give time for form to process
    await new Promise((r) => setTimeout(r, 100));
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should show validation error for empty password', async () => {
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should call login and redirect on valid submission', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'mypassword');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'mypassword',
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('should show "Invalid email or password" on 401 error', async () => {
    const { ApiError } = await import('@/lib/api-client');
    mockLogin.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('should show generic error on non-401 API error', async () => {
    const { ApiError } = await import('@/lib/api-client');
    mockLogin.mockRejectedValue(new ApiError(500, 'Server error'));

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(
        screen.getByText('Something went wrong. Please try again.'),
      ).toBeInTheDocument();
    });
  });

  it('should show generic error on non-API errors', async () => {
    mockLogin.mockRejectedValue(new Error('Network failure'));

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(
        screen.getByText('Something went wrong. Please try again.'),
      ).toBeInTheDocument();
    });
  });
});
