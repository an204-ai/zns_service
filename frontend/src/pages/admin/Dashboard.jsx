import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Users, EnvelopeSimple, CheckCircle, XCircle } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="loading-overlay"><div className="spinner" /></div>;

  const stats = data || {};

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header-title">Tổng quan hệ thống</h1>
        <p className="page-header-desc">Thống kê hoạt động toàn bộ hệ thống đại lý ZNS</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon primary"><Users size={24} weight="duotone" /></div>
          <div className="stat-card-value">{stats.activeCustomers || 0}</div>
          <div className="stat-card-label">Khách hàng hoạt động</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success"><EnvelopeSimple size={24} weight="duotone" /></div>
          <div className="stat-card-value">{stats.todayStats?.total || 0}</div>
          <div className="stat-card-label">Tin nhắn hôm nay</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon success"><CheckCircle size={24} weight="duotone" /></div>
          <div className="stat-card-value">{stats.todayStats?.success || 0}</div>
          <div className="stat-card-label">Gửi thành công</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon danger"><XCircle size={24} weight="duotone" /></div>
          <div className="stat-card-value">{stats.todayStats?.failed || 0}</div>
          <div className="stat-card-label">Gửi thất bại</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        {/* Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title">Biểu đồ tin nhắn 30 ngày</div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.dailyStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="success" fill="var(--color-success)" name="Thành công" radius={[3, 3, 0, 0]} />
                <Bar dataKey="failed" fill="var(--color-danger)" name="Thất bại" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent messages */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title">Tin nhắn gần đây</div>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentMessages || []).slice(0, 8).map(msg => (
                  <tr key={msg.id}>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{msg.user?.companyName || msg.user?.fullName}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{msg.phone}</td>
                    <td>
                      <span className={`badge badge-${msg.status === 'SUCCESS' ? 'success' : msg.status === 'FAILED' ? 'danger' : msg.status === 'QUEUED' ? 'warning' : 'primary'}`}>
                        {msg.status === 'SUCCESS' ? 'Thành công' : msg.status === 'FAILED' ? 'Thất bại' : msg.status === 'QUEUED' ? 'Đang chờ' : 'Đã gửi'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
