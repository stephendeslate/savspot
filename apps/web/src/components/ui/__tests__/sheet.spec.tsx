import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sheet, SheetContent, SheetTrigger } from '../sheet';

describe('Sheet', () => {
  it('should not render content when closed', () => {
    render(
      <Sheet open={false}>
        <SheetContent>
          <p>Sheet content</p>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.queryByText('Sheet content')).not.toBeInTheDocument();
  });

  it('should render content when open', () => {
    render(
      <Sheet open={true}>
        <SheetContent>
          <p>Sheet content</p>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('should have close button', () => {
    render(
      <Sheet open={true}>
        <SheetContent>
          <p>Sheet content</p>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('should call onOpenChange when close button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open={true} onOpenChange={onOpenChange}>
        <SheetContent>
          <p>Sheet content</p>
        </SheetContent>
      </Sheet>,
    );

    fireEvent.click(screen.getByText('Close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should have dialog role', () => {
    render(
      <Sheet open={true}>
        <SheetContent>
          <p>Sheet content</p>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
