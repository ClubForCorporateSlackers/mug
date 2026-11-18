type Props = { children: string; tone?: 'info' | 'error' };

export function AppNotice({ children, tone = 'info' }: Props) {
  return (
    <p
      className={
        tone === 'error'
          ? 'rounded-2xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary'
          : 'rounded-2xl bg-muted px-3 py-2 text-sm font-medium'
      }
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}
