import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeroCard } from './HeroCard';

const meta = {
  title: 'Components/HeroCard',
  component: HeroCard,
  args: { children: 'きらわれ者の蚊にも、じつはいいところがあるんです。' },
} satisfies Meta<typeof HeroCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
