import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  PaperPlaneTilt,
  Phone,
  Tag,
  Buildings,
  ChatText,
  CalendarBlank,
  WarningCircle,
} from '@phosphor-icons/react';

export default function MessageDetailModal({ isOpen, onClose, message }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const m = message;
  const rating = m.rating;
  const feedbacks = Array.isArray(m.ratingFeedbacks)
    ? m.ratingFeedbacks
    : typeof m.ratingFeedbacks === 'string'
    ? [m.ratingFeedbacks]
    : [];

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="badge-active-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={13} weight="bold" /> Thành công
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={13} weight="bold" /> Thất bại
          </span>
        );
      case 'SENT':
        return (
          <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <PaperPlaneTilt size={13} weight="bold" /> Đã gửi đi
          </span>
        );
      default:
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} weight="bold" /> Đang chờ
          </span>
        );
    }
  };

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 180ms ease',
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 580,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          animation: 'slideUp 200ms ease',
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, textAlign: 'left' }}>
              Chi tiết tin nhắn
            </h2>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>Mã tham chiếu: <span style={{ fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>{m.refId || m.id}</span></span>
              {(m.messageId || m.message_id) && (
                <span>Mã tin nhắn: <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>{m.messageId || m.message_id}</span></span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              cursor: 'pointer',
            }}
            title="Đóng cửa sổ"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{ padding: '20px', overflowY: 'auto', flex: 1 }}
        >
          {/* Khối Đánh giá của khách hàng (Nếu có đánh giá) */}
          {rating ? (
            <div
              style={{
                background: '#fffdf5',
                border: '1px solid #fef08a',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#854d0e', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Star size={16} weight="fill" color="#eab308" />
                  Đánh giá của người nhận
                </span>
                {m.ratedAt && (
                  <span style={{ fontSize: 11.5, color: '#a16207', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CalendarBlank size={13} />
                    {new Date(m.ratedAt).toLocaleString('vi-VN')}
                  </span>
                )}
              </div>

              {/* Hiển thị số ngôi sao */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      weight={star <= rating ? 'fill' : 'regular'}
                      color={star <= rating ? '#eab308' : '#cbd5e1'}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#854d0e',
                    background: '#fef08a',
                    padding: '2px 8px',
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {rating} sao
                </span>
              </div>

              {/* Feedback tags */}
              {feedbacks.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {feedbacks.map((f, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: '#fef9c3',
                        color: '#854d0e',
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '3px 9px',
                        borderRadius: 6,
                        border: '1px solid #fef08a',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Note ghi chú */}
              {m.ratingNote && (
                <div style={{ fontSize: 12.5, color: '#475569', background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #fef08a', fontStyle: 'italic' }}>
                  "{m.ratingNote}"
                </div>
              )}
            </div>
          ) : null}

          {/* Thông tin chuyển phát */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={13} /> Số điện thoại người nhận
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 3, fontFamily: 'monospace' }}>
                {m.phone}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Tag size={13} /> Trạng thái gửi tin
              </div>
              <div style={{ marginTop: 4 }}>
                {renderStatusBadge(m.status)}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ChatText size={13} /> Mã mẫu tin ZNS
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', marginTop: 3, fontFamily: 'monospace' }}>
                {m.templateId}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Buildings size={13} /> Ứng dụng liên kết
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginTop: 3 }}>
                {m.fptAppConfig?.appName || '—'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Thời gian khởi tạo
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginTop: 3 }}>
                {m.createdAt ? new Date(m.createdAt).toLocaleString('vi-VN') : '—'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Thời gian nhận tin (Nhà mạng)
              </div>
              <div style={{ fontSize: 12.5, color: '#334155', marginTop: 3 }}>
                {m.deliveredAt ? new Date(m.deliveredAt).toLocaleString('vi-VN') : (m.sentAt ? new Date(m.sentAt).toLocaleString('vi-VN') : 'Chờ xác nhận')}
              </div>
            </div>
          </div>

          {/* Mã lỗi nếu có */}
          {m.errorCode && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontSize: 12.5, fontWeight: 600 }}>
                <WarningCircle size={15} weight="bold" />
                Chi tiết lỗi từ máy chủ: Mã lỗi {m.errorCode}
              </div>
              {m.errorMessage && (
                <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>
                  {m.errorMessage}
                </div>
              )}
            </div>
          )}

          {/* Tham số tin nhắn đã gửi (template_data) */}
          {m.templateData && Object.keys(m.templateData).length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Tham số nội dung tin nhắn
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  {Object.entries(m.templateData).map(([key, val]) => (
                    <div key={key} style={{ fontSize: 12 }}>
                      <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{key}: </span>
                      <strong style={{ color: '#0f172a' }}>{String(val)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            background: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              fontSize: 13,
              height: 36,
              padding: '0 22px',
              fontWeight: 500,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
