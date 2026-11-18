import type { Meta, StoryObj } from '@storybook/react-vite';
import { MascotCircle } from './MascotCircle';

const meta = { title: 'Components/MascotCircle', component: MascotCircle } satisfies Meta<typeof MascotCircle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {};
export const Medium: Story = { args: { size: 'md' } };
export const LargeDashed: Story = { args: { size: 'lg', dashed: true } };
