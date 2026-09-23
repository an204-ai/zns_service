import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  ArrowLeft,
  User,
  Buildings,
  Phone,
  EnvelopeSimple,
  CalendarBlank,
  Key,
  ArrowsClockwise,
  Trash,
  Plus,
  Lock,
  LockOpen,
  X,
  CopySimple,
  Check,
  ShieldCheck,
  Broadcast,
  Sparkle,
  Info
} from '@phosphor-icons/react';

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Modals state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSystemOaModal, setShowSystemOaModal] = useState(false);
  const [selectedSystemOaId, setSelectedSystemOaId] = useState('');
  
  const [showPrivateOaModal, setShowPrivateOaModal] = useState(false);
  const [privateOaForm, setPrivateOaForm] = useState({ oaName: '', fptAppId: '', fptSecretKey: '' });
  const [privateOaError, setPrivateOaError] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch Customer Details
  const { data: customer, isLoading, refetch } = useQuery({
    queryKey: ['admin-customer-detail', id],
    queryFn: () => api.get(`/admin/customers/${id}`).then(r => r.data.data),
  });

  // Fetch System OAs for assignment dropdown
  const { data: systemOAs } = useQuery({
    queryKey: ['admin-oa-system'],
    queryFn: () => api.get('/admin/oa-configs/system').then(r => r.data.data),
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (newStatus) => api.patch(`/admin/customers/${id}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-customer-detail', id]);
      queryClient.invalidateQueries(['admin-customers']);
      toast.success('Đã cập nhật trạng thái tài khoản khách hàng');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái');
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (pwd) => api.post(`/admin/customers/${id}/reset-password`, { newPassword: pwd }),
    onSuccess: () => {
      setShowPasswordModal(false);
      setNewPassword('');
      toast.success('Đổi mật khẩu thành công!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    },
  });

  // Assign System OA mutation
  const assignSystemMutation = useMutation({
    mutationFn: (oaConfigId) => api.post(`/admin/customers/${id}/assign-system-oa`, { oaConfigId }),
    onSuccess: () => {
      refetch();
      setShowSystemOaModal(false);
      setSelectedSystemOaId('');
      toast.success('Đã gán ứng dụng hệ thống và tự động cấp API Key cho khách hàng!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gán ứng dụng hệ thống');
    },
  });

  // Unassign System OA mutation
  const unassignSystemMutation = useMutation({
    mutationFn: (oaId) => api.delete(`/admin/customers/${id}/assign-system-oa/${oaId}`),
    onSuccess: () => {
      refetch();
      toast.success('Đã gỡ ứng dụng hệ thống khỏi khách hàng');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gỡ ứng dụng hệ thống');
    },
  });

  // Create Private OA mutation
  const createPrivateMutation = useMutation({
    mutationFn: (formData) => api.post(`/admin/customers/${id}/private-oa`, formData),
    onSuccess: () => {
      refetch();
      setShowPrivateOaModal(false);
      setPrivateOaForm({ oaName: '', fptAppId: '', fptSecretKey: '' });
      toast.success('Tạo ứng dụng riêng thành công và đã tự động cấp API Key!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Không thể tạo ứng dụng riêng. Vui lòng kiểm tra lại FPT App ID và Secret Key';
      setPrivateOaError(msg);
      toast.error(msg);
    },
  });

  // Delete Private OA mutation
  const deletePrivateMutation = useMutation({
    mutationFn: (oaId) => api.delete(`/admin/customers/${id}/private-oa/${oaId}`),
    onSuccess: () => {
      refetch();
      toast.success('Đã xóa ứng dụng riêng khỏi khách hàng');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa ứng dụng riêng');
    },
  });

  // Regenerate API Key mutation
  const regenerateKeyMutation = useMutation({
    mutationFn: (oaId) => api.post(`/admin/customers/${id}/oas/${oaId}/regenerate-key`),
    onSuccess: (r) => {
      refetch();
      setNewlyGeneratedKey(r.data.data.apiKey);
      toast.success('Đã cấp lại API Key ngẫu nhiên mới cho ứng dụng này!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi cấp lại API Key');
    },
  });

  // Sync templates mutation
  const syncMutation = useMutation({
    mutationFn: (oaId) => api.post(`/admin/oa-configs/${oaId}/sync`),
    onSuccess: (r) => {
      refetch();
      toast.success(`Đồng bộ thành công! Có ${r.data.data.templatesCount || 0} mẫu tin.`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi đồng bộ mẫu tin');
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: () => api.delete(`/admin/customers/${id}`),
    onSuccess: () => {
      toast.success('Đã xóa khách hàng thành công');
      navigate('/admin/customers');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa khách hàng');
    },
  });

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-title">Không tìm thấy khách hàng</div>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/customers')}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const assignedSystemOaIds = (customer.allOAs || [])
    .filter(oa => oa.type === 'SYSTEM')
    .map(oa => oa.id);

  const availableSystemOAs = (systemOAs || []).filter(
    oa => !assignedSystemOaIds.includes(oa.id) && oa.status === 'ACTIVE'
  );

  return (
    <div>
      {/* Top navigation back button */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => navigate('/admin/customers')}
        >
          <ArrowLeft size={16} /> Danh sách khách hàng
        </button>
      </div>

      {/* Customer Header Row */}
      <div className="page-header-row" style={{ alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-header-title" style={{ margin: 0 }}>{customer.fullName}</h1>
            <span className={`badge ${customer.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
              {customer.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
            </span>
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#2563eb',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease',
              }}
              title="Bấm để xem đầy đủ thông tin tài khoản"
            >
              <Info size={15} weight="bold" />
            </button>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {customer.companyName && <span>{customer.companyName}</span>}
            {customer.companyName && <span>•</span>}
            <span>{customer.email}</span>
            {customer.phone && (
              <>
                <span>•</span>
                <span>{customer.phone}</span>
              </>
            )}
            <span>•</span>
            <span>Khởi tạo: {new Date(customer.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowPasswordModal(true);
              setNewPassword('');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Lock size={15} /> Đổi mật khẩu
          </button>

          <button
            type="button"
            className={`btn ${customer.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'}`}
            onClick={() => {
              const nextStatus = customer.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
              const actionName = nextStatus === 'BLOCKED' ? 'khóa' : 'mở khóa';
              if (window.confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản "${customer.fullName}"?`)) {
                toggleStatusMutation.mutate(nextStatus);
              }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {customer.status === 'ACTIVE' ? <Lock size={15} /> : <LockOpen size={15} />}
            {customer.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa khách hàng "${customer.fullName}"? Tất cả dữ liệu, OA riêng và tin nhắn liên quan sẽ bị xóa vĩnh viễn!`)) {
                deleteCustomerMutation.mutate();
              }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Trash size={15} /> Xóa tài khoản
          </button>
        </div>
      </div>

      {/* Section: Zalo OAs & Attached API Keys */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <span className="card-header-title">Danh sách Ứng dụng liên kết và API Key ({customer.allOAs?.length || 0})</span>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowSystemOaModal(true)}
            >
              <ShieldCheck size={16} color="#2563eb" weight="fill" />
              Gán ứng dụng hệ thống
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                setShowPrivateOaModal(true);
                setPrivateOaError('');
                setPrivateOaForm({ oaName: '', fptAppId: '', fptSecretKey: '' });
              }}
            >
              <Plus size={16} weight="bold" />
              Thêm ứng dụng riêng
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Ứng dụng liên kết</th>
                <th>Loại ứng dụng</th>
                <th>App ID</th>
                <th>API Key của ứng dụng</th>
                <th>Mẫu tin</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(customer.allOAs || []).map(oa => (
                <tr key={oa.id}>
                  <td>
                    <div>
                      <div className="table-cell-bold">{oa.oaName}</div>
                      {oa.oaId && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          OA ID: {oa.oaId}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {oa.type === 'SYSTEM' ? (
                      <span className="badge badge-primary">Ứng dụng hệ thống</span>
                    ) : (
                      <span className="badge badge-success">Ứng dụng riêng</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                    {oa.fptAppId}
                  </td>
                  <td>
                    {oa.apiKey ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <code
                          style={{
                            background: 'var(--color-gray-100)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#1e293b',
                          }}
                        >
                          {oa.apiKey.prefix}...
                        </code>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          title="Cấp lại API Key ngẫu nhiên mới cho ứng dụng này"
                          disabled={regenerateKeyMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Cấp lại mã API Key mới cho ứng dụng "${oa.oaName}"? Mã cũ sẽ lập tức bị vô hiệu hóa.`)) {
                              regenerateKeyMutation.mutate(oa.id);
                            }
                          }}
                        >
                          <ArrowsClockwise size={13} /> Cấp lại
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        Đang khởi tạo...
                      </span>
                    )}
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
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        title="Đồng bộ mẫu tin từ FPT"
                        disabled={syncMutation.isPending}
                        onClick={() => syncMutation.mutate(oa.id)}
                      >
                        <ArrowsClockwise size={13} className={syncMutation.isPending ? 'spin' : ''} />
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        title={oa.type === 'SYSTEM' ? 'Gỡ ứng dụng hệ thống' : 'Xóa ứng dụng riêng'}
                        onClick={() => {
                          if (oa.type === 'SYSTEM') {
                            if (window.confirm(`Bạn có chắc muốn gỡ ứng dụng hệ thống "${oa.oaName}" khỏi khách hàng này?`)) {
                              unassignSystemMutation.mutate(oa.id);
                            }
                          } else {
                            if (window.confirm(`Bạn có chắc muốn xóa vĩnh viễn ứng dụng riêng "${oa.oaName}" khỏi khách hàng này?`)) {
                              deletePrivateMutation.mutate(oa.id);
                            }
                          }
                        }}
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!customer.allOAs?.length && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <div className="empty-state-title">Khách hàng chưa có ứng dụng liên kết nào</div>
                    <div className="empty-state-text">
                      Bấm vào "Gán ứng dụng hệ thống" hoặc "Thêm ứng dụng riêng" ở trên để kết nối cho khách hàng
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Gán OA Hệ thống */}
      {showSystemOaModal && (
        <div className="modal-overlay" onClick={() => setShowSystemOaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="#2563eb" weight="fill" />
                <h2 className="modal-title">Gán ứng dụng hệ thống cho khách hàng</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowSystemOaModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Chọn một ứng dụng hệ thống đang hoạt động để cấp quyền gửi tin cho <strong>{customer.fullName}</strong>:
              </p>

              <div className="form-group">
                <label className="form-label">Chọn ứng dụng hệ thống *</label>
                <select
                  className="form-input"
                  value={selectedSystemOaId}
                  onChange={e => setSelectedSystemOaId(e.target.value)}
                >
                  <option value="">-- Chọn ứng dụng hệ thống --</option>
                  {availableSystemOAs.map(oa => (
                    <option key={oa.id} value={oa.id}>
                      {oa.oaName} (Mã OA: {oa.oaId || 'N/A'}) - {oa._count?.templates || 0} mẫu tin
                    </option>
                  ))}
                </select>
                {!availableSystemOAs.length && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: '#ea580c', marginTop: 4, display: 'block' }}>
                    Không có ứng dụng hệ thống nào khả dụng hoặc tất cả ứng dụng hệ thống đã được gán cho khách này.
                  </span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSystemOaModal(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedSystemOaId || assignSystemMutation.isPending}
                onClick={() => assignSystemMutation.mutate(selectedSystemOaId)}
              >
                {assignSystemMutation.isPending ? 'Đang gán...' : 'Xác nhận gán ứng dụng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Thêm Ứng dụng Riêng */}
      {showPrivateOaModal && (
        <div className="modal-overlay" onClick={() => setShowPrivateOaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Broadcast size={22} color="#10b981" weight="fill" />
                <h2 className="modal-title">Thêm ứng dụng riêng cho khách hàng</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowPrivateOaModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setPrivateOaError('');
              if (!privateOaForm.fptAppId.trim() || !privateOaForm.fptSecretKey.trim()) {
                setPrivateOaError('Vui lòng điền FPT App ID và Secret Key');
                return;
              }
              createPrivateMutation.mutate(privateOaForm);
            }}>
              <div className="modal-body">
                {privateOaError && (
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
                    {privateOaError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tên gợi nhớ ứng dụng</label>
                  <input
                    className="form-input"
                    placeholder={`Ví dụ: Ứng dụng ${customer.companyName || customer.fullName}`}
                    value={privateOaForm.oaName}
                    onChange={e => setPrivateOaForm({ ...privateOaForm, oaName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">FPT App ID *</label>
                  <input
                    className="form-input"
                    placeholder="App ID FPT cung cấp cho khách hàng"
                    value={privateOaForm.fptAppId}
                    onChange={e => setPrivateOaForm({ ...privateOaForm, fptAppId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">FPT Secret Key *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Secret Key FPT cung cấp cho khách hàng"
                    value={privateOaForm.fptSecretKey}
                    onChange={e => setPrivateOaForm({ ...privateOaForm, fptSecretKey: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPrivateOaModal(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createPrivateMutation.isPending}
                >
                  {createPrivateMutation.isPending ? 'Đang kết nối FPT...' : 'Tạo và cấp API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Đổi mật khẩu */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Đổi mật khẩu cho khách hàng</h2>
              <button type="button" className="modal-close" onClick={() => setShowPasswordModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (newPassword.length < 6) {
                toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
                return;
              }
              resetPasswordMutation.mutate(newPassword);
            }}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mật khẩu mới *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hiển thị API Key mới tạo */}
      {newlyGeneratedKey && (
        <div className="modal-overlay" onClick={() => setNewlyGeneratedKey(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={22} color="#10b981" weight="fill" />
                <h2 className="modal-title">API Key mới đã được tạo</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setNewlyGeneratedKey(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                Dưới đây là chuỗi API Key ngẫu nhiên mới. Hãy sao chép ngay để cung cấp cho khách hàng vì chuỗi đầy đủ chỉ hiển thị một lần duy nhất:
              </p>

              <div
                style={{
                  background: 'var(--color-gray-900)',
                  color: '#4ade80',
                  padding: '12px 16px',
                  borderRadius: 'var(--border-radius)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  wordBreak: 'break-all',
                  marginBottom: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span>{newlyGeneratedKey}</span>
                <button
                  type="button"
                  style={{
                    background: copiedKey ? '#10b981' : 'rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(newlyGeneratedKey);
                    setCopiedKey(true);
                    toast.success('Đã sao chép API Key!');
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                >
                  {copiedKey ? <Check size={14} /> : <CopySimple size={14} />}
                  {copiedKey ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setNewlyGeneratedKey(null)}>
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết thông tin tài khoản */}
      {showInfoModal && (
        <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={20} color="#2563eb" weight="bold" />
                <h3 className="modal-title">Thông tin tài khoản khách hàng</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowInfoModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Họ và tên</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{customer.fullName}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Email đăng nhập</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2563eb' }}>{customer.email}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Số điện thoại</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{customer.phone || 'Chưa cập nhật'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Doanh nghiệp / Công ty</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{customer.companyName || 'Khách hàng cá nhân'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Trạng thái tài khoản</span>
                  <span className={customer.status === 'ACTIVE' ? 'badge-active-pill' : 'badge-inactive-pill'}>
                    {customer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Ngày tạo tài khoản</span>
                  <span style={{ fontSize: 13, color: '#0f172a' }}>{new Date(customer.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Tổng số OA đang dùng</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{customer.allOAs?.length || 0} OA</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowInfoModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
