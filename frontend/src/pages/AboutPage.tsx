import { BottomNav } from '@/components/BottomNav';
import { MugMark } from '@/components/MugMark';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { TabName } from '@/lib/route';

const FACTS = [
  { title: '刺すのはメスだけ', body: 'オスは花の蜜を吸います。血は吸いません。' },
  { title: '受粉を手伝う', body: 'オスが蜜を吸うときに、花粉を運ぶことがあります。' },
  { title: 'だれかの食事になる', body: '幼虫も成虫も、鳥や魚やコウモリの食べ物です。' },
  { title: '人を刺さない種類が多い', body: '日本にいる蚊の多くは、人より鳥やほかの動物を刺します。' },
];

type Props = { tab: TabName; onTab: (tab: TabName) => void };

export function AboutPage({ tab, onTab }: Props) {
  return (
    <main className="flex min-h-svh flex-col">
      <ScreenHeader title="蚊のいいところ" />
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        <div className="flex items-center gap-3">
          <MugMark className="size-16 shrink-0" />
          <p className="font-bold">刺された場所は、地図のほうで見てください。</p>
        </div>
        {FACTS.map((fact) => (
          <section key={fact.title} className="rounded-2xl bg-card px-3 py-3">
            <h2 className="font-bold">{fact.title}</h2>
            <p className="mt-1 text-sm">{fact.body}</p>
          </section>
        ))}
      </div>
      <BottomNav tab={tab} onChange={onTab} />
    </main>
  );
}
