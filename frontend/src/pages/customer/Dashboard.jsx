import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  TrendUp,
  CalendarBlank,
} from '@phosphor-icons/react';
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useSocket } from '../../hooks/useSocket';

export default function CustomerDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: () => api.get('/customer/dashboard').then(r => r.data.data),
    refetchInterval: 30000,
  });

  useSocket((event) => {
    if (event === 'message:status' || event === 'message:new') {
      refetch();
    }
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const stats = data || {};
  const monthStats = stats.monthStats || { transactions: 0, requests: 0 };
  const todayStats = stats.todayStats || { transactions: 0, requests: 0 };
  const chartData = stats.chartData || [];

  // Calculate formatted date range for 8-day filter pill
  const now = new Date();
  const pastDate = new Date();
  pastDate.setDate(now.getDate() - 7);
  const formatDateRange = (d) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  };
  const dateRangeLabel = `${formatDateRange(pastDate)} - ${formatDateRange(now)}`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '10px 14px',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-md)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {label}
          </div>
          {payload.map((entry, index) => (
            <div
              key={`item-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: entry.name === 'Transactions' ? '#2563eb' : '#8b5cf6',
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: entry.name === 'Transactions' ? '#2563eb' : '#8b5cf6',
                }}
              />
              <span>{entry.name}:</span>
              <span style={{ fontWeight: 700 }}>
                {entry.value.toLocaleString('en-US')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="overview-page">
      {/* Page Header with concise title and short description */}
      <div className="page-header">
        <h1 className="page-header-title">Tổng quan</h1>
        <p className="page-header-desc">Theo dõi số lượng giao dịch và hiệu quả gửi tin ZNS</p>
      </div>

      {/* Row 1: Two metric cards */}
      <div className="customer-metrics-grid">
        {/* Transactions tháng này */}
        <div className="overview-metric-card">
          <div className="overview-metric-header">
            <span className="overview-metric-title">Transactions tháng này</span>
            <TrendUp size={18} weight="bold" className="overview-metric-icon" />
          </div>
          <div className="overview-metric-body">
            <div className="overview-metric-col">
              <span className="overview-metric-value-primary">
                {monthStats.transactions.toLocaleString('en-US')}
              </span>
              <span className="overview-metric-label">TRANSACTIONS</span>
            </div>
            <div className="overview-metric-col" style={{ alignItems: 'flex-end' }}>
              <span className="overview-metric-value-secondary">
                {monthStats.requests.toLocaleString('en-US')}
              </span>
              <span className="overview-metric-label">REQUESTS</span>
            </div>
          </div>
        </div>

        {/* Transactions hôm nay */}
        <div className="overview-metric-card">
          <div className="overview-metric-header">
            <span className="overview-metric-title">Transactions hôm nay</span>
            <TrendUp size={18} weight="bold" className="overview-metric-icon" />
          </div>
          <div className="overview-metric-body">
            <div className="overview-metric-col">
              <span className="overview-metric-value-primary">
                {todayStats.transactions.toLocaleString('en-US')}
              </span>
              <span className="overview-metric-label">TRANSACTIONS</span>
            </div>
            <div className="overview-metric-col" style={{ alignItems: 'flex-end' }}>
              <span className="overview-metric-value-secondary">
                {todayStats.requests.toLocaleString('en-US')}
              </span>
              <span className="overview-metric-label">REQUESTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Date range pill */}
      <div className="overview-chart-filter-bar">
        <div className="overview-date-pill">
          <CalendarBlank size={16} weight="duotone" color="var(--color-gray-500)" />
          <span>{dateRangeLabel}</span>
        </div>
      </div>

      {/* Row 3: Transactions & Requests Chart */}
      <div className="overview-chart-card">
        <div className="overview-chart-title">Transactions & Requests</div>
        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
            >
              <defs>
                <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: '#f1f5f9' }}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dy={8}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dx={-8}
                domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.25) : 600)]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dx={8}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.25) : 1000)]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="transactions"
                name="Transactions"
                fill="#2563eb"
                barSize={24}
                radius={[4, 4, 0, 0]}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#reqGradient)"
                dot={false}
                activeDot={{ r: 4, stroke: '#8b5cf6', strokeWidth: 2, fill: '#ffffff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
