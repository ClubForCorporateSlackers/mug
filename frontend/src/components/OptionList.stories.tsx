import type { Meta, StoryObj } from '@storybook/react-vite';
import { Navigation } from 'lucide-react';
import { fn } from 'storybook/test';
import { OptionList } from './OptionList';

const meta = {
  title: 'Components/OptionList',
  component: OptionList,
  args: {
    label: '期間',
    options: [
      { value: '2026-11', label: '2026年11月（今月）' },
      { value: '2026-10', label: '2026年10月' },
      { value: '2026-09', label: '2026年9月' },
    ],
    value: '2026-11',
    onSelect: fn(),
  },
} satisfies Meta<typeof OptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Months: Story = {};
export const WithIcon: Story = {
  args: {
    label: '都道府県',
    options: [
      { value: 'すべて', label: 'すべて', icon: Navigation },
      { value: '北海道', label: '北海道' },
      { value: '東京都', label: '東京都' },
    ],
    value: '東京都',
  },
};
