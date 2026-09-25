import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  ArrowLeft,
  ShieldCheck,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  Power,
  Users,
  Broadcast,
  Plus,
  X,
  CheckCircle,
  Building,
  Buildings,
  User,
  CalendarBlank,
  CaretRight,
  IdentificationBadge,
  Phone,
  EnvelopeSimple,
  UserPlus,
  Gauge,
  WarningCircle
} from '@phosphor-icons/react';
import TemplateDetailModal from '../../components/TemplateDetailModal';
import CustomSelect from '../../components/CustomSelect';

export default function AdminAppDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Modals & Selected Template
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ appName: '', fptAppId: '', fptSecretKey: '', status: 'ACTIVE' });
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Fetch App Detail
  const { data: app, isLoading, refetch } = useQuery({
    queryKey: ['admin-app-detail', id],
    queryFn: () => api.get(`/admin/app-configs/${id}`).then(r => r.data.data),
  });

  // Fetch ZNS Quota
  const {
    data: quota,
    isLoading: isQuotaLoading,
    isError: isQuotaError,
    error: quotaError,
    refetch: refetchQuota
  } = useQuery({
    queryKey: ['admin-app-quota', id],
    queryFn: () => api.get(`/admin/app-configs/${id}/quota`).then(r => r.data.data),
    enabled: !!id,
    retry: 1,
  });

  // Fetch all customers for assign modal
  const { data: customersData } = useQuery({
    queryKey: ['admin-customers-all'],
    queryFn: () => api.get('/admin/customers', { params: { limit: 200 } }).then(r => r.data.data),
    enabled: showAssignModal,
  });

  // Update App Mutation
  const updateMutation = useMutation({
    mutationFn: (d) => api.put(`/admin/app-configs/${id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-app-detail', id]);
      queryClient.invalidateQueries(['admin-app-configs']);
      setShowEditModal(false);
      toast.success('Cập nhật thông tin ứng dụng thành công!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật ứng dụng';
      setEditErrorMsg(msg);
      toast.error(msg);
    },
  });

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: () => api.post(`/admin/app-configs/${id}/sync`),
    onSuccess: (r) => {
      queryClient.invalidateQueries(['admin-app-detail', id]);
      toast.success(`Đồng bộ thành công! Đã cập nhật ${r.data.data?.templatesCount || 0} mẫu tin.`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi đồng bộ ứng dụng');
    },
  });

  // Toggle status
  const toggleStatusMutation = useMutation({
    mutationFn: (status) => api.patch(`/admin/app-configs/${id}/status`, { status }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries(['admin-app-detail', id]);
      toast.success(status === 'ACTIVE' ? 'Đã kích hoạt ứng dụng' : 'Đã tạm dừng ứng dụng');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi đổi trạng thái');
    },
  });

  // Delete App
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/app-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-app-configs']);
      toast.success('Đã xóa ứng dụng thành công');
      navigate('/admin/app-configs');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa ứng dụng');
    },
  });

  // Assign customer mutation
  const assignMutation = useMutation({
    mutationFn: (userId) => api.post(`/admin/customers/${userId}/assign-app`, { appConfigId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-app-detail', id]);
      setShowAssignModal(false);
      setSelectedCustomerId('');
      toast.success('Đã gán ứng dụng cho khách hàng thành công!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gán khách hàng');
    },
  });

  // Unassign customer mutation
  const unassignMutation = useMutation({
    mutationFn: (userId) => api.delete(`/admin/customers/${userId}/unassign-app/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-app-detail', id]);
      toast.success('Đã gỡ quyền sử dụng ứng dụng của khách hàng');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gỡ quyền khách hàng');
    },
  });

  const handleOpenEdit = () => {
    setEditForm({
      appName: app?.appName || '',
      fptAppId: app?.fptAppId || '',
      fptSecretKey: '',
      status: app?.status || 'ACTIVE',
    });
    setEditErrorMsg('');
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setEditErrorMsg('');
    updateMutation.mutate(editForm);
  };

  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  const appDisplayName = app?.appName || 'Ứng dụng';

  if (!app) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Không tìm thấy ứng dụng</div>
        <p className="empty-state-text">Ứng dụng này có thể đã bị xóa khỏi hệ thống.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/admin/app-configs')}
          style={{ marginTop: 12 }}
        >
          Quay lại danh sách ứng dụng
        </button>
      </div>
    );
  }

  const assignedUserIds = new Set(app.assignments?.map(a => a.userId) || []);
  const availableCustomers = (customersData || []).filter(c => !assignedUserIds.has(c.id));

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Back Button */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/admin/app-configs')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách ứng dụng
        </button>
      </div>

      {/* Main Header with Integrated Compact Quota Strip */}
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0, marginBottom: 8, letterSpacing: '-0.02em' }}>
              {appDisplayName}
            </h1>
            <div className="header-info-strip">
              {app.isSystem ? (
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
                App ID: <span className="pill-value" style={{ fontFamily: 'monospace' }}>{app.fptAppId || '—'}</span>
              </div>
              {app.oaId && (
                <div className="header-info-pill">
                  <IdentificationBadge size={13} weight="bold" />
                  Mã OA: <span className="pill-value" style={{ fontFamily: 'monospace' }}>{app.oaId}</span>
                </div>
              )}
              <div className="header-info-pill">
                <CalendarBlank size={12} weight="bold" />
                {new Date(app.createdAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Header Actions & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {app.status === 'ACTIVE' ? (
              <span className="badge-active-pill">Đang hoạt động</span>
            ) : (
              <span className="badge-inactive-pill">Tạm dừng</span>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleOpenEdit}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, height: 32, padding: '0 10px' }}
            >
              <PencilSimple size={13} />
              <span>Sửa thông tin</span>
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (window.confirm(`Bạn có chắc chắn muốn xóa ứng dụng "${appDisplayName}"? Hành động này không thể hoàn tác!`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, height: 32, padding: '0 10px' }}
              title="Xóa ứng dụng"
            >
              <Trash size={13} />
              <span>Xóa ứng dụng</span>
            </button>
          </div>
        </div>

        {/* Thanh Hạn Mức Tinh Gọn (Compact Quota Strip) */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
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
          ) : quota ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                <Gauge size={16} color="#0284c7" weight="bold" />
                <span style={{ color: '#64748b' }}>Hạn mức hôm nay:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {quota.remainingQuota?.toLocaleString('vi-VN') || 0}{' '}
                  <span style={{ fontWeight: 500, color: '#64748b', fontSize: 11.5 }}>
                    / {quota.dailyQuota?.toLocaleString('vi-VN') || 0} tin
                  </span>
                </span>
                <div style={{ width: 64, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginLeft: 4 }}>
                  <div
                    style={{
                      height: '100%',
                      background: '#0284c7',
                      width: `${quota.dailyQuota ? Math.min(100, Math.round((quota.remainingQuota / quota.dailyQuota) * 100)) : 0}%`,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11.5, color: '#0284c7', fontWeight: 600, marginLeft: 2 }}>
                  (Còn {quota.dailyQuota ? Math.round((quota.remainingQuota / quota.dailyQuota) * 100) : 0}%)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ color: '#64748b' }}>Hậu mãi (Promotion):</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>
                  {quota.remainingMonthlyPromotionQuota !== undefined
                    ? quota.remainingMonthlyPromotionQuota?.toLocaleString('vi-VN')
                    : (quota.remainingQuotaPromotion?.toLocaleString('vi-VN') || '0')} tin
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b' }}>
              Chưa có dữ liệu hạn mức từ nhà mạng. Bấm "Làm mới" để kiểm tra.
            </div>
          )}

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => refetchQuota()}
            disabled={isQuotaLoading}
            style={{
              height: 26,
              padding: '0 8px',
              fontSize: 11.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#475569',
            }}
            title="Làm mới thông tin hạn mức từ nhà mạng"
          >
            <ArrowsClockwise size={12} className={isQuotaLoading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Section 1: Danh sách khách hàng đang sử dụng App */}
      <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div
          className="card-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Khách hàng được cấp quyền
          </h2>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowAssignModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
          >
            <UserPlus size={14} weight="bold" /> Gán thêm khách hàng
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>#</th>
                <th style={{ width: '25%', textAlign: 'left' }}>Doanh nghiệp / Khách hàng</th>
                <th style={{ width: '25%', textAlign: 'left' }}>Người liên hệ</th>
                <th style={{ width: '18%', textAlign: 'center' }}>Số điện thoại</th>
                <th style={{ width: '18%', textAlign: 'center' }}>Ngày cấp quyền</th>
                <th style={{ width: '14%', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {app.assignments?.map((a, idx) => (
                <tr key={a.id || a.userId}>
                  <td className="table-col-index">{idx + 1}</td>
                  <td>
                    <span
                      className="table-cell-link"
                      onClick={() => navigate(`/admin/customers/${a.user?.id}`)}
                    >
                      {a.user?.companyName || a.user?.fullName}
                    </span>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{a.user?.fullName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{a.user?.email}</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12.5 }}>
                    {a.user?.phone || '—'}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                    {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString('vi-VN') : (a.createdAt ? new Date(a.createdAt).toLocaleDateString('vi-VN') : '—')}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        if (window.confirm(`Gỡ quyền sử dụng ứng dụng này của "${a.user?.fullName}"?`)) {
                          unassignMutation.mutate(a.userId);
                        }
                      }}
                      style={{ color: '#dc2626', fontSize: 12, padding: '4px 8px' }}
                      title="Gỡ quyền gửi tin"
                    >
                      Gỡ quyền
                    </button>
                  </td>
                </tr>
              ))}

              {!app.assignments?.length && (
                <tr>
                  <td colSpan={6} className="empty-state" style={{ padding: '30px 20px', textAlign: 'center' }}>
                    <div className="empty-state-title" style={{ fontSize: 14 }}>
                      Chưa có khách hàng nào được gán
                    </div>
                    <p style={{ color: '#64748b', fontSize: 12.5, marginTop: 4 }}>
                      Bấm nút "Gán thêm khách hàng" ở trên để cấp quyền cho doanh nghiệp gửi tin qua ứng dụng này.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Danh sách mẫu tin ZNS đã duyệt */}
      <div className="card">
        <div
          className="card-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Mẫu tin nhắn ZNS đã duyệt
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
              Danh sách mẫu tin được đồng bộ trực tiếp từ cổng nhà mạng
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
          >
            <ArrowsClockwise size={14} className={syncMutation.isPending ? 'spin' : ''} />
            {syncMutation.isPending ? 'Đang đồng bộ...' : 'Đồng bộ nhà mạng'}
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>#</th>
                <th style={{ width: '12%', textAlign: 'center' }}>ID Mẫu</th>
                <th style={{ width: '38%', textAlign: 'left' }}>Tên mẫu tin nhắn</th>
                <th style={{ width: '18%', textAlign: 'center' }}>Phân loại</th>
                <th style={{ width: '18%', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {app.templates?.map((tpl, idx) => (
                <tr
                  key={tpl.id}
                  className="clickable-row"
                  onClick={() => setSelectedTemplate(tpl)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="table-col-index">{idx + 1}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                    {tpl.templateId}
                  </td>
                  <td>
                    <span
                      className="table-cell-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(tpl);
                      }}
                      style={{ fontWeight: 500 }}
                    >
                      {tpl.templateName}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral">
                      {tpl.templateTag || 'Chăm sóc KH'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {tpl.status === 'ENABLE' ? (
                      <span className="badge-active-pill">Đang hoạt động</span>
                    ) : (
                      <span className="badge-inactive-pill">Đã khóa</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setSelectedTemplate(tpl)}
                      style={{ padding: '3px 8px', fontSize: 11.5 }}
                    >
                      Xem mẫu
                    </button>
                  </td>
                </tr>
              ))}

              {!app.templates?.length && (
                <tr>
                  <td colSpan={6} className="empty-state" style={{ padding: '30px 20px', textAlign: 'center' }}>
                    <div className="empty-state-title" style={{ fontSize: 14 }}>
                      Chưa có mẫu tin nhắn nào
                    </div>
                    <p style={{ color: '#64748b', fontSize: 12.5, marginTop: 4 }}>
                      Bấm nút "Đồng bộ nhà mạng" ở góc phải để tải danh sách mẫu tin mới nhất từ hệ thống nhà mạng.
                    </p>
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
          isOpen={true}
          templateId={selectedTemplate.templateId}
          initialData={selectedTemplate}
          appId={id}
          isAdmin={true}
          onClose={() => setSelectedTemplate(null)}
        />
      )}

      {/* Modal 1: Sửa thông tin App */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Sửa thông tin ứng dụng</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                {editErrorMsg && (
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
                    {editErrorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Tên ứng dụng *</label>
                  <input
                    className="form-input"
                    value={editForm.appName}
                    onChange={e => setEditForm({ ...editForm, appName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>FPT App ID *</label>
                  <input
                    className="form-input"
                    value={editForm.fptAppId}
                    onChange={e => setEditForm({ ...editForm, fptAppId: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Trạng thái hoạt động</label>
                  <CustomSelect
                    value={editForm.status}
                    onChange={(val) => setEditForm({ ...editForm, status: val })}
                    options={[
                      { value: 'ACTIVE', label: 'Đang hoạt động' },
                      { value: 'INACTIVE', label: 'Tạm dừng' },
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>
                    FPT Secret Key mới (Để trống nếu không đổi)
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Chỉ nhập khi muốn cập nhật Secret Key mới"
                    value={editForm.fptSecretKey}
                    onChange={e => setEditForm({ ...editForm, fptSecretKey: e.target.value })}
                  />
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                    Khóa bí mật mới sẽ được mã hóa chuẩn AES 256 GCM trước khi lưu trữ
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Gán thêm khách hàng */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={20} color="#2563eb" weight="bold" />
                <h3 className="modal-title">Gán khách hàng sử dụng ứng dụng</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAssignModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                Chọn tài khoản doanh nghiệp được quyền sử dụng ứng dụng <strong>{appDisplayName}</strong> để gửi tin ZNS:
              </p>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 500 }}>Chọn khách hàng *</label>
                <CustomSelect
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  placeholder="Chọn tài khoản khách hàng"
                  options={availableCustomers.map(c => ({
                    value: c.id,
                    label: c.companyName ? `${c.companyName}` : c.fullName,
                    sublabel: c.companyName ? c.fullName : c.email,
                  }))}
                />
              </div>

              {!availableCustomers.length && (
                <div style={{ fontSize: 12, color: '#d97706', background: '#fef3c7', padding: '8px 12px', borderRadius: 4 }}>
                  Tất cả các khách hàng hiện tại đều đã được cấp quyền sử dụng ứng dụng này.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAssignModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedCustomerId || assignMutation.isPending}
                onClick={() => assignMutation.mutate(selectedCustomerId)}
              >
                {assignMutation.isPending ? 'Đang gán...' : 'Gán quyền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
