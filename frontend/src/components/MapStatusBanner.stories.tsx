import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapStatusBanner } from './MapStatusBanner';

const meta = {
  title: 'Components/MapStatusBanner',
  component: MapStatusBanner,
  args: { message: 'ピンを見るには、地図を拡大してください' },
} satisfies Meta<typeof MapStatusBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TooWide: Story = {};
export const Loading: Story = { args: { message: '読み込み中…' } };
export const Error: Story = {
  args: { message: 'ピンを読み込めませんでした：通信に失敗しました（502）', tone: 'error' },
};
export const Hidden: Story = { args: { message: null } };
