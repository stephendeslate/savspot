import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Separator } from '../separator';

describe('Separator', () => {
  it('should render with decorative role by default', () => {
    const { container } = render(<Separator />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('role')).toBe('none');
  });

  it('should render as separator role when not decorative', () => {
    const { container } = render(<Separator decorative={false} />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('role')).toBe('separator');
  });

  it('should render horizontal by default', () => {
    const { container } = render(<Separator />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('should render vertical when specified', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-orientation')).toBe('vertical');
  });

  it('should set aria-orientation for non-decorative separators', () => {
    const { container } = render(
      <Separator decorative={false} orientation="vertical" />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
  });
});
