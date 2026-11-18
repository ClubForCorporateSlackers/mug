import type { Meta, StoryObj } from '@storybook/react-vite';
import { RankHighlight } from './RankHighlight';

const meta = {
  title: 'Components/RankHighlight',
  component: RankHighlight,
  args: { eyebrow: 'いまいる杉並区は', title: '東京都で 3位', note: '先月より +24件' },
} satisfies Meta<typeof RankHighlight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Waiting: Story = {
  args: { eyebrow: 'いまいる市町村の順位', title: '準備中です', note: 'API の追加を待っています' },
};
