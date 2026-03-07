import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  it('should render with correct type', () => {
    render(<Input type="email" aria-label="Email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('should render with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should handle value changes', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Test" />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('should be disabled when disabled prop is set', () => {
    render(<Input disabled aria-label="Disabled" />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should merge custom className', () => {
    render(<Input className="custom-class" aria-label="Test" />);
    expect(screen.getByRole('textbox').className).toContain('custom-class');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} aria-label="Test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
