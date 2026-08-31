/**
 * The inline SVGs this view uses. Each was written out in full at every use
 * site — the back arrow three times, the pencil twice, the info circle twice at
 * two different sizes — which is a large part of why the original file ran to
 * 798 lines. `currentColor` throughout, so each inherits the colour of the
 * control it sits in.
 */
type IconProps = { size?: number; className?: string; strokeWidth?: number };

function Icon({
  size = 12,
  className,
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    >
      {children}
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </Icon>
  );
}

export function ChevronDownIcon({ size = 10, strokeWidth = 2.5, ...rest }: IconProps) {
  return (
    <Icon size={size} strokeWidth={strokeWidth} {...rest}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  );
}

/**
 * Doubles as the error card's marker. The two were identical paths at different
 * sizes, so there is one icon and the caller picks the size.
 */
export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Icon>
  );
}

export function ArrowLeftIcon({ size = 16, ...rest }: IconProps) {
  return (
    <Icon size={size} {...rest}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Icon>
  );
}

export function SaveIcon({ size = 14, ...rest }: IconProps) {
  return (
    <Icon size={size} {...rest}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </Icon>
  );
}

export function CheckIcon({ strokeWidth = 2.5, ...rest }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...rest}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}

export function CloseIcon({ strokeWidth = 2.5, ...rest }: IconProps) {
  return (
    <Icon strokeWidth={strokeWidth} {...rest}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  );
}
