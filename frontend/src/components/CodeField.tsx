import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type Props = { value: string; onChange: (value: string) => void; label: string };

// 確認コード（6桁の数字）の入力欄。1文字ずつ箱に入る
export function CodeField({ value, onChange, label }: Props) {
  return (
    <InputOTP
      maxLength={6}
      inputMode="numeric"
      pattern="^[0-9]*$"
      autoComplete="one-time-code"
      aria-label={label}
      value={value}
      onChange={onChange}
      containerClassName="w-full"
    >
      <InputOTPGroup className="grid w-full grid-cols-6 gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className="h-[60px] w-full rounded-[14px] border-0 bg-muted text-[28px] font-bold shadow-none first:rounded-[14px] first:border-0 last:rounded-[14px] data-[active=true]:border-2 data-[active=true]:border-ring data-[active=true]:bg-card data-[active=true]:ring-0"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
