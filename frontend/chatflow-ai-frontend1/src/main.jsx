import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../App.jsx';
import '../index.css';
import { ReactFlowProvider } from 'reactflow';
import { FlowProvider } from './context/FlowContext';
import ErrorBoundary from './components/ErrorBoundary';

// This is our app's entry point.
// We wrap everything in the necessary providers:
// 1. ErrorBoundary - Catches and handles errors gracefully (outermost layer)
// 2. ReactFlowProvider - Required for React Flow (chatbot builder)
// 3. FlowProvider - Our custom context for flow management

// StrictMode only in development - it causes double renders which is great for catching bugs
// but not needed in production and can impact performance
const isDevelopment = import.meta.env.MODE === 'development';

const AppContent = (
  <ErrorBoundary>
    <ReactFlowProvider>
      <FlowProvider>
        <App />
      </FlowProvider>
    </ReactFlowProvider>
  </ErrorBoundary>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  isDevelopment ? <React.StrictMode>{AppContent}</React.StrictMode> : AppContent,
);