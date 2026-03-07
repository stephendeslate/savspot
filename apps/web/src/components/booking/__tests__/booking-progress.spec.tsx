import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookingProgress } from '../booking-progress';
import type { BookingStep } from '../booking-types';

const STEPS: BookingStep[] = [
  { type: 'SERVICE_SELECTION', label: 'Select Service', order: 0 },
  { type: 'DATE_TIME_PICKER', label: 'Date & Time', order: 1 },
  { type: 'CLIENT_INFO', label: 'Your Info', order: 2 },
  { type: 'PAYMENT', label: 'Payment', order: 3 },
  { type: 'CONFIRMATION', label: 'Confirmation', order: 4 },
];

describe('BookingProgress', () => {
  it('should render a navigation element', () => {
    render(<BookingProgress steps={STEPS} currentStepIndex={0} />);
    expect(screen.getByRole('navigation', { name: /booking progress/i })).toBeInTheDocument();
  });

  it('should render all step labels', () => {
    render(<BookingProgress steps={STEPS} currentStepIndex={0} />);

    for (const step of STEPS) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
    }
  });

  it('should show step numbers for non-completed steps', () => {
    render(<BookingProgress steps={STEPS} currentStepIndex={2} />);

    // Steps 0 and 1 are completed (should show checkmark, not number)
    // Steps 2, 3, 4 are not completed (should show numbers 3, 4, 5)
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render an ordered list', () => {
    render(<BookingProgress steps={STEPS} currentStepIndex={0} />);
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
  });

  it('should render the correct number of list items', () => {
    render(<BookingProgress steps={STEPS} currentStepIndex={0} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(STEPS.length);
  });

  it('should handle single step', () => {
    const singleStep: BookingStep[] = [
      { type: 'CONFIRMATION', label: 'Done', order: 0 },
    ];
    render(<BookingProgress steps={singleStep} currentStepIndex={0} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should handle last step as current', () => {
    render(<BookingProgress steps={STEPS} currentStepIndex={4} />);
    // All previous steps should be completed
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
