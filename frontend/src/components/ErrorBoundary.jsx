import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches any unhandled React render errors
 * and shows a friendly recovery UI instead of a blank screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-navy, #0a1628)', padding: '2rem',
      }}>
        <div style={{
          maxWidth: 480, width: '100%',
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: '2.5rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <AlertTriangle size={28} color="#ef4444" />
          </div>

          <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            An unexpected error occurred in this section of the dashboard.
            Your data is safe — try refreshing or navigating to another page.
          </p>

          {this.state.error && (
            <pre style={{
              background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '0.75rem',
              fontSize: '0.72rem', color: '#f87171', textAlign: 'left',
              overflow: 'auto', marginBottom: '1.5rem', maxHeight: 120,
              border: '1px solid rgba(239,68,68,0.15)',
            }}>
              {this.state.error.toString()}
            </pre>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
                background: 'linear-gradient(135deg, #0ea5a0, #0891b2)',
                border: 'none', color: '#fff', cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} /> Reload Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null, info: null })}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
