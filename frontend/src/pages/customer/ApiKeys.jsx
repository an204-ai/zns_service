import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Plus, CopySimple, Power, Trash } from '@phosphor-icons/react';

export default function CustomerApiKeys() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customer-api-keys'],
    queryFn: () => api.get('/customer/api-keys').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (name) => api.post('/customer/api-keys', { keyName: name }),
    onSuccess: (r) => {
      setNewKey(r.data.data);
      queryClient.invalidateQueries(['customer-api-keys']);
      toast.success('Tạo API Key mới thành công!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo API Key');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.patch(`/customer/api-keys/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-api-keys']);
      toast.success('Đã cập nhật trạng thái API Key');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái API Key');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customer/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['customer-api-keys']);
      toast.success('Đã xóa API Key thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa API Key');
    },
  });

  const copyKey = () => {
    navigator.clipboard.writeText(newKey.apiKey);
    setCopied(true);
    toast.success('Đã sao chép API Key vào bộ nhớ tạm!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-header-title">Quản lý API Key</h1>
          <p className="page-header-desc">Khóa bảo mật dùng để gửi tin ZNS qua hệ thống API</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setNewKey(null); setKeyName(''); }}>
          <Plus size={18} weight="bold" /> Tạo API Key mới
        </button>
      </div>

      <div className="card">
        {isLoading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Tên</th><th>Prefix</th><th>Trạng thái</th><th>Lần dùng cuối</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
              <tbody>
                {data?.map(k => (
                  <tr key={k.id}>
                    <td className="table-cell-bold">{k.keyName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{k.prefix}...</td>
                    <td><span className={`badge ${k.isActive ? 'badge-success' : 'badge-neutral'}`}>{k.isActive ? 'Hoạt động' : 'Vô hiệu'}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('vi-VN') : 'Chưa sử dụng'}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(k.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className={`btn btn-sm ${k.isActive ? 'btn-secondary' : 'btn-success'}`} onClick={() => toggleMutation.mutate(k.id)}>
                          <Power size={14} /> {k.isActive ? 'Vô hiệu' : 'Kích hoạt'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => { if (confirm('Bạn chắc chắn muốn xoá API Key này?')) deleteMutation.mutate(k.id); }}>
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.length && <tr><td colSpan={6} className="empty-state"><div className="empty-state-title">Chưa có API Key</div><div className="empty-state-text">Tạo API Key để tích hợp với hệ thống của bạn</div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{newKey ? 'API Key đã tạo thành công' : 'Tạo API Key mới'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {newKey ? (
                <div>
                  <div style={{ padding: '12px 16px', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-light)', borderRadius: 'var(--border-radius)', marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-warning)' }}>
                    Vui lòng sao chép API Key ngay bây giờ. Bạn sẽ không thể xem lại sau khi đóng.
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="form-input" value={newKey.apiKey} readOnly style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }} />
                    <button className="btn btn-primary btn-sm" onClick={copyKey}>
                      <CopySimple size={16} /> {copied ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); createMutation.mutate(keyName); }}>
                  <div className="form-group">
                    <label className="form-label">Tên API Key</label>
                    <input className="form-input" value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="VD: Website chính, CRM" required />
                  </div>
                  <button type="submit" className="btn btn-success" disabled={createMutation.isPending}>Tạo API Key</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
