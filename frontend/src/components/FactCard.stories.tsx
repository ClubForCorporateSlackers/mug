import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sun } from 'lucide-react';
import { FactCard } from './FactCard';

const meta = {
  title: 'Components/FactCard',
  component: FactCard,
  args: {
    icon: Sun,
    title: '花の受粉をてつだう',
    body: 'オスの蚊は血を吸わず、花の蜜をエサにしています。そのときに花粉を運ぶことがあります。',
  },
} satisfies Meta<typeof FactCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
