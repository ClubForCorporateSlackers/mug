import { Activity, Database, Droplet, Sun } from 'lucide-react';
import { FactCard } from '@/components/FactCard';
import { HeroCard } from '@/components/HeroCard';
import { NoteCard } from '@/components/NoteCard';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { TabBar } from '@/components/TabBar';
import type { TabName } from '@/lib/route';

// 文章は Figma（C5）のまま。出典をどう載せるかは docs/app-spec.md F-09（要相談）
const FACTS = [
  {
    icon: Sun,
    title: '花の受粉をてつだう',
    body: 'オスの蚊は血を吸わず、花の蜜をエサにしています。そのときに花粉を運ぶことがあります。',
  },
  {
    icon: Droplet,
    title: '生きもののごはんになる',
    body: '幼虫のボウフラは、メダカなどの魚やヤゴのたいせつなエサです。',
  },
  {
    icon: Activity,
    title: '痛くない注射針のヒント',
    body: '蚊の口のしくみを手本に、刺しても痛みの少ない針の研究が進められています。',
  },
];

type Props = { onTab: (tab: TabName) => void };

// C5 蚊のいいところ
export function AboutPage({ onTab }: Props) {
  return (
    <Screen withTabBar>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        <PageTitle title="蚊のいいところ" size="xl" />
        <HeroCard>きらわれ者の蚊にも、じつはいいところがあるんです。</HeroCard>
        {FACTS.map((fact) => (
          <FactCard key={fact.title} icon={fact.icon} title={fact.title} body={fact.body} />
        ))}
        <NoteCard icon={Database}>あなたのピンが、蚊の研究に役立つデータになるかもしれません。</NoteCard>
      </div>
      <TabBar tab="about" onChange={onTab} />
    </Screen>
  );
}
