import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { UserCircle, Buildings, Phone, EnvelopeSimple, ShieldCheck } from '@phosphor-icons/react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setFetching(true);
      api.get('/auth/me')
        .then(({ data }) => {
          const u = data.data;
          setForm({
            fullName: u.fullName || '',
            companyName: u.companyName || '',
            phone: u.phone || '',
          });
        })
        .catch(() => {
          if (user) {
            setForm({
              fullName: user.fullName || '',
              companyName: user.companyName || '',
              phone: user.phone || '',
            });
          }
        })
        .finally(() => setFetching(false));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setErrorMsg('Họ và tên không được để trống');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data } = await api.put('/auth/profile', form);
      const updatedUser = { ...user, ...data.data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSuccessMsg('Cập nhật thông tin hồ sơ thành công!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCircle size={22} weight="duotone" color="var(--color-primary)" />
            Quản lý hồ sơ cá nhân
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {fetching ? (
          <div className="loading-overlay" style={{ minHeight: '220px' }}>
            <div className="spinner" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {errorMsg && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-light)',
                  borderRadius: 'var(--border-radius)',
                  color: 'var(--color-danger)',
                  fontSize: 'var(--font-size-sm)',
                }}>
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success-light)',
                  borderRadius: 'var(--border-radius)',
                  color: 'var(--color-success)',
                  fontSize: 'var(--font-size-sm)',
                }}>
                  {successMsg}
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--color-gray-50)',
                borderRadius: 'var(--border-radius)',
                marginBottom: 'var(--spacing-xs)'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 'var(--font-size-xl)'
                }}>
                  {form.fullName?.charAt(0) || user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 'var(--font-size-md)' }}>
                    {form.fullName || user?.fullName || 'Người dùng'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    <ShieldCheck size={14} color="var(--color-primary)" />
                    <span>{user?.role === 'ADMIN' ? 'Quản trị viên toàn hệ thống' : 'Khách hàng doanh nghiệp'}</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <EnvelopeSimple size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Địa chỉ Email (Tài khoản)
                </label>
                <input
                  className="form-input"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{ backgroundColor: 'var(--color-gray-100)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <UserCircle size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Họ và tên *
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Nhập họ và tên đầy đủ"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Buildings size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Tên doanh nghiệp hoặc đơn vị
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ví dụ: Công ty TNHH Giải Pháp Công Nghệ"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Số điện thoại liên hệ
                </label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Đóng
              </button>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
