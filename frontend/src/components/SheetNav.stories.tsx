import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SheetNav } from './SheetNav';

const meta = {
  title: 'Components/SheetNav',
  component: SheetNav,
  args: { title: '絞り込み', leadingLabel: '閉じる', onLeading: fn(), trailingLabel: '完了', onTrailing: fn() },
} satisfies Meta<typeof SheetNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filter: Story = {};
export const Back: Story = {
  args: { title: '都道府県', leadingLabel: '絞り込み', leadingBack: true, trailingLabel: undefined },
};
