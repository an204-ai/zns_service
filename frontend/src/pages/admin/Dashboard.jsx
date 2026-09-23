import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Users,
  EnvelopeSimple,
  CheckCircle,
  XCircle,
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
  ResponsiveContainer,
} from 'recharts';
import { useSocket } from '../../hooks/useSocket';

export default function AdminDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
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

  // Format 30 days chart data like customer overview
  const chartData = (stats.dailyStats || []).map((day) => {
    const parts = day.date.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : day.date;
    return {
      date: formattedDate,
      rawDate: day.date,
      transactions: day.success || 0,
      requests: day.total || 0,
    };
  });

  // Calculate formatted date range for 30-day filter pill
  const now = new Date();
  const pastDate = new Date();
  pastDate.setDate(now.getDate() - 29);
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
    <div>
      <div className="page-header">
        <h1 className="page-header-title">Tổng quan hệ thống</h1>
        <p className="page-header-desc">Thống kê hoạt động toàn bộ hệ thống đại lý ZNS</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon primary">
            <Users size={24} weight="duotone" />
          </div>
          <div className="stat-card-value">{stats.activeCustomers || 0}</div>
          <div className="stat-card-label">Khách hàng hoạt động</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success">
            <EnvelopeSimple size={24} weight="duotone" />
          </div>
          <div className="stat-card-value">{stats.todayStats?.total || 0}</div>
          <div className="stat-card-label">Tin nhắn hôm nay</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success">
            <CheckCircle size={24} weight="duotone" />
          </div>
          <div className="stat-card-value">{stats.todayStats?.success || 0}</div>
          <div className="stat-card-label">Gửi thành công</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon danger">
            <XCircle size={24} weight="duotone" />
          </div>
          <div className="stat-card-value">{stats.todayStats?.failed || 0}</div>
          <div className="stat-card-label">Gửi thất bại</div>
        </div>
      </div>

      {/* Date range pill */}
      <div className="overview-chart-filter-bar" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className="overview-date-pill">
          <CalendarBlank size={16} weight="duotone" color="var(--color-gray-500)" />
          <span>{dateRangeLabel}</span>
        </div>
      </div>

      {/* Full width Chart - Styled identically to Customer Overview */}
      <div className="overview-chart-card" style={{ width: '100%' }}>
        <div className="overview-chart-title">Transactions & Requests (30 ngày)</div>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
            >
              <defs>
                <linearGradient id="adminReqGradient" x1="0" y1="0" x2="0" y2="1">
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
                domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.25) : 10)]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dx={8}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.25) : 20)]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="transactions"
                name="Transactions"
                fill="#2563eb"
                barSize={16}
                radius={[4, 4, 0, 0]}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="requests"
                name="Requests"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#adminReqGradient)"
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
