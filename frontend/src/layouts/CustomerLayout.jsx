import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  SquaresFour,
  IdentificationBadge,
  PaperPlaneTilt,
  Megaphone,
  ClockCounterClockwise,
  BookOpen,
  SidebarSimple,
  SignOut,
  CaretDown,
  UserCircle,
  Key,
  CaretUpDown,
  User,
  CreditCard
} from '@phosphor-icons/react';
import ProfileModal from '../components/ProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

const navGroups = [
  {
    title: 'Tài khoản của tôi',
    items: [
      { to: '/customer', label: 'Tổng quan', icon: SquaresFour, end: true },
      { to: '/customer/oa-info', label: 'Quản lý ứng dụng và API key', icon: IdentificationBadge },
      { to: '/customer/send-message', label: 'Gửi tin thử nghiệm', icon: PaperPlaneTilt },
      { to: '/customer/campaigns', label: 'Chiến dịch gửi tin', icon: Megaphone },
      { to: '/customer/messages', label: 'Lịch sử gửi tin', icon: ClockCounterClockwise },
    ]
  },
  {
    title: 'Công cụ & Tài liệu',
    items: [
      { to: '/customer/api-docs', label: 'Tài liệu API', icon: BookOpen },
    ]
  }
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const allItems = navGroups.flatMap(g => g.items);
  const activeItem = allItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const currentTitle = activeItem ? activeItem.label : (user?.companyName || 'Cổng khách hàng');

  const getInitials = (name) => {
    if (!name) return 'KH';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <span className="sidebar-brand-title">ZNS PORTAL</span>
            <span className="sidebar-brand-subtitle">Customer Console</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="sidebar-section-title">{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  title={item.label}
                >
                  <item.icon size={17} weight="regular" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar User Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar" title={user?.fullName}>
            <CreditCard size={17} weight="bold" />
          </div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{user?.fullName || 'Người dùng'}</div>
            <div className="sidebar-footer-role">{user?.companyName || 'Trial'}</div>
          </div>
          <button
            type="button"
            className="sidebar-footer-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Tùy chọn tài khoản"
          >
            <CaretUpDown size={16} />
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              aria-label="Thu gọn hoặc mở rộng thanh bên"
            >
              <SidebarSimple size={17} weight="bold" />
            </button>
            <div className="header-divider" />
            <span className="header-title-text">{currentTitle}</span>
          </div>

          <div className="header-right">
            <div className="header-user-badge">
              <User size={13} weight="bold" />
              <span>User</span>
            </div>

            <div className="user-menu" style={{ position: 'relative' }}>
              <button
                type="button"
                className="header-user-trigger"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="header-avatar-circle">
                  {getInitials(user?.fullName)}
                </div>
                <span className="header-user-name">
                  {user?.fullName || 'Người dùng'}
                </span>
                <CaretDown size={13} className="header-caret" />
              </button>

              {showDropdown && (
                <div className="user-dropdown">
                  <button
                    type="button"
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowProfileModal(true);
                    }}
                  >
                    <UserCircle size={17} />
                    Quản lý hồ sơ
                  </button>
                  <button
                    type="button"
                    className="user-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowPasswordModal(true);
                    }}
                  >
                    <Key size={17} />
                    Đổi mật khẩu
                  </button>
                  <div className="user-dropdown-divider" />
                  <button
                    type="button"
                    className="user-dropdown-item danger"
                    onClick={handleLogout}
                  >
                    <SignOut size={17} />
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

      {showDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          onClick={() => setShowDropdown(false)}
        />
      )}

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
