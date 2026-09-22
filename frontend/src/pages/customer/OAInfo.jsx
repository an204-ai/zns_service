import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  Key,
  ArrowsClockwise,
  CopySimple,
  Check,
  Code,
  CheckCircle,
  WarningCircle,
  X,
  Broadcast,
  ShieldCheck,
  Sparkle
} from '@phosphor-icons/react';

export default function CustomerOAInfo() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [newlyRegeneratedKey, setNewlyRegeneratedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showGuideOaId, setShowGuideOaId] = useState(null);

  const { data: oaConfigs, isLoading, refetch } = useQuery({
    queryKey: ['customer-oa-configs'],
    queryFn: () => api.get('/customer/oa-configs').then(r => r.data.data),
  });

  const regenerateMutation = useMutation({
    mutationFn: (oaId) => api.post(`/customer/oa-configs/${oaId}/regenerate-key`),
    onSuccess: (r) => {
      refetch();
      setNewlyRegeneratedKey(r.data.data);
      toast.success('Đã cấp lại API Key ngẫu nhiên mới cho OA này');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi cấp lại API Key');
    },
  });

  const handleCopyNewKey = () => {
    if (!newlyRegeneratedKey?.apiKey) return;
    navigator.clipboard.writeText(newlyRegeneratedKey.apiKey);
    setCopiedKey(true);
    toast.success('Đã sao chép API Key vào bộ nhớ tạm');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-header-title">Quản lý OA và API Key</h1>
          <p className="page-header-desc">
            Thông tin tài khoản Zalo OA, khóa bảo mật API Key kết nối và danh sách mẫu tin ZNS
          </p>
        </div>
      </div>

      {!oaConfigs?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-title">Chưa có Zalo OA nào được liên kết</div>
            <div className="empty-state-text">
              Vui lòng liên hệ ban quản trị hệ thống để được gán Zalo OA phục vụ gửi tin ZNS
            </div>
          </div>
        </div>
      ) : (
        oaConfigs.map((oa) => {
          const isSystem = oa.isSystem;
          const apiKey = oa.apiKey;
          const templates = oa.templates || [];
          const quota = oa.quotaInfo;
          const isGuideOpen = showGuideOaId === oa.id;

          return (
            <div
              className="card"
              key={oa.id}
              style={{
                marginBottom: 'var(--spacing-lg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden'
              }}
            >
              {/* Header Card: OA Name, Type, Status */}
              <div
                style={{
                  padding: 'var(--spacing-md) var(--spacing-lg)',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--color-gray-50)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--spacing-md)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--border-radius-md)',
                      background: isSystem ? 'var(--color-primary-light)' : 'var(--color-success-light)',
                      color: isSystem ? 'var(--color-primary)' : 'var(--color-success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isSystem ? <ShieldCheck size={24} weight="duotone" /> : <Broadcast size={24} weight="duotone" />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {oa.oaName}
                      </span>
                      {isSystem ? (
                        <span className="badge badge-primary" style={{ fontSize: 11, fontWeight: 600 }}>
                          OA Hệ thống
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: 11, fontWeight: 600 }}>
                          OA Riêng
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      Mã OA: {oa.oaId || 'Chưa cập nhật'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} weight="fill" />
                    Đang hoạt động
                  </span>
                  <button
                    className={`btn btn-sm ${isGuideOpen ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setShowGuideOaId(isGuideOpen ? null : oa.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Code size={16} weight="bold" />
                    {isGuideOpen ? 'Ẩn mẫu gọi API' : 'Mẫu gọi API'}
                  </button>
                </div>
              </div>

              {/* Sub-block 1: API Key Section */}
              <div
                style={{
                  padding: 'var(--spacing-md) var(--spacing-lg)',
                  borderBottom: '1px solid var(--border-color)',
                  background: '#fafbfc'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--border-radius-sm)',
                        background: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Key size={18} weight="bold" />
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
                        API Key dành riêng cho OA này
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <code
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            padding: '3px 8px',
                            background: '#f1f5f9',
                            borderRadius: 'var(--border-radius-sm)',
                            border: '1px solid #e2e8f0',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {apiKey?.prefix ? `${apiKey.prefix}••••••••••••••••••••••••••••••••` : 'Chưa khởi tạo'}
                        </code>
                        {apiKey?.isActive && (
                          <span className="badge badge-success" style={{ fontSize: 11 }}>
                            Hoạt động
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn cấp lại API Key cho OA "${oa.oaName}"? Khóa cũ sẽ ngay lập tức bị vô hiệu hóa.`)) {
                          regenerateMutation.mutate(oa.id);
                        }
                      }}
                      disabled={regenerateMutation.isPending}
                    >
                      <ArrowsClockwise size={15} weight="bold" className={regenerateMutation.isPending ? 'spin' : ''} />
                      Cấp lại API Key mới
                    </button>
                  </div>
                </div>

                {/* API Quick Usage helper */}
                {isGuideOpen && (
                  <div
                    style={{
                      marginTop: 'var(--spacing-md)',
                      padding: 'var(--spacing-md)',
                      background: '#1e293b',
                      borderRadius: 'var(--border-radius-md)',
                      color: '#f8fafc',
                      fontSize: 'var(--font-size-xs)',
                      overflowX: 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, color: '#94a3b8' }}>
                      <span style={{ fontWeight: 600 }}>Ví dụ cURL gửi tin ZNS bằng API Key của OA này:</span>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12
                        }}
                        onClick={() => {
                          const sample = `curl -X POST "${window.location.origin}/api/v1/zns/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey?.prefix || 'YOUR_API_KEY'}..." \\
  -d '{
    "phone": "84901234567",
    "templateId": "${templates[0]?.templateId || '123456'}",
    "templateData": { "name": "Nguyen Van A" }
  }'`;
                          navigator.clipboard.writeText(sample);
                          toast.success('Đã sao chép lệnh cURL mẫu');
                        }}
                      >
                        <CopySimple size={14} /> Sao chép cURL
                      </button>
                    </div>
                    <pre style={{ margin: 0, fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
{`curl -X POST "${window.location.origin}/api/v1/zns/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey?.prefix || 'YOUR_API_KEY'}..." \\
  -d '{
    "phone": "84901234567",
    "templateId": "${templates[0]?.templateId || 'ID_MAU_TIN'}",
    "templateData": {
      "customer_name": "Nguyen Van A",
      "order_code": "DH1001"
    }
  }'`}
                    </pre>
                  </div>
                )}
              </div>

              {/* Sub-block 2: Quota Information */}
              {quota && (
                <div
                  style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--color-white)',
                    display: 'flex',
                    gap: 'var(--spacing-xl)',
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block' }}>
                      Hạn mức gửi tin hàng ngày
                    </span>
                    <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {quota.dailyQuota ? quota.dailyQuota.toLocaleString('vi-VN') : 'Không giới hạn'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block' }}>
                      Hạn mức còn lại trong ngày
                    </span>
                    <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-success)' }}>
                      {quota.remainingQuota ? quota.remainingQuota.toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                </div>
              )}

              {/* Sub-block 3: Templates Table */}
              <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Danh sách mẫu tin nhắn ZNS đã được duyệt ({templates.length})
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>Mã Template ID</th>
                        <th style={{ width: '25%' }}>Tên mẫu tin</th>
                        <th style={{ width: '15%' }}>Loại mẫu tin</th>
                        <th style={{ width: '30%' }}>Tham số truyền vào</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((t) => (
                        <tr key={t.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {t.templateId}
                          </td>
                          <td className="table-cell-bold">{t.templateName}</td>
                          <td>
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
                            <span className="badge badge-success">Kích hoạt</span>
                          </td>
                        </tr>
                      ))}

                      {!templates.length && (
                        <tr>
                          <td colSpan={5} className="empty-state" style={{ padding: 'var(--spacing-md)' }}>
                            <div className="empty-state-text">Chưa có mẫu tin nào được đồng bộ cho OA này</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Modal Hiển thị API Key mới sau khi cấp lại */}
      {newlyRegeneratedKey && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkle size={20} color="var(--color-success)" weight="fill" />
                <h3 className="modal-title">API Key mới đã được tạo</h3>
              </div>
              <button
                className="modal-close"
                onClick={() => setNewlyRegeneratedKey(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  padding: 'var(--spacing-md)',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--border-radius-md)',
                  marginBottom: 'var(--spacing-md)',
                  display: 'flex',
                  gap: 10
                }}
              >
                <WarningCircle size={20} color="#b45309" weight="fill" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 'var(--font-size-xs)', color: '#92400e', lineHeight: 1.5 }}>
                  <strong>Lưu ý quan trọng:</strong> Vì lý do bảo mật, chuỗi API Key này chỉ được hiển thị <strong>một lần duy nhất</strong>. Vui lòng sao chép và lưu trữ cẩn thận vào hệ thống của bạn.
                </div>
              </div>

              <label className="form-label" style={{ fontWeight: 600 }}>Chuỗi API Key bí mật</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value={newlyRegeneratedKey.apiKey}
                  style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13, background: '#f8fafc' }}
                />
                <button
                  type="button"
                  className={`btn ${copiedKey ? 'btn-success' : 'btn-primary'}`}
                  onClick={handleCopyNewKey}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                >
                  {copiedKey ? <Check size={16} weight="bold" /> : <CopySimple size={16} weight="bold" />}
                  {copiedKey ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>

              <div style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                Sử dụng API Key này truyền vào HTTP Header: <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>x-api-key: {newlyRegeneratedKey.apiKey}</code>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setNewlyRegeneratedKey(null)}
              >
                Tôi đã lưu API Key an toàn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

