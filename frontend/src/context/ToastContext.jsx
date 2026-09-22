import { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, Warning, Info, X } from '@phosphor-icons/react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', message, duration = 3500 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (msg, duration) => addToast({ type: 'success', message: msg, duration }),
    error: (msg, duration) => addToast({ type: 'error', message: msg, duration }),
    warning: (msg, duration) => addToast({ type: 'warning', message: msg, duration }),
    info: (msg, duration) => addToast({ type: 'info', message: msg, duration }),
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} weight="fill" style={{ flexShrink: 0 }} />;
      case 'error':
        return <XCircle size={20} weight="fill" style={{ flexShrink: 0 }} />;
      case 'warning':
        return <Warning size={20} weight="fill" style={{ flexShrink: 0 }} />;
      default:
        return <Info size={20} weight="fill" style={{ flexShrink: 0 }} />;
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                {renderIcon(t.type)}
                <span style={{ lineHeight: 1.4 }}>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  opacity: 0.8,
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 4,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
