import type { Meta, StoryObj } from '@storybook/react-vite';
import { Crosshair } from 'lucide-react';
import { SwitchRow } from './SwitchRow';

const meta = {
  title: 'Components/SwitchRow',
  component: SwitchRow,
  args: { icon: Crosshair, label: '位置情報', checked: true, onChange: () => {} },
} satisfies Meta<typeof SwitchRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const On: Story = {};
export const Off: Story = { args: { checked: false, note: 'オフの間はピンを立てられません' } };
export const Disabled: Story = { args: { disabled: true } };
