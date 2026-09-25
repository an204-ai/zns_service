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
  Sparkle,
  Info,
  WebhooksLogo,
  PencilSimple,
  FloppyDisk,
  Eye,
  EyeSlash,
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

  // Selected App Detail Modal state
  const [selectedAppDetail, setSelectedAppDetail] = useState(null);
  const [appNameInput, setAppNameInput] = useState('');
  const [webhookDlrInput, setWebhookDlrInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [showSecretInputVisible, setShowSecretInputVisible] = useState(false);

  const handleOpenAppDetail = (app) => {
    setSelectedAppDetail(app);
    setAppNameInput(app.appName || '');
    setWebhookDlrInput(app.apiKey?.webhookDlrUrl || app.apiKey?.webhookUrl || '');
    setWebhookSecretInput(app.apiKey?.webhookSecret || '');
    setShowSecretInputVisible(false);
    setCopiedKey(false);
  };

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
      queryClient.invalidateQueries(['admin-app-configs']);
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
    mutationFn: (appId) => api.delete(`/admin/customers/${id}/unassign-app/${appId}`),
    onSuccess: () => {
      refetch();
      refetchAvailableApps();
      queryClient.invalidateQueries(['admin-app-configs']);
      toast.success('Đã gỡ ứng dụng khỏi khách hàng thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gỡ ứng dụng');
    },
  });


  // Regenerate API Key mutation
  const regenerateKeyMutation = useMutation({
    mutationFn: (appId) => api.post(`/admin/customers/${id}/apps/${appId}/regenerate-key`),
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
    mutationFn: (appId) => api.post(`/admin/app-configs/${appId}/sync`),
    onSuccess: (r) => {
      refetch();
      toast.success(`Đồng bộ thành công! Có ${r.data.data.templatesCount || 0} mẫu tin.`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi đồng bộ mẫu tin');
    },
  });

  // Update Webhook URL mutation
  const updateWebhookMutation = useMutation({
    mutationFn: ({ keyId, webhookDlrUrl, webhookSecret, webhookRatingUrl }) =>
      api.put(`/admin/customers/${id}/api-keys/${keyId}/webhook`, {
        webhookDlrUrl,
        webhookSecret,
        webhookRatingUrl,
      }),
    onSuccess: () => {
      refetch();
      toast.success('Cập nhật cấu hình Webhook thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật cấu hình Webhook');
    },
  });

  // Update App Config mutation
  const updateAppMutation = useMutation({
    mutationFn: ({ appId, appName, status }) =>
      api.put(`/admin/app-configs/${appId}`, { appName, status }),
    onSuccess: () => {
      refetch();
      toast.success('Cập nhật thông tin ứng dụng thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật ứng dụng');
    },
  });

  // Update App Status mutation
  const updateAppStatusMutation = useMutation({
    mutationFn: ({ appId, status }) =>
      api.patch(`/admin/app-configs/${appId}/status`, { status }),
    onSuccess: () => {
      refetch();
      toast.success('Cập nhật trạng thái ứng dụng thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái');
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
                <th>API Key</th>
                <th>Webhook</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(customer.allApps || []).map(app => {
                const hasWebhook = Boolean(app.apiKey?.webhookDlrUrl || app.apiKey?.webhookUrl || app.apiKey?.webhookSecret);
                return (
                  <tr
                    key={app.id}
                    className="clickable-row"
                    onClick={() => handleOpenAppDetail(app)}
                    style={{ cursor: 'pointer' }}
                    title="Bấm vào dòng để xem và quản lý chi tiết ứng dụng"
                  >
                    <td>
                      <div>
                        <div className="table-cell-bold">{app.appName}</div>
                        {app.oaId && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            OA ID: {app.oaId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {app.type === 'SYSTEM' ? (
                        <span className="badge badge-primary">Hệ thống</span>
                      ) : (
                        <span className="badge badge-success">Cá nhân</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                      {app.fptAppId}
                    </td>
                    <td>
                      {app.apiKey ? (
                        <code
                          style={{
                            background: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1e293b',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {app.apiKey.prefix}...
                        </code>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Đang tạo...</span>
                      )}
                    </td>
                    <td>
                      {hasWebhook ? (
                        <span
                          className="badge badge-success"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                          title={app.apiKey?.webhookDlrUrl || app.apiKey?.webhookUrl || 'Đã cài đặt Webhook'}
                        >
                          <WebhooksLogo size={12} weight="bold" /> Đã kết nối
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ color: '#94a3b8', fontSize: 11 }}>
                          Chưa cấu hình
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${app.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                        {app.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ height: 28, padding: '0 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Xem chi tiết ứng dụng"
                          onClick={() => handleOpenAppDetail(app)}
                        >
                          <Eye size={13} /> Chi tiết
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          style={{ height: 28, padding: '0 8px' }}
                          title={app.type === 'SYSTEM' ? 'Gỡ ứng dụng hệ thống' : 'Gỡ ứng dụng cá nhân'}
                          onClick={() => {
                            const name = app.appName;
                            const confirmMsg = app.type === 'SYSTEM'
                              ? `Bạn có chắc muốn gỡ ứng dụng hệ thống "${name}" khỏi khách hàng này?`
                              : `Bạn có chắc muốn gỡ ứng dụng cá nhân "${name}" khỏi khách hàng này? Ứng dụng sẽ được trả về kho ứng dụng để có thể gán lại sau này.`;
                            if (window.confirm(confirmMsg)) {
                              unassignAppMutation.mutate(app.id);
                            }
                          }}
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!customer.allApps?.length && (
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
                  ).map(app => ({
                    value: app.id,
                    label: app.appName,
                    sublabel: `${app.isSystem ? 'Hệ thống' : 'Cá nhân'} \u2022 ${app._count?.templates || 0} mẫu tin`,
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
                  <span style={{ fontSize: 13, color: '#64748b' }}>Tổng số ứng dụng đang dùng</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{customer.allApps?.length || 0} ứng dụng</span>
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

      {/* Modal: Chi tiết và Quản lý Cấu hình Ứng dụng liên kết */}
      {(() => {
        const currentSelectedApp = selectedAppDetail
          ? (customer?.allApps || []).find(a => a.id === selectedAppDetail.id) || selectedAppDetail
          : null;
        if (!currentSelectedApp) return null;

        const hasAnyWebhook = Boolean(
          currentSelectedApp.apiKey?.webhookDlrUrl ||
          currentSelectedApp.apiKey?.webhookUrl ||
          currentSelectedApp.apiKey?.webhookSecret
        );

        return (
          <div className="modal-overlay" onClick={() => setSelectedAppDetail(null)}>
            <div
              className="modal"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 640, borderRadius: 12, overflow: 'hidden' }}
            >
              {/* Modal Header */}
              <div
                className="modal-header"
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={20} weight="fill" />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Chi tiết Ứng dụng và Cấu hình
                    </h3>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Khách hàng: <strong style={{ color: '#0f172a' }}>{customer.fullName}</strong>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setSelectedAppDetail(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                className="modal-body"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  maxHeight: 'calc(85vh - 120px)',
                  overflowY: 'auto',
                }}
              >
                {/* PHẦN 1: THÔNG TIN ỨNG DỤNG */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      Thông tin ứng dụng
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {currentSelectedApp.type === 'SYSTEM' ? (
                        <span className="badge badge-primary">Ứng dụng Hệ thống</span>
                      ) : (
                        <span className="badge badge-success">Ứng dụng Cá nhân</span>
                      )}
                      <span className={`badge ${currentSelectedApp.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                        {currentSelectedApp.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </div>
                  </div>

                  {/* Sửa tên ứng dụng */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: 0 }}>
                        Tên ứng dụng
                      </label>
                      {appNameInput && (
                        <button
                          type="button"
                          onClick={() => setAppNameInput('')}
                          style={{ border: 'none', background: 'transparent', color: '#dc2626', fontSize: 11, cursor: 'pointer', padding: 0 }}
                        >
                          Xóa trường này
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="text"
                        value={appNameInput}
                        onChange={e => setAppNameInput(e.target.value)}
                        placeholder="Nhập tên ứng dụng"
                        style={{
                          height: 36,
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#0f172a',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          padding: '0 12px',
                          flex: 1,
                          boxSizing: 'border-box',
                        }}
                      />
                      {appNameInput.trim() !== currentSelectedApp.appName && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            height: 36,
                            padding: '0 14px',
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: updateAppMutation.isPending ? 'not-allowed' : 'pointer',
                          }}
                          disabled={updateAppMutation.isPending}
                          onClick={() => {
                            const trimmed = appNameInput.trim();
                            if (!trimmed) {
                              toast.error('Tên ứng dụng không được để trống');
                              return;
                            }
                            updateAppMutation.mutate({
                              appId: currentSelectedApp.id,
                              appName: trimmed,
                              status: currentSelectedApp.status,
                            });
                          }}
                        >
                          {updateAppMutation.isPending ? 'Đang lưu...' : 'Lưu tên'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grid 2 cột: FPT App ID và OA ID */}
                  <div className="form-grid-2" style={{ gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginBottom: 3 }}>FPT App ID:</span>
                      <code style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', background: '#ffffff', padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', display: 'inline-block' }}>
                        {currentSelectedApp.fptAppId}
                      </code>
                    </div>
                    <div>
                      <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginBottom: 3 }}>Zalo OA ID:</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>
                        {currentSelectedApp.oaId || 'Chưa liên kết OA'}
                      </span>
                    </div>
                  </div>

                  {/* Thao tác trạng thái và đồng bộ */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Trạng thái:</span>
                      <button
                        type="button"
                        className={`btn btn-sm ${currentSelectedApp.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'}`}
                        style={{ height: 28, padding: '0 10px', fontSize: 11.5 }}
                        disabled={updateAppStatusMutation.isPending}
                        onClick={() => {
                          const newStatus = currentSelectedApp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                          updateAppStatusMutation.mutate({ appId: currentSelectedApp.id, status: newStatus });
                        }}
                      >
                        {currentSelectedApp.status === 'ACTIVE' ? 'Tạm dừng ứng dụng' : 'Kích hoạt hoạt động'}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ height: 28, padding: '0 10px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate(currentSelectedApp.id)}
                      title="Đồng bộ mẫu tin từ nhà mạng"
                    >
                      <ArrowsClockwise size={12} className={syncMutation.isPending ? 'spin' : ''} />
                      <span>Đồng bộ nhà mạng</span>
                    </button>
                  </div>
                </div>

                {/* PHẦN 2: QUẢN LÝ KHÓA API KEY */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      Khóa API Key của ứng dụng
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ height: 28, padding: '0 10px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      disabled={regenerateKeyMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Cấp lại mã API Key mới cho ứng dụng "${currentSelectedApp.appName}"? Mã cũ sẽ lập tức bị vô hiệu hóa.`)) {
                          regenerateKeyMutation.mutate(currentSelectedApp.id);
                        }
                      }}
                    >
                      <ArrowsClockwise size={12} /> Cấp lại API Key mới
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code
                      style={{
                        background: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        flex: 1,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {currentSelectedApp.apiKey ? `${currentSelectedApp.apiKey.prefix}...` : 'Đang khởi tạo...'}
                    </code>
                    {currentSelectedApp.apiKey && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ height: 36, padding: '0 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => {
                          navigator.clipboard.writeText(currentSelectedApp.apiKey.prefix);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                          toast.success('Đã sao chép tiền tố API Key');
                        }}
                      >
                        {copiedKey ? <Check size={14} color="#16a34a" /> : <CopySimple size={14} />}
                        <span>{copiedKey ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* PHẦN 3: CẤU HÌNH WEBHOOK (SỬA VÀ XÓA TỪNG TRƯỜNG) */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <WebhooksLogo size={16} color="#16a34a" weight="bold" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        Cấu hình Webhook Callback
                      </span>
                    </div>
                    {hasAnyWebhook && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          height: 26,
                          padding: '0 8px',
                          fontSize: 11,
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          cursor: updateWebhookMutation.isPending ? 'not-allowed' : 'pointer',
                        }}
                        disabled={updateWebhookMutation.isPending}
                        onClick={() => {
                          if (window.confirm('Bạn có chắc muốn xóa toàn bộ cấu hình Webhook của ứng dụng này?')) {
                            updateWebhookMutation.mutate({
                              keyId: currentSelectedApp.apiKey.id,
                              webhookDlrUrl: null,
                              webhookRatingUrl: null,
                              webhookSecret: null,
                            });
                            setWebhookDlrInput('');
                            setWebhookSecretInput('');
                          }
                        }}
                      >
                        <Trash size={12} /> Xóa Webhook
                      </button>
                    )}
                  </div>

                  {/* Trường 1: Webhook URL DLR */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                        Webhook URL nhận trạng thái tin
                      </label>
                      {webhookDlrInput && (
                        <button
                          type="button"
                          onClick={() => setWebhookDlrInput('')}
                          style={{ border: 'none', background: 'transparent', color: '#dc2626', fontSize: 11, cursor: 'pointer', padding: 0 }}
                        >
                          Xóa trường này
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="https://crm.yourdomain.com/webhook/zns-dlr"
                      value={webhookDlrInput}
                      onChange={e => setWebhookDlrInput(e.target.value)}
                      style={{
                        width: '100%',
                        height: 36,
                        padding: '0 10px',
                        fontSize: 12.5,
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

                  {/* Trường 2: Mã xác thực Bearer Token */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                        Mã xác thực Bearer Token
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>Tùy chọn</span>
                        {webhookSecretInput && (
                          <button
                            type="button"
                            onClick={() => setWebhookSecretInput('')}
                            style={{ border: 'none', background: 'transparent', color: '#dc2626', fontSize: 11, cursor: 'pointer', padding: 0 }}
                          >
                            Xóa trường này
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSecretInputVisible ? 'text' : 'password'}
                        placeholder="Ví dụ: my_secret_token_123"
                        value={webhookSecretInput}
                        onChange={e => setWebhookSecretInput(e.target.value)}
                        style={{
                          width: '100%',
                          height: 36,
                          padding: '0 36px 0 10px',
                          fontSize: 12.5,
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
                        title={showSecretInputVisible ? 'Ẩn mã token' : 'Xem mã token'}
                      >
                        {showSecretInputVisible ? <EyeSlash size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Nút lưu cấu hình Webhook */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{
                        height: 34,
                        padding: '0 16px',
                        fontSize: 12.5,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: 'none',
                        background: '#16a34a',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: updateWebhookMutation.isPending ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 2px rgba(22, 163, 74, 0.25)',
                      }}
                      disabled={updateWebhookMutation.isPending}
                      onClick={() => {
                        const dlrTrimmed = webhookDlrInput.trim();
                        const secretTrimmed = webhookSecretInput.trim();
                        if (dlrTrimmed && !/^https?:\/\/.+/i.test(dlrTrimmed)) {
                          toast.error('Webhook URL nhận trạng thái tin không hợp lệ (phải bắt đầu bằng http:// hoặc https://)');
                          return;
                        }
                        updateWebhookMutation.mutate({
                          keyId: currentSelectedApp.apiKey.id,
                          webhookDlrUrl: dlrTrimmed || null,
                          webhookSecret: secretTrimmed || null,
                          webhookRatingUrl: null,
                        });
                      }}
                    >
                      <FloppyDisk size={14} weight="bold" />
                      <span>{updateWebhookMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình Webhook'}</span>
                    </button>
                  </div>
                </div>

                {/* PHẦN 4: HÀNH ĐỘNG GỠ ỨNG DỤNG */}
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#991b1b' }}>
                      Gỡ liên kết ứng dụng
                    </div>
                    <div style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 2 }}>
                      {currentSelectedApp.type === 'SYSTEM'
                        ? 'Hủy quyền sử dụng ứng dụng hệ thống này của khách hàng.'
                        : 'Trả ứng dụng cá nhân này về kho ứng dụng để có thể gán lại sau.'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      height: 32,
                      padding: '0 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      background: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: unassignAppMutation.isPending ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                    }}
                    disabled={unassignAppMutation.isPending}
                    onClick={() => {
                      const name = currentSelectedApp.appName;
                      const confirmMsg = currentSelectedApp.type === 'SYSTEM'
                        ? `Bạn có chắc muốn gỡ ứng dụng hệ thống "${name}" khỏi khách hàng này?`
                        : `Bạn có chắc muốn gỡ ứng dụng cá nhân "${name}" khỏi khách hàng này? Ứng dụng sẽ được trả về kho ứng dụng để có thể gán lại sau này.`;
                      if (window.confirm(confirmMsg)) {
                        unassignAppMutation.mutate(currentSelectedApp.id);
                        setSelectedAppDetail(null);
                      }
                    }}
                  >
                    <Trash size={13} /> Gỡ ứng dụng
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  padding: '12px 20px',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ height: 34, padding: '0 18px', fontSize: 12.5, fontWeight: 500 }}
                  onClick={() => setSelectedAppDetail(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
