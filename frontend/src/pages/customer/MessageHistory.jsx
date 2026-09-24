import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  MagnifyingGlass,
  Star,
  Eye,
  ChatText,
  ListDashes
} from '@phosphor-icons/react';
import { useSocket } from '../../hooks/useSocket';
import Pagination from '../../components/Pagination';
import CustomSelect from '../../components/CustomSelect';
import MessageDetailModal from '../../components/MessageDetailModal';

export default function CustomerMessageHistory() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'ratings'
  const [filters, setFilters] = useState({ phone: '', status: '', rating: '', page: 1, limit: 10 });
  const [selectedMessage, setSelectedMessage] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-messages', filters, activeTab],
    queryFn: () =>
      api
        .get('/customer/messages', {
          params: {
            page: filters.page,
            limit: filters.limit,
            status: activeTab === 'all' && filters.status ? filters.status : undefined,
            phone: filters.phone.trim() || undefined,
            hasRating: activeTab === 'ratings' ? true : undefined,
            rating: activeTab === 'ratings' && filters.rating ? filters.rating : undefined,
          },
        })
        .then((r) => r.data),
  });

  useSocket((event) => {
    if (event === 'message:status' || event === 'message:rating') {
      refetch();
    }
  });

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="console-section-header">
        <h1 className="console-section-title">Lịch sử gửi tin</h1>
        <p className="console-section-desc">Tra cứu trạng thái phát tin và phản hồi đánh giá của người nhận tin</p>
      </div>

      {/* Tabs Chuyển đổi chế độ xem */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 8,
          width: 'fit-content',
          marginBottom: 'var(--spacing-md)',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setFilters({ ...filters, page: 1, rating: '' });
          }}
          style={{
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            padding: '6px 14px',
            fontSize: 12.5,
            fontWeight: activeTab === 'all' ? 600 : 500,
            color: activeTab === 'all' ? '#0f172a' : '#64748b',
            background: activeTab === 'all' ? '#ffffff' : 'transparent',
            borderRadius: 6,
            boxShadow: activeTab === 'all' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <ListDashes size={14} weight={activeTab === 'all' ? 'bold' : 'regular'} />
          Tất cả tin nhắn
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('ratings');
            setFilters({ ...filters, page: 1, status: '' });
          }}
          style={{
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            padding: '6px 14px',
            fontSize: 12.5,
            fontWeight: activeTab === 'ratings' ? 600 : 500,
            color: activeTab === 'ratings' ? '#b45309' : '#64748b',
            background: activeTab === 'ratings' ? '#ffffff' : 'transparent',
            borderRadius: 6,
            boxShadow: activeTab === 'ratings' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <Star size={14} weight={activeTab === 'ratings' ? 'fill' : 'regular'} color={activeTab === 'ratings' ? '#d97706' : '#64748b'} />
          Đánh giá của khách
        </button>
      </div>

      {/* Toolbar bộ lọc */}
      <div className="console-toolbar">
        <div className="console-toolbar-left">
          <div className="console-search-wrapper">
            <MagnifyingGlass weight="bold" />
            <input
              type="text"
              className="console-search-input"
              placeholder="Tìm theo số điện thoại..."
              value={filters.phone}
              onChange={(e) => setFilters({ ...filters, phone: e.target.value, page: 1 })}
            />
          </div>

          {activeTab === 'all' ? (
            <CustomSelect
              value={filters.status}
              onChange={(val) => setFilters({ ...filters, status: val, page: 1 })}
              placeholder="Tất cả trạng thái"
              style={{ width: 170 }}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'QUEUED', label: 'Đang chờ' },
                { value: 'SENT', label: 'Đã gửi' },
                { value: 'SUCCESS', label: 'Thành công' },
                { value: 'FAILED', label: 'Thất bại' },
              ]}
            />
          ) : (
            <CustomSelect
              value={filters.rating}
              onChange={(val) => setFilters({ ...filters, rating: val, page: 1 })}
              placeholder="Tất cả mức sao"
              style={{ width: 150 }}
              options={[
                { value: '', label: 'Tất cả mức sao' },
                { value: '5', label: '5 sao' },
                { value: '4', label: '4 sao' },
                { value: '3', label: '3 sao' },
                { value: '2', label: '2 sao' },
                { value: '1', label: '1 sao' },
              ]}
            />
          )}
        </div>
      </div>

      {/* Bảng danh sách */}
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
                    <th style={{ width: '18%' }}>Thời gian</th>
                    <th style={{ width: '17%' }}>Số điện thoại</th>
                    <th style={{ width: '15%' }}>Mã Template</th>
                    <th style={{ width: '18%' }}>Ứng dụng liên kết</th>
                    <th style={{ width: '18%', textAlign: 'center' }}>
                      {activeTab === 'ratings' ? 'Đánh giá' : 'Trạng thái'}
                    </th>
                    <th style={{ width: '14%', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((m, idx) => (
                    <tr
                      key={m.id}
                      className="clickable-row"
                      onClick={() => setSelectedMessage(m)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="table-col-index">{(filters.page - 1) * filters.limit + idx + 1}</td>
                      <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 500, color: '#0f172a' }}>
                        {m.phone}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 500 }}>
                        {m.templateId}
                      </td>
                      <td style={{ fontSize: 12.5, color: '#475569' }}>
                        {m.fptAppConfig?.appName || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          {m.status === 'SUCCESS' ? (
                            <span className="badge-active-pill">Thành công</span>
                          ) : m.status === 'FAILED' ? (
                            <span className="badge badge-danger" style={{ fontSize: 11 }}>Thất bại</span>
                          ) : m.status === 'SENT' ? (
                            <span className="badge badge-primary" style={{ fontSize: 11 }}>Đã gửi</span>
                          ) : (
                            <span className="badge badge-warning" style={{ fontSize: 11 }}>Đang chờ</span>
                          )}

                          {/* Hiển thị dãy sao nếu tin nhắn có đánh giá */}
                          {m.rating ? (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                background: '#fffbeb',
                                padding: '2px 6px',
                                borderRadius: 5,
                                border: '1px solid #fde68a',
                              }}
                              title={`Người nhận đánh giá: ${m.rating}/5 sao`}
                            >
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={11}
                                  weight="fill"
                                  color={star <= m.rating ? '#f59e0b' : '#e2e8f0'}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedMessage(m)}
                          style={{
                            fontSize: 11.5,
                            padding: '3px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 500,
                          }}
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!data?.data?.length && (
                    <tr>
                      <td colSpan={7} className="empty-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
                        <div className="empty-state-title" style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>
                          {activeTab === 'ratings' ? 'Chưa có đánh giá nào' : 'Chưa có tin nhắn nào'}
                        </div>
                        <p style={{ color: '#64748b', fontSize: 12.5, marginTop: 4 }}>
                          {activeTab === 'ratings'
                            ? 'Chưa ghi nhận đánh giá khảo sát nào từ người nhận tin ZNS'
                            : 'Chưa có nhật ký gửi tin nhắn nào được ghi nhận'}
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

      {/* Modal Chi tiết tin nhắn & Đánh giá */}
      {selectedMessage && (
        <MessageDetailModal
          isOpen={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          message={selectedMessage}
        />
      )}
    </div>
  );
}
