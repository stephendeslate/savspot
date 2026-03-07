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
    expect(el.className).toContain('w-full');
    expect(el.className).toContain('h-[1px]');
  });

  it('should render vertical when specified', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-full');
    expect(el.className).toContain('w-[1px]');
  });

  it('should set aria-orientation for non-decorative separators', () => {
    const { container } = render(
      <Separator decorative={false} orientation="vertical" />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
  });
});
