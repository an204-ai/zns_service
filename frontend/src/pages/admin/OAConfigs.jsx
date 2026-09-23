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
  Eye,
  Buildings,
  User,
  MagnifyingGlass,
  CheckCircle,
} from '@phosphor-icons/react';

export default function AdminOAConfigs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Tab lọc
  const [currentTab, setCurrentTab] = useState('all'); // 'all' | 'system' | 'private' | 'unassigned'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: Thêm ứng dụng
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    oaName: '',
    fptAppId: '',
    fptSecretKey: '',
    isSystem: true,
  });
  const [errorMsg, setErrorMsg] = useState('');

  // Danh sách ứng dụng từ backend (hỗ trợ filter type & search)
  const { data: responseData, isLoading } = useQuery({
    queryKey: ['admin-oa-configs', currentTab, searchQuery],
    queryFn: () => {
      const params = {};
      if (currentTab !== 'all') params.type = currentTab;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      return api.get('/admin/oa-configs', { params }).then(r => r.data);
    },
  });

  const appList = responseData?.data || [];

  // Tạo ứng dụng mutation
  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/oa-configs', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-oa-configs']);
      queryClient.invalidateQueries(['admin-oa-system']);
      setShowModal(false);
      setFormData({ oaName: '', fptAppId: '', fptSecretKey: '', isSystem: true });
      toast.success(res.data?.message || 'Thêm ứng dụng thành công!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo ứng dụng';
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  // Xóa ứng dụng
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/oa-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-oa-configs']);
      queryClient.invalidateQueries(['admin-oa-system']);
      toast.success('Đã xóa ứng dụng thành công');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa ứng dụng');
    },
  });

  const handleCreateApp = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.oaName.trim() || !formData.fptAppId.trim() || !formData.fptSecretKey.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div>
      {/* Page Header Row */}
      <div className="console-section-header">
        <h1 className="console-section-title">Quản lý ứng dụng</h1>
        <p className="console-section-desc">
          Kho ứng dụng kết nối Zalo Official Account từ cổng FPT Telecom, bao gồm ứng dụng hệ thống dùng chung và ứng dụng cấp phát riêng cho từng khách hàng
        </p>
      </div>

      {/* Filter Tabs & Toolbar */}
      <div className="console-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${currentTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('all')}
            style={{ fontWeight: currentTab === 'all' ? 600 : 400 }}
          >
            Tất cả ứng dụng
          </button>
          <button
            type="button"
            className={`btn btn-sm ${currentTab === 'system' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('system')}
            style={{ fontWeight: currentTab === 'system' ? 600 : 400 }}
          >
            Hệ thống
          </button>
          <button
            type="button"
            className={`btn btn-sm ${currentTab === 'private' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('private')}
            style={{ fontWeight: currentTab === 'private' ? 600 : 400 }}
          >
            Cá nhân
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 220 }}>
            <MagnifyingGlass
              size={15}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Tìm kiếm ứng dụng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 13, height: 36 }}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowModal(true);
              setErrorMsg('');
              setFormData({ oaName: '', fptAppId: '', fptSecretKey: '', isSystem: true });
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, whiteSpace: 'nowrap' }}
          >
            <Plus size={16} weight="bold" /> Thêm ứng dụng
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="console-card-table">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>#</th>
                  <th style={{ width: '30%', textAlign: 'left' }}>Tên ứng dụng</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Loại ứng dụng</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Mã Zalo OA</th>
                  <th style={{ width: '18%', textAlign: 'left' }}>Khách hàng sử dụng</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Mẫu tin</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {appList.map((oa, index) => (
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
                          style={{ fontWeight: 600, color: '#1e293b' }}
                        >
                          {oa.oaName}
                        </span>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                          App ID: <span style={{ fontFamily: 'monospace' }}>{oa.fptAppId}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {oa.isSystem ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11.5,
                            fontWeight: 500,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          <Buildings size={13} weight="bold" />
                          Hệ thống
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11.5,
                            fontWeight: 500,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: '#f5f3ff',
                            color: '#6d28d9',
                            border: '1px solid #ddd6fe',
                          }}
                        >
                          <User size={13} weight="bold" />
                          Cá nhân
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12.5, fontWeight: 500 }}>
                      {oa.oaId || '—'}
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      {oa.isSystem ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            color: '#334155',
                            background: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Users size={13} color="#2563eb" weight="bold" />
                          <span><strong>{oa._count?.assignments || 0}</strong> khách hàng</span>
                        </span>
                      ) : oa.user ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>
                            {oa.user.companyName || oa.user.fullName}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {oa.user.email}
                          </span>
                        </div>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 11.5,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                          }}
                        >
                          Chưa gán khách
                        </span>
                      )}
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

                {!appList.length && (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      <div className="empty-state-title">Không tìm thấy ứng dụng nào</div>
                      <div className="empty-state-text">
                        Bấm vào "Thêm ứng dụng" để khai báo thông tin kết nối FPT cho ứng dụng hệ thống hoặc ứng dụng của khách
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
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="#2563eb" weight="fill" />
                <h2 className="modal-title">Thêm ứng dụng mới</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateApp}>
              <div className="modal-body">
                {errorMsg && (
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
                    {errorMsg}
                  </div>
                )}

                {/* Chọn loại ứng dụng: Hệ thống vs Khách */}
                <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Chọn loại ứng dụng *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Option 1: Ứng dụng hệ thống */}
                    <div
                      onClick={() => setFormData({ ...formData, isSystem: true })}
                      style={{
                        border: formData.isSystem ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '12px',
                        cursor: 'pointer',
                        background: formData.isSystem ? '#eff6ff' : '#ffffff',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: formData.isSystem ? '#1d4ed8' : '#334155' }}>
                          <Buildings size={16} weight={formData.isSystem ? 'fill' : 'regular'} />
                          Ứng dụng hệ thống
                        </span>
                        {formData.isSystem && <CheckCircle size={16} color="#2563eb" weight="fill" />}
                      </div>
                      <span style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.3 }}>
                        Dùng chung cho nhiều khách hàng, có thể gán cấp phát cho nhiều tài khoản
                      </span>
                    </div>

                    {/* Option 2: Ứng dụng cá nhân */}
                    <div
                      onClick={() => setFormData({ ...formData, isSystem: false })}
                      style={{
                        border: !formData.isSystem ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '12px',
                        cursor: 'pointer',
                        background: !formData.isSystem ? '#f5f3ff' : '#ffffff',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: !formData.isSystem ? '#6d28d9' : '#334155' }}>
                          <User size={16} weight={!formData.isSystem ? 'fill' : 'regular'} />
                          Cá nhân
                        </span>
                        {!formData.isSystem && <CheckCircle size={16} color="#7c3aed" weight="fill" />}
                      </div>
                      <span style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.3 }}>
                        Dành riêng cho 1 khách hàng duy nhất. Sau khi tạo sẽ vào trang chi tiết khách để gán
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Tên ứng dụng *</label>
                  <input
                    className="form-input"
                    placeholder="Ví dụ: CloudVerify hoặc OA Khách hàng A"
                    value={formData.oaName}
                    onChange={e => setFormData({ ...formData, oaName: e.target.value })}
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
                    value={formData.fptAppId}
                    onChange={e => setFormData({ ...formData, fptAppId: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500 }}>Secret Key *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Lấy từ fns.fpt.work"
                    value={formData.fptSecretKey}
                    onChange={e => setFormData({ ...formData, fptSecretKey: e.target.value })}
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
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Đang kết nối FPT...' : 'Lưu ứng dụng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
