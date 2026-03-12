import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/tabs.js';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Account</TabsTrigger>
        <TabsTrigger value="tab2">Password</TabsTrigger>
        <TabsTrigger value="tab3">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="p-4">
        <p className="text-sm">Account settings content.</p>
      </TabsContent>
      <TabsContent value="tab2" className="p-4">
        <p className="text-sm">Password settings content.</p>
      </TabsContent>
      <TabsContent value="tab3" className="p-4">
        <p className="text-sm">General settings content.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const Line: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList variant="line">
        <TabsTrigger value="tab1">Overview</TabsTrigger>
        <TabsTrigger value="tab2">Analytics</TabsTrigger>
        <TabsTrigger value="tab3">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="p-4">
        <p className="text-sm">Overview content.</p>
      </TabsContent>
      <TabsContent value="tab2" className="p-4">
        <p className="text-sm">Analytics content.</p>
      </TabsContent>
      <TabsContent value="tab3" className="p-4">
        <p className="text-sm">Reports content.</p>
      </TabsContent>
    </Tabs>
  ),
};
