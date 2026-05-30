import React from 'react';
import { toast } from 'sonner';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到渲染错误:', error, errorInfo);
    toast.error('页面渲染出错，请刷新重试', {
      description: error.message.slice(0, 100),
      duration: 8000,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="text-center max-w-lg">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-semibold mb-2 text-foreground">页面渲染出错</h1>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}