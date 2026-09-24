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
  WarningCircle,
  Buildings,
  User
} from '@phosphor-icons/react';
import Pagination from '../../components/Pagination';
import TemplateDetailModal from '../../components/TemplateDetailModal';

export default function CustomerAppInfo() {
  const toast = useToast();

  const [selectedAppId, setSelectedAppId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showKeyVisible, setShowKeyVisible] = useState(false);
  const [copiedKeyAppId, setCopiedKeyAppId] = useState(null);
  const [copiedDetailKey, setCopiedDetailKey] = useState(false);

  const { data: appConfigs, isLoading } = useQuery({
    queryKey: ['customer-app-configs'],
    queryFn: () => api.get('/customer/app-configs').then((r) => r.data.data),
  });

  const selectedApp = appConfigs?.find((a) => a.id === selectedAppId);

  // Quota cho ứng dụng đang chọn
  const {
    data: appQuota,
    isLoading: isQuotaLoading,
    isError: isQuotaError,
    error: quotaError,
    refetch: refetchQuota
  } = useQuery({
    queryKey: ['customer-app-quota', selectedApp?.id],
    queryFn: () => api.get(`/customer/app-configs/${selectedApp.id}/quota`).then((r) => r.data.data),
    enabled: !!selectedApp?.id,
    retry: 1,
  });

  const handleCopyText = (text, type = 'key', appId = null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'row-key') {
      setCopiedKeyAppId(appId);
      setTimeout(() => setCopiedKeyAppId(null), 2000);
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

  // ==========================================
  // VIEW 1: CHI TIẾT ỨNG DỤNG ĐƯỢC CHỌN
  // ==========================================
  if (selectedApp) {
    const rawApiKey = selectedApp.apiKey?.apiKey || selectedApp.apiKey?.prefix || '';
    const maskedApiKey = `${selectedApp.apiKey?.prefix || 'YOUR_API_KEY'}••••••••••••••••••••••••••••••••`;
    const appDisplayName = selectedApp.appName || 'Ứng dụng';

    return (
      <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
        {/* Navigation */}
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 500,
              fontSize: 12.5,
            }}
            onClick={() => {
              setSelectedAppId(null);
              setShowKeyVisible(false);
            }}
          >
            <ArrowLeft size={15} weight="bold" />
            Quay lại danh sách ứng dụng
          </button>
        </div>

        {/* Header Card */}
        <div
          className="card"
          style={{
            padding: '10px 14px',
            marginBottom: 'var(--spacing-md)',
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {appDisplayName}
            </h1>

            <div>
              {selectedApp.status === 'ACTIVE' ? (
                <span className="badge-active-pill">Đang hoạt động</span>
              ) : (
                <span className="badge-inactive-pill">Tạm dừng</span>
              )}
            </div>
          </div>

          <div className="header-info-strip">
            {selectedApp.isSystem ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 500,
                  padding: '2.5px 8px',
                  borderRadius: 12,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                }}
              >
                <Buildings size={13} weight="bold" />
                Ứng dụng hệ thống
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 500,
                  padding: '2.5px 8px',
                  borderRadius: 12,
                  background: '#f5f3ff',
                  color: '#6d28d9',
                  border: '1px solid #ddd6fe',
                }}
              >
                <User size={13} weight="bold" />
                Ứng dụng cá nhân
              </span>
            )}
            <div className="header-info-pill">
              Mã OA: <strong style={{ color: '#0f172a' }}>{selectedApp.oaId || 'Chưa cập nhật'}</strong>
            </div>
            <div className="header-info-pill">
              <span style={{ color: '#0284c7', fontWeight: 600 }}>{selectedApp.templates?.length || 0}</span> mẫu tin ZNS
            </div>
            {appQuota?.dailyQuota ? (
              <div
                className="header-info-pill"
                style={{ background: '#dcfce7', borderColor: '#86efac', color: '#166534' }}
              >
                <Gauge size={13} color="#15803d" weight="bold" />
                <strong style={{ color: '#15803d' }}>
                  {appQuota.remainingQuota?.toLocaleString('vi-VN')} / {appQuota.dailyQuota?.toLocaleString('vi-VN')}
                </strong> tin hôm nay
              </div>
            ) : isQuotaError ? (
              <div
                className="header-info-pill"
                style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}
              >
                <WarningCircle size={13} weight="bold" />
                Không thể lấy hạn mức
              </div>
            ) : null}
          </div>
        </div>

        {/* Thanh Khóa bảo mật API Key */}
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

        {/* Thanh Hạn mức gửi tin ZNS */}
        <div
          className="card"
          style={{
            marginBottom: 'var(--spacing-md)',
            padding: '10px 16px',
            background: '#ffffff',
            border: isQuotaError ? '1px solid #fecaca' : '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              fontSize: 12.5,
            }}
          >
            {isQuotaLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                <span>Đang kiểm tra hạn mức từ máy chủ FPT...</span>
              </div>
            ) : isQuotaError ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b', flexWrap: 'wrap' }}>
                <WarningCircle size={16} color="#dc2626" weight="bold" />
                <span>
                  Không thể lấy hạn mức FPT: <span style={{ color: '#b91c1c' }}>{quotaError?.response?.data?.message || quotaError?.message || 'Timeout / Lỗi kết nối'}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => refetchQuota()}
                  style={{
                    height: 24,
                    padding: '0 8px',
                    fontSize: 11.5,
                    color: '#991b1b',
                    borderColor: '#fca5a5',
                    background: '#fef2f2',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ArrowsClockwise size={12} /> Thử lại
                </button>
              </div>
            ) : appQuota ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                  <Gauge size={16} color="#0284c7" weight="bold" />
                  <span style={{ color: '#64748b' }}>Hạn mức hôm nay:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {appQuota.remainingQuota?.toLocaleString('vi-VN') || 0}{' '}
                    <span style={{ fontWeight: 500, color: '#64748b', fontSize: 11.5 }}>
                      / {appQuota.dailyQuota?.toLocaleString('vi-VN') || 0} tin
                    </span>
                  </span>
                  <div style={{ width: 64, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginLeft: 4 }}>
                    <div
                      style={{
                        height: '100%',
                        background: '#0284c7',
                        width: `${appQuota.dailyQuota ? Math.min(100, Math.round((appQuota.remainingQuota / appQuota.dailyQuota) * 100)) : 0}%`,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11.5, color: '#0284c7', fontWeight: 600, marginLeft: 2 }}>
                    (Còn {appQuota.dailyQuota ? Math.round((appQuota.remainingQuota / appQuota.dailyQuota) * 100) : 0}%)
                  </span>
                </div>

                {appQuota.remainingMonthlyPromotionQuota !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ color: '#64748b' }}>Hậu mãi:</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>
                      {appQuota.remainingMonthlyPromotionQuota?.toLocaleString('vi-VN')} tin
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#64748b' }}>
                Chưa có dữ liệu hạn mức từ FPT. Bấm "Làm mới" để kiểm tra.
              </div>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ height: 26, padding: '0 8px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => refetchQuota()}
              disabled={isQuotaLoading}
              title="Làm mới hạn mức"
            >
              <ArrowsClockwise size={12} className={isQuotaLoading ? 'spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Danh sách mẫu tin ZNS đã duyệt */}
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: 'none' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 18px' }}>
            <span className="card-header-title" style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              Danh sách mẫu tin ZNS đã duyệt
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
                {selectedApp.templates?.map((t, idx) => (
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

                {!selectedApp.templates?.length && (
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
            appId={selectedApp.id}
            initialData={selectedTemplate}
            isAdmin={false}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: BẢNG DANH SÁCH ỨNG DỤNG LIÊN KẾT
  // ==========================================
  const filteredApps = (appConfigs || []).filter((app) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const appName = (app.appName || '').toLowerCase();
    return (
      appName.includes(q) ||
      app.oaId?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredApps.length / pageSize) || 1;
  const paginatedApps = filteredApps.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="console-section-header">
        <h1 className="console-section-title">Quản lý ứng dụng và API key</h1>
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
        {!appConfigs?.length ? (
          <div className="empty-state">
            <div className="empty-state-title">Chưa có ứng dụng nào được liên kết</div>
            <div className="empty-state-text">
              Vui lòng liên hệ ban quản trị hệ thống để được gán ứng dụng phục vụ gửi tin ZNS
            </div>
          </div>
        ) : !filteredApps.length ? (
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
                  {paginatedApps.map((app, index) => {
                    const apiKeyVal = app.apiKey?.apiKey || (app.apiKey?.prefix ? `${app.apiKey.prefix}••••••••••••••••••••••••••••••••` : '');
                    const isCopied = copiedKeyAppId === app.id;
                    const rowIndex = (page - 1) * pageSize + index + 1;
                    const appDisplayName = app.appName;

                    return (
                      <tr
                        key={app.id}
                        className="clickable-row"
                        onClick={() => {
                          setSelectedAppId(app.id);
                          setShowKeyVisible(false);
                        }}
                      >
                        <td className="table-col-index">{rowIndex}</td>
                        <td>
                          <div>
                            <span
                              className="table-cell-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppId(app.id);
                                setShowKeyVisible(false);
                              }}
                            >
                              {appDisplayName}
                            </span>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              Mã OA: {app.oaId || 'Chưa cập nhật'}
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {app.status === 'ACTIVE' ? (
                            <span className="badge-active-pill">Đang hoạt động</span>
                          ) : (
                            <span className="badge-inactive-pill">Tạm dừng</span>
                          )}
                        </td>
                        <td>
                          {app.isSystem ? (
                            <span className="badge badge-primary">Hệ thống</span>
                          ) : (
                            <span className="badge badge-success">Cá nhân</span>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {app.apiKey ? (
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
                                {app.apiKey.apiKey ? `${app.apiKey.apiKey.substring(0, 14)}••••` : `${app.apiKey.prefix}••••••••`}
                              </code>
                              <button
                                type="button"
                                className={`btn btn-sm ${isCopied ? 'btn-success' : 'btn-secondary'}`}
                                style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, height: 26 }}
                                title="Sao chép toàn bộ API Key"
                                onClick={() => handleCopyText(app.apiKey?.apiKey || app.apiKey?.prefix, 'row-key', app.id)}
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
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-neutral">
                            {app.templates?.length || 0} mẫu
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
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
                              setSelectedAppId(app.id);
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
              totalItems={filteredApps.length}
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
