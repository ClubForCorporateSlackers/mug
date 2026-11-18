import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SearchField } from './SearchField';

const meta = {
  title: 'Components/SearchField',
  component: SearchField,
  args: { value: '', onChange: fn(), placeholder: '都道府県を検索' },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Typed: Story = { args: { value: '東京' } };
