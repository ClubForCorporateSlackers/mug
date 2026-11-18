import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProfileCard } from './ProfileCard';

const meta = {
  title: 'Components/ProfileCard',
  component: ProfileCard,
  args: { nickname: 'かゆみ太郎', bloodLabel: 'O型', email: 'kayumi@example.com' },
} satisfies Meta<typeof ProfileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const NoBlood: Story = { args: { bloodLabel: undefined } };
