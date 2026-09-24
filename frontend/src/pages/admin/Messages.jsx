import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { MagnifyingGlass } from '@phosphor-icons/react';
import Pagination from '../../components/Pagination';
import CustomSelect from '../../components/CustomSelect';

export default function AdminMessages() {
  const [filters, setFilters] = useState({ phone: '', status: '', page: 1, limit: 10 });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-messages', filters],
    queryFn: () =>
      api
        .get('/admin/messages', {
          params: {
            ...filters,
            status: filters.status || undefined,
            phone: filters.phone.trim() || undefined,
          },
        })
        .then((r) => r.data),
  });

  const statusMap = {
    SUCCESS: 'Thành công',
    FAILED: 'Thất bại',
    QUEUED: 'Đang chờ',
    SENT: 'Đã gửi',
  };

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div className="console-section-header">
        <h1 className="console-section-title">Giám sát tin nhắn</h1>
        <p className="console-section-desc">Theo dõi toàn bộ tin nhắn ZNS gửi qua hệ thống đại lý</p>
      </div>

      <div className="console-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <div className="console-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="console-search-wrapper" style={{ width: 240 }}>
            <MagnifyingGlass weight="bold" />
            <input
              type="text"
              className="console-search-input"
              placeholder="Tìm theo số điện thoại..."
              value={filters.phone}
              onChange={(e) => setFilters({ ...filters, phone: e.target.value, page: 1 })}
            />
          </div>
          <div style={{ width: 190 }}>
            <CustomSelect
              value={filters.status}
              onChange={(val) => setFilters({ ...filters, status: val, page: 1 })}
              placeholder="Tất cả trạng thái"
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'QUEUED', label: 'Đang chờ' },
                { value: 'SENT', label: 'Đã gửi' },
                { value: 'SUCCESS', label: 'Thành công' },
                { value: 'FAILED', label: 'Thất bại' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="console-card-table">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>#</th>
                    <th style={{ width: '17%' }}>Thời gian <span className="th-sort">⇅</span></th>
                    <th style={{ width: '20%' }}>Khách hàng <span className="th-sort">⇅</span></th>
                    <th style={{ width: '16%' }}>Ứng dụng liên kết <span className="th-sort">⇅</span></th>
                    <th style={{ width: '15%' }}>Số điện thoại <span className="th-sort">⇅</span></th>
                    <th style={{ width: '12%' }}>Mã Template <span className="th-sort">⇅</span></th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Trạng thái <span className="th-sort">⇅</span></th>
                    <th style={{ width: '10%' }}>Mã lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((m, idx) => (
                    <tr key={m.id}>
                      <td className="table-col-index">{(filters.page - 1) * filters.limit + idx + 1}</td>
                      <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="table-cell-bold">
                        {m.user?.companyName || m.user?.fullName}
                      </td>
                      <td style={{ fontSize: 12.5, color: '#475569' }}>
                        {m.fptAppConfig?.appName || '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {m.phone}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 500 }}>
                        {m.templateId}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {m.status === 'SUCCESS' ? (
                          <span className="badge-active-pill">Thành công</span>
                        ) : m.status === 'FAILED' ? (
                          <span className="badge badge-danger" style={{ fontSize: 11 }}>Thất bại</span>
                        ) : m.status === 'SENT' ? (
                          <span className="badge badge-primary" style={{ fontSize: 11 }}>Đã gửi</span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: 11 }}>Đang chờ</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11.5, color: '#dc2626', fontFamily: 'monospace' }}>
                        {m.errorCode || '—'}
                      </td>
                    </tr>
                  ))}
                  {!data?.data?.length && (
                    <tr>
                      <td colSpan={8} className="empty-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
                        <div className="empty-state-title" style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>
                          Chưa có tin nhắn nào
                        </div>
                        <p style={{ color: '#64748b', fontSize: 12.5, marginTop: 4 }}>
                          Không tìm thấy nhật ký tin nhắn phù hợp với bộ lọc
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={filters.page}
              totalPages={data?.totalPages || 1}
              pageSize={filters.limit}
              totalItems={data?.total}
              onPageChange={(p) => setFilters({ ...filters, page: p })}
              onPageSizeChange={(newLimit) => setFilters({ ...filters, limit: newLimit, page: 1 })}
            />
          </>
        )}
      </div>
    </div>
  );
}
