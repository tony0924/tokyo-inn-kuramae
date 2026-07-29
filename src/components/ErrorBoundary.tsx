import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Keeps a recoverable rendering error from leaving guests on a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="full-page-center" role="alert" aria-live="assertive">
        <div className="card" style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1>頁面暫時無法顯示</h1>
          <p style={{ marginTop: 12 }}>請重新載入頁面；若問題持續，請聯絡管理員。</p>
          <button type="button" className="btn-gold" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
            重新載入
          </button>
        </div>
      </main>
    );
  }
}
