import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '../App.jsx';
import '../index.css';
import { ReactFlowProvider } from 'reactflow';
import { FlowProvider } from './context/FlowContext';

// This is our app's entry point.
// We wrap everything in the necessary providers:
// 1. ReactFlowProvider - Required for React Flow (chatbot builder)
// 2. FlowProvider - Our custom context for flow management

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <FlowProvider>
        <App />
      </FlowProvider>
    </ReactFlowProvider>
  </React.StrictMode>,
);