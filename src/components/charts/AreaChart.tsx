import { Area, AreaChart as RAreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

export interface AreaPoint { label: string; value: number }

export function RevenueArea({ data, color = '#FF5B04' }: { data: AreaPoint[]; color?: string }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted-ink)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-ink)' }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#revFill)" isAnimationActive={false} />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
