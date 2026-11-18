import { useId, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = { label: string; hint?: string; error?: string } & ComponentProps<'input'>;

// Figma の Text Field。高さ50。ラベルは常に出す。エラーは枠と文言の両方で伝える
export function MugField({ label, hint, error, id, className, ...props }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const noteId = `${fieldId}-note`;
  const note = error || hint;
  return (
    <div className="flex w-full flex-col gap-2">
      <label className="text-[15px] leading-[22px] font-bold tracking-[0.01em]" htmlFor={fieldId}>
        {label}
      </label>
      <Input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cn(
          'h-[50px] rounded-[14px] border-0 bg-muted px-4 text-[17px] leading-[26px] font-medium tracking-[0.01em] shadow-none placeholder:text-placeholder md:text-[17px]',
          'focus-visible:border-2 focus-visible:border-ring focus-visible:ring-0',
          'aria-invalid:border aria-invalid:border-primary aria-invalid:bg-accent/40 aria-invalid:ring-0',
          'disabled:opacity-100',
          className,
        )}
        {...props}
      />
      {note ? (
        <p
          id={noteId}
          className={cn(
            'text-[13px] leading-[18px] font-medium tracking-[0.01em]',
            error ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
