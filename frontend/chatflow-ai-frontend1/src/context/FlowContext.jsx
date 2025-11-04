import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import api from '../services/api';

// Generate unique IDs without external dependency
const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const FlowContext = createContext();

export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }
  return context;
};

export const FlowProvider = ({ children }) => {
  // Core React Flow state management
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Application state
  const [flows, setFlows] = useState([]);
  const [currentFlow, setCurrentFlow] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track the original flow state to enable change detection
  const originalFlowState = useRef(null);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!currentFlow || !originalFlowState.current) return false;
    
    const current = JSON.stringify({ nodes, edges });
    const original = JSON.stringify(originalFlowState.current);
    
    return current !== original;
  }, [nodes, edges, currentFlow]);

  // When nodes connect, add an animated edge between them
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true,
      type: 'smoothstep',
      style: { stroke: '#6366f1', strokeWidth: 2 }
    }, eds)),
    [setEdges]
  );

  // Update specific fields in a node's data
  const updateNodeData = useCallback((nodeId, data) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);

  // When nodes are deleted, clean up any related state
  const onNodesDelete = useCallback((deleted) => {
    if (deleted.some(node => node.id === selectedNodeId)) {
      setIsPanelOpen(false);
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  // Duplicate a node at a slightly offset position
  const duplicateNode = useCallback((nodeId) => {
    setNodes((nds) => {
      const nodeToDuplicate = nds.find(n => n.id === nodeId);
      if (!nodeToDuplicate) return nds;

      const newNode = {
        ...nodeToDuplicate,
        id: generateId(),
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50
        },
        data: JSON.parse(JSON.stringify(nodeToDuplicate.data))
      };

      return [...nds, newNode];
    });
  }, [setNodes]);

  // Load a specific flow from the backend
  const loadFlow = useCallback(async (id) => {
    // VALIDATION: Ensure ID is valid before making API call
    if (!id || id === 'undefined' || id === 'null') {
      console.error('loadFlow called with invalid ID:', id);
      setError('Cannot load flow: Invalid flow ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading flow with ID:', id);
      const flow = await api.getFlowById(id);

      if (!flow || !flow.id) {
        throw new Error('Received invalid flow data from server');
      }

      const flowData = flow.flow_data || { nodes: [], edges: [] };

      setNodes(flowData.nodes || []);
      setEdges(flowData.edges || []);
      setCurrentFlow(flow);

      // Store the original state for change detection
      originalFlowState.current = {
        nodes: flowData.nodes || [],
        edges: flowData.edges || []
      };

      setIsPanelOpen(false);
      setSelectedNodeId(null);

      console.log('Flow loaded successfully:', flow.name);
    } catch (err) {
      console.error("Failed to load flow:", err);
      setError(`Failed to load flow: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges]);

  // Fetch all available flows from the backend
  const fetchFlows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching flows from backend...');
      const data = await api.getFlows();
      console.log('Received flows:', data);

      // Filter out any flows without valid IDs
      const validFlows = data.filter(flow => {
        const isValid = flow && flow.id && flow.id !== 'undefined' && flow.id !== 'null';
        if (!isValid) {
          console.warn('Filtered out invalid flow:', flow);
        }
        return isValid;
      });

      console.log('Valid flows:', validFlows.length);
      setFlows(validFlows);

      // Auto-load first flow ONLY if:
      // 1. No current flow is loaded
      // 2. Valid flows exist
      // 3. First flow has valid ID
      if (!currentFlow && validFlows.length > 0) {
        const firstFlow = validFlows[0];
        if (firstFlow.id && firstFlow.id !== 'undefined' && firstFlow.id !== 'null') {
          console.log('Auto-loading first flow:', firstFlow.name, firstFlow.id);
          await loadFlow(firstFlow.id);
        } else {
          console.error('First flow has invalid ID:', firstFlow);
        }
      }
    } catch (err) {
      console.error("Failed to fetch flows:", err);
      setError("Failed to fetch flows. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, [currentFlow, loadFlow]);

  // Save the current flow to the backend
  const saveCurrentFlow = useCallback(async () => {
    if (!currentFlow) {
      console.warn("No current flow to save");
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      const flowData = { nodes, edges };
      
      await api.updateFlow(currentFlow.id, { 
        flow_data: flowData,
        name: currentFlow.name,
        is_active: currentFlow.is_active
      });
      
      // Update the original state reference
      originalFlowState.current = { nodes, edges };
      
      const data = await api.getFlows();
      setFlows(data);
      
      const updatedFlow = data.find(f => f.id === currentFlow.id);
      if (updatedFlow) {
        setCurrentFlow(updatedFlow);
      }
    } catch (err) {
      console.error("Failed to save flow:", err);
      setError("Failed to save flow. Please try again.");
      throw err;
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  }, [currentFlow, nodes, edges]);

  // Create a brand new flow
  const createNewFlow = useCallback(async (name) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Creating new flow:', name);
      const newFlow = await api.createFlow({
        name,
        flow_data: { nodes: [], edges: [] },
        is_active: false
      });

      console.log('Flow created:', newFlow);

      // VALIDATION: Ensure created flow has valid ID
      if (!newFlow || !newFlow.id || newFlow.id === 'undefined' || newFlow.id === 'null') {
        throw new Error('Server returned flow without valid ID');
      }

      setFlows(prev => [...prev, newFlow]);
      await loadFlow(newFlow.id);
    } catch (err) {
      console.error("Failed to create new flow:", err);
      setError(`Failed to create flow: ${err.message || 'Unknown error'}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadFlow]);

  // Delete a flow from the system
  const deleteFlow = useCallback(async (flowId) => {
    // VALIDATION: Check flow ID before attempting delete
    if (!flowId || flowId === 'undefined' || flowId === 'null') {
      console.error('deleteFlow called with invalid ID:', flowId);
      setError('Cannot delete flow: Invalid flow ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Deleting flow:', flowId);
      await api.deleteFlow(flowId);

      setFlows(prev => prev.filter(f => f.id !== flowId));

      if (currentFlow?.id === flowId) {
        setNodes([]);
        setEdges([]);
        setCurrentFlow(null);
        originalFlowState.current = null;

        const remainingFlows = flows.filter(f => f.id !== flowId);
        if (remainingFlows.length > 0 && remainingFlows[0].id) {
          console.log('Loading next flow after delete:', remainingFlows[0].id);
          await loadFlow(remainingFlows[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to delete flow:", err);
      setError(`Failed to delete flow: ${err.message || 'Unknown error'}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentFlow, flows, loadFlow, setNodes, setEdges]);
  
  // Open the properties panel for a specific node
  const openPanel = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setIsPanelOpen(true);
  }, []);

  // Close the properties panel
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedNodeId(null);
  }, []);

  // Handle clicks on the canvas background
  const onPaneClick = useCallback(() => {
    closePanel();
  }, [closePanel]);

  // Get the currently selected node object
  const getSelectedNode = useCallback(() => {
    if (!selectedNodeId) return null;
    return nodes.find(node => node.id === selectedNodeId);
  }, [selectedNodeId, nodes]);

  // Validate that a flow has all required data
  const validateFlow = useCallback(() => {
    const errors = [];
    
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const orphanedNodes = nodes.filter(
      node => nodes.length > 1 && !connectedNodeIds.has(node.id)
    );
    
    if (orphanedNodes.length > 0) {
      errors.push(`${orphanedNodes.length} node(s) are not connected to the flow`);
    }
    
    nodes.forEach(node => {
      if (node.type === 'textMessage' && !node.data.message?.trim()) {
        errors.push(`Text message node is empty`);
      }
      if (node.type === 'aiResponse' && !node.data.prompt?.trim()) {
        errors.push(`AI response node has no prompt`);
      }
    });
    
    return errors;
  }, [nodes, edges]);

  // Clear any error messages
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // State
    nodes,
    edges,
    flows,
    currentFlow,
    selectedNodeId,
    isSaving,
    isPanelOpen,
    isLoading,
    error,
    
    // Node/Edge operations
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,
    updateNodeData,
    duplicateNode,
    
    // Flow operations
    fetchFlows,
    loadFlow,
    saveCurrentFlow,
    createNewFlow,
    deleteFlow,
    
    // Panel operations
    openPanel,
    closePanel,
    onPaneClick,
    getSelectedNode,
    
    // Utility functions
    hasUnsavedChanges,
    validateFlow,
    clearError,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};