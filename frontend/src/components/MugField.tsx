import { useId, type ComponentProps } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Props = { label: string; hint?: string } & ComponentProps<'input'>;

export function MugField({ label, hint, id, ...props }: Props) {
  const fieldId = id ?? props.name ?? label;
  const hintId = useId();
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor={fieldId} className="font-bold">
        {label}
      </FieldLabel>
      <Input
        id={fieldId}
        aria-describedby={hint ? hintId : undefined}
        className="h-12 rounded-2xl bg-card px-3 text-base font-medium shadow-none md:text-base dark:bg-card"
        {...props}
      />
      {hint ? (
        <FieldDescription id={hintId} className="text-xs font-medium">
          {hint}
        </FieldDescription>
      ) : null}
    </Field>
  );
}
