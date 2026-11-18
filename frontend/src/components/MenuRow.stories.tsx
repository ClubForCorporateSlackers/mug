import type { Meta, StoryObj } from '@storybook/react-vite';
import { Crosshair, Pencil } from 'lucide-react';
import { fn } from 'storybook/test';
import { MenuRow } from './MenuRow';

const meta = {
  title: 'Components/MenuRow',
  component: MenuRow,
  args: { icon: Pencil, label: 'プロフィールを編集', onClick: fn() },
} satisfies Meta<typeof MenuRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { icon: Crosshair, label: '位置情報', value: 'オン' } };
