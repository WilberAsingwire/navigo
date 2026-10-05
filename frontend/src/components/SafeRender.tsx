import React from 'react';

export default class SafeRender extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }> {
  state = { error: false, msg: '' };
  static getDerivedStateFromError(e: any) { return { error: true, msg: e?.message || 'Unknown error' }; }
  render() {
    if (this.state.error) {
      return this.props.fallback || <div style={{ padding: 20, color: 'var(--nav-text)', textAlign: 'center' }}>Component failed: {this.state.msg}</div>;
    }
    return this.props.children;
  }
}
