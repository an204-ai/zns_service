import { useState } from 'react';
import api from '../services/api';
import { Key, Lock, CheckCircle, WarningCircle } from '@phosphor-icons/react';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.oldPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (!form.newPassword || form.newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });

      setSuccessMsg('Đổi mật khẩu thành công!');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={22} weight="duotone" color="var(--color-primary)" />
            Đổi mật khẩu
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {errorMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-light)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--color-danger)',
                fontSize: 'var(--font-size-sm)',
              }}>
                <WarningCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-light)',
                borderRadius: 'var(--border-radius)',
                color: 'var(--color-success)',
                fontSize: 'var(--font-size-sm)',
              }}>
                <CheckCircle size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <Lock size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Mật khẩu hiện tại *
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="Nhập mật khẩu đang sử dụng"
                value={form.oldPassword}
                onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Key size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Mật khẩu mới *
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Key size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Xác nhận mật khẩu mới *
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
              Đóng
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
