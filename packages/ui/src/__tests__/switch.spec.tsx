import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../components/switch.js';

describe('Switch', () => {
  it('should render as switch role', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('should toggle checked state on click', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch checked={false} onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('should reflect checked state via aria-checked', () => {
    const { rerender } = render(<Switch checked={false} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

    rerender(<Switch checked={true} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('should be disabled when disabled prop is set', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch disabled onCheckedChange={onCheckedChange} />);

    expect(screen.getByRole('switch')).toBeDisabled();
    await user.click(screen.getByRole('switch'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('should call onCheckedChange with toggled value', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch checked={true} onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});
