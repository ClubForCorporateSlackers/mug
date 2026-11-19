import type { ComponentProps } from 'react';

type Props = { label: string; hint?: string } & ComponentProps<'input'>;

export function MugField({ label, hint, id, ...props }: Props) {
  const fieldId = id ?? props.name ?? label;
  return (
    <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={fieldId}>
      {label}
      <input
        id={fieldId}
        className="h-12 rounded-2xl border bg-card px-3 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        {...props}
      />
      {hint ? <span className="text-xs font-medium text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
