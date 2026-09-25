import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  User,
  WebhooksLogo,
  FloppyDisk,
  PencilSimple,
  X,
} from '@phosphor-icons/react';
import Pagination from '../../components/Pagination';
import TemplateDetailModal from '../../components/TemplateDetailModal';

export default function CustomerAppInfo() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedAppId, setSelectedAppId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showKeyVisible, setShowKeyVisible] = useState(false);
  const [copiedKeyAppId, setCopiedKeyAppId] = useState(null);
  const [copiedDetailKey, setCopiedDetailKey] = useState(false);
  const [copiedDlrUrl, setCopiedDlrUrl] = useState(false);
  const [copiedRatingUrl, setCopiedRatingUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecretVisible, setShowSecretVisible] = useState(false);

  // Webhook modal states
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookDlrInput, setWebhookDlrInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [showSecretInputVisible, setShowSecretInputVisible] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

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

  const handleOpenWebhookModal = () => {
    setWebhookDlrInput(selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl || '');
    setWebhookSecretInput(selectedApp?.apiKey?.webhookSecret || '');
    setShowSecretInputVisible(false);
    setShowWebhookModal(true);
  };

  const handleSaveWebhook = async () => {
    if (!selectedApp?.apiKey?.id) {
      toast.error('Ứng dụng này chưa được cấp API Key');
      return;
    }
    const dlrTrimmed = webhookDlrInput.trim();
    const secretTrimmed = webhookSecretInput.trim();

    if (dlrTrimmed && !/^https?:\/\/.+/i.test(dlrTrimmed)) {
      toast.error('Webhook URL nhận trạng thái tin không hợp lệ (phải bắt đầu bằng http:// hoặc https://)');
      return;
    }

    setIsSavingWebhook(true);
    try {
      await api.put(`/customer/api-keys/${selectedApp.apiKey.id}/webhook`, {
        webhookDlrUrl: dlrTrimmed || null,
        webhookSecret: secretTrimmed || null,
      });
      toast.success('Lưu cấu hình Webhook DLR thành công');
      queryClient.invalidateQueries({ queryKey: ['customer-app-configs'] });
      setShowWebhookModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình Webhook');
    } finally {
      setIsSavingWebhook(false);
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
      <div style={{ maxWidth: '100%' }}>
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

        {/* Thanh Khóa bảo mật API Key & Webhook Callback */}
        <div
          className="card"
          style={{
            marginBottom: 'var(--spacing-md)',
            padding: '14px 16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: 'none',
          }}
        >
          {/* Hàng 1: Khóa bảo mật API Key */}
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Khóa API Key</span>
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

          {/* Đường phân cách mảnh tinh tế */}
          <div style={{ height: 1, background: '#f1f5f9', margin: '14px 0 12px 0' }} />

          {/* Hàng 2: Cấu hình Webhook URL DLR */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: (selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl || selectedApp?.apiKey?.webhookSecret) ? 10 : 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 260, flex: '1 1 auto' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: (selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl) ? '#f0fdf4' : '#f8fafc',
                    color: (selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl) ? '#16a34a' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: (selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl) ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  }}
                >
                  <WebhooksLogo size={18} weight="bold" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Cấu hình Webhook Callback</span>
                  </div>
                  {!(selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl || selectedApp?.apiKey?.webhookSecret) && (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      Chưa thiết lập URL nhận trạng thái tự động
                    </div>
                  )}
                </div>
              </div>

              <div>
                {!(selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl || selectedApp?.apiKey?.webhookSecret) ? (
                  <button
                    type="button"
                    onClick={handleOpenWebhookModal}
                    disabled={!selectedApp?.apiKey}
                    style={{
                      height: 32,
                      padding: '0 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: !selectedApp?.apiKey ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)',
                    }}
                  >
                    <WebhooksLogo size={15} weight="bold" />
                    <span>Cài đặt Webhook</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenWebhookModal}
                    style={{
                      height: 32,
                      padding: '0 12px',
                      fontSize: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontWeight: 500,
                    }}
                    title="Chỉnh sửa Webhook URL"
                  >
                    <PencilSimple size={14} weight="bold" />
                    <span>Chỉnh sửa</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chi tiết Webhook DLR khi đã cấu hình */}
            {(selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl || selectedApp?.apiKey?.webhookSecret) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginTop: 6 }}>
                {/* 1. Webhook DLR */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>
                      1. Webhook URL nhận trạng thái tin
                    </span>
                    {(selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl) ? (
                      <span style={{ fontSize: 11, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 500 }}>
                        <Check size={12} weight="bold" /> Đã kết nối
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Chưa thiết lập</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11.5,
                        color: (selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl) ? '#0f172a' : '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                      title={selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl || 'Chưa thiết lập'}
                    >
                      {selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl || 'Chưa thiết lập URL'}
                    </div>
                    {(selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedApp?.apiKey?.webhookDlrUrl || selectedApp?.apiKey?.webhookUrl);
                          setCopiedDlrUrl(true);
                          setTimeout(() => setCopiedDlrUrl(false), 2000);
                          toast.success('Đã sao chép URL');
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#64748b' }}
                        title="Sao chép URL"
                      >
                        {copiedDlrUrl ? <Check size={13} color="#059669" /> : <CopySimple size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Mã xác thực Bearer Token */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>
                      2. Mã xác thực Bearer Token
                    </span>
                    {selectedApp?.apiKey?.webhookSecret ? (
                      <span style={{ fontSize: 11, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 500 }}>
                        <Check size={12} weight="bold" /> Đã cấu hình
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Không dùng</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11.5,
                        color: selectedApp?.apiKey?.webhookSecret ? '#0f172a' : '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                      title={selectedApp?.apiKey?.webhookSecret || 'Không cấu hình mã xác thực'}
                    >
                      {selectedApp?.apiKey?.webhookSecret
                        ? (showSecretVisible ? `Bearer ${selectedApp.apiKey.webhookSecret.replace(/^Bearer\s+/i, '')}` : '••••••••••••••••')
                        : 'Không yêu cầu mã'}
                    </div>
                    {selectedApp?.apiKey?.webhookSecret && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <button
                          type="button"
                          onClick={() => setShowSecretVisible(!showSecretVisible)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#64748b' }}
                          title={showSecretVisible ? 'Ẩn mã Bearer' : 'Xem mã Bearer'}
                        >
                          {showSecretVisible ? <EyeSlash size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedApp?.apiKey?.webhookSecret.replace(/^Bearer\s+/i, ''));
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                            toast.success('Đã sao chép mã Token');
                          }}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#64748b' }}
                          title="Sao chép mã Token"
                        >
                          {copiedSecret ? <Check size={13} color="#059669" /> : <CopySimple size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                <span>Đang kiểm tra hạn mức từ nhà mạng...</span>
              </div>
            ) : isQuotaError ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b', flexWrap: 'wrap' }}>
                <WarningCircle size={16} color="#dc2626" weight="bold" />
                <span>
                  Không thể kết nối đến cổng nhà mạng: <span style={{ color: '#b91c1c' }}>{quotaError?.response?.data?.message || quotaError?.message || 'Timeout / Lỗi kết nối'}</span>
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
                Chưa có dữ liệu hạn mức từ nhà mạng. Bấm "Làm mới" để kiểm tra.
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
                        Ứng dụng liên kết này chưa có mẫu tin ZNS nào được đồng bộ từ nhà mạng
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

        {/* Modal Cài đặt / Chỉnh sửa Webhook URLs */}
        {showWebhookModal && ReactDOM.createPortal(
          <div
            className="modal-overlay"
            onClick={() => setShowWebhookModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              animation: 'fadeIn 180ms ease',
            }}
          >
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 520,
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
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, textAlign: 'left' }}>
                  Cài đặt Webhook Callback
                </h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowWebhookModal(false)}
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
                style={{
                  padding: '20px',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}
              >
                {/* Webhook DLR URL */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6, textAlign: 'left' }}>
                    Webhook URL nhận trạng thái tin
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-domain.com/webhook/zns-dlr"
                    value={webhookDlrInput}
                    onChange={(e) => setWebhookDlrInput(e.target.value)}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '8px 12px',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Mã Bearer Token Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, textAlign: 'left' }}>
                      Mã xác thực Bearer Token
                    </label>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>Tùy chọn</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSecretInputVisible ? 'text' : 'password'}
                      placeholder="Ví dụ: my_secret_token_123"
                      value={webhookSecretInput}
                      onChange={(e) => setWebhookSecretInput(e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '8px 40px 8px 12px',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretInputVisible(!showSecretInputVisible)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={showSecretInputVisible ? 'Ẩn mã xác thực' : 'Xem mã xác thực'}
                    >
                      {showSecretInputVisible ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer: Nút Hủy bên trái, Nút Lưu bên phải */}
              <div
                className="modal-footer"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  flexShrink: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowWebhookModal(false)}
                  disabled={isSavingWebhook}
                  style={{
                    fontSize: 13,
                    height: 38,
                    padding: '0 18px',
                    fontWeight: 500,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  disabled={isSavingWebhook}
                  style={{
                    height: 38,
                    padding: '0 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: isSavingWebhook ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  {isSavingWebhook ? (
                    <div className="spinner" style={{ width: 14, height: 14, borderColor: '#ffffff', borderTopColor: 'transparent' }} />
                  ) : (
                    <FloppyDisk size={16} weight="bold" />
                  )}
                  <span>{isSavingWebhook ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
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
    <div style={{ maxWidth: '100%' }}>
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
                            <>
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
                            {(app.apiKey.webhookDlrUrl || app.apiKey.webhookUrl || app.apiKey.webhookSecret) && (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  marginTop: 4,
                                  fontSize: 11,
                                  color: '#16a34a',
                                  maxWidth: 220,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={`Webhook DLR: ${app.apiKey.webhookDlrUrl || app.apiKey.webhookUrl || 'Chưa cấu hình'}\nBearer Token: ${app.apiKey.webhookSecret ? 'Đã cài đặt' : 'Không dùng'}`}
                              >
                                <WebhooksLogo size={12} weight="bold" />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {app.apiKey.webhookDlrUrl || app.apiKey.webhookUrl ? 'Webhook DLR' : 'Bearer Token'}
                                </span>
                              </div>
                            )}
                          </>
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
