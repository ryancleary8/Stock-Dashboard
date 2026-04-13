import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const toPstLabel = (value) => {
  const text = String(value || '');
  if (!/^\d{2}:\d{2}$/.test(text)) return text;

  const [hours, minutes] = text.split(':').map(Number);
  const dt = new Date(Date.UTC(2020, 0, 2, hours, minutes));

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Los_Angeles'
  }).format(dt);
};

const PriceChart = ({ data = [] }) => {
  if (!data.length) {
    return <p className="text-sm text-slate-400">No chart data available.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
          <XAxis
            dataKey="time"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            minTickGap={18}
            axisLine={false}
            tickLine={false}
            tickFormatter={toPstLabel}
          />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem' }}
            labelStyle={{ color: '#cbd5e1' }}
            labelFormatter={(label) => `${toPstLabel(label)} PST`}
          />
          <Line type="monotone" dataKey="price" stroke="#22c55e" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
