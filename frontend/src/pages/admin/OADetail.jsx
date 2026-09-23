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

export default function AdminOADetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Modals & Selected Template
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ oaName: '', fptAppId: '', fptSecretKey: '', status: 'ACTIVE' });
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Fetch OA Detail
  const { data: oa, isLoading, refetch } = useQuery({
    queryKey: ['admin-oa-detail', id],
    queryFn: () => api.get(`/admin/oa-configs/${id}`).then(r => r.data.data),
  });

  // Fetch ZNS Quota
  const {
    data: quota,
    isLoading: isQuotaLoading,
    isError: isQuotaError,
    error: quotaError,
    refetch: refetchQuota
  } = useQuery({
    queryKey: ['admin-oa-quota', id],
    queryFn: () => api.get(`/admin/oa-configs/${id}/quota`).then(r => r.data.data),
    enabled: !!id,
    retry: 1,
  });

  // Fetch all customers for assign modal
  const { data: customersData } = useQuery({
    queryKey: ['admin-customers-all'],
    queryFn: () => api.get('/admin/customers', { params: { limit: 200 } }).then(r => r.data.data),
    enabled: showAssignModal,
  });

  // Update OA Mutation
  const updateMutation = useMutation({
    mutationFn: (d) => api.put(`/admin/oa-configs/${id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-oa-detail', id]);
      queryClient.invalidateQueries(['admin-oa-system']);
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
    mutationFn: () => api.post(`/admin/oa-configs/${id}/sync`),
    onSuccess: (r) => {
      queryClient.invalidateQueries(['admin-oa-detail', id]);
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success(`Đồng bộ thành công! Đã cập nhật ${r.data.data?.templatesCount || 0} mẫu tin.`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi đồng bộ ứng dụng');
    },
  });

  // Toggle status
  const toggleStatusMutation = useMutation({
    mutationFn: (status) => api.patch(`/admin/oa-configs/${id}/status`, { status }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries(['admin-oa-detail', id]);
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success(status === 'ACTIVE' ? 'Đã kích hoạt ứng dụng' : 'Đã tạm dừng ứng dụng');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi đổi trạng thái');
    },
  });

  // Delete OA
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/oa-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success('Đã xóa ứng dụng thành công');
      navigate('/admin/oa-configs');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa ứng dụng');
    },
  });

  // Assign customer mutation
  const assignMutation = useMutation({
    mutationFn: (userId) => api.post(`/admin/customers/${userId}/assign-system-oa`, { oaConfigId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-oa-detail', id]);
      queryClient.invalidateQueries(['admin-oa-system']);
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
    mutationFn: (userId) => api.delete(`/admin/customers/${userId}/assign-system-oa/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-oa-detail', id]);
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success('Đã gỡ quyền sử dụng ứng dụng của khách hàng');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi gỡ quyền khách hàng');
    },
  });

  const handleOpenEdit = () => {
    setEditForm({
      oaName: oa?.oaName || '',
      fptAppId: oa?.fptAppId || '',
      fptSecretKey: '',
      status: oa?.status || 'ACTIVE',
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

  if (!oa) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Không tìm thấy ứng dụng</div>
        <p className="empty-state-text">Ứng dụng này có thể đã bị xóa khỏi hệ thống.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/admin/oa-configs')}
          style={{ marginTop: 12 }}
        >
          Quay lại danh sách ứng dụng
        </button>
      </div>
    );
  }

  // Filter customers that are not yet assigned to this OA
  const assignedUserIds = new Set(oa.assignments?.map(a => a.userId) || []);
  const availableCustomers = (customersData || []).filter(c => !assignedUserIds.has(c.id));

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Back Button */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/admin/oa-configs')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách ứng dụng
        </button>
      </div>

      {/* Main Header */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: 'var(--spacing-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {oa.oaName}
            </h1>
            {oa.status === 'ACTIVE' ? (
              <span className="badge-active-pill">Đang hoạt động</span>
            ) : (
              <span className="badge-inactive-pill">Tạm dừng</span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>
            App ID: <span style={{ color: '#0f172a', fontFamily: 'monospace', fontWeight: 500 }}>{oa.fptAppId || '—'}</span>
            {oa.oaId ? <> • Mã OA: <span style={{ color: '#0f172a', fontFamily: 'monospace' }}>{oa.oaId}</span></> : null}
            {' '}• Khởi tạo: {new Date(oa.createdAt).toLocaleDateString('vi-VN')}
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenEdit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }}
          >
            <PencilSimple size={15} />
            <span>Sửa thông tin</span>
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(`Bạn có chắc chắn muốn xóa ứng dụng "${oa.oaName}"? Hành động này không thể hoàn tác!`)) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }}
            title="Xóa ứng dụng"
          >
            <Trash size={15} />
            <span>Xóa ứng dụng</span>
          </button>
        </div>
      </div>

      {/* Section 0: Hạn mức gửi tin ZNS (Quota) */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--spacing-xl)',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          background: '#ffffff',
          boxShadow: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge size={20} color="#0284c7" weight="bold" />
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Hạn mức gửi tin ZNS (Quota)
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => refetchQuota()}
            disabled={isQuotaLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}
          >
            <ArrowsClockwise size={13} className={isQuotaLoading ? 'spin' : ''} />
            Làm mới hạn mức
          </button>
        </div>

        {isQuotaLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}><div className="spinner" /></div>
        ) : isQuotaError ? (
          <div
            style={{
              padding: '14px 18px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <WarningCircle size={20} color="#dc2626" weight="bold" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#991b1b' }}>
                  Không thể lấy hạn mức từ máy chủ FPT ZBS
                </div>
                <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 2 }}>
                  {quotaError?.response?.data?.message || quotaError?.message || 'Lỗi kết nối máy chủ FPT ZBS'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => refetchQuota()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: '#991b1b',
                borderColor: '#fca5a5',
              }}
            >
              <ArrowsClockwise size={13} />
              Thử lại
            </button>
          </div>
        ) : quota ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            {/* Daily Quota */}
            <div
              style={{
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                Hạn mức gửi trong ngày hôm nay
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                {quota.remainingQuota?.toLocaleString('vi-VN') || 0}{' '}
                <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 500 }}>
                  / {quota.dailyQuota?.toLocaleString('vi-VN') || 0} tin
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, marginTop: 10, overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#0284c7',
                    height: '100%',
                    width: `${quota.dailyQuota ? Math.min(100, Math.round((quota.remainingQuota / quota.dailyQuota) * 100)) : 0}%`,
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 6 }}>
                Còn lại {quota.dailyQuota ? Math.round((quota.remainingQuota / quota.dailyQuota) * 100) : 0}% hạn mức gửi hôm nay
              </div>
            </div>

            {/* Monthly Promotion Quota */}
            <div
              style={{
                padding: '14px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                Hạn mức gửi tin hậu mãi (Promotion)
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#059669', marginTop: 4 }}>
                {quota.remainingMonthlyPromotionQuota !== undefined
                  ? quota.remainingMonthlyPromotionQuota?.toLocaleString('vi-VN')
                  : (quota.remainingQuotaPromotion?.toLocaleString('vi-VN') || '0')}{' '}
                <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 500 }}>
                  {quota.monthlyPromotionQuota ? `/ ${quota.monthlyPromotionQuota.toLocaleString('vi-VN')} tin` : 'tin còn lại'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 10 }}>
                Áp dụng cho các mẫu tin ZNS chăm sóc khách hàng hậu mãi
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: '14px' }}>
            Chưa có thông tin hạn mức từ FPT Telecom. Bấm "Làm mới hạn mức" để đồng bộ.
          </div>
        )}
      </div>

      {/* Section 1: Danh sách khách hàng đang sử dụng OA */}
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
            Khách hàng được cấp quyền ({oa.assignments?.length || 0})
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
              {oa.assignments?.map((a, idx) => (
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

              {!oa.assignments?.length && (
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
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Mẫu tin ZNS đã duyệt ({oa.templates?.length || 0})
          </h2>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
          >
            <ArrowsClockwise size={14} className={syncMutation.isPending ? 'spin' : ''} />
            Đồng bộ lại
          </button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>#</th>
                <th style={{ width: '15%', textAlign: 'left' }}>Mã Template ID</th>
                <th style={{ width: '23%', textAlign: 'left' }}>Tên mẫu tin</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Phân loại</th>
                <th style={{ width: '23%', textAlign: 'left' }}>Tham số truyền vào</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {oa.templates?.map((t, idx) => (
                <tr
                  key={t.id}
                  className="clickable-row"
                  onClick={() => setSelectedTemplate(t)}
                >
                  <td className="table-col-index">{idx + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                    {t.templateId}
                  </td>
                  <td className="table-cell-bold">{t.templateName}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral">{t.templateTag || 'Mặc định'}</span>
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
                    <span className="badge-active-pill">Đang hoạt động</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(t);
                      }}
                    >
                      Chi tiết
                      <CaretRight size={13} weight="bold" />
                    </button>
                  </td>
                </tr>
              ))}

              {!oa.templates?.length && (
                <tr>
                  <td colSpan={7} className="empty-state" style={{ padding: '30px 20px', textAlign: 'center' }}>
                    <div className="empty-state-title" style={{ fontSize: 14 }}>
                      Chưa có mẫu tin nào
                    </div>
                    <p style={{ color: '#64748b', fontSize: 12.5, marginTop: 4 }}>
                      Bấm nút "Đồng bộ mẫu tin" để kéo danh sách mẫu đã duyệt từ hệ thống FPT Telecom về.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Sửa thông tin ứng dụng */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PencilSimple size={20} color="#2563eb" weight="bold" />
                <h3 className="modal-title">Sửa thông tin ứng dụng</h3>
              </div>
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
                    value={editForm.oaName}
                    onChange={e => setEditForm({ ...editForm, oaName: e.target.value })}
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
                  <select
                    className="form-select"
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Tạm dừng</option>
                  </select>
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
                Chọn tài khoản doanh nghiệp được quyền sử dụng ứng dụng <strong>{oa.oaName}</strong> để gửi tin ZNS:
              </p>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 500 }}>Chọn khách hàng *</label>
                <select
                  className="form-select"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Chọn tài khoản khách hàng --</option>
                  {availableCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName ? `${c.companyName} (${c.fullName})` : `${c.fullName} (${c.email})`}
                    </option>
                  ))}
                </select>
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
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedCustomerId || assignMutation.isPending}
                onClick={() => assignMutation.mutate(selectedCustomerId)}
              >
                {assignMutation.isPending ? 'Đang gán...' : 'Xác nhận gán'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          templateId={selectedTemplate.templateId}
          oaId={oa.id}
          isAdmin={true}
        />
      )}
    </div>
  );
}
