import type { Meta, StoryObj } from '@storybook/react-vite';
import { Navigation, UserRound } from 'lucide-react';
import { fn } from 'storybook/test';
import { RoundIconButton } from './RoundIconButton';

const meta = {
  title: 'Components/RoundIconButton',
  component: RoundIconButton,
  args: { icon: UserRound, label: 'マイページ', onClick: fn() },
  decorators: [
    (Story) => (
      <div className="bg-muted p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RoundIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MyPage: Story = {};
export const Locate: Story = { args: { icon: Navigation, label: '現在地へ' } };
export const Disabled: Story = { args: { disabled: true } };
