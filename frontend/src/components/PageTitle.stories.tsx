import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageTitle } from './PageTitle';

const meta = {
  title: 'Components/PageTitle',
  component: PageTitle,
  args: { title: 'アカウント作成', description: 'メールアドレスとパスワードを入力してください。' },
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const Large: Story = { args: { title: 'ランキング', description: undefined, size: 'xl' } };
