import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary - Production-grade error boundary component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the errors, and displays a fallback UI instead of crashing the entire app.
 *
 * Features:
 * - Catches rendering errors, lifecycle errors, and constructor errors
 * - Provides user-friendly error UI with recovery options
 * - Logs errors for debugging (can be integrated with error tracking services)
 * - Allows users to recover without page reload
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // TODO: Send error to error tracking service (e.g., Sentry)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const isDevelopment = import.meta.env.MODE === 'development';

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h1>

            {/* Error Description */}
            <p className="text-gray-600 text-center mb-8">
              We encountered an unexpected error. Don't worry, your data is safe.
              {errorCount > 1 && (
                <span className="block mt-2 text-sm text-red-600">
                  This error has occurred {errorCount} times. Consider reloading the page.
                </span>
              )}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
              >
                <Home className="w-5 h-5 mr-2" />
                Go Home
              </button>
            </div>

            {/* Development Error Details */}
            {isDevelopment && error && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <details className="text-left">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 mb-3">
                    Error Details (Development Only)
                  </summary>

                  <div className="space-y-4">
                    {/* Error Message */}
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Error Message:
                      </h3>
                      <pre className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-900 overflow-x-auto">
                        {error.toString()}
                      </pre>
                    </div>

                    {/* Stack Trace */}
                    {errorInfo && errorInfo.componentStack && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Component Stack:
                        </h3>
                        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    {/* Full Stack */}
                    {error.stack && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Stack Trace:
                        </h3>
                        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-6 text-center text-sm text-gray-500">
              If this problem persists, please contact support or check the console for more details.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
