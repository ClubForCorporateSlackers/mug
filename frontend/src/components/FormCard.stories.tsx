import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormCard } from './FormCard';
import { MugField } from './MugField';

const meta = {
  title: 'Components/FormCard',
  component: FormCard,
  args: { children: <MugField label="ニックネーム" placeholder="例：かゆみ太郎" /> },
} satisfies Meta<typeof FormCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};
