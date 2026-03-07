import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from '../page';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('SettingsPage', () => {
  it('should render the heading', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render the description', () => {
    render(<SettingsPage />);
    expect(
      screen.getByText('Manage your account and business settings'),
    ).toBeInTheDocument();
  });

  it('should render all 11 settings sections', () => {
    render(<SettingsPage />);

    const expectedSections = [
      'Business Profile',
      'Availability',
      'Payments',
      'Calendar',
      'Notifications',
      'Branding',
      'Discounts',
      'Tax Rates',
      'Gallery',
      'Team',
      'Embed Widget',
    ];

    for (const name of expectedSections) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('should link each section to the correct href', () => {
    render(<SettingsPage />);

    const expectedLinks: Record<string, string> = {
      'Business Profile': '/settings/profile',
      Availability: '/settings/availability',
      Payments: '/settings/payments',
      Calendar: '/settings/calendar',
      Notifications: '/settings/notifications',
      Branding: '/settings/branding',
      Discounts: '/settings/discounts',
      'Tax Rates': '/settings/tax-rates',
      Gallery: '/settings/gallery',
      Team: '/settings/team',
      'Booking Flow': '/settings/booking-flow',
      'Embed Widget': '/settings/embed',
    };

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(12);

    for (const [name, href] of Object.entries(expectedLinks)) {
      const link = screen.getByText(name).closest('a');
      expect(link).toHaveAttribute('href', href);
    }
  });

  it('should render descriptions for each section', () => {
    render(<SettingsPage />);

    expect(
      screen.getByText('Update your business information and branding'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Connect Stripe to accept online payments'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Configure email and push notification preferences'),
    ).toBeInTheDocument();
  });
});
