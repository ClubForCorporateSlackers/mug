type Props = { title: string; description?: string; size?: 'lg' | 'xl' };

// 画面の大きな見出し（Figma の Title 1／Large Title）と説明文
export function PageTitle({ title, description, size = 'lg' }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className={size === 'xl' ? 'text-[34px] leading-[41px] font-bold' : 'text-[28px] leading-[38px] font-bold'}>
        {title}
      </h1>
      {description ? (
        <p className="text-base leading-6 font-medium tracking-[0.01em] text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
