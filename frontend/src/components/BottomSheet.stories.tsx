import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BottomSheet } from './BottomSheet';

const meta = {
  title: 'Components/BottomSheet',
  component: BottomSheet,
  args: {
    label: 'ピンの詳細',
    onClose: fn(),
    children: <p className="py-8 text-center">シートの中身</p>,
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Long: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i}>{i + 1}行目</p>
        ))}
      </div>
    ),
  },
};
