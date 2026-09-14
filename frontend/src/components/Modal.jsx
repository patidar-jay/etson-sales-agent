import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal — properly centered, scrollable backdrop so content never clips at top.
 * Uses portal to escape transform containing blocks.
 */
const Modal = ({ isOpen, onClose, title, children, maxWidth = '500px' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(11, 14, 26, 0.85)',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      <div style={{
        minHeight: '100%',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-card slide-in"
          style={{
            width: '100%', maxWidth,
            padding: '2rem',
            position: 'relative',
            margin: 'auto', // This ensures it centers when smaller than viewport, but grows downwards when taller
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{title}</h2>
            <button
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: '0.35rem', borderRadius: '8px', lineHeight: 0 }}
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
