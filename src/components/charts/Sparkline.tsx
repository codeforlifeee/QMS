import { memo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

export const Sparkline = memo(function Sparkline({
  data,
  color = 'var(--color-brand-orange)',
}: {
  data: number[];
  color?: string;
}) {
  const rows = data.map((v, i) => ({ i, v }));
  const id = `sg-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
});
