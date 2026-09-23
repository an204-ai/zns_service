import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  PaperPlaneTilt, CheckCircle, Warning,
  ArrowSquareOut, Megaphone, ArrowCounterClockwise
} from '@phosphor-icons/react';
import CustomSelect from '../../components/CustomSelect';

export default function CustomerSendMessage() {
  const toast = useToast();
  const [oaId, setOaId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [phone, setPhone] = useState('');
  const [params, setParams] = useState({});
  const [result, setResult] = useState(null);

  const { data: oaConfigs } = useQuery({
    queryKey: ['customer-oa-configs'],
    queryFn: () => api.get('/customer/oa-configs').then(r => r.data.data),
  });

  const selectedOA = oaConfigs?.find(o => o.id === oaId);
  const selectedTemplate = selectedOA?.templates?.find(t => String(t.templateId) === String(templateId));

  const sendMutation = useMutation({
    mutationFn: (d) => api.post('/customer/send-message', d),
    onSuccess: (r) => {
      setResult({ success: true, data: r.data.data });
      toast.success('Đã đưa tin nhắn thử nghiệm vào hàng đợi gửi thành công!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Lỗi gửi tin nhắn';
      setResult({ success: false, message: msg });
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setResult(null);
    sendMutation.mutate({
      fptAppConfigId: oaId,
      templateId: Number(templateId),
      phone: phone.trim(),
      templateData: params,
    });
  };

  const handleReset = () => {
    setPhone('');
    setParams({});
    setResult(null);
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-header-title">Gửi tin thử nghiệm</h1>
          <p className="page-header-desc">Kiểm tra gửi tin nhắn ZNS trực tiếp tới số điện thoại</p>
        </div>
        <Link to="/customer/campaigns" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <Megaphone size={16} weight="duotone" />
          Gửi tin hàng loạt
        </Link>
      </div>

      {/* Thông báo kết quả gửi tin nếu có */}
      {result && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '16px 20px',
          backgroundColor: result.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          border: `1px solid ${result.success ? 'var(--color-success-light)' : 'var(--color-danger-light)'}`,
          borderRadius: 'var(--border-radius-lg)',
          marginBottom: 'var(--spacing-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {result.success ? (
            <CheckCircle size={26} weight="fill" color="var(--color-success)" style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <Warning size={26} weight="fill" color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: result.success ? 'var(--color-success)' : 'var(--color-danger)', fontSize: 'var(--font-size-base)' }}>
              {result.success ? 'Đã đưa tin nhắn vào hàng đợi gửi thành công' : 'Gửi tin nhắn thử nghiệm thất bại'}
            </div>
            {result.success ? (
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 6 }}>
                Mã theo dõi (Tracking ID): <code style={{ background: '#ffffff', padding: '2px 8px', borderRadius: 4, fontWeight: 600, border: '1px solid var(--border-color)' }}>{result.data?.trackingId}</code>
              </div>
            ) : (
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)', marginTop: 6 }}>
                {result.message}
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {result.success && (
                <Link to="/customer/messages" className="btn btn-sm btn-secondary" style={{ fontWeight: 500 }}>
                  Xem trong Lịch sử gửi tin
                </Link>
              )}
              <button
                type="button"
                onClick={() => setResult(null)}
                className="btn btn-sm btn-secondary"
                style={{ fontWeight: 500 }}
              >
                Đóng thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form gửi thử */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-header-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PaperPlaneTilt size={20} color="var(--color-primary)" weight="duotone" />
            Cấu hình tin gửi thử nghiệm
          </div>
          <span className="badge badge-neutral" style={{ fontWeight: 500 }}>Kiểm tra nhanh</span>
        </div>

        <div className="card-body" style={{ padding: 'var(--spacing-xl)' }}>
          <form onSubmit={handleSubmit}>
            {/* Hàng 1: Chọn OA và Chọn Template */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 500 }}>Chọn ứng dụng gửi tin *</label>
                <CustomSelect
                  value={oaId}
                  onChange={(val) => {
                    setOaId(val);
                    setTemplateId('');
                    setParams({});
                  }}
                  placeholder="Chọn ứng dụng gửi tin"
                  options={(oaConfigs || []).map(o => ({
                    value: o.id,
                    label: o.oaName,
                    sublabel: o.isSystem ? 'Hệ thống' : 'Cá nhân',
                  }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 500 }}>Chọn mẫu tin nhắn (Template) *</label>
                <CustomSelect
                  value={templateId}
                  onChange={(val) => {
                    setTemplateId(val);
                    setParams({});
                  }}
                  disabled={!oaId}
                  placeholder={oaId ? 'Chọn mẫu tin nhắn' : 'Vui lòng chọn ứng dụng trước'}
                  options={(selectedOA?.templates || []).map(t => ({
                    value: t.templateId,
                    label: t.templateName,
                    sublabel: `ID: ${t.templateId}`,
                  }))}
                />
              </div>
            </div>

            {/* Chi tiết template đã chọn nếu có */}
            {selectedTemplate && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-body)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--border-color)',
                marginBottom: 'var(--spacing-md)',
                fontSize: 'var(--font-size-xs)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span><strong>Mã template:</strong> {selectedTemplate.templateId}</span>
                  <span><strong>Loại tin:</strong> {selectedTemplate.templateTag || 'Mặc định'}</span>
                  <span>
                    <strong>Chất lượng:</strong>{' '}
                    <span className={`badge ${selectedTemplate.templateQuality === 'HIGH' ? 'badge-success' : selectedTemplate.templateQuality === 'LOW' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {selectedTemplate.templateQuality || 'Đang đánh giá'}
                    </span>
                  </span>
                </div>
                {selectedTemplate.previewUrl && (
                  <a
                    href={selectedTemplate.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'var(--color-primary)',
                      fontWeight: 500,
                      textDecoration: 'none'
                    }}
                  >
                    <ArrowSquareOut size={14} /> Xem mẫu trên Zalo
                  </a>
                )}
              </div>
            )}

            {/* Hàng 2: Số điện thoại người nhận */}
            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="form-label" style={{ fontWeight: 500 }}>Số điện thoại người nhận thử nghiệm *</label>
              <input
                className="form-input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="VD: 0987654321 hoặc 84987654321"
                required
              />
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                Hỗ trợ định dạng đầu số 84 hoặc 0 (hệ thống tự động chuẩn hoá sang định dạng Zalo)
              </div>
            </div>

            {/* Hàng 3: Các tham số biến của template */}
            {selectedTemplate?.listParams && selectedTemplate.listParams.length > 0 && (
              <div style={{
                padding: 'var(--spacing-md)',
                background: 'var(--bg-body)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)',
                marginBottom: 'var(--spacing-lg)',
              }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
                  Tham số nội dung mẫu tin ({selectedTemplate.listParams.length} tham số)
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: selectedTemplate.listParams.length > 1 ? '1fr 1fr' : '1fr',
                  gap: 'var(--spacing-sm)'
                }}>
                  {selectedTemplate.listParams.map(p => (
                    <div key={p.name}>
                      <label className="form-label" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 3 }}>
                        {p.name} {p.require && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                      </label>
                      <input
                        className="form-input"
                        value={params[p.name] || ''}
                        onChange={e => setParams({ ...params, [p.name]: e.target.value })}
                        required={p.require}
                        maxLength={p.maxLength || undefined}
                        placeholder={`Nhập ${p.name}`}
                        style={{ fontSize: 'var(--font-size-sm)' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hàng 4: Nút Gửi tin & Nút Đặt lại */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={sendMutation.isPending || !oaId || !templateId}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 600,
                  backgroundColor: '#1e3a8a',
                  borderColor: '#1e3a8a',
                  color: '#ffffff',
                }}
              >
                <PaperPlaneTilt size={20} weight="fill" />
                {sendMutation.isPending ? 'Đang gửi tin thử...' : 'Gửi tin thử nghiệm'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={sendMutation.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 500,
                  padding: '0 20px',
                }}
              >
                <ArrowCounterClockwise size={16} />
                Xóa nhập lại
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
