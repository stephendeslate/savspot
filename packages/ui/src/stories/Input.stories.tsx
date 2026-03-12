import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/input.js';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Enter text...' },
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled', disabled: true },
};

export const WithValue: Story = {
  args: { defaultValue: 'Hello World' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Password' },
};
