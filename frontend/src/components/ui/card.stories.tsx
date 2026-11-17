import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

const meta = {
  title: 'UI/Card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>渋谷区で刺された</CardTitle>
        <CardDescription>5分前</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">公園のベンチの近く。かゆい。</p>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline">
          わかる
        </Button>
      </CardFooter>
    </Card>
  ),
};
