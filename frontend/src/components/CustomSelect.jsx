import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { CaretDown, Check } from '@phosphor-icons/react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- Chọn --',
  style = {},
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 260 });
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  const updatePlacement = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(260, (options.length || 1) * 38 + 12);

    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const calculatedMaxHeight = Math.min(
      260,
      openUpwards ? Math.max(120, spaceAbove - 16) : Math.max(120, spaceBelow - 16)
    );

    setMenuPos({
      top: openUpwards ? Math.max(8, rect.top - estimatedHeight - 4) : (rect.bottom + 4),
      left: rect.left,
      width: rect.width,
      maxHeight: calculatedMaxHeight,
    });
  }, [options.length]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        (!menuRef.current || !menuRef.current.contains(event.target))
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePlacement);
      window.addEventListener('scroll', updatePlacement, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen, updatePlacement]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePlacement();
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrapper ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          minHeight: 38,
          background: disabled ? '#f1f5f9' : '#ffffff',
          color: selectedOption ? '#0f172a' : '#64748b',
          border: isOpen ? '1.5px solid #1e3a8a' : '1px solid #cbd5e1',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(30, 58, 138, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <CaretDown
          size={14}
          color="#64748b"
          weight="bold"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            marginLeft: 8,
          }}
        />
      </button>

      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight || 260,
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              zIndex: 99999,
              padding: '4px',
            }}
          >
            {options.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 13, color: '#94a3b8' }}>
                Không có lựa chọn khả dụng
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#1e3a8a' : '#1e293b',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.label}
                      </span>
                      {opt.sublabel && (
                        <span style={{ fontSize: 11.5, color: '#64748b' }}>{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} color="#1e3a8a" weight="bold" style={{ flexShrink: 0, marginLeft: 8 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
