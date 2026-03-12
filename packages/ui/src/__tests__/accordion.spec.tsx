import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/accordion.js';

describe('Accordion', () => {
  const renderAccordion = (collapsible = false) =>
    render(
      <Accordion type="single" collapsible={collapsible}>
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Section 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

  it('should render accordion items', () => {
    renderAccordion();

    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
  });

  it('should not show content by default', () => {
    renderAccordion();

    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('should expand content on click', async () => {
    const user = userEvent.setup();
    renderAccordion();

    await user.click(screen.getByText('Section 1'));
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('should collapse content on second click when collapsible', async () => {
    const user = userEvent.setup();
    renderAccordion(true);

    await user.click(screen.getByText('Section 1'));
    expect(screen.getByText('Content 1')).toBeInTheDocument();

    await user.click(screen.getByText('Section 1'));
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('should close other items in single mode', async () => {
    const user = userEvent.setup();
    renderAccordion();

    await user.click(screen.getByText('Section 1'));
    expect(screen.getByText('Content 1')).toBeInTheDocument();

    await user.click(screen.getByText('Section 2'));
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });
});
