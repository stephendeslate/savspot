import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FadeIn, PageTransition, StepTransition } from '../motion';

describe('FadeIn', () => {
  it('should render children', () => {
    render(<FadeIn>Hello world</FadeIn>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should accept className prop without error', () => {
    const { container } = render(<FadeIn className="my-class">Content</FadeIn>);
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(container.innerHTML).toBeTruthy();
  });
});

describe('PageTransition', () => {
  it('should render children', () => {
    render(<PageTransition>Page content</PageTransition>);
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});

describe('StepTransition', () => {
  it('should render children with forward direction', () => {
    render(
      <StepTransition stepKey="step-1" direction="forward">
        Step 1 content
      </StepTransition>,
    );
    expect(screen.getByText('Step 1 content')).toBeInTheDocument();
  });

  it('should render children with backward direction', () => {
    render(
      <StepTransition stepKey="step-2" direction="backward">
        Step 2 content
      </StepTransition>,
    );
    expect(screen.getByText('Step 2 content')).toBeInTheDocument();
  });
});
