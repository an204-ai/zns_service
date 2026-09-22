import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  ChartBar, Users, Gear, EnvelopeSimple,
  ListDashes, SignOut, CaretDown, UserCircle, Key, ShieldCheck
} from '@phosphor-icons/react';
import ProfileModal from '../components/ProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

const navItems = [
  { to: '/admin', label: 'Tổng quan', icon: ChartBar, end: true },
  { to: '/admin/customers', label: 'Quản lý khách hàng', icon: Users },
  { to: '/admin/oa-configs', label: 'Quản lý OA hệ thống', icon: ShieldCheck },
  { to: '/admin/templates', label: 'Mẫu tin nhắn', icon: ListDashes },
  { to: '/admin/messages', label: 'Giám sát tin nhắn', icon: EnvelopeSimple },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const activeItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const currentTitle = activeItem ? activeItem.label : 'Cổng quản trị';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">Z</div>
          <div className="sidebar-brand-text">ZNS Reseller</div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Quản trị hệ thống</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <item.icon size={20} weight="duotone" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentTitle}
            </span>
          </div>
          <div className="header-right">
            <div className="user-menu">
              <button
                className="user-menu-trigger"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="user-avatar">
                  {user?.fullName?.charAt(0) || 'A'}
                </div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                  {user?.fullName || 'Admin'}
                </span>
                <CaretDown size={14} />
              </button>
              {showDropdown && (
                <div className="user-dropdown">
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowProfileModal(true);
                    }}
                  >
                    <UserCircle size={18} />
                    Quản lý hồ sơ
                  </button>
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowPasswordModal(true);
                    }}
                  >
                    <Key size={18} />
                    Đổi mật khẩu
                  </button>
                  <div className="user-dropdown-divider" />
                  <button className="user-dropdown-item danger" onClick={handleLogout}>
                    <SignOut size={18} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      {showDropdown && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowDropdown(false)} />}

      {/* Modals for profile and change password */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
