import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../../hooks/useToast';
import {
  Plus, Megaphone, UploadSimple, DownloadSimple,
  FileXls, CheckCircle, WarningCircle, Info
} from '@phosphor-icons/react';
import Pagination from '../../components/Pagination';

export default function CustomerCampaigns() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [oaId, setOaId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [file, setFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Fetch campaigns
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-campaigns', page],
    queryFn: () => api.get('/customer/campaigns', { params: { page, limit: 15 } }).then(r => r.data),
  });

  // Fetch OA configs & templates for creation
  const { data: oaConfigs } = useQuery({
    queryKey: ['customer-oa-configs'],
    queryFn: () => api.get('/customer/oa-configs').then(r => r.data.data),
  });

  const selectedOA = oaConfigs?.find(o => o.id === oaId);
  const selectedTemplate = selectedOA?.templates?.find(t => String(t.templateId) === String(templateId));

  useSocket((event) => {
    if (event === 'campaign:update') refetch();
  });

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: (formData) => api.post('/customer/campaigns', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-campaigns']);
      handleCloseModal();
      toast.success('Tạo chiến dịch thành công! Đang xử lý gửi tin trong nền.');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo chiến dịch';
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setCampaignName('');
    setOaId('');
    setTemplateId('');
    setFile(null);
    setErrorMsg('');
  };

  const handleDownloadSample = () => {
    if (!selectedTemplate) return;
    const paramNames = (selectedTemplate.listParams || []).map(p => p.name);
    const headers = ['phone', ...paramNames];
    const sampleRow = ['84987654321', ...paramNames.map(p => `Gia_tri_${p}`)];

    const csvContent = '\uFEFF' + [headers.join(','), sampleRow.join(',')].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mau_chien_dich_${selectedTemplate.templateId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info('Đã tải xuống file mẫu CSV thành công');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!campaignName.trim()) {
      setErrorMsg('Vui lòng nhập tên chiến dịch');
      return;
    }
    if (!oaId) {
      setErrorMsg('Vui lòng chọn Official Account');
      return;
    }
    if (!templateId) {
      setErrorMsg('Vui lòng chọn mẫu tin nhắn');
      return;
    }
    if (!file) {
      setErrorMsg('Vui lòng chọn file Excel hoặc CSV danh sách người nhận');
      return;
    }

    const formData = new FormData();
    formData.append('name', campaignName.trim());
    formData.append('fptOaConfigId', oaId);
    formData.append('templateId', templateId);
    formData.append('file', file);

    createMutation.mutate(formData);
  };

  const statusMap = {
    PENDING: 'Chờ xử lý',
    PROCESSING: 'Đang gửi',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã huỷ'
  };

  const badgeMap = {
    PENDING: 'badge-warning',
    PROCESSING: 'badge-primary',
    COMPLETED: 'badge-success',
    CANCELLED: 'badge-neutral'
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-header-title">Chiến dịch gửi tin</h1>
          <p className="page-header-desc">Tạo và theo dõi tiến độ các chiến dịch gửi ZNS hàng loạt</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} weight="bold" />
          Tạo chiến dịch mới
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên chiến dịch</th>
                    <th>Official Account</th>
                    <th>Tổng tin</th>
                    <th>Thành công</th>
                    <th>Thất bại</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map(c => {
                    const progress = c.totalMessages > 0 ? Math.round(((c.successCount + c.failedCount) / c.totalMessages) * 100) : 0;
                    return (
                      <tr key={c.id}>
                        <td className="table-cell-bold">{c.name}</td>
                        <td style={{ fontSize: 'var(--font-size-sm)' }}>{c.fptOaConfig?.oaName || '—'}</td>
                        <td>{c.totalMessages}</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{c.successCount}</td>
                        <td style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{c.failedCount}</td>
                        <td>
                          <span className={`badge ${badgeMap[c.status]}`}>{statusMap[c.status]}</span>
                          {c.status === 'PROCESSING' && (
                            <div style={{ marginTop: 6, background: 'var(--color-gray-200)', borderRadius: 4, height: 5, width: 90 }}>
                              <div style={{ background: 'var(--color-primary)', borderRadius: 4, height: '100%', width: `${progress}%`, transition: 'width 0.3s' }} />
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                          {new Date(c.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                  {!data?.data?.length && (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        <Megaphone size={36} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                        <div className="empty-state-title">Chưa có chiến dịch nào</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
                          Bấm vào nút <strong>Tạo chiến dịch mới</strong> ở góc trên bên phải để bắt đầu gửi tin hàng loạt
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={data?.totalPages || 1}
              pageSize={15}
              totalItems={data?.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Modal Tạo Chiến Dịch */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Megaphone size={22} color="var(--color-primary)" weight="duotone" />
                Tạo chiến dịch gửi tin mới
              </div>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {errorMsg && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger-light)',
                    borderRadius: 'var(--border-radius)',
                    color: 'var(--color-danger)',
                    fontSize: 'var(--font-size-sm)',
                  }}>
                    <WarningCircle size={18} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tên chiến dịch *</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ví dụ: Chiến dịch thông báo đơn hàng Tháng 9"
                    value={campaignName}
                    onChange={e => setCampaignName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Chọn Official Account (OA) *</label>
                  <select
                    className="form-select"
                    value={oaId}
                    onChange={e => {
                      setOaId(e.target.value);
                      setTemplateId('');
                    }}
                    required
                  >
                    <option value="">-- Chọn OA gửi tin --</option>
                    {oaConfigs?.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.isSystem ? `[OA Hệ thống] ${o.oaName}` : `[OA Riêng] ${o.oaName}`}
                      </option>
                    ))}
                  </select>
                </div>

                {oaId && (
                  <div className="form-group">
                    <label className="form-label">Chọn mẫu tin nhắn (Template) *</label>
                    <select
                      className="form-select"
                      value={templateId}
                      onChange={e => setTemplateId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn template --</option>
                      {selectedOA?.templates?.map(t => (
                        <option key={t.templateId} value={t.templateId}>
                          {t.templateName} (ID: {t.templateId})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Hướng dẫn cột file khi đã chọn template */}
                {selectedTemplate && (
                  <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-gray-50)',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border-color)',
                    fontSize: 'var(--font-size-xs)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Info size={16} color="var(--color-primary)" />
                        Cấu trúc cột trong file dữ liệu:
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={handleDownloadSample}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <DownloadSimple size={14} /> Tải file mẫu CSV
                      </button>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Dòng đầu tiên của file phải chứa chính xác tên các cột sau:
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge badge-primary" style={{ fontFamily: 'monospace' }}>phone *</span>
                      {(selectedTemplate.listParams || []).map(p => (
                        <span key={p.name} className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                          {p.name} {p.require ? '*' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tải lên file Excel */}
                <div className="form-group">
                  <label className="form-label">Tải lên file danh sách (.xlsx, .xls, .csv) *</label>
                  <div
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      padding: 'var(--spacing-lg)',
                      textAlign: 'center',
                      backgroundColor: file ? 'var(--color-primary-bg)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".xlsx,.xls,.csv"
                      onChange={e => {
                        if (e.target.files?.[0]) setFile(e.target.files[0]);
                      }}
                    />
                    {file ? (
                      <div>
                        <FileXls size={36} color="var(--color-primary)" />
                        <div style={{ fontWeight: 600, marginTop: 6, color: 'var(--text-primary)' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {(file.size / 1024).toFixed(1)} KB (Bấm để chọn file khác)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <UploadSimple size={36} color="var(--text-muted)" />
                        <div style={{ fontWeight: 500, marginTop: 6, color: 'var(--text-primary)' }}>
                          Nhấp để chọn file từ máy tính
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                          Hỗ trợ định dạng .xlsx, .xls, .csv (tối đa 10MB)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={createMutation.isPending}>
                  Đóng
                </button>
                <button type="submit" className="btn btn-success" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Đang tải lên & gửi...' : 'Bắt đầu gửi chiến dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
