import type { Meta, StoryObj } from '@storybook/react-vite';
import { EyeOff, Flag, Move, Pencil, Trash2 } from 'lucide-react';
import { fn } from 'storybook/test';
import { ActionMenu } from './ActionMenu';

const meta = {
  title: 'Components/ActionMenu',
  component: ActionMenu,
  args: {
    actions: [
      { id: 'report', label: 'このピンを通報する', icon: Flag, danger: true },
      { id: 'hide', label: 'このピンを非表示にする', icon: EyeOff },
    ],
    onSelect: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-muted-foreground/40 p-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActionMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Others: Story = {};
export const Mine: Story = {
  args: {
    actions: [
      { id: 'move', label: 'ピンの位置を調整する', icon: Move },
      { id: 'edit', label: 'コメントを編集する', icon: Pencil },
      { id: 'delete', label: 'このピンを削除する', icon: Trash2, danger: true },
    ],
  },
};
