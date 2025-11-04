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
    setIsLoading(true);
    setError(null);
    
    try {
      const flow = await api.getFlowById(id);
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
    } catch (err) {
      console.error("Failed to load flow:", err);
      setError("Failed to load flow. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges]);

  // Fetch all available flows from the backend
  const fetchFlows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await api.getFlows();
      setFlows(data);
      
      if (!currentFlow && data.length > 0) {
        await loadFlow(data[0].id);
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
      const newFlow = await api.createFlow({ 
        name, 
        flow_data: { nodes: [], edges: [] },
        is_active: false
      });
      
      setFlows(prev => [...prev, newFlow]);
      await loadFlow(newFlow.id);
    } catch (err) {
      console.error("Failed to create new flow:", err);
      setError("Failed to create flow. Please try again.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadFlow]);

  // Delete a flow from the system
  const deleteFlow = useCallback(async (flowId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.deleteFlow(flowId);
      
      setFlows(prev => prev.filter(f => f.id !== flowId));
      
      if (currentFlow?.id === flowId) {
        setNodes([]);
        setEdges([]);
        setCurrentFlow(null);
        originalFlowState.current = null;
        
        const remainingFlows = flows.filter(f => f.id !== flowId);
        if (remainingFlows.length > 0) {
          await loadFlow(remainingFlows[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to delete flow:", err);
      setError("Failed to delete flow. Please try again.");
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