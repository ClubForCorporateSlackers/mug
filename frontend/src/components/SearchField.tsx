import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Props = { value: string; onChange: (value: string) => void; placeholder: string };

// C4 の「都道府県を検索」
export function SearchField({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-placeholder" aria-hidden />
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border-0 bg-muted pl-10 text-[17px] shadow-none placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-ring md:text-[17px]"
      />
    </div>
  );
}
