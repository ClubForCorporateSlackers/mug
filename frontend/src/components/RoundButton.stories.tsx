import type { Meta, StoryObj } from '@storybook/react-vite';
import { Navigation, User } from 'lucide-react';
import { fn } from 'storybook/test';
import { RoundButton } from './RoundButton';

const meta = {
  title: 'Components/RoundButton',
  component: RoundButton,
  args: { icon: Navigation, label: '現在地へ', onClick: fn() },
} satisfies Meta<typeof RoundButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Location: Story = {};
export const Profile: Story = { args: { icon: User, label: 'マイページ', size: 'lg' } };
export const Disabled: Story = { args: { disabled: true } };
