import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from '../progress';

describe('Progress', () => {
  it('should render with progressbar role', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should have correct aria-valuenow', () => {
    render(<Progress value={42} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
  });

  it('should render at 0%', () => {
    render(<Progress value={0} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('should render at 100%', () => {
    render(<Progress value={100} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('should accept className', () => {
    const { container } = render(<Progress value={50} className="my-progress" />);
    expect(container.innerHTML).toContain('my-progress');
  });
});
