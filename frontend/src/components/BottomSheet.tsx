import type { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';

type Props = {
  label: string;
  onClose: () => void;
  children: ReactNode;
};

// 画面の下から出るシート（shadcn/ui の Drawer）。
// 下に引っ張る・外側を押す・Esc キーのどれでも閉じる。開いているあいだだけ表示する（閉じたら親が消す）
export function BottomSheet({ label, onClose, children }: Props) {
  return (
    <Drawer open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DrawerContent
        aria-describedby={undefined}
        className="mx-auto max-h-[88svh] max-w-[430px] rounded-t-3xl border-0 bg-card data-[vaul-drawer-direction=bottom]:max-h-[88svh] data-[vaul-drawer-direction=bottom]:rounded-t-3xl data-[vaul-drawer-direction=bottom]:border-t-0"
      >
        <DrawerTitle className="sr-only">{label}</DrawerTitle>
        <div className="flex flex-col overflow-y-auto px-4 pt-3 pb-safe-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
