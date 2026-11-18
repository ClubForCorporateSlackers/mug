import type { Meta, StoryObj } from '@storybook/react-vite';
import { Crosshair, LogOut } from 'lucide-react';
import { fn } from 'storybook/test';
import { MenuRow } from './MenuRow';

const meta = {
  title: 'Components/MenuRow',
  component: MenuRow,
  args: { icon: Crosshair, label: '位置情報', value: 'オン', onClick: fn() },
} satisfies Meta<typeof MenuRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Danger: Story = { args: { icon: LogOut, label: 'ログアウト', value: undefined, danger: true } };
