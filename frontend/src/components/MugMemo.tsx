import type { ComponentProps } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

type Props = { label: string } & ComponentProps<'textarea'>;

export function MugMemo({ label, id, ...props }: Props) {
  const fieldId = id ?? 'memo';
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor={fieldId} className="font-bold">
        {label}
      </FieldLabel>
      {/* field-sizing-fixed：shadcn の Textarea は文字に合わせて伸びるので、今までどおり高さを固定する */}
      <Textarea
        id={fieldId}
        className="field-sizing-fixed min-h-24 rounded-2xl bg-card px-3 py-2 text-base font-medium shadow-none md:text-base dark:bg-card"
        {...props}
      />
    </Field>
  );
}
