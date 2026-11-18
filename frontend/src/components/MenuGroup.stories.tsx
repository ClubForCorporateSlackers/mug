import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Pencil } from 'lucide-react';
import { fn } from 'storybook/test';
import { MenuGroup } from './MenuGroup';
import { MenuRow } from './MenuRow';

const meta = {
  title: 'Components/MenuGroup',
  component: MenuGroup,
  args: {
    label: '設定',
    children: (
      <>
        <MenuRow icon={Pencil} label="プロフィールを編集" onClick={fn()} />
        <MenuRow icon={FileText} label="利用規約" onClick={fn()} />
      </>
    ),
  },
} satisfies Meta<typeof MenuGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
