import { cn } from 'cn';

type Props = { className?: string; decorative?: boolean };

// アイコンの蚊。色は画面のトークン（頭・くちばし・ほお）に合わせる。
export function MugMark({ className, decorative = false }: Props) {
  return (
    <svg
      viewBox="0 0 80 96"
      className={cn('text-foreground', className)}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'mug' })}
    >
      <path d="M30 28c-8-14-18-16-20-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="10" cy="16" r="3.2" fill="currentColor" />
      <path d="M50 28c8-14 18-16 20-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="70" cy="16" r="3.2" fill="currentColor" />
      <circle cx="40" cy="42" r="26" className="fill-foreground" />
      <ellipse cx="30" cy="40" rx="8" ry="10" className="fill-card" />
      <ellipse cx="50" cy="40" rx="8" ry="10" className="fill-card" />
      <circle cx="32" cy="42" r="4" className="fill-foreground" />
      <circle cx="52" cy="42" r="4" className="fill-foreground" />
      <circle cx="33.5" cy="40.5" r="1.4" className="fill-card" />
      <circle cx="53.5" cy="40.5" r="1.4" className="fill-card" />
      <ellipse cx="20" cy="52" rx="4.5" ry="2.6" className="fill-accent" />
      <ellipse cx="60" cy="52" rx="4.5" ry="2.6" className="fill-accent" />
      <path d="M33 56h14L40 90Z" className="fill-primary" />
      <circle cx="40" cy="64" r="2.4" className="fill-card" />
    </svg>
  );
}
