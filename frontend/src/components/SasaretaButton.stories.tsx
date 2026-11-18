import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SasaretaButton } from './SasaretaButton';

const meta = {
  title: 'Components/SasaretaButton',
  component: SasaretaButton,
  args: { onClick: fn() },
} satisfies Meta<typeof SasaretaButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
export const LocationOff: Story = { args: { disabled: true, label: '位置情報がオフです' } };
