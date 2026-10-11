import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';

const ThemeToggle = ({ compact = false }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { id: 'system', label: 'System Default', icon: Monitor },
    { id: 'dark', label: 'Dark Theme', icon: Moon },
    { id: 'light', label: 'Light Theme', icon: Sun },
  ];

  const CurrentIcon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;

  if (compact) {
    return (
      <div className="theme-toggle-container" ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          className="theme-toggle-btn"
          onClick={() => setOpen(!open)}
          title={`Theme: ${theme} (${resolvedTheme})`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 11px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            transition: 'all 0.18s ease'
          }}
        >
          <CurrentIcon size={14} style={{ color: 'var(--cyan-400)' }} />
          <span style={{ textTransform: 'capitalize' }}>{theme}</span>
          <ChevronDown size={12} style={{ opacity: 0.6 }} />
        </button>

        {open && (
          <div
            className="theme-dropdown"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              minWidth: '150px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {options.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setTheme(id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: theme === id ? 'rgba(34,211,238,0.12)' : 'transparent',
                  color: theme === id ? 'var(--cyan-400)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: theme === id ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s'
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="theme-segmented-control"
      style={{
        display: 'flex',
        gap: '2px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        padding: '3px',
        borderRadius: 'var(--radius-md)',
        width: '100%'
      }}
    >
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          title={label}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '7px 8px',
            borderRadius: 'var(--radius-sm)',
            border: theme === id ? '1px solid var(--border-default)' : '1px solid transparent',
            background: theme === id ? 'var(--bg-overlay)' : 'transparent',
            color: theme === id ? 'var(--cyan-400)' : 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: theme === id ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            fontFamily: 'var(--font)'
          }}
        >
          <Icon size={13} />
          <span>{id === 'system' ? 'Auto' : id.charAt(0).toUpperCase() + id.slice(1)}</span>
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
