type Props = { value: string; label: string };

// D1 の数字のタイル（「5 今月の刺され」など）。分からない数は「—」
export function StatTile({ value, label }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-[20px] bg-card px-2 py-4 text-center">
      <p className="text-[28px] leading-8 font-bold">{value}</p>
      <p className="text-xs leading-4 font-medium whitespace-pre-line text-muted-foreground">{label}</p>
    </div>
  );
}
