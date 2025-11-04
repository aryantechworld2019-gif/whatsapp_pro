import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Panel } from 'reactflow';
import { useFlow } from '../context/FlowContext';
import DndSidebar from '../components/builder/DndSidebar';
import PropertiesPanel from '../components/builder/PropertiesPanel';
import { FlowSelector } from '../components/builder/FlowSelector';
import TextMessageNode from '../components/builder/nodes/TextMessageNode';
import AiResponseNode from '../components/builder/nodes/AiResponseNode';
import { ZoomIn, ZoomOut, Maximize2, Save, AlertCircle } from 'lucide-react';
import 'reactflow/dist/style.css';

// Define our custom node types outside component to avoid recreation
// This object is stable and doesn't need to be recreated on every render
const NODE_TYPES = {
  textMessage: TextMessageNode,
  aiResponse: AiResponseNode,
};

export const ChatbotBuilderView = () => {
  const {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    onEdgesChange,
    onConnect,
    onNodesDelete,
    fetchFlows,
    openPanel,
    currentFlow,
    saveCurrentFlow,
    hasUnsavedChanges,
  } = useFlow();
  
  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useRef(null);
  const [isDropping, setIsDropping] = useState(false);

  // Refs to avoid re-registering event listeners
  const saveCurrentFlowRef = useRef(saveCurrentFlow);
  const handleFitViewRef = useRef(null);

  // Keep refs updated
  useEffect(() => {
    saveCurrentFlowRef.current = saveCurrentFlow;
  }, [saveCurrentFlow]);

  // Fetch flows when component mounts
  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  // Handle node click to open the properties panel
  const onNodeClick = useCallback((event, node) => {
    openPanel(node.id);
  }, [openPanel]);

  // Enhanced drag over handler with visual feedback
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDropping(true);
  }, []);

  // Clear dropping state when drag leaves
  const handleDragLeave = useCallback((event) => {
    if (event.currentTarget === event.target) {
      setIsDropping(false);
    }
  }, []);

  // Enhanced drop handler that calculates position correctly
  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDropping(false);
      
      if (!reactFlowInstance.current) {
        console.warn('React Flow instance not ready');
        return;
      }

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) {
        return;
      }

      const label = event.dataTransfer.getData('application/reactflow-label') || 
                    type.charAt(0).toUpperCase() + type.slice(1);

      // Calculate the correct position on the canvas
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Create a new node with correct data structure matching what the node components expect
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label,
          // IMPORTANT: Use 'message' not 'text' to match TextMessageNode component
          ...(type === 'textMessage' && { 
            message: 'Enter your message here',
            delay: 0 
          }),
          ...(type === 'aiResponse' && { 
            prompt: 'Enter AI prompt here',
            model: 'gpt-4'
          }),
        },
      };

      setNodes((nds) => [...nds, newNode]);
      
      // Automatically open the properties panel for the new node
      setTimeout(() => openPanel(newNode.id), 100);
    },
    [setNodes, openPanel]
  );

  // Zoom controls for better canvas navigation
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomIn({ duration: 300 });
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomOut({ duration: 300 });
    }
  }, []);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({
        padding: 0.2,
        duration: 300
      });
    }
  }, []);

  // Update ref when handleFitView changes
  useEffect(() => {
    handleFitViewRef.current = handleFitView;
  }, [handleFitView]);

  // Keyboard shortcuts for common actions
  // Using refs to avoid re-registering event listener on every render
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (saveCurrentFlowRef.current) {
          saveCurrentFlowRef.current();
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === '0') {
        event.preventDefault();
        if (handleFitViewRef.current) {
          handleFitViewRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty deps - event listener registered once, refs keep it updated

  // Note: Unsaved changes warning on beforeunload is now handled in FlowContext
  // to avoid duplicate event listeners and keep the logic centralized

  // Memoize MiniMap node color function to avoid recreation on every render
  const minimapNodeColor = useCallback((node) => {
    switch (node.type) {
      case 'textMessage':
        return '#818cf8';
      case 'aiResponse':
        return '#34d399';
      default:
        return '#94a3b8';
    }
  }, []);

  return (
    <div className="flex h-full w-full bg-gray-50">
      {/* Main Content: Builder */}
      <div className="flex-1 flex flex-col h-full" ref={reactFlowWrapper}>
        {/* Top Bar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Chatbot Builder</h1>
            {currentFlow && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded-md font-medium">
                  {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
                </span>
                <span className="px-2 py-1 bg-gray-100 rounded-md font-medium">
                  {edges.length} {edges.length === 1 ? 'connection' : 'connections'}
                </span>
              </div>
            )}
          </div>
          <FlowSelector />
        </div>

        {/* React Flow Canvas */}
        <div 
          className={`
            flex-grow h-full w-full relative transition-all duration-200
            ${isDropping ? 'ring-4 ring-indigo-400 ring-inset' : ''}
          `}
          onDragLeave={handleDragLeave}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onNodeClick={onNodeClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            nodeTypes={NODE_TYPES}
            onInit={(instance) => (reactFlowInstance.current = instance)}
            fitView
            className="bg-gray-50"
            connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#6366f1', strokeWidth: 2 },
            }}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode="Shift"
            selectNodesOnDrag={false}
          >
            <Background 
              variant="dots" 
              gap={16} 
              size={1} 
              color="#d1d5db" 
            />
            <Controls 
              showInteractive={false}
              className="bg-white rounded-lg shadow-lg border border-gray-200"
            />
            
            <MiniMap
              nodeColor={minimapNodeColor}
              className="bg-white rounded-lg shadow-lg border border-gray-200"
              maskColor="rgb(0, 0, 0, 0.1)"
            />

            <Panel position="top-right" className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 space-y-2">
              <button
                onClick={handleZoomIn}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors"
                title="Zoom In (or use mouse wheel)"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleZoomOut}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors"
                title="Zoom Out (or use mouse wheel)"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleFitView}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors"
                title="Fit View (Cmd/Ctrl + 0)"
              >
                <Maximize2 className="w-4 h-4 text-gray-600" />
              </button>
              <div className="border-t border-gray-200 my-2" />
              <button
                onClick={saveCurrentFlow}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors relative"
                title="Save Flow (Cmd/Ctrl + S)"
              >
                <Save className="w-4 h-4 text-gray-600" />
                {hasUnsavedChanges && hasUnsavedChanges() && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
            </Panel>

            {nodes.length === 0 && currentFlow && (
              <Panel position="top-center" className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <AlertCircle className="w-4 h-4 text-indigo-600" />
                  <span>Drag a node from the sidebar to get started</span>
                </div>
              </Panel>
            )}

            {!currentFlow && (
              <Panel position="center" className="bg-white rounded-lg shadow-xl border border-gray-200 p-8">
                <div className="text-center space-y-2">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
                  <h3 className="text-lg font-semibold text-gray-900">No Flow Selected</h3>
                  <p className="text-sm text-gray-600 max-w-xs">
                    Select an existing flow or create a new one to start building your chatbot
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
      
      {/* Sidebars */}
      <div className="w-72 flex-shrink-0 h-full bg-white border-l border-gray-200 shadow-sm">
        <DndSidebar />
      </div>

      <PropertiesPanel />
    </div>
  );
};

export default ChatbotBuilderView;