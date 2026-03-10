import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockResolvedTheme = 'light';
const mockSetTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockResolvedTheme = 'light';
  });

  it('should render a button with aria-label', async () => {
    const { ThemeToggle } = await import('../theme-toggle');
    render(<ThemeToggle />);
    expect(
      screen.getByRole('button', { name: 'Toggle theme' }),
    ).toBeInTheDocument();
  });

  it('should call setTheme with "dark" when in light mode', async () => {
    mockResolvedTheme = 'light';
    const { ThemeToggle } = await import('../theme-toggle');
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('should call setTheme with "light" when in dark mode', async () => {
    mockResolvedTheme = 'dark';
    const { ThemeToggle } = await import('../theme-toggle');
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
