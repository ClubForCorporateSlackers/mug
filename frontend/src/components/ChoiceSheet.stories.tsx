import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChoiceSheet } from './ChoiceSheet';

const meta = {
  title: 'Components/ChoiceSheet',
  component: ChoiceSheet,
  args: {
    title: '期間',
    options: [
      { value: '2026-11', label: '2026年11月（今月）' },
      { value: '2026-10', label: '2026年10月' },
      { value: '2026-09', label: '2026年9月' },
    ],
    selected: '2026-11',
    onChoose: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof ChoiceSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};
export const Prefecture: Story = {
  args: {
    title: '地域',
    options: [
      { value: 'すべての地域', label: 'すべての地域' },
      { value: '東京都', label: '東京都' },
      { value: '大阪府', label: '大阪府' },
    ],
    selected: 'すべての地域',
    note: 'ランキングは市区町村ごとに集計しています。',
  },
};
