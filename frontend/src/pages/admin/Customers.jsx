import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  Plus, MagnifyingGlass, LockOpen, Lock, Key,
  CheckCircle, Broadcast, Buildings, Phone,
  EnvelopeSimple, Sparkle, ShieldCheck, Trash, X
} from '@phosphor-icons/react';

export default function AdminCustomers() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal 1: Create Customer (All-in-one with OA)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    companyName: '',
    phone: '',
    oaType: 'SYSTEM', // 'SYSTEM' | 'PRIVATE' | 'NONE'
    systemOaId: '',
    oaName: '',
    fptAppId: '',
    fptSecretKey: '',
  });

  // Modal 2: Direct Attach OA for existing customer
  const [oaTarget, setOaTarget] = useState(null);
  const [oaModalTab, setOaModalTab] = useState('SYSTEM'); // 'SYSTEM' | 'PRIVATE'
  const [selectedSystemOaId, setSelectedSystemOaId] = useState('');
  const [oaForm, setOaForm] = useState({
    oaName: '',
    fptAppId: '',
    fptSecretKey: '',
  });

  // Modal 3: Reset Password
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Modal 4: Delete Customer Confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch customers
  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search, statusFilter, page],
    queryFn: () => api.get('/admin/customers', { params: { search, status: statusFilter || undefined, page, limit: 15 } }).then(r => r.data),
  });

  // Fetch system OAs for assignment
  const { data: systemOAs } = useQuery({
    queryKey: ['admin-oa-system'],
    queryFn: () => api.get('/admin/oa-configs/system').then(r => r.data.data),
  });

  const activeSystemOAs = systemOAs?.filter(s => s.status === 'ACTIVE') || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/customers', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-customers']);
      setShowCreateModal(false);
      setForm({
        fullName: '',
        email: '',
        password: '',
        companyName: '',
        phone: '',
        oaType: 'SYSTEM',
        systemOaId: '',
        oaName: '',
        fptAppId: '',
        fptSecretKey: '',
      });
      toast.success(res.data?.message || 'Tạo khách hàng thành công!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo khách hàng');
    },
  });

  const addOaMutation = useMutation({
    mutationFn: (d) => api.post('/admin/oa-configs', d),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-customers']);
      setOaTarget(null);
      setOaForm({ oaName: '', fptAppId: '', fptSecretKey: '' });
      toast.success('Gán cấu hình OA riêng thành công! Đang tự động đồng bộ mẫu tin.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi gán cấu hình OA');
    },
  });

  const assignSystemOaMutation = useMutation({
    mutationFn: ({ userId, oaConfigId }) => api.post(`/admin/customers/${userId}/assign-system-oa`, { oaConfigId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-customers']);
      toast.success('Gán OA hệ thống cho khách hàng thành công!');
      setOaTarget(null);
      setSelectedSystemOaId('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi gán OA hệ thống');
    },
  });

  const unassignSystemOaMutation = useMutation({
    mutationFn: ({ userId, oaId }) => api.delete(`/admin/customers/${userId}/assign-system-oa/${oaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-customers']);
      toast.success('Đã hủy gán OA hệ thống khỏi khách hàng');
      setOaTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi hủy gán OA hệ thống');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/customers/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['admin-customers']);
      toast.success(vars.status === 'ACTIVE' ? 'Đã kích hoạt tài khoản khách hàng' : 'Đã khóa tài khoản khách hàng');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái'),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, newPassword }) => api.post(`/admin/customers/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      toast.success('Đặt lại mật khẩu thành công');
      setResetTarget(null);
      setNewPassword('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi đặt lại mật khẩu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-customers']);
      toast.success('Đã xóa tài khoản khách hàng thành công');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi xóa khách hàng');
    },
  });

  const handleCreateCustomer = (e) => {
    e.preventDefault();
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      companyName: form.companyName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      oaType: form.oaType,
    };

    if (form.oaType === 'SYSTEM') {
      if (!form.systemOaId) {
        toast.warning('Vui lòng chọn một OA hệ thống để gán cho khách hàng.');
        return;
      }
      payload.systemOaId = form.systemOaId;
    } else if (form.oaType === 'PRIVATE') {
      if (!form.fptAppId.trim() || !form.fptSecretKey.trim()) {
        toast.warning('Vui lòng nhập FPT App ID và FPT Secret Key để kết nối OA riêng.');
        return;
      }
      payload.oaName = form.oaName.trim() || form.companyName.trim() || form.fullName.trim() || 'OA Khách hàng';
      payload.fptAppId = form.fptAppId.trim();
      payload.fptSecretKey = form.fptSecretKey.trim();
    }

    createMutation.mutate(payload);
  };

  const handleDirectAddOA = (e) => {
    e.preventDefault();
    if (!oaTarget) return;
    addOaMutation.mutate({
      userId: oaTarget.id,
      oaName: oaForm.oaName.trim() || oaTarget.companyName || oaTarget.fullName,
      fptAppId: oaForm.fptAppId.trim(),
      fptSecretKey: oaForm.fptSecretKey.trim(),
    });
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    resetMutation.mutate({ id: resetTarget.id, newPassword });
  };

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div className="page-header-row">
        <div>
          <h1 className="page-header-title">Quản lý khách hàng</h1>
          <p className="page-header-desc">Quản lý tài khoản doanh nghiệp và thiết lập cấu hình Zalo OA</p>
        </div>
        <button
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} weight="bold" /> Thêm khách hàng mới
        </button>
      </div>

      <div className="card" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <div className="toolbar" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
          <div className="search-input-wrapper" style={{ maxWidth: '320px' }}>
            <MagnifyingGlass />
            <input
              className="search-input"
              placeholder="Tìm tên, email, công ty..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="BLOCKED">Đã khoá</option>
          </select>
        </div>

        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '16%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Liên hệ</th>
                    <th>OA Zalo liên kết</th>
                    <th style={{ textAlign: 'center' }}>Tin nhắn</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center', paddingRight: '14px', paddingLeft: '8px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map(c => {
                    const hasPrivateOA = c.oaConfigs && c.oaConfigs.length > 0;
                    const hasSystemOA = c.systemOaAssignments && c.systemOaAssignments.length > 0;
                    const hasAnyOA = hasPrivateOA || hasSystemOA;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                        title="Bấm để xem chi tiết khách hàng"
                      >
                        {/* Cột 1: Khách hàng */}
                        <td style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={c.fullName}
                          >
                            {c.fullName}
                          </div>
                          {c.companyName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 3, minWidth: 0 }}>
                              <Buildings size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.companyName}>{c.companyName}</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                              Cá nhân
                            </div>
                          )}
                        </td>

                        {/* Cột 2: Thông tin liên hệ */}
                        <td style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', minWidth: 0 }}>
                            <EnvelopeSimple size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.email}>{c.email}</span>
                          </div>
                          {c.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 3, minWidth: 0 }}>
                              <Phone size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Cột 3: OA Zalo liên kết */}
                        <td style={{ minWidth: 0 }} onClick={e => e.stopPropagation()}>
                          {hasAnyOA ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                              {/* OA Riêng */}
                              {c.oaConfigs?.map(oa => (
                                <div
                                  key={oa.id}
                                  role="button"
                                  tabIndex={0}
                                  title="Bấm vào để quản lý cấu hình OA"
                                  onClick={() => {
                                    setOaTarget(c);
                                    setOaModalTab('SYSTEM');
                                    setSelectedSystemOaId('');
                                    setOaForm({ oaName: `OA ${c.companyName || c.fullName}`, fptAppId: '', fptSecretKey: '' });
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--bg-body)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--border-radius-sm)',
                                    padding: '5px 8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    width: '100%',
                                    minWidth: 0,
                                    boxSizing: 'border-box',
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.04)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                    e.currentTarget.style.background = 'var(--bg-body)';
                                  }}
                                >
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6, minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 500, fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                      <Broadcast size={13} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={oa.oaName}>{oa.oaName}</span>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      App: {oa.fptAppId?.substring(0, 8)}... • {oa._count?.templates || 0} mẫu
                                    </div>
                                  </div>
                                  <span
                                    className="badge badge-success"
                                    style={{ fontSize: '10px', padding: '1px 5px', flexShrink: 0, fontWeight: 500 }}
                                  >
                                    OA Riêng
                                  </span>
                                </div>
                              ))}

                              {/* OA Hệ thống đã gán */}
                              {c.systemOaAssignments?.map(assignment => (
                                <div
                                  key={assignment.id}
                                  role="button"
                                  tabIndex={0}
                                  title="Bấm vào để quản lý cấu hình OA"
                                  onClick={() => {
                                    setOaTarget(c);
                                    setOaModalTab('SYSTEM');
                                    setSelectedSystemOaId('');
                                    setOaForm({ oaName: `OA ${c.companyName || c.fullName}`, fptAppId: '', fptSecretKey: '' });
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--color-primary-bg)',
                                    border: '1px solid var(--color-primary-light)',
                                    borderRadius: 'var(--border-radius-sm)',
                                    padding: '5px 8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    width: '100%',
                                    minWidth: 0,
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6, minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 500, fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                      <ShieldCheck size={13} color="var(--color-primary)" weight="fill" style={{ flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={assignment.oaConfig?.oaName}>{assignment.oaConfig?.oaName}</span>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {assignment.oaConfig?._count?.templates || 0} mẫu tin có sẵn
                                    </div>
                                  </div>
                                  <span
                                    className="badge badge-primary"
                                    style={{ fontSize: '10px', padding: '1px 5px', flexShrink: 0, fontWeight: 500 }}
                                  >
                                    Hệ thống
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Ô tương tác trực tiếp: bấm thẳng vào để gán OA */
                            <div
                              role="button"
                              tabIndex={0}
                              title="Bấm vào đây để gán OA Hệ thống hoặc tạo OA riêng"
                              onClick={() => {
                                setOaTarget(c);
                                setOaModalTab('SYSTEM');
                                setSelectedSystemOaId('');
                                setOaForm({ oaName: `OA ${c.companyName || c.fullName}`, fptAppId: '', fptSecretKey: '' });
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 10px',
                                border: '1px dashed #cbd5e1',
                                background: 'rgba(241, 245, 249, 0.6)',
                                borderRadius: 'var(--border-radius-sm)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 500,
                                transition: 'all 0.15s ease',
                                width: '100%',
                                maxWidth: '160px',
                                boxSizing: 'border-box',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)';
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                                e.currentTarget.style.color = 'var(--color-primary)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(241, 245, 249, 0.6)';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }}
                            >
                              <Plus size={14} style={{ flexShrink: 0 }} />
                              <span>Bấm để gán OA</span>
                            </div>
                          )}
                        </td>

                        {/* Cột 4: Số lượng tin nhắn */}
                        <td style={{ textAlign: 'center', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {c._count?.messages || 0}
                        </td>

                        {/* Cột 5: Trạng thái tài khoản */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: 500 }}>
                            {c.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khoá'}
                          </span>
                        </td>

                        {/* Cột 6: Thao tác (3 nút icon: Đặt lại mật khẩu, Khóa/Mở khóa, Xóa) */}
                        <td style={{ textAlign: 'center', paddingRight: '14px', paddingLeft: '8px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0 }}>
                            <button
                              type="button"
                              title="Đặt lại mật khẩu"
                              onClick={() => { setResetTarget(c); setNewPassword(''); }}
                              style={{
                                width: 28,
                                height: 28,
                                flexShrink: 0,
                                borderRadius: 'var(--border-radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-secondary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.color = 'var(--color-primary)';
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.background = 'var(--bg-card)';
                              }}
                            >
                              <Key size={14} />
                            </button>
                            <button
                              type="button"
                              title={c.status === 'ACTIVE' ? 'Khoá tài khoản này' : 'Mở khoá tài khoản'}
                              onClick={() => statusMutation.mutate({ id: c.id, status: c.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' })}
                              style={{
                                width: 28,
                                height: 28,
                                flexShrink: 0,
                                borderRadius: 'var(--border-radius-sm)',
                                border: '1px solid',
                                borderColor: c.status === 'ACTIVE' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                                background: c.status === 'ACTIVE' ? 'rgba(217, 119, 6, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                color: c.status === 'ACTIVE' ? 'var(--color-warning)' : 'var(--color-success)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => {
                                if (c.status === 'ACTIVE') {
                                  e.currentTarget.style.background = 'var(--color-warning)';
                                  e.currentTarget.style.color = '#fff';
                                  e.currentTarget.style.borderColor = 'var(--color-warning)';
                                } else {
                                  e.currentTarget.style.background = 'var(--color-success)';
                                  e.currentTarget.style.color = '#fff';
                                  e.currentTarget.style.borderColor = 'var(--color-success)';
                                }
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = c.status === 'ACTIVE' ? 'rgba(217, 119, 6, 0.08)' : 'rgba(16, 185, 129, 0.08)';
                                e.currentTarget.style.color = c.status === 'ACTIVE' ? 'var(--color-warning)' : 'var(--color-success)';
                                e.currentTarget.style.borderColor = c.status === 'ACTIVE' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(16, 185, 129, 0.3)';
                              }}
                            >
                              {c.status === 'ACTIVE' ? <Lock size={14} /> : <LockOpen size={14} />}
                            </button>
                            <button
                              type="button"
                              title="Xóa khách hàng"
                              onClick={() => setDeleteTarget(c)}
                              style={{
                                width: 28,
                                height: 28,
                                flexShrink: 0,
                                borderRadius: 'var(--border-radius-sm)',
                                border: '1px solid rgba(220, 38, 38, 0.25)',
                                background: 'rgba(220, 38, 38, 0.08)',
                                color: 'var(--color-danger)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--color-danger)';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.borderColor = 'var(--color-danger)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                                e.currentTarget.style.color = 'var(--color-danger)';
                                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.25)';
                              }}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!data?.data?.length && (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        <div className="empty-state-title" style={{ fontWeight: 600 }}>Chưa có khách hàng nào</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                          Bấm nút "Thêm khách hàng mới" để tạo tài khoản và thiết lập cấu hình Zalo OA.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data?.totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">Trang {page} trên {data.totalPages} ({data.total} khách hàng)</div>
                <div className="pagination-controls">
                  <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
                  <button className="pagination-btn" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Sau</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal 1: Thêm khách hàng mới */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                Thêm khách hàng mới
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                  <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <label className="form-label" style={{ fontWeight: 500 }}>Họ tên khách hàng *</label>
                    <input
                      className="form-input"
                      placeholder="VD: Nguyễn Văn A"
                      value={form.fullName}
                      onChange={e => {
                        const val = e.target.value;
                        setForm(prev => ({
                          ...prev,
                          fullName: val,
                          oaName: prev.oaName || (prev.companyName ? `OA ${prev.companyName}` : `OA ${val}`)
                        }));
                      }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <label className="form-label" style={{ fontWeight: 500 }}>Số điện thoại</label>
                    <input
                      className="form-input"
                      placeholder="VD: 0987654321"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
                  <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <label className="form-label" style={{ fontWeight: 500 }}>Email đăng nhập *</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="VD: khachhang@gmail.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <label className="form-label" style={{ fontWeight: 500 }}>Mật khẩu đăng nhập *</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
                  <label className="form-label" style={{ fontWeight: 500 }}>Tên doanh nghiệp</label>
                  <input
                    className="form-input"
                    placeholder="VD: Công ty TNHH Dịch vụ ABC"
                    value={form.companyName}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        companyName: val,
                        oaName: val ? `OA ${val}` : prev.oaName
                      }));
                    }}
                  />
                </div>

                {/* Khối Cấu hình Zalo OA */}
                <div
                  style={{
                    background: 'var(--bg-body)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    padding: 'var(--spacing-md)',
                  }}
                >
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                    Cấu hình OA Zalo
                  </label>

                  {/* 3 Lựa chọn: Dùng OA Hệ thống | Cấu hình OA Riêng | Chưa gán OA */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 'var(--spacing-md)' }}>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, oaType: 'SYSTEM' })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: form.oaType === 'SYSTEM' ? 600 : 500,
                        background: form.oaType === 'SYSTEM' ? 'var(--color-primary)' : '#ffffff',
                        color: form.oaType === 'SYSTEM' ? '#ffffff' : 'var(--text-secondary)',
                        border: '1px solid ' + (form.oaType === 'SYSTEM' ? 'var(--color-primary)' : 'var(--border-color)'),
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ShieldCheck size={16} weight={form.oaType === 'SYSTEM' ? 'fill' : 'regular'} />
                      OA Hệ thống
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, oaType: 'PRIVATE' })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: form.oaType === 'PRIVATE' ? 600 : 500,
                        background: form.oaType === 'PRIVATE' ? 'var(--color-primary)' : '#ffffff',
                        color: form.oaType === 'PRIVATE' ? '#ffffff' : 'var(--text-secondary)',
                        border: '1px solid ' + (form.oaType === 'PRIVATE' ? 'var(--color-primary)' : 'var(--border-color)'),
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Broadcast size={16} weight={form.oaType === 'PRIVATE' ? 'fill' : 'regular'} />
                      OA Riêng
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, oaType: 'NONE' })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: form.oaType === 'NONE' ? 600 : 500,
                        background: form.oaType === 'NONE' ? 'var(--color-gray-800)' : '#ffffff',
                        color: form.oaType === 'NONE' ? '#ffffff' : 'var(--text-secondary)',
                        border: '1px solid ' + (form.oaType === 'NONE' ? 'var(--color-gray-800)' : 'var(--border-color)'),
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Chưa gán OA
                    </button>
                  </div>

                  {/* Chi tiết theo lựa chọn */}
                  {form.oaType === 'SYSTEM' && (
                    <div>
                      {activeSystemOAs.length > 0 ? (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontWeight: 500 }}>Chọn OA hệ thống *</label>
                          <select
                            className="form-select"
                            value={form.systemOaId}
                            onChange={e => setForm({ ...form, systemOaId: e.target.value })}
                            required={form.oaType === 'SYSTEM'}
                          >
                            <option value="">-- Chọn OA hệ thống đang hoạt động --</option>
                            {activeSystemOAs.map(oa => (
                              <option key={oa.id} value={oa.id}>
                                {oa.oaName} ({oa._count?.templates || 0} mẫu tin)
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', padding: '8px 12px', background: 'var(--color-warning-bg)', borderRadius: 'var(--border-radius-sm)' }}>
                          Chưa có OA hệ thống nào hoạt động. Vui lòng tạo OA hệ thống trước hoặc chọn Cấu hình OA riêng.
                        </div>
                      )}
                    </div>
                  )}

                  {form.oaType === 'PRIVATE' && (
                    <div>
                      <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <label className="form-label" style={{ fontWeight: 500 }}>Tên gợi nhớ OA *</label>
                        <input
                          className="form-input"
                          placeholder="VD: OA Khách hàng ABC"
                          value={form.oaName}
                          onChange={e => setForm({ ...form, oaName: e.target.value })}
                          required={form.oaType === 'PRIVATE'}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontWeight: 500 }}>FPT App ID *</label>
                          <input
                            className="form-input"
                            placeholder="Lấy từ fns.fpt.work"
                            value={form.fptAppId}
                            onChange={e => setForm({ ...form, fptAppId: e.target.value })}
                            required={form.oaType === 'PRIVATE'}
                            style={{ fontFamily: 'monospace' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontWeight: 500 }}>FPT Secret Key *</label>
                          <input
                            className="form-input"
                            type="password"
                            placeholder="Lấy từ fns.fpt.work"
                            value={form.fptSecretKey}
                            onChange={e => setForm({ ...form, fptSecretKey: e.target.value })}
                            required={form.oaType === 'PRIVATE'}
                            style={{ fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {form.oaType === 'NONE' && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      Tài khoản sẽ được tạo mà chưa có OA. Bạn có thể gán OA hệ thống hoặc kết nối OA riêng bất kỳ lúc nào tại danh sách khách hàng.
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} style={{ fontWeight: 500 }}>
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={createMutation.isPending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
                >
                  <CheckCircle size={16} />
                  {createMutation.isPending ? 'Đang tạo...' : 'Lưu và Tạo khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Gán OA trực tiếp cho 1 khách hàng */}
      {oaTarget && (
        <div className="modal-overlay" onClick={() => setOaTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <Broadcast size={20} color="var(--color-primary)" />
                Cấu hình OA cho {oaTarget.fullName}
              </div>
              <button className="modal-close" onClick={() => setOaTarget(null)}>✕</button>
            </div>

            {/* Segmented Tabs: OA Hệ thống vs OA Riêng */}
            <div style={{ display: 'flex', gap: 8, padding: 'var(--spacing-md) var(--spacing-lg) 0', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setOaModalTab('SYSTEM')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: oaModalTab === 'SYSTEM' ? 600 : 500,
                  background: oaModalTab === 'SYSTEM' ? 'var(--color-primary)' : 'var(--bg-body)',
                  color: oaModalTab === 'SYSTEM' ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid ' + (oaModalTab === 'SYSTEM' ? 'var(--color-primary)' : 'var(--border-color)'),
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <ShieldCheck size={16} weight={oaModalTab === 'SYSTEM' ? 'fill' : 'regular'} />
                Gán OA Hệ thống
              </button>

              <button
                type="button"
                onClick={() => setOaModalTab('PRIVATE')}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: oaModalTab === 'PRIVATE' ? 600 : 500,
                  background: oaModalTab === 'PRIVATE' ? 'var(--color-primary)' : 'var(--bg-body)',
                  color: oaModalTab === 'PRIVATE' ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid ' + (oaModalTab === 'PRIVATE' ? 'var(--color-primary)' : 'var(--border-color)'),
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Broadcast size={16} />
                Cấu hình OA Riêng
              </button>
            </div>

            {/* TAB 1: Gán OA Hệ thống */}
            {oaModalTab === 'SYSTEM' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 500 }}>Chọn OA Hệ thống cần gán *</label>
                    <select
                      className="form-select"
                      value={selectedSystemOaId}
                      onChange={e => setSelectedSystemOaId(e.target.value)}
                    >
                      <option value="">-- Chọn OA Hệ thống đang hoạt động --</option>
                      {systemOAs?.filter(s => s.status === 'ACTIVE').map(s => (
                        <option key={s.id} value={s.id}>
                          {s.oaName} ({s._count?.templates || 0} mẫu tin)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={!selectedSystemOaId || assignSystemOaMutation.isPending}
                    onClick={() => assignSystemOaMutation.mutate({ userId: oaTarget.id, oaConfigId: selectedSystemOaId })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, width: '100%', justifyContent: 'center' }}
                  >
                    <CheckCircle size={16} />
                    {assignSystemOaMutation.isPending ? 'Đang gán OA...' : 'Gán OA Hệ thống này cho khách hàng'}
                  </button>

                  {/* Danh sách OA Hệ thống đã gán */}
                  {oaTarget.systemOaAssignments && oaTarget.systemOaAssignments.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-lg)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        OA Hệ thống đang gán cho khách hàng này:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {oaTarget.systemOaAssignments.map(item => (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: 'var(--bg-body)',
                              borderRadius: 'var(--border-radius-sm)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                {item.oaConfig?.oaName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {item.oaConfig?._count?.templates || 0} mẫu tin đã sẵn sàng
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={unassignSystemOaMutation.isPending}
                              onClick={() => {
                                if (window.confirm('Bạn có chắc muốn hủy gán OA Hệ thống này khỏi khách hàng?')) {
                                  unassignSystemOaMutation.mutate({ userId: oaTarget.id, oaId: item.oaConfig.id });
                                }
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 500 }}
                            >
                              Gỡ gán
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setOaTarget(null)} style={{ fontWeight: 500 }}>
                    Đóng
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Cấu hình OA Riêng */}
            {oaModalTab === 'PRIVATE' && (
              <form onSubmit={handleDirectAddOA}>
                <div className="modal-body">
                  <div style={{ background: 'var(--bg-body)', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--border-radius-sm)', marginBottom: 'var(--spacing-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Khách hàng được gán:</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {oaTarget.fullName} {oaTarget.companyName && `(${oaTarget.companyName})`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email: {oaTarget.email}</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 500 }}>Tên gợi nhớ OA *</label>
                    <input
                      className="form-input"
                      value={oaForm.oaName}
                      onChange={e => setOaForm({ ...oaForm, oaName: e.target.value })}
                      placeholder="VD: OA Cửa hàng ABC"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 500 }}>FPT App ID *</label>
                    <input
                      className="form-input"
                      value={oaForm.fptAppId}
                      onChange={e => setOaForm({ ...oaForm, fptAppId: e.target.value })}
                      placeholder="Lấy từ fns.fpt.work"
                      required
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 500 }}>FPT Secret Key *</label>
                    <input
                      className="form-input"
                      type="password"
                      value={oaForm.fptSecretKey}
                      onChange={e => setOaForm({ ...oaForm, fptSecretKey: e.target.value })}
                      placeholder="Lấy từ fns.fpt.work"
                      required
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setOaTarget(null)} style={{ fontWeight: 500 }}>
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={addOaMutation.isPending}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
                  >
                    <CheckCircle size={16} />
                    {addOaMutation.isPending ? 'Đang kết nối...' : 'Xác nhận gán OA riêng'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Đổi mật khẩu */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ fontWeight: 600 }}>Đặt lại mật khẩu cho {resetTarget.fullName}</div>
              <button className="modal-close" onClick={() => setResetTarget(null)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                  Email: <strong>{resetTarget.email}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Mật khẩu mới *</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResetTarget(null)} style={{ fontWeight: 500 }}>Đóng</button>
                <button type="submit" className="btn btn-primary" disabled={resetMutation.isPending} style={{ fontWeight: 500 }}>
                  {resetMutation.isPending ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Xác nhận xóa khách hàng */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(220, 38, 38, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-danger)'
                }}>
                  <Trash size={20} />
                </div>
                <div>
                  <div className="modal-title" style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: '#991b1b' }}>
                    Xác nhận xóa khách hàng
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    Hành động xóa không thể khôi phục
                  </div>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: 'var(--spacing-lg)' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
                Bạn có chắc chắn muốn xóa khách hàng <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.fullName}</strong> ({deleteTarget.email}) không?
              </p>
              <div style={{
                marginTop: 'var(--spacing-md)',
                padding: '10px 14px',
                background: 'rgba(220, 38, 38, 0.05)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: 'var(--font-size-xs)',
                color: '#b91c1c',
                lineHeight: 1.5,
              }}>
                Toàn bộ dữ liệu liên quan bao gồm cấu hình OA, chiến dịch, tin nhắn và API key của khách hàng này sẽ bị xóa hoàn toàn khỏi hệ thống.
              </div>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                style={{ fontWeight: 500 }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                style={{
                  background: 'var(--color-danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(220, 38, 38, 0.2)',
                }}
              >
                <Trash size={15} />
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
