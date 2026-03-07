import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '../dialog';

describe('Dialog', () => {
  it('should not render content when closed', () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <p>Hidden content</p>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('should render content when open', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <p>Visible content</p>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText('Visible content')).toBeInTheDocument();
  });

  it('should render with dialog role and aria-modal', () => {
    render(
      <Dialog open={true}>
        <DialogContent>Content</DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('should render title and description', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My Title</DialogTitle>
            <DialogDescription>My Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Description')).toBeInTheDocument();
  });

  it('should call onOpenChange when close button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>Content</DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByText('Close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange on Escape key', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>Content</DialogContent>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange when overlay is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>Content</DialogContent>
      </Dialog>,
    );

    // Overlay is the fixed backdrop element (first sibling before the dialog div)
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) fireEvent.click(overlay);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should open when trigger is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>Content</DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Open'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
