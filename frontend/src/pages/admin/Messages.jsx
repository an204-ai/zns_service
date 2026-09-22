import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { MagnifyingGlass } from '@phosphor-icons/react';

export default function AdminMessages() {
  const [filters, setFilters] = useState({ phone: '', status: '', page: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-messages', filters],
    queryFn: () => api.get('/admin/messages', { params: { ...filters, status: filters.status || undefined, phone: filters.phone || undefined, limit: 20 } }).then(r => r.data),
  });

  const statusMap = { SUCCESS: 'Thành công', FAILED: 'Thất bại', QUEUED: 'Đang chờ', SENT: 'Đã gửi' };
  const badgeMap = { SUCCESS: 'badge-success', FAILED: 'badge-danger', QUEUED: 'badge-warning', SENT: 'badge-primary' };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header-title">Giám sát tin nhắn</h1>
        <p className="page-header-desc">Theo dõi toàn bộ tin nhắn ZNS gửi qua hệ thống đại lý</p>
      </div>

      <div className="card">
        <div className="toolbar" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
          <div className="search-input-wrapper">
            <MagnifyingGlass />
            <input className="search-input" placeholder="Tìm theo số điện thoại..." value={filters.phone} onChange={e => setFilters({ ...filters, phone: e.target.value, page: 1 })} />
          </div>
          <select className="filter-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}>
            <option value="">Tất cả trạng thái</option>
            <option value="QUEUED">Đang chờ</option>
            <option value="SENT">Đã gửi</option>
            <option value="SUCCESS">Thành công</option>
            <option value="FAILED">Thất bại</option>
          </select>
        </div>

        {isLoading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Thời gian</th><th>Khách hàng</th><th>OA</th><th>Số điện thoại</th><th>Template</th><th>Trạng thái</th><th>Mã lỗi</th></tr></thead>
                <tbody>
                  {data?.data?.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>{new Date(m.createdAt).toLocaleString('vi-VN')}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)' }}>{m.user?.companyName || m.user?.fullName}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)' }}>{m.fptOaConfig?.oaName}</td>
                      <td style={{ fontFamily: 'monospace' }}>{m.phone}</td>
                      <td>{m.templateId}</td>
                      <td><span className={`badge ${badgeMap[m.status]}`}>{statusMap[m.status]}</span></td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>{m.errorCode || ''}</td>
                    </tr>
                  ))}
                  {!data?.data?.length && <tr><td colSpan={7} className="empty-state"><div className="empty-state-title">Chưa có tin nhắn</div></td></tr>}
                </tbody>
              </table>
            </div>
            {data?.totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">Trang {filters.page} trên {data.totalPages} ({data.total} tin nhắn)</div>
                <div className="pagination-controls">
                  <button className="pagination-btn" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Trước</button>
                  <button className="pagination-btn" disabled={filters.page >= data.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Sau</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
