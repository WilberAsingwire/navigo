import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', color: '#fff', background: 'var(--nav-bg)', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#ff6b6b', marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: '#ccc', marginBottom: 8 }}>A render error occurred on this page.</p>
          {this.state.error && (
            <pre style={{ background: '#1a2332', padding: 12, borderRadius: 8, overflowX: 'auto', color: '#ffb3b3', fontSize: 13 }}>
              {this.state.error.message}
              {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
