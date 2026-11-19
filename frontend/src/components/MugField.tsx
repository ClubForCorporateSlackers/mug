import { useId, useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Props = { label: string; hint?: string } & ComponentProps<'input'>;

export function MugField({ label, hint, id, type, ...props }: Props) {
  const fieldId = id ?? props.name ?? label;
  const hintId = useId();
  // type="password" のときだけ、右端に「表示／隠す」のボタンを出す
  const isPassword = type === 'password';
  const [shown, setShown] = useState(false);
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor={fieldId} className="font-bold">
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          id={fieldId}
          type={isPassword && shown ? 'text' : type}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            'h-12 rounded-2xl bg-card px-3 text-base font-medium shadow-none md:text-base dark:bg-card',
            isPassword && 'pr-12',
          )}
          {...props}
        />
        {isPassword ? (
          <Button
            type="button"
            variant="ghost"
            className="absolute top-1/2 right-0.5 size-11 -translate-y-1/2 rounded-xl p-0 text-muted-foreground"
            aria-label={shown ? 'パスワードを隠す' : 'パスワードを表示'}
            aria-pressed={shown}
            aria-controls={fieldId}
            onClick={() => setShown((value) => !value)}
            disabled={props.disabled}
          >
            {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </Button>
        ) : null}
      </div>
      {hint ? (
        <FieldDescription id={hintId} className="text-xs font-medium">
          {hint}
        </FieldDescription>
      ) : null}
    </Field>
  );
}
