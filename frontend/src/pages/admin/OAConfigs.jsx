import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  Plus,
  ShieldCheck,
  Trash,
  X,
  Users,
  Eye
} from '@phosphor-icons/react';

export default function AdminOAConfigs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Modal: Thêm OA Hệ thống
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [systemForm, setSystemForm] = useState({ oaName: '', fptAppId: '', fptSecretKey: '' });
  const [systemErrorMsg, setSystemErrorMsg] = useState('');

  // Danh sách ứng dụng hệ thống
  const { data: systemOAs, isLoading } = useQuery({
    queryKey: ['admin-oa-system'],
    queryFn: () => api.get('/admin/oa-configs/system').then(r => r.data.data),
  });

  // Tạo ứng dụng hệ thống mutation
  const createSystemMutation = useMutation({
    mutationFn: (d) => api.post('/admin/oa-configs/system', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-oa-system']);
      setShowSystemModal(false);
      setSystemForm({ oaName: '', fptAppId: '', fptSecretKey: '' });
      toast.success(res.data?.message || 'Thêm ứng dụng thành công!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo ứng dụng';
      setSystemErrorMsg(msg);
      toast.error(msg);
    },
  });

  // Xóa ứng dụng hệ thống
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/oa-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success('Đã xóa ứng dụng thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa ứng dụng');
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
      <div className="console-section-header">
        <h1 className="console-section-title">Quản lý ứng dụng</h1>
        <p className="console-section-desc">
          Cấu hình và đồng bộ các ứng dụng kết nối Zalo Official Account từ cổng FPT Telecom dùng chung cho các khách hàng
        </p>
      </div>

      <div className="console-toolbar">
        <div className="console-toolbar-left" />
        <div className="console-toolbar-right">
          <button
            type="button"
            className="console-primary-btn"
            onClick={() => {
              setShowSystemModal(true);
              setSystemErrorMsg('');
              setSystemForm({ oaName: '', fptAppId: '', fptSecretKey: '' });
            }}
          >
            <Plus size={16} weight="bold" /> Thêm ứng dụng
          </button>
        </div>
      </div>

      {/* System Applications Table */}
      <div className="console-card-table">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>#</th>
                  <th style={{ width: '32%', textAlign: 'left' }}>Tên ứng dụng</th>
                  <th style={{ width: '18%', textAlign: 'center' }}>Mã Zalo OA</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>Khách hàng</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Mẫu tin</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {systemOAs?.map((oa, index) => (
                  <tr
                    key={oa.id}
                    className="clickable-row"
                    onClick={() => navigate(`/admin/oa-configs/${oa.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="table-col-index">{index + 1}</td>
                    <td>
                      <div>
                        <span
                          className="table-cell-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/oa-configs/${oa.id}`);
                          }}
                        >
                          {oa.oaName}
                        </span>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                          App ID: <span style={{ fontFamily: 'monospace' }}>{oa.fptAppId}</span>
                        </div>
                        <span className="badge badge-primary" style={{ fontSize: 10, padding: '1px 6px', marginTop: 3, display: 'inline-block' }}>
                          Ứng dụng hệ thống
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12.5, fontWeight: 500 }}>
                      {oa.oaId || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: '#334155',
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: 4,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Users size={13} color="#2563eb" />
                        <strong>{oa._count?.assignments || 0}</strong> khách
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-neutral" style={{ whiteSpace: 'nowrap' }}>
                        {oa._count?.templates || 0} mẫu
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {oa.status === 'ACTIVE' ? (
                        <span className="badge-active-pill" style={{ whiteSpace: 'nowrap' }}>Đang hoạt động</span>
                      ) : (
                        <span className="badge-inactive-pill" style={{ whiteSpace: 'nowrap' }}>Tạm dừng</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          title="Xem chi tiết ứng dụng"
                          onClick={() => navigate(`/admin/oa-configs/${oa.id}`)}
                          style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        >
                          <Eye size={14} />
                          <span>Chi tiết</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          title="Xóa ứng dụng"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa ứng dụng "${oa.oaName}"?`)) {
                              deleteMutation.mutate(oa.id);
                            }
                          }}
                          style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center' }}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!systemOAs?.length && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      <div className="empty-state-title">Chưa có ứng dụng nào</div>
                      <div className="empty-state-text">
                        Thêm ứng dụng kết nối Zalo OA từ cổng FPT Telecom để cấu hình gửi tin ZNS
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Thêm ứng dụng */}
      {showSystemModal && (
        <div className="modal-overlay" onClick={() => setShowSystemModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="#2563eb" weight="fill" />
                <h2 className="modal-title">Thêm ứng dụng mới</h2>
              </div>
              <button
                type="button"
                className="modal-close"
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
                  <label className="form-label" style={{ fontWeight: 500 }}>Tên ứng dụng *</label>
                  <input
                    className="form-input"
                    placeholder="Ví dụ: CloudVerify hoặc Ứng dụng test"
                    value={systemForm.oaName}
                    onChange={e => setSystemForm({ ...systemForm, oaName: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                    Tên ứng dụng đồng bộ theo thông tin trên cổng FPT fns.fpt.work
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>App ID *</label>
                  <input
                    className="form-input"
                    placeholder="Lấy từ fns.fpt.work (VD: 1790070220)"
                    value={systemForm.fptAppId}
                    onChange={e => setSystemForm({ ...systemForm, fptAppId: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Secret Key *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Lấy từ fns.fpt.work"
                    value={systemForm.fptSecretKey}
                    onChange={e => setSystemForm({ ...systemForm, fptSecretKey: e.target.value })}
                    required
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
                  {createSystemMutation.isPending ? 'Đang kết nối FPT...' : 'Lưu ứng dụng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
