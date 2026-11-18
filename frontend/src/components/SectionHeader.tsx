type Props = { title: string; actionLabel?: string; onAction?: () => void };

// 「自分のピン」と「すべて見る」のような小見出し
export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[17px] leading-6 font-bold">{title}</h2>
      {actionLabel && onAction ? (
        <button type="button" className="text-[15px] font-bold text-primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
