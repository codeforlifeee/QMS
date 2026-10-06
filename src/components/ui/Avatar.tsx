import { cn } from '../../lib/cn';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!;
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1]!;
  const a = first[0] ?? '';
  const b = last[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

function colorFor(name: string): string {
  const colors = [
    'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length]!;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return <img src={src} alt={name} className={cn('rounded-full object-cover', sizeMap[size], className)} />;
  }
  return (
    <span
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white',
        colorFor(name),
        sizeMap[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
