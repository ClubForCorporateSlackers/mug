import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { NavBar } from './NavBar';
import { TextAction } from './TextAction';

const meta = {
  title: 'Components/NavBar',
  component: NavBar,
  args: { backLabel: '戻る', onBack: fn() },
} satisfies Meta<typeof NavBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Back: Story = {};
export const WithTitle: Story = { args: { backLabel: 'マイページ', title: '自分のピン' } };
export const Modal: Story = {
  args: {
    title: 'プロフィール編集',
    leading: <TextAction onClick={fn()}>キャンセル</TextAction>,
    trailing: (
      <TextAction strong onClick={fn()}>
        保存
      </TextAction>
    ),
  },
};
