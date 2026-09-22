import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function CustomerProfile() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', companyName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');

  const { data } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: () => api.get('/customer/profile').then(r => r.data.data),
    onSuccess: (d) => setForm({ fullName: d.fullName, companyName: d.companyName || '', phone: d.phone || '' }),
  });

  const updateMutation = useMutation({
    mutationFn: (d) => api.put('/customer/profile', d),
    onSuccess: (r) => { setMsg('Cập nhật thành công'); setEditing(false); },
  });

  const pwMutation = useMutation({
    mutationFn: (d) => api.post('/customer/change-password', d),
    onSuccess: () => { setMsg('Đổi mật khẩu thành công'); setPwForm({ oldPassword: '', newPassword: '' }); },
    onError: (err) => setMsg(err.response?.data?.message || 'Có lỗi xảy ra'),
  });

  return (
    <div>
      {msg && <div style={{ padding: '10px 14px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-light)', borderRadius: 'var(--border-radius)', color: 'var(--color-success)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <div className="card">
          <div className="card-header">
            <div className="card-header-title">Thông tin cá nhân</div>
            {!editing && <button className="btn btn-sm btn-secondary" onClick={() => { setForm({ fullName: data?.fullName || '', companyName: data?.companyName || '', phone: data?.phone || '' }); setEditing(true); }}>Chỉnh sửa</button>}
          </div>
          <div className="card-body">
            {editing ? (
              <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(form); }}>
                <div className="form-group"><label className="form-label">Họ tên</label><input className="form-input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Công ty</label><input className="form-input" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Số điện thoại</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-success" disabled={updateMutation.isPending}>Lưu</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Huỷ</button>
                </div>
              </form>
            ) : (
              <div>
                <p style={{ marginBottom: 12 }}><strong>Email:</strong> {data?.email}</p>
                <p style={{ marginBottom: 12 }}><strong>Họ tên:</strong> {data?.fullName}</p>
                <p style={{ marginBottom: 12 }}><strong>Công ty:</strong> {data?.companyName || '—'}</p>
                <p><strong>Số điện thoại:</strong> {data?.phone || '—'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-header-title">Đổi mật khẩu</div></div>
          <div className="card-body">
            <form onSubmit={e => { e.preventDefault(); pwMutation.mutate(pwForm); }}>
              <div className="form-group"><label className="form-label">Mật khẩu hiện tại</label><input className="form-input" type="password" value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Mật khẩu mới</label><input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} /></div>
              <button type="submit" className="btn btn-primary" disabled={pwMutation.isPending}>Đổi mật khẩu</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
