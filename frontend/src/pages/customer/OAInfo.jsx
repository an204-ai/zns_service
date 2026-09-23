import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  Key,
  CopySimple,
  Check,
  Eye,
  EyeSlash,
  CaretRight,
  ArrowLeft,
  MagnifyingGlass,
  Gauge,
  ArrowsClockwise,
  WarningCircle
} from '@phosphor-icons/react';
import Pagination from '../../components/Pagination';
import TemplateDetailModal from '../../components/TemplateDetailModal';

export default function CustomerOAInfo() {
  const toast = useToast();

  const [selectedOaId, setSelectedOaId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showKeyVisible, setShowKeyVisible] = useState(false);
  const [copiedKeyOaId, setCopiedKeyOaId] = useState(null);
  const [copiedDetailKey, setCopiedDetailKey] = useState(false);

  const { data: oaConfigs, isLoading } = useQuery({
    queryKey: ['customer-oa-configs'],
    queryFn: () => api.get('/customer/oa-configs').then((r) => r.data.data),
  });

  const selectedOa = oaConfigs?.find((o) => o.id === selectedOaId);

  // Quota for selected OA
  const {
    data: oaQuota,
    isLoading: isQuotaLoading,
    isError: isQuotaError,
    error: quotaError,
    refetch: refetchQuota
  } = useQuery({
    queryKey: ['customer-oa-quota', selectedOa?.id],
    queryFn: () => api.get(`/customer/oa-configs/${selectedOa.id}/quota`).then((r) => r.data.data),
    enabled: !!selectedOa?.id,
    retry: 1,
  });

  const handleCopyText = (text, type = 'key', oaId = null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'row-key') {
      setCopiedKeyOaId(oaId);
      setTimeout(() => setCopiedKeyOaId(null), 2000);
      toast.success('Đã sao chép API Key');
    } else if (type === 'detail-key') {
      setCopiedDetailKey(true);
      setTimeout(() => setCopiedDetailKey(false), 2000);
      toast.success('Đã sao chép API Key');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (selectedOa) {
    const rawApiKey = selectedOa.apiKey?.apiKey || selectedOa.apiKey?.prefix || '';
    const maskedApiKey = `${selectedOa.apiKey?.prefix || 'YOUR_API_KEY'}••••••••••••••••••••••••••••••••`;

    return (
      <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
        {/* Navigation & Header */}
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              fontWeight: 500,
              fontSize: 13,
            }}
            onClick={() => {
              setSelectedOaId(null);
              setShowKeyVisible(false);
            }}
          >
            <ArrowLeft size={15} weight="bold" />
            Quay lại danh sách ứng dụng liên kết
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="page-header-title" style={{ margin: 0, fontSize: 20 }}>
                  {selectedOa.oaName}
                </h1>
                {selectedOa.isSystem ? (
                  <span className="badge badge-primary">Ứng dụng hệ thống</span>
                ) : (
                  <span className="badge badge-success">Ứng dụng riêng</span>
                )}
                <span className="badge-active-pill">Đang hoạt động</span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Mã định danh OA: <strong style={{ color: '#0f172a' }}>{selectedOa.oaId || 'Chưa cập nhật'}</strong>
                <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                <span style={{ color: '#0284c7', fontWeight: 600 }}>{selectedOa.templates?.length || 0}</span> mẫu tin ZNS sẵn sàng
                {oaQuota?.dailyQuota ? (
                  <>
                    <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                    <span>Hạn mức hôm nay: </span>
                    <strong style={{ color: '#059669' }}>
                      {oaQuota.remainingQuota?.toLocaleString('vi-VN')} / {oaQuota.dailyQuota?.toLocaleString('vi-VN')} tin
                    </strong>
                  </>
                ) : isQuotaError ? (
                  <>
                    <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                    <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 500 }}>
                      Không thể lấy hạn mức FPT
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Khóa bảo mật API Key gọn gàng (1 hàng) */}
        <div
          className="card"
          style={{
            marginBottom: 'var(--spacing-md)',
            padding: '12px 16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 240, flex: '1 1 auto' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Key size={18} weight="bold" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Khóa bảo mật API Key</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>(Dùng cho HTTP API gửi tin ZNS)</span>
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: '#334155',
                    background: '#f8fafc',
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    display: 'inline-block',
                    marginTop: 3,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {showKeyVisible ? rawApiKey || 'Chưa cấp API Key' : maskedApiKey}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 32, padding: '0 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                onClick={() => setShowKeyVisible(!showKeyVisible)}
                title={showKeyVisible ? 'Ẩn API Key' : 'Hiện API Key'}
              >
                {showKeyVisible ? <EyeSlash size={14} /> : <Eye size={14} />}
                {showKeyVisible ? 'Ẩn' : 'Hiện'}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 32, padding: '0 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                onClick={() => handleCopyText(rawApiKey, 'detail-key')}
                disabled={!rawApiKey}
                title="Sao chép toàn bộ API Key"
              >
                {copiedDetailKey ? <Check size={14} color="#059669" /> : <CopySimple size={14} />}
                {copiedDetailKey ? 'Đã chép' : 'Sao chép'}
              </button>
            </div>
          </div>
        </div>

        {/* Thẻ hạn mức gửi tin ZNS */}
        <div
          className="card"
          style={{
            marginBottom: 'var(--spacing-md)',
            padding: '14px 18px',
            background: '#ffffff',
            border: isQuotaError ? '1px solid #fecaca' : '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: isQuotaError ? 0 : 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: isQuotaError ? '#fef2f2' : '#f0f9ff',
                  color: isQuotaError ? '#dc2626' : '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isQuotaError ? <WarningCircle size={18} weight="bold" /> : <Gauge size={18} weight="bold" />}
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  Hạn mức gửi tin ZNS hôm nay
                </span>
                <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                  (Cập nhật từ FPT Telecom)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!isQuotaError && oaQuota && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#059669',
                    background: '#ecfdf5',
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: '1px solid #d1fae5',
                  }}
                >
                  Còn {oaQuota.remainingQuota?.toLocaleString('vi-VN') || 0} / {oaQuota.dailyQuota?.toLocaleString('vi-VN') || 0} tin
                </span>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ height: 28, padding: '0 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => refetchQuota()}
                disabled={isQuotaLoading}
                title="Làm mới hạn mức"
              >
                <ArrowsClockwise size={12} className={isQuotaLoading ? 'spin' : ''} />
                Làm mới
              </button>
            </div>
          </div>

          {isQuotaLoading ? (
            <div style={{ padding: '8px 0', fontSize: 12, color: '#64748b' }}>Đang kiểm tra hạn mức từ máy chủ FPT...</div>
          ) : isQuotaError ? (
            <div
              style={{
                marginTop: 10,
                padding: '10px 14px',
                background: '#fef2f2',
                borderRadius: 6,
                fontSize: 12.5,
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span>
                <strong>Không thể lấy hạn mức từ FPT:</strong>{' '}
                {quotaError?.response?.data?.message || quotaError?.message || 'Lỗi kết nối máy chủ FPT ZBS'}
              </span>
            </div>
          ) : oaQuota ? (
            <>
              {/* Progress bar */}
              <div style={{ background: '#f1f5f9', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 6 }}>
                <div
                  style={{
                    background: '#0284c7',
                    height: '100%',
                    width: `${oaQuota.dailyQuota ? Math.min(100, Math.round((oaQuota.remainingQuota / oaQuota.dailyQuota) * 100)) : 0}%`,
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748b', flexWrap: 'wrap', gap: 6 }}>
                <span>
                  Đã sử dụng {oaQuota.dailyQuota ? (oaQuota.dailyQuota - oaQuota.remainingQuota).toLocaleString('vi-VN') : 0} tin trong ngày
                </span>
                {oaQuota.remainingMonthlyPromotionQuota !== undefined && (
                  <span>
                    Hạn mức tin hậu mãi (Promotion): Còn{' '}
                    <strong style={{ color: '#0f172a' }}>
                      {oaQuota.remainingMonthlyPromotionQuota?.toLocaleString('vi-VN')} tin
                    </strong>
                  </span>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
              Chưa có dữ liệu hạn mức từ FPT. Bấm "Làm mới" để kiểm tra.
            </div>
          )}
        </div>

        {/* Danh sách mẫu tin ZNS đã duyệt */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'none' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 18px' }}>
            <span className="card-header-title" style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              Danh sách mẫu tin ZNS đã duyệt ({selectedOa.templates?.length || 0})
            </span>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>#</th>
                  <th style={{ width: '16%', textAlign: 'left' }}>Mã Template ID</th>
                  <th style={{ width: '24%', textAlign: 'left' }}>Tên mẫu tin</th>
                  <th style={{ width: '16%', textAlign: 'center' }}>Loại mẫu tin</th>
                  <th style={{ width: '22%', textAlign: 'left' }}>Tham số truyền vào</th>
                  <th style={{ width: '11%', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '11%', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {selectedOa.templates?.map((t, idx) => (
                  <tr
                    key={t.id}
                    className="clickable-row"
                    onClick={() => setSelectedTemplate(t)}
                  >
                    <td className="table-col-index">{idx + 1}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-link)' }}>
                      {t.templateId}
                    </td>
                    <td className="table-cell-bold">{t.templateName}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-neutral">{t.templateTag || 'Chăm sóc khách hàng'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {t.listParams?.map((p) => (
                          <span
                            key={p.name}
                            className="badge badge-primary"
                            style={{ fontSize: 11, fontWeight: 500 }}
                          >
                            {p.name}{p.require ? ' *' : ''}
                          </span>
                        ))}
                        {!t.listParams?.length && (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            Không có tham số động
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-active-pill">Kích hoạt</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(t);
                        }}
                      >
                        Chi tiết
                        <CaretRight size={13} weight="bold" />
                      </button>
                    </td>
                  </tr>
                ))}

                {!selectedOa.templates?.length && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      <div className="empty-state-title">Chưa có mẫu tin nào</div>
                      <div className="empty-state-text">
                        Ứng dụng liên kết này chưa có mẫu tin ZNS nào được đồng bộ từ FPT Telecom
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Template Detail Modal */}
        {selectedTemplate && (
          <TemplateDetailModal
            isOpen={!!selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            templateId={selectedTemplate.templateId}
            oaId={selectedOa.id}
            isAdmin={false}
          />
        )}
      </div>
    );
  }


  // ==========================================
  // VIEW 2: BẢNG DANH SÁCH ỨNG DỤNG LIÊN KẾT
  // ==========================================
  const filteredOas = (oaConfigs || []).filter((oa) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      oa.oaName?.toLowerCase().includes(q) ||
      oa.oaId?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredOas.length / pageSize) || 1;
  const paginatedOas = filteredOas.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="console-section-header">
        <h1 className="console-section-title">Ứng dụng liên kết & API Key</h1>
        <p className="console-section-desc">
          Danh sách các ứng dụng được cấp quyền cho tài khoản và khóa bảo mật API Key gửi tin ZNS
        </p>
      </div>

      {/* Table Controls Toolbar */}
      <div className="console-toolbar">
        <div className="console-toolbar-left">
          <div className="console-search-wrapper">
            <MagnifyingGlass weight="bold" />
            <input
              type="text"
              className="console-search-input"
              placeholder="Tìm kiếm ứng dụng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="console-card-table">
        {!oaConfigs?.length ? (
          <div className="empty-state">
            <div className="empty-state-title">Chưa có ứng dụng nào được liên kết</div>
            <div className="empty-state-text">
              Vui lòng liên hệ ban quản trị hệ thống để được gán ứng dụng phục vụ gửi tin ZNS
            </div>
          </div>
        ) : !filteredOas.length ? (
          <div className="empty-state">
            <div className="empty-state-title">Không tìm thấy ứng dụng phù hợp</div>
            <div className="empty-state-text">
              Thử tìm kiếm với từ khóa khác như tên ứng dụng hoặc mã OA
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }}>#</th>
                    <th style={{ width: '26%', textAlign: 'left' }}>Ứng dụng liên kết</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Loại ứng dụng</th>
                    <th style={{ width: '24%', textAlign: 'left' }}>Khóa API Key</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Mẫu tin</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOas.map((oa, index) => {
                    const apiKeyVal = oa.apiKey?.apiKey || (oa.apiKey?.prefix ? `${oa.apiKey.prefix}••••••••••••••••••••••••••••••••` : '');
                    const isCopied = copiedKeyOaId === oa.id;
                    const rowIndex = (page - 1) * pageSize + index + 1;

                    return (
                      <tr
                        key={oa.id}
                        className="clickable-row"
                        onClick={() => {
                          setSelectedOaId(oa.id);
                          setShowKeyVisible(false);
                        }}
                      >
                        {/* Cột 1: STT # */}
                        <td className="table-col-index">{rowIndex}</td>

                        {/* Cột 2: Tên ứng dụng */}
                        <td>
                          <div>
                            <span
                              className="table-cell-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOaId(oa.id);
                                setShowKeyVisible(false);
                              }}
                            >
                              {oa.oaName}
                            </span>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              Mã OA: {oa.oaId || 'Chưa cập nhật'}
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Trạng thái */}
                        <td>
                          <span className="badge-active-pill">Đang hoạt động</span>
                        </td>

                        {/* Cột 4: Loại ứng dụng */}
                        <td>
                          {oa.isSystem ? (
                            <span className="badge badge-primary">Ứng dụng hệ thống</span>
                          ) : (
                            <span className="badge badge-success">Ứng dụng riêng</span>
                          )}
                        </td>

                        {/* Cột 5: Khóa API Key */}
                        <td onClick={(e) => e.stopPropagation()}>
                          {oa.apiKey ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <code
                                style={{
                                  background: '#f1f5f9',
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  maxWidth: 160,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  border: '1px solid #e2e8f0',
                                }}
                                title={apiKeyVal}
                              >
                                {oa.apiKey.apiKey ? `${oa.apiKey.apiKey.substring(0, 14)}••••` : `${oa.apiKey.prefix}••••••••`}
                              </code>
                              <button
                                type="button"
                                className={`btn btn-sm ${isCopied ? 'btn-success' : 'btn-secondary'}`}
                                style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, height: 26 }}
                                title="Sao chép toàn bộ API Key"
                                onClick={() => handleCopyText(oa.apiKey?.apiKey || oa.apiKey?.prefix, 'row-key', oa.id)}
                              >
                                {isCopied ? <Check size={13} weight="bold" /> : <CopySimple size={13} />}
                                <span style={{ fontSize: 11 }}>{isCopied ? 'Đã chép' : 'Chép'}</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                              Chưa khởi tạo
                            </span>
                          )}
                        </td>

                        {/* Cột 6: Mẫu tin */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-neutral">
                            {oa.templates?.length || 0} mẫu
                          </span>
                        </td>

                        {/* Cột 7: Thao tác */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 500,
                              fontSize: 12,
                              padding: '5px 10px',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOaId(oa.id);
                              setShowKeyVisible(false);
                            }}
                          >
                            Chi tiết
                            <CaretRight size={13} weight="bold" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredOas.length}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
