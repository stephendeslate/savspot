/**
 * Component-level accessibility tests using axe-core via jest-axe.
 *
 * These run in jsdom with vitest and check rendered component markup
 * against WCAG 2.1 AA rules. They complement eslint-plugin-jsx-a11y
 * (static analysis) with runtime DOM auditing.
 */
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Mocks — these components rely on Next.js router and auth context
// ---------------------------------------------------------------------------

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    loadUser: vi.fn(),
  }),
}));

// Mock constants that reference env vars
vi.mock('@/lib/constants', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    API_URL: 'http://localhost:3001',
    ROUTES: {
      HOME: '/',
      LOGIN: '/login',
      REGISTER: '/register',
      FORGOT_PASSWORD: '/forgot-password',
      DASHBOARD: '/dashboard',
    },
  };
});

// ---------------------------------------------------------------------------
// Imports — after mocks so module resolution picks them up
// ---------------------------------------------------------------------------
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { GoogleButton } from '@/components/auth/google-button';
import { AppleButton } from '@/components/auth/apple-button';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Accessibility — WCAG 2.1 AA', () => {
  it('LoginForm has no critical accessibility violations', async () => {
    const { container } = render(<LoginForm />);
    const results = await axe(container, {
      rules: {
        // Only flag critical/serious (default includes minor/moderate)
        region: { enabled: false }, // page landmark rule — not relevant for isolated component
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('RegisterForm has no critical accessibility violations', async () => {
    const { container } = render(<RegisterForm />);
    const results = await axe(container, {
      rules: {
        region: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('GoogleButton has no accessibility violations', async () => {
    const { container } = render(<GoogleButton />);
    const results = await axe(container, {
      rules: {
        region: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('AppleButton has no accessibility violations', async () => {
    const { container } = render(<AppleButton />);
    const results = await axe(container, {
      rules: {
        region: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
