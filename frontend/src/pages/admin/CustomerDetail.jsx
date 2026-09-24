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
import CustomSelect from '../../components/CustomSelect';

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Modals state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [modalFilter, setModalFilter] = useState('all'); // 'all' | 'system' | 'private'

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch Customer Details
  const { data: customer, isLoading, refetch } = useQuery({
    queryKey: ['admin-customer-detail', id],
    queryFn: () => api.get(`/admin/customers/${id}`).then(r => r.data.data),
  });

  // Fetch available apps (System apps not yet assigned + Unassigned private apps)
  const { data: availableAppsData, refetch: refetchAvailableApps } = useQuery({
    queryKey: ['admin-customer-available-apps', id],
    queryFn: () => api.get(`/admin/customers/${id}/available-apps`).then(r => r.data.data),
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

  // Assign App mutation (Supports both System Apps and Private Apps from pool)
  const assignAppMutation = useMutation({
    mutationFn: (appConfigId) => api.post(`/admin/customers/${id}/assign-app`, { appConfigId }),
    onSuccess: () => {
      refetch();
      refetchAvailableApps();
      queryClient.invalidateQueries(['admin-oa-configs']);
      setShowAssignModal(false);
      setSelectedAppId('');
      toast.success('Đã gán ứng dụng và tự động cấp API Key cho khách hàng!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gán ứng dụng');
    },
  });

  // Unassign App mutation (Unassigns System App or returns Private App to unassigned pool)
  const unassignAppMutation = useMutation({
    mutationFn: (oaId) => api.delete(`/admin/customers/${id}/unassign-app/${oaId}`),
    onSuccess: () => {
      refetch();
      refetchAvailableApps();
      queryClient.invalidateQueries(['admin-oa-configs']);
      toast.success('Đã gỡ ứng dụng khỏi khách hàng thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gỡ ứng dụng');
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

  const availableSystemApps = availableAppsData?.systemApps || [];
  const availablePrivateApps = availableAppsData?.privateApps || [];
  const totalAvailableCount = availableSystemApps.length + availablePrivateApps.length;

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

      {/* Customer Header Card */}
      <div
        className="card"
        style={{
          padding: '10px 14px',
          marginBottom: 'var(--spacing-lg)',
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {customer.fullName}
              </h1>
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
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
                <Info size={14} weight="bold" />
              </button>
            </div>
            <div className="header-info-strip">
              <div className="header-info-pill">
                <EnvelopeSimple size={12} weight="bold" />
                {customer.email}
              </div>
              {customer.phone ? (
                <div className="header-info-pill">
                  <Phone size={12} weight="bold" />
                  {customer.phone}
                </div>
              ) : customer.companyName ? (
                <div className="header-info-pill">
                  <Buildings size={12} weight="bold" />
                  {customer.companyName}
                </div>
              ) : null}
            </div>
          </div>

          {/* Action buttons and Status on the right side */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {customer.status === 'ACTIVE' ? (
              <span className="badge-active-pill">Đang hoạt động</span>
            ) : (
              <span className="badge-inactive-pill">Đã khóa</span>
            )}

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setShowPasswordModal(true);
                setNewPassword('');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, height: 32, padding: '0 10px' }}
            >
              <Lock size={13} /> Đổi mật khẩu
            </button>

            <button
              type="button"
              className={`btn btn-sm ${customer.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'}`}
              onClick={() => {
                const nextStatus = customer.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
                const actionName = nextStatus === 'BLOCKED' ? 'khóa' : 'mở khóa';
                if (window.confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản "${customer.fullName}"?`)) {
                  toggleStatusMutation.mutate(nextStatus);
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, height: 32, padding: '0 10px' }}
            >
              {customer.status === 'ACTIVE' ? <Lock size={13} /> : <LockOpen size={13} />}
              {customer.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa khách hàng "${customer.fullName}"? Tất cả dữ liệu, OA riêng và tin nhắn liên quan sẽ bị xóa vĩnh viễn!`)) {
                  deleteCustomerMutation.mutate();
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, height: 32, padding: '0 10px' }}
            >
              <Trash size={13} /> Xóa tài khoản
            </button>
          </div>
        </div>
      </div>

      {/* Section: Zalo OAs & Attached API Keys */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <span className="card-header-title">Danh sách Ứng dụng liên kết và API Key</span>

          <div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                setShowAssignModal(true);
                setSelectedAppId('');
                setModalFilter('all');
              }}
            >
              <ShieldCheck size={16} weight="fill" />
              Gán ứng dụng
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
                      <span className="badge badge-primary">Hệ thống</span>
                    ) : (
                      <span className="badge badge-success">Cá nhân</span>
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
                        title={oa.type === 'SYSTEM' ? 'Gỡ ứng dụng hệ thống' : 'Gỡ ứng dụng cá nhân khỏi khách hàng'}
                        onClick={() => {
                          const confirmMsg = oa.type === 'SYSTEM'
                            ? `Bạn có chắc muốn gỡ ứng dụng hệ thống "${oa.oaName}" khỏi khách hàng này?`
                            : `Bạn có chắc muốn gỡ ứng dụng cá nhân "${oa.oaName}" khỏi khách hàng này? Ứng dụng sẽ được trả về kho ứng dụng để có thể gán lại sau này.`;
                          if (window.confirm(confirmMsg)) {
                            unassignAppMutation.mutate(oa.id);
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
                      Bấm vào "Gán ứng dụng" ở trên để kết nối ứng dụng cho khách hàng
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Gán Ứng dụng (Hệ thống hoặc Riêng từ kho) */}
      {/* Modal: Gán Ứng dụng */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="#2563eb" weight="fill" />
                <h2 className="modal-title">Gán ứng dụng cho khách hàng</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowAssignModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ minHeight: 240, paddingBottom: 40 }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 14 }}>
                Chọn một ứng dụng từ kho ứng dụng để cấp quyền gửi tin cho khách hàng <strong>{customer.fullName}</strong>:
              </p>

              {/* Tabs lọc loại ứng dụng */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${modalFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setModalFilter('all');
                    setSelectedAppId('');
                  }}
                  style={{
                    borderRadius: 6,
                    fontWeight: modalFilter === 'all' ? 600 : 500,
                  }}
                >
                  Tất cả
                </button>

                <button
                  type="button"
                  className={`btn btn-sm ${modalFilter === 'system' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setModalFilter('system');
                    setSelectedAppId('');
                  }}
                  style={{
                    borderRadius: 6,
                    fontWeight: modalFilter === 'system' ? 600 : 500,
                  }}
                >
                  Hệ thống
                </button>

                <button
                  type="button"
                  className={`btn btn-sm ${modalFilter === 'private' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setModalFilter('private');
                    setSelectedAppId('');
                  }}
                  style={{
                    borderRadius: 6,
                    fontWeight: modalFilter === 'private' ? 600 : 500,
                  }}
                >
                  Cá nhân
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Chọn ứng dụng khả dụng *</label>
                <CustomSelect
                  value={selectedAppId}
                  onChange={setSelectedAppId}
                  placeholder="Chọn ứng dụng cần gán"
                  options={(modalFilter === 'system'
                    ? availableSystemApps
                    : modalFilter === 'private'
                    ? availablePrivateApps
                    : [...availableSystemApps, ...availablePrivateApps]
                  ).map(oa => ({
                    value: oa.id,
                    label: oa.oaName,
                    sublabel: `${oa.isSystem ? 'Hệ thống' : 'Cá nhân'} \u2022 ${oa._count?.templates || 0} mẫu tin`,
                  }))}
                />

                {((modalFilter === 'all' && totalAvailableCount === 0) ||
                  (modalFilter === 'system' && availableSystemApps.length === 0) ||
                  (modalFilter === 'private' && availablePrivateApps.length === 0)) && (
                  <span style={{ fontSize: 'var(--font-size-xs)', color: '#ea580c', marginTop: 8, display: 'block' }}>
                    {modalFilter === 'system'
                      ? 'Không có ứng dụng hệ thống nào khả dụng để gán.'
                      : modalFilter === 'private'
                      ? 'Không có ứng dụng cá nhân nào còn trống trong kho. Vui lòng tạo thêm tại trang Quản lý ứng dụng.'
                      : 'Không có ứng dụng khả dụng nào. Vui lòng vào trang Quản lý ứng dụng để tạo thêm.'}
                  </span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedAppId || assignAppMutation.isPending}
                onClick={() => assignAppMutation.mutate(selectedAppId)}
              >
                {assignAppMutation.isPending ? 'Đang gán...' : 'Xác nhận gán ứng dụng'}
              </button>
            </div>
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
