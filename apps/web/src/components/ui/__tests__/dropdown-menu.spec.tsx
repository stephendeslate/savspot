import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../dropdown-menu';

describe('DropdownMenu', () => {
  const renderMenu = () =>
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuItem>Item 2</DropdownMenuItem>
          <DropdownMenuItem>Item 3</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

  it('should render the trigger', () => {
    renderMenu();
    expect(screen.getByText('Open Menu')).toBeInTheDocument();
  });

  it('should not show menu content initially', () => {
    renderMenu();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('should open menu on click', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('should show menu items when open', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByText('Open Menu'));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should have aria-expanded on trigger', async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByText('Open Menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
