import type { Meta, StoryObj } from '@storybook/react-vite';
import { HerePin } from './HerePin';

const meta = {
  title: 'Components/HerePin',
  component: HerePin,
  decorators: [
    (Story) => (
      <div className="p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HerePin>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
