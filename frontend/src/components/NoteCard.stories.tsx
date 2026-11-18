import type { Meta, StoryObj } from '@storybook/react-vite';
import { Database } from 'lucide-react';
import { NoteCard } from './NoteCard';

const meta = {
  title: 'Components/NoteCard',
  component: NoteCard,
  args: { icon: Database, children: 'あなたのピンが、蚊の研究に役立つデータになるかもしれません。' },
} satisfies Meta<typeof NoteCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
