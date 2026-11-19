import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapPin } from 'lucide-react';
import { fn } from 'storybook/test';
import { FilterChip } from './FilterChip';

const meta = {
  title: 'Components/FilterChip',
  component: FilterChip,
  args: { children: '2026年11月', onClick: fn() },
  decorators: [
    (Story) => (
      <div className="bg-muted p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FilterChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};
export const WithIcon: Story = { args: { icon: MapPin, children: 'すべての地域' } };
