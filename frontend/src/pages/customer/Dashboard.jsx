import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  TrendUp,
  CalendarBlank,
  Sparkle,
  CaretRight,
  X,
  ChatCircleText,
  PhoneCall
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
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
  const quota = stats.quota || {
    used: 0,
    total: 60000,
    available: 60000,
    percent: 0,
  };
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
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius)',
            padding: '10px 14px',
            boxShadow: 'var(--shadow-md)',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Ngày: {label}
          </div>
          {payload.map((entry, index) => (
            <div
              key={`item-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: entry.color,
                fontWeight: 600,
                marginTop: '3px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  background: entry.color,
                  display: 'inline-block',
                }}
              />
              <span>{entry.name}:</span>
              <span>{entry.value?.toLocaleString('en-US')}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Page Header with concise title and short description */}
      <div className="page-header">
        <h1 className="page-header-title">Tổng quan</h1>
        <p className="page-header-desc">Theo dõi số lượng giao dịch và hạn mức gửi tin ZNS</p>
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

      {/* Row 2: Total Quota card */}
      <div className="overview-quota-card">
        <div className="overview-quota-header">
          <span className="overview-quota-title">Total Quota</span>
          <span className="overview-quota-percent">{quota.percent}% đã dùng</span>
        </div>
        <div className="overview-quota-track">
          <div
            className="overview-quota-fill"
            style={{ width: `${Math.min(100, Math.max(0, quota.percent))}%` }}
          />
        </div>
        <div className="overview-quota-footer">
          <div className="overview-quota-info">
            Đã dùng {quota.used.toLocaleString('en-US')} · Tổng {quota.total.toLocaleString('en-US')} · Khả dụng {quota.available.toLocaleString('en-US')}
          </div>
          <div className="overview-quota-actions">
            <button
              type="button"
              className="overview-quota-link"
              onClick={() => navigate('/customer/oa-info')}
            >
              <CaretRight size={13} weight="bold" /> Chi tiết
            </button>
            <button
              type="button"
              className="overview-quota-upgrade-btn"
              onClick={() => setShowUpgradeModal(true)}
            >
              <Sparkle size={14} weight="fill" /> Nâng cấp
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Date range pill */}
      <div className="overview-chart-filter-bar">
        <div className="overview-date-pill">
          <CalendarBlank size={16} weight="duotone" color="var(--color-gray-500)" />
          <span>{dateRangeLabel}</span>
        </div>
      </div>

      {/* Row 4: Transactions & Requests Chart */}
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

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Nâng cấp hạn mức ZNS</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowUpgradeModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Để nâng cấp hạn mức gửi tin ZNS hoặc mở rộng gói dịch vụ doanh nghiệp, quý khách vui lòng liên hệ quản trị viên:
              </p>
              <div
                style={{
                  background: 'var(--color-gray-50)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  padding: 'var(--spacing-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)' }}>
                  <PhoneCall size={18} color="#2563eb" />
                  <span>Hotline hỗ trợ: <strong>1900 6600</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)' }}>
                  <ChatCircleText size={18} color="#10b981" />
                  <span>Hỗ trợ kỹ thuật: <strong>support@znsportal.vn</strong></span>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowUpgradeModal(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
