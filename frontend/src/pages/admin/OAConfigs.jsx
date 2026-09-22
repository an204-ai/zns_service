import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  Plus,
  ArrowsClockwise,
  ShieldCheck,
  Trash,
  Power,
  X,
  Users
} from '@phosphor-icons/react';

export default function AdminOAConfigs() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Modal OA Hệ thống
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [systemForm, setSystemForm] = useState({ oaName: '', fptAppId: '', fptSecretKey: '' });
  const [systemErrorMsg, setSystemErrorMsg] = useState('');

  // Danh sách OA Hệ thống
  const { data: systemOAs, isLoading } = useQuery({
    queryKey: ['admin-oa-system'],
    queryFn: () => api.get('/admin/oa-configs/system').then(r => r.data.data),
  });

  // Tạo OA Hệ thống mutation
  const createSystemMutation = useMutation({
    mutationFn: (d) => api.post('/admin/oa-configs/system', d),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-oa-system']);
      setShowSystemModal(false);
      setSystemForm({ oaName: '', fptAppId: '', fptSecretKey: '' });
      toast.success('Thêm OA Hệ thống thành công và đã đồng bộ mẫu tin!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo OA Hệ thống';
      setSystemErrorMsg(msg);
      toast.error(msg);
    },
  });

  // Đồng bộ templates & OA info
  const syncMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/oa-configs/${id}/sync`),
    onSuccess: (r) => {
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success(`Đồng bộ thành công! Đã cập nhật ${r.data.data.templatesCount || 0} mẫu tin.`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi đồng bộ cấu hình OA');
    },
  });

  // Cập nhật trạng thái OA
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/oa-configs/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success(vars.status === 'ACTIVE' ? 'Đã kích hoạt OA hệ thống' : 'Đã tạm dừng OA hệ thống');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    },
  });

  // Xóa OA hệ thống
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/oa-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success('Đã xóa OA hệ thống thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa OA hệ thống');
    },
  });

  const handleCreateSystemOA = (e) => {
    e.preventDefault();
    setSystemErrorMsg('');
    if (!systemForm.oaName.trim() || !systemForm.fptAppId.trim() || !systemForm.fptSecretKey.trim()) {
      setSystemErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }
    createSystemMutation.mutate(systemForm);
  };

  return (
    <div>
      {/* Page Header Row */}
      <div className="page-header-row">
        <div>
          <h1 className="page-header-title">Quản lý OA hệ thống</h1>
          <p className="page-header-desc">
            Cấu hình và đồng bộ các Zalo OA của hệ thống dùng chung cho khách hàng
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
          onClick={() => {
            setShowSystemModal(true);
            setSystemErrorMsg('');
            setSystemForm({ oaName: '', fptAppId: '', fptSecretKey: '' });
          }}
        >
          <Plus size={18} weight="bold" /> Thêm OA hệ thống
        </button>
      </div>

      {/* System OAs Table */}
      <div className="card">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên gợi nhớ OA</th>
                  <th>Mã OA</th>
                  <th>App ID</th>
                  <th>Khách hàng đang dùng</th>
                  <th>Mẫu tin</th>
                  <th>Trạng thái</th>
                  <th>Lần đồng bộ</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {systemOAs?.map(oa => (
                  <tr key={oa.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--border-radius)',
                            background: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          OA
                        </div>
                        <div>
                          <div className="table-cell-bold">{oa.oaName}</div>
                          <span className="badge badge-primary" style={{ fontSize: '10px', padding: '1px 6px', marginTop: 2 }}>
                            OA Hệ thống
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                      {oa.oaId || 'Chưa cập nhật'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                      {oa.fptAppId}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--text-secondary)',
                          background: 'var(--color-gray-100)',
                          padding: '3px 8px',
                          borderRadius: 'var(--border-radius-sm)',
                        }}
                      >
                        <Users size={14} color="#2563eb" />
                        <strong>{oa._count?.assignments || 0}</strong> khách hàng
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {oa._count?.templates || 0} template
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${oa.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                        {oa.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      {oa.syncedAt ? new Date(oa.syncedAt).toLocaleString('vi-VN') : 'Chưa đồng bộ'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          title="Đồng bộ mẫu tin"
                          disabled={syncMutation.isPending}
                          onClick={() => syncMutation.mutate(oa.id)}
                        >
                          <ArrowsClockwise size={14} className={syncMutation.isPending ? 'spin' : ''} />
                          Đồng bộ
                        </button>
                        <button
                          className={`btn btn-sm ${oa.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'}`}
                          title={oa.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}
                          onClick={() => toggleStatusMutation.mutate({
                            id: oa.id,
                            status: oa.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                          })}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          title="Xóa OA hệ thống"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa OA Hệ thống "${oa.oaName}"?`)) {
                              deleteMutation.mutate(oa.id);
                            }
                          }}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!systemOAs?.length && (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      <div className="empty-state-title">Chưa có OA Hệ thống</div>
                      <div className="empty-state-text">
                        Thêm OA Zalo của hệ thống để gắn cho các khách hàng không có OA riêng
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Thêm OA Hệ thống */}
      {showSystemModal && (
        <div className="modal-overlay" onClick={() => setShowSystemModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="#2563eb" weight="fill" />
                <h2 className="modal-title">Thêm OA Hệ thống mới</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowSystemModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSystemOA}>
              <div className="modal-body">
                {systemErrorMsg && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      padding: '10px 14px',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-xs)',
                      marginBottom: 'var(--spacing-md)',
                    }}
                  >
                    {systemErrorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tên gợi nhớ OA *</label>
                  <input
                    className="form-input"
                    placeholder="Ví dụ: Zalo OA Tổng Hệ Thống"
                    value={systemForm.oaName}
                    onChange={e => setSystemForm({ ...systemForm, oaName: e.target.value })}
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                    Tên phân biệt giúp bạn nhận diện OA này trong danh sách
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">FPT App ID *</label>
                  <input
                    className="form-input"
                    placeholder="App ID cung cấp bởi FPT"
                    value={systemForm.fptAppId}
                    onChange={e => setSystemForm({ ...systemForm, fptAppId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">FPT Secret Key *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Secret Key cung cấp bởi FPT"
                    value={systemForm.fptSecretKey}
                    onChange={e => setSystemForm({ ...systemForm, fptSecretKey: e.target.value })}
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                    Khóa bí mật sẽ được mã hóa chuẩn AES 256 GCM trước khi lưu vào cơ sở dữ liệu
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSystemModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createSystemMutation.isPending}
                >
                  {createSystemMutation.isPending ? 'Đang kết nối FPT...' : 'Lưu OA hệ thống'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
