import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type Props = {
  label: string;
  value: string;
  length?: number;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
};

// 確認コード（数字だけ）を1文字ずつの枠で入力する欄
export function CodeField({ label, value, length = 6, name = 'code', disabled, invalid, onChange }: Props) {
  const fieldId = `${name}-field`;
  return (
    <Field className="gap-1" data-invalid={invalid}>
      <FieldLabel htmlFor={fieldId} className="font-bold">
        {label}
      </FieldLabel>
      <InputOTP
        id={fieldId}
        name={name}
        maxLength={length}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        disabled={disabled}
        aria-invalid={invalid}
        value={value}
        onChange={onChange}
      >
        <InputOTPGroup className="w-full">
          {Array.from({ length }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              aria-invalid={invalid}
              className="h-12 flex-1 bg-card text-lg font-bold shadow-none first:rounded-l-2xl last:rounded-r-2xl dark:bg-card"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </Field>
  );
}
