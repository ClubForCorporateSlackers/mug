import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ApiCheckCard } from './ApiCheckCard';

const meta = {
  title: 'Components/ApiCheckCard',
  component: ApiCheckCard,
  args: { result: 'まだ確認していません', onCheck: fn() },
} satisfies Meta<typeof ApiCheckCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Success: Story = { args: { result: 'つながりました：hello' } };
export const Failure: Story = { args: { result: '失敗しました：通信に失敗しました（502）' } };
