import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MyPinCard } from './MyPinCard';

const meta = {
  title: 'Components/MyPinCard',
  component: MyPinCard,
  args: {
    place: '東京都杉並区',
    when: '11/17 7:40',
    stamp: 'kayui',
    stampLabel: 'かゆい',
    memo: '公園のベンチに座っていたら3か所やられました。',
    odaiji: 12,
    onClick: fn(),
  },
} satisfies Meta<typeof MyPinCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const NoMemo: Story = { args: { stamp: null, stampLabel: 'スタンプなし', memo: '', odaiji: 0 } };
