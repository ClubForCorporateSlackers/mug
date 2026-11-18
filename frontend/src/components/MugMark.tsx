import { cn } from 'cn';

type Props = { className?: string; decorative?: boolean };

// アイコンの蚊。口はピンの形で、いちばん下の先が刺した場所を指す。
export function MugMark({ className, decorative = false }: Props) {
  return (
    <svg
      viewBox="80 8 690 925"
      className={cn('text-mug-body', className)}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'mug' })}
    >
      <path
        d="M300 110C270 62 240 40 205 38M524 110C554 62 584 40 618 38"
        fill="none"
        stroke="currentColor"
        strokeWidth="26"
        strokeLinecap="round"
      />
      <circle cx="205" cy="38" r="26" fill="currentColor" />
      <circle cx="618" cy="38" r="26" fill="currentColor" />
      <circle cx="412" cy="405" r="325" fill="currentColor" />
      <circle cx="290" cy="355" r="106" className="fill-card" />
      <circle cx="535" cy="355" r="106" className="fill-card" />
      <circle cx="300" cy="365" r="65" className="fill-mug-pupil" />
      <circle cx="525" cy="365" r="65" className="fill-mug-pupil" />
      <circle cx="322" cy="340" r="22" className="fill-card" />
      <circle cx="547" cy="340" r="22" className="fill-card" />
      <circle cx="280" cy="392" r="10" className="fill-card" />
      <circle cx="505" cy="392" r="10" className="fill-card" />
      <ellipse cx="180" cy="497" rx="50" ry="31" className="fill-mug-cheek" />
      <ellipse cx="645" cy="497" rx="50" ry="31" className="fill-mug-cheek" />
      <path
        d="M412 925L330 630A85 85 0 1 1 494 630Z"
        className="fill-primary stroke-secondary"
        strokeWidth="14"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
      <circle cx="412" cy="607" r="31" className="fill-card" />
    </svg>
  );
}
