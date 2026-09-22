import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { EnvelopeSimple, Lock, SignIn, Warning } from '@phosphor-icons/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/customer');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-body)',
      padding: 'var(--spacing-lg)',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--border-radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%',
        maxWidth: 420,
        overflow: 'hidden',
      }}>
        {/* Brand header */}
        <div style={{
          padding: 'var(--spacing-2xl) var(--spacing-xl) var(--spacing-lg)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'var(--color-primary)',
            borderRadius: 'var(--border-radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--spacing-md)',
            color: 'white',
            fontWeight: 700,
            fontSize: 'var(--font-size-2xl)',
          }}>
            Z
          </div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 4 }}>
            ZNS Reseller Platform
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Đăng nhập để quản lý dịch vụ
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '0 var(--spacing-xl) var(--spacing-xl)' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-light)',
              borderRadius: 'var(--border-radius)',
              color: 'var(--color-danger)',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 'var(--spacing-md)',
            }}>
              <Warning size={18} weight="fill" />
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tên đăng nhập hoặc Email</label>
            <div style={{ position: 'relative' }}>
              <EnvelopeSimple
                size={18}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 38 }}
                placeholder="Nhập tên đăng nhập hoặc email (VD: admin)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: 38 }}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
          >
            {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <SignIn size={20} />}
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
