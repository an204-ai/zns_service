import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  X,
  Star,
  Warning,
  CheckCircle,
  FileText,
  ChatCircleText,
  ArrowSquareOut,
  CalendarBlank,
  ArrowsClockwise,
  Phone,
  Link,
  Info
} from '@phosphor-icons/react';

export default function TemplateDetailModal({
  isOpen,
  onClose,
  templateId,
  oaId,
  isAdmin = false
}) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'ratings'

  // Rating filters (default 30 days)
  const defaultDates = () => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    return {
      from: past.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    };
  };

  const [dateFilter, setDateFilter] = useState(defaultDates());
  const [ratingPage, setRatingPage] = useState(1);

  // Fetch live detail
  const detailEndpoint = isAdmin
    ? `/admin/oa-configs/${oaId}/templates/${templateId}/detail`
    : `/customer/oa-configs/${oaId}/templates/${templateId}/detail`;

  const {
    data: detailData,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
    refetch: refetchDetail
  } = useQuery({
    queryKey: ['template-detail', oaId, templateId, isAdmin],
    queryFn: () => api.get(detailEndpoint).then(r => r.data.data),
    enabled: !!isOpen && !!templateId && !!oaId,
    retry: 1,
  });

  // Fetch ratings
  const ratingsEndpoint = isAdmin
    ? `/admin/oa-configs/${oaId}/templates/${templateId}/ratings`
    : `/customer/oa-configs/${oaId}/templates/${templateId}/ratings`;

  const {
    data: ratingsData,
    isLoading: isRatingsLoading,
    isError: isRatingsError,
    error: ratingsError,
    refetch: refetchRatings
  } = useQuery({
    queryKey: ['template-ratings', oaId, templateId, dateFilter.from, dateFilter.to, ratingPage, isAdmin],
    queryFn: () =>
      api.get(ratingsEndpoint, {
        params: {
          from_time: dateFilter.from,
          to_time: dateFilter.to,
          page: ratingPage,
        }
      }).then(r => r.data.data),
    enabled: !!isOpen && !!templateId && !!oaId && activeTab === 'ratings',
    retry: 1,
  });

  if (!isOpen) return null;

  const tpl = detailData || {};
  const params = tpl.listParams || [];
  const buttons = tpl.listButtons || [];
  const quality = tpl.templateQuality || 'UNDEFINED';

  const renderQualityBadge = (q) => {
    switch (q) {
      case 'HIGH':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Chất lượng cao</span>;
      case 'MEDIUM':
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Chất lượng trung bình</span>;
      case 'LOW':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Chất lượng kém</span>;
      default:
        return <span className="badge badge-neutral">Chưa có đánh giá</span>;
    }
  };

  const ratingsList = ratingsData?.data || [];
  const totalRatings = ratingsData?.total || 0;
  const avgRate = ratingsData?.avgRate || 0;

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }} onClick={onClose}>
      <div
        className="modal"
        style={{
          maxWidth: 780,
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={20} weight="bold" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  {tpl.templateName || `Mẫu tin #${templateId}`}
                </h3>
                <span className="badge badge-primary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  ID: {templateId}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Ứng dụng: <strong>{tpl.fptAppConfig?.oaName || tpl.fptOaConfig?.oaName || 'Ứng dụng liên kết'}</strong> • Phân loại: {tpl.templateTag || 'Chăm sóc khách hàng'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="modal-close"
            style={{ position: 'static' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            padding: '0 20px'
          }}
        >
          <button
            type="button"
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: activeTab === 'info' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'info' ? '2px solid #2563eb' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
            onClick={() => setActiveTab('info')}
          >
            <FileText size={16} weight={activeTab === 'info' ? 'bold' : 'regular'} />
            Thông tin và Tham số
          </button>

          <button
            type="button"
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: activeTab === 'ratings' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'ratings' ? '2px solid #2563eb' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
            onClick={() => setActiveTab('ratings')}
          >
            <ChatCircleText size={16} weight={activeTab === 'ratings' ? 'bold' : 'regular'} />
            Đánh giá của người nhận tin
            {avgRate > 0 && (
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {avgRate} ★
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {isDetailLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="spinner" />
            </div>
          ) : activeTab === 'info' ? (
            <div>
              {/* Notice if liveDetailError or isDetailError */}
              {(isDetailError || tpl.liveDetailError) && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    color: '#92400e',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Info size={18} color="#b45309" weight="bold" />
                    <span>
                      <strong>Thông báo FPT ZBS:</strong> {detailError?.response?.data?.message || detailError?.message || tpl.liveDetailError}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => refetchDetail()}
                    style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Quality Alert if LOW */}
              {quality === 'LOW' && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#991b1b'
                  }}
                >
                  <Warning size={20} color="#dc2626" weight="fill" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    <strong>Cảnh báo chất lượng gửi tin thấp:</strong> Theo quy định của Zalo, mẫu tin này đang bị đánh giá chất lượng kém từ người nhận tin và có nguy cơ bị khóa tạm thời.
                  </div>
                </div>
              )}

              {/* Status & Preview Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Trạng thái:</span>
                    <span className="badge-active-pill">Đang hoạt động</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Chất lượng Zalo:</span>
                    {renderQualityBadge(quality)}
                  </div>
                </div>

                {tpl.previewUrl && (
                  <a
                    href={tpl.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#0284c7'
                    }}
                  >
                    <ArrowSquareOut size={15} weight="bold" />
                    Xem trước trên Zalo Cloud
                  </a>
                )}
              </div>

              {/* Template Content Box */}
              {tpl.templateContent && (
                <div style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    Nội dung bản tin mẫu
                  </label>
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '12px 16px',
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#1e293b',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit'
                    }}
                  >
                    {tpl.templateContent}
                  </div>
                </div>
              )}

              {/* Action Buttons CTAs */}
              {buttons && buttons.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    Nút bấm tương tác trên tin nhắn ({buttons.length})
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {buttons.map((btn, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: '#0f172a'
                        }}
                      >
                        {btn.type === 'oa.open.url' ? <Link size={14} color="#2563eb" /> : <Phone size={14} color="#059669" />}
                        <strong style={{ fontWeight: 600 }}>{btn.title || btn.name}</strong>
                        {btn.type && (
                          <span style={{ fontSize: 10.5, color: '#64748b' }}>({btn.type})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parameters Table */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                    Danh sách tham số truyền vào ({params.length})
                  </label>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Các trường dữ liệu động cần điền khi gửi tin qua API hoặc Excel
                  </span>
                </div>

                <div className="table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>#</th>
                        <th style={{ width: '30%', textAlign: 'left' }}>Tên tham số</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>Bắt buộc</th>
                        <th style={{ width: '25%', textAlign: 'center' }}>Kiểu dữ liệu</th>
                        <th style={{ width: '25%', textAlign: 'center' }}>Độ dài ký tự</th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.map((p, idx) => (
                        <tr key={p.name || idx}>
                          <td className="table-col-index">{idx + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                            {p.name}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {p.require ? (
                              <span className="badge badge-danger" style={{ fontSize: 11 }}>Bắt buộc</span>
                            ) : (
                              <span className="badge badge-neutral" style={{ fontSize: 11 }}>Tùy chọn</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12, color: '#475569' }}>
                            <code>{p.type || 'STRING'}</code>
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                            {p.minLength !== undefined && p.maxLength !== undefined
                              ? `${p.minLength} đến ${p.maxLength} ký tự`
                              : p.maxLength ? `Tối đa ${p.maxLength} ký tự` : '—'}
                          </td>
                        </tr>
                      ))}

                      {!params.length && (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: 12.5 }}>
                            Mẫu tin này là tin cố định, không có tham số động.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Customer Ratings & Feedback */
            <div>
              {/* Rating Filter Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Từ ngày:</span>
                    <input
                      type="date"
                      className="form-input"
                      style={{ height: 32, padding: '0 8px', fontSize: 12, width: 135 }}
                      value={dateFilter.from}
                      onChange={e => {
                        setDateFilter({ ...dateFilter, from: e.target.value });
                        setRatingPage(1);
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Đến ngày:</span>
                    <input
                      type="date"
                      className="form-input"
                      style={{ height: 32, padding: '0 8px', fontSize: 12, width: 135 }}
                      value={dateFilter.to}
                      onChange={e => {
                        setDateFilter({ ...dateFilter, to: e.target.value });
                        setRatingPage(1);
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
                  onClick={() => refetchRatings()}
                  disabled={isRatingsLoading}
                >
                  <ArrowsClockwise size={14} className={isRatingsLoading ? 'spin' : ''} />
                  Làm mới đánh giá
                </button>
              </div>

              {isRatingsError ? (
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Warning size={20} color="#dc2626" weight="bold" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#991b1b' }}>
                        Không thể lấy đánh giá từ máy chủ FPT ZBS
                      </div>
                      <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 2 }}>
                        {ratingsError?.response?.data?.message || ratingsError?.message || 'Lỗi kết nối máy chủ FPT'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => refetchRatings()}
                    style={{ fontSize: 12, color: '#991b1b', borderColor: '#fca5a5' }}
                  >
                    Thử lại
                  </button>
                </div>
              ) : isRatingsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div className="spinner" />
                </div>
              ) : (
                <>
                  {/* Rating Score Summary Card */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 12,
                      marginBottom: 18
                    }}
                  >
                    <div
                      style={{
                        padding: '14px 18px',
                        background: '#fffbeb',
                        border: '1px solid #fef3c7',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#fde68a',
                          color: '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          fontWeight: 700
                        }}
                      >
                        ★
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, color: '#92400e', fontWeight: 500 }}>
                          Điểm đánh giá trung bình
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#78350f', marginTop: 2 }}>
                          {avgRate > 0 ? `${avgRate} / 5.0` : 'Chưa có đánh giá'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '14px 18px',
                        background: '#f0fdf4',
                        border: '1px solid #dcfce7',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: '#bbf7d0',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ChatCircleText size={22} weight="bold" />
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, color: '#166534', fontWeight: 500 }}>
                          Tổng số lượt đánh giá
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#14532d', marginTop: 2 }}>
                          {totalRatings} phản hồi
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ratings List Table */}
                  <div className="table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: 'center' }}>#</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Mức đánh giá</th>
                          <th style={{ width: '20%', textAlign: 'left' }}>Số điện thoại</th>
                          <th style={{ width: '25%', textAlign: 'left' }}>Nhận xét định sẵn</th>
                          <th style={{ width: '25%', textAlign: 'left' }}>Ghi chú của khách</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ratingsList.map((r, idx) => (
                          <tr key={r.msg_id || idx}>
                            <td className="table-col-index">{(ratingPage - 1) * 20 + idx + 1}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#f59e0b', fontWeight: 700 }}>
                                {Array.from({ length: Number(r.rate) || 0 }).map((_, i) => (
                                  <Star key={i} size={14} weight="fill" />
                                ))}
                                <span style={{ fontSize: 12, marginLeft: 3, color: '#0f172a' }}>
                                  ({r.rate}★)
                                </span>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#334155' }}>
                              {r.phone || '—'}
                            </td>
                            <td>
                              {Array.isArray(r.feedbacks) && r.feedbacks.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {r.feedbacks.map((fb, fi) => (
                                    <span key={fi} className="badge badge-success" style={{ fontSize: 11 }}>
                                      {fb}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={{ fontSize: 12.5, color: '#1e293b' }}>
                              {r.note || <span style={{ color: '#94a3b8' }}>Không có ghi chú</span>}
                            </td>
                            <td style={{ textAlign: 'center', fontSize: 11.5, color: '#64748b' }}>
                              {r.time || '—'}
                            </td>
                          </tr>
                        ))}

                        {!ratingsList.length && !isRatingsLoading && (
                          <tr>
                            <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center' }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#475569' }}>
                                Chưa có phản hồi đánh giá nào
                              </div>
                              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                                Chưa ghi nhận đánh giá nào cho mẫu tin này trong khoảng thời gian đã chọn.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Rating pagination if needed */}
                  {totalRatings > 20 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={ratingPage <= 1}
                        onClick={() => setRatingPage(ratingPage - 1)}
                      >
                        Trang trước
                      </button>
                      <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', color: '#64748b' }}>
                        Trang {ratingPage}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        disabled={ratingsList.length < 20}
                        onClick={() => setRatingPage(ratingPage + 1)}
                      >
                        Trang sau
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
