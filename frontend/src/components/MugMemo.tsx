import type { ComponentProps } from 'react';

type Props = { label: string } & ComponentProps<'textarea'>;

export function MugMemo({ label, id, ...props }: Props) {
  const fieldId = id ?? 'memo';
  return (
    <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={fieldId}>
      {label}
      <textarea
        id={fieldId}
        className="min-h-24 rounded-2xl border bg-card px-3 py-2 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      />
    </label>
  );
}
