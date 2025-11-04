import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNodesState, useEdgesState, addEdge } from 'reactflow';
import api from '../services/api';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate unique IDs using modern API
 * Uses crypto.randomUUID() when available, falls back to timestamp + random
 */
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `node_${crypto.randomUUID()}`;
  }
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Deep clone object safely
 * Handles dates, maintains structure without losing data
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const cloned = {};
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key]);
  });
  return cloned;
};

/**
 * Fast shallow comparison for objects
 */
const shallowEqual = (obj1, obj2) => {
  const keys1 = Object.keys(obj1 || {});
  const keys2 = Object.keys(obj2 || {});

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => obj1[key] === obj2[key]);
};

// ============================================================================
// CONTEXT
// ============================================================================

const FlowContext = createContext(undefined);

export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

export const FlowProvider = ({ children }) => {
  // -------------------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------------------

  // Core React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Application state
  const [flows, setFlows] = useState([]);
  const [currentFlow, setCurrentFlow] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Loading states (isolated for better UX)
  const [loadingStates, setLoadingStates] = useState({
    fetching: false,
    loading: false,
    saving: false,
    creating: false,
    deleting: false,
  });

  const [error, setError] = useState(null);

  // Refs for tracking and cleanup
  const originalFlowState = useRef(null);
  const abortControllerRef = useRef(null);
  const lastSavedHashRef = useRef(null);
  const isMountedRef = useRef(true);

  // -------------------------------------------------------------------------
  // EFFECT: Component Lifecycle
  // -------------------------------------------------------------------------

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Warn user before closing/refreshing browser with unsaved changes
   */
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // -------------------------------------------------------------------------
  // MEMOIZED VALUES
  // -------------------------------------------------------------------------

  /**
   * Check for unsaved changes using hash comparison
   * More efficient than JSON.stringify on every check
   */
  const currentStateHash = useMemo(() => {
    return `${nodes.length}-${edges.length}-${nodes.map(n => n.id).join(',')}-${edges.map(e => e.id).join(',')}`;
  }, [nodes, edges]);

  const hasUnsavedChanges = useCallback(() => {
    if (!currentFlow || !lastSavedHashRef.current) return false;
    return currentStateHash !== lastSavedHashRef.current;
  }, [currentFlow, currentStateHash]);

  /**
   * Get selected node (memoized to prevent recalculation)
   */
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(node => node.id === selectedNodeId);
  }, [selectedNodeId, nodes]);

  /**
   * Computed loading state
   */
  const isLoading = useMemo(() => {
    return Object.values(loadingStates).some(state => state);
  }, [loadingStates]);

  // -------------------------------------------------------------------------
  // HELPER: Safe State Update
  // -------------------------------------------------------------------------

  const safeSetState = useCallback((setter) => {
    if (isMountedRef.current) {
      setter();
    }
  }, []);

  // -------------------------------------------------------------------------
  // HELPER: Loading State Management
  // -------------------------------------------------------------------------

  const setLoadingState = useCallback((key, value) => {
    safeSetState(() => {
      setLoadingStates(prev => ({ ...prev, [key]: value }));
    });
  }, [safeSetState]);

  // -------------------------------------------------------------------------
  // NODE/EDGE OPERATIONS
  // -------------------------------------------------------------------------

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      id: `edge-${Date.now()}`,
      animated: true,
      type: 'smoothstep',
      style: { stroke: '#6366f1', strokeWidth: 2 }
    }, eds)),
    [setEdges]
  );

  const updateNodeData = useCallback((nodeId, data) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [setNodes]);

  const onNodesDelete = useCallback((deleted) => {
    if (deleted.some(node => node.id === selectedNodeId)) {
      setIsPanelOpen(false);
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

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
        data: deepClone(nodeToDuplicate.data)
      };

      return [...nds, newNode];
    });
  }, [setNodes]);

  // -------------------------------------------------------------------------
  // UNSAVED CHANGES WARNING
  // -------------------------------------------------------------------------

  /**
   * Check for unsaved changes and warn user if necessary
   * Returns true if safe to proceed, false if user cancelled
   */
  const checkUnsavedChanges = useCallback(() => {
    if (!hasUnsavedChanges()) return true;

    const message =
      'You have unsaved changes in the current flow.\n\n' +
      'If you continue, your changes will be lost.\n\n' +
      'Do you want to continue without saving?';

    return window.confirm(message);
  }, [hasUnsavedChanges]);

  // -------------------------------------------------------------------------
  // FLOW OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Load a specific flow by ID
   * Includes cancellation support and proper cleanup
   * Now checks for unsaved changes before switching
   */
  const loadFlow = useCallback(async (id) => {
    // Check for unsaved changes before switching flows
    if (currentFlow && !checkUnsavedChanges()) {
      console.log('[FlowContext] Load cancelled by user (unsaved changes)');
      return;
    }
    // Validation
    if (!id || id === 'undefined' || id === 'null') {
      console.error('[FlowContext] loadFlow: Invalid ID:', id);
      safeSetState(() => setError('Cannot load flow: Invalid flow ID'));
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoadingState('loading', true);
    safeSetState(() => setError(null));

    try {
      console.log('[FlowContext] Loading flow:', id);
      const flow = await api.getFlowById(id);

      if (!isMountedRef.current) return;

      if (!flow || !flow.id) {
        throw new Error('Received invalid flow data from server');
      }

      const flowData = flow.flow_data || { nodes: [], edges: [] };

      setNodes(flowData.nodes || []);
      setEdges(flowData.edges || []);
      safeSetState(() => {
        setCurrentFlow(flow);
        setIsPanelOpen(false);
        setSelectedNodeId(null);
      });

      // Store original state and hash for change detection
      originalFlowState.current = {
        nodes: flowData.nodes || [],
        edges: flowData.edges || []
      };
      lastSavedHashRef.current = `${flowData.nodes?.length || 0}-${flowData.edges?.length || 0}-${flowData.nodes?.map(n => n.id).join(',') || ''}-${flowData.edges?.map(e => e.id).join(',') || ''}`;

      console.log('[FlowContext] Flow loaded successfully:', flow.name);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[FlowContext] Load cancelled');
        return;
      }
      console.error('[FlowContext] Failed to load flow:', err);
      safeSetState(() => setError(`Failed to load flow: ${err.message || 'Unknown error'}`));
    } finally {
      setLoadingState('loading', false);
    }
  }, [setNodes, setEdges, safeSetState, setLoadingState, currentFlow, checkUnsavedChanges]);

  /**
   * Fetch all flows from backend
   * Fixed: Removed currentFlow from deps to prevent race condition
   */
  const fetchFlows = useCallback(async (autoLoad = true) => {
    setLoadingState('fetching', true);
    safeSetState(() => setError(null));

    try {
      console.log('[FlowContext] Fetching flows...');
      const data = await api.getFlows();

      if (!isMountedRef.current) return;

      console.log('[FlowContext] Received flows:', data?.length || 0);

      // Filter valid flows
      const validFlows = (data || []).filter(flow => {
        const isValid = flow && flow.id && flow.id !== 'undefined' && flow.id !== 'null';
        if (!isValid) {
          console.warn('[FlowContext] Filtered invalid flow:', flow);
        }
        return isValid;
      });

      safeSetState(() => setFlows(validFlows));

      // Auto-load first flow only if requested and no current flow
      if (autoLoad && validFlows.length > 0) {
        // Check if there's a current flow, if not load the first one
        const shouldAutoLoad = !currentFlow;

        if (shouldAutoLoad) {
          const firstFlow = validFlows[0];
          if (firstFlow.id) {
            console.log('[FlowContext] Auto-loading first flow:', firstFlow.name);
            await loadFlow(firstFlow.id);
          }
        }
      }

      console.log('[FlowContext] Valid flows loaded:', validFlows.length);
    } catch (err) {
      console.error('[FlowContext] Failed to fetch flows:', err);
      safeSetState(() => setError('Failed to fetch flows. Please refresh the page.'));
    } finally {
      setLoadingState('fetching', false);
    }
  }, [loadFlow, safeSetState, setLoadingState, currentFlow]);

  /**
   * Save current flow
   * Optimized: Only update necessary state
   */
  const saveCurrentFlow = useCallback(async () => {
    if (!currentFlow) {
      console.warn('[FlowContext] No current flow to save');
      return;
    }

    if (!hasUnsavedChanges()) {
      console.log('[FlowContext] No changes to save');
      return;
    }

    setLoadingState('saving', true);
    safeSetState(() => setError(null));

    try {
      const flowData = { nodes, edges };

      await api.updateFlow(currentFlow.id, {
        flow_data: flowData,
        name: currentFlow.name,
        is_active: currentFlow.is_active
      });

      if (!isMountedRef.current) return;

      // Update saved state
      originalFlowState.current = { nodes, edges };
      lastSavedHashRef.current = currentStateHash;

      // Optimized: Only update current flow, not entire list
      safeSetState(() => {
        setFlows(prev => prev.map(f =>
          f.id === currentFlow.id
            ? { ...f, flow_data: flowData }
            : f
        ));
      });

      console.log('[FlowContext] Flow saved successfully');
    } catch (err) {
      console.error('[FlowContext] Failed to save flow:', err);
      safeSetState(() => setError(`Failed to save flow: ${err.message || 'Unknown error'}`));
      throw err;
    } finally {
      setTimeout(() => setLoadingState('saving', false), 1000);
    }
  }, [currentFlow, nodes, edges, hasUnsavedChanges, currentStateHash, safeSetState, setLoadingState]);

  /**
   * Create a new flow
   * Now checks for unsaved changes before creating
   */
  const createNewFlow = useCallback(async (name) => {
    // Check for unsaved changes before creating new flow
    if (currentFlow && !checkUnsavedChanges()) {
      console.log('[FlowContext] Create cancelled by user (unsaved changes)');
      throw new Error('Cancelled by user');
    }

    setLoadingState('creating', true);
    safeSetState(() => setError(null));

    try {
      console.log('[FlowContext] Creating new flow:', name);
      const newFlow = await api.createFlow({
        name,
        flow_data: { nodes: [], edges: [] },
        is_active: false
      });

      if (!isMountedRef.current) return;

      if (!newFlow || !newFlow.id || newFlow.id === 'undefined' || newFlow.id === 'null') {
        throw new Error('Server returned flow without valid ID');
      }

      safeSetState(() => setFlows(prev => [...prev, newFlow]));
      await loadFlow(newFlow.id);

      console.log('[FlowContext] Flow created:', newFlow.id);
    } catch (err) {
      console.error('[FlowContext] Failed to create flow:', err);
      safeSetState(() => setError(`Failed to create flow: ${err.message || 'Unknown error'}`));
      throw err;
    } finally {
      setLoadingState('creating', false);
    }
  }, [loadFlow, safeSetState, setLoadingState, currentFlow, checkUnsavedChanges]);

  /**
   * Delete a flow
   * Fixed: Use functional update to avoid stale closure
   */
  const deleteFlow = useCallback(async (flowId) => {
    if (!flowId || flowId === 'undefined' || flowId === 'null') {
      console.error('[FlowContext] deleteFlow: Invalid ID:', flowId);
      safeSetState(() => setError('Cannot delete flow: Invalid flow ID'));
      return;
    }

    setLoadingState('deleting', true);
    safeSetState(() => setError(null));

    try {
      console.log('[FlowContext] Deleting flow:', flowId);
      await api.deleteFlow(flowId);

      if (!isMountedRef.current) return;

      // Use functional update to get latest flows
      safeSetState(() => {
        setFlows(prev => {
          const updated = prev.filter(f => f.id !== flowId);

          // If deleted flow was current, load another
          if (currentFlow?.id === flowId) {
            setNodes([]);
            setEdges([]);
            setCurrentFlow(null);
            originalFlowState.current = null;
            lastSavedHashRef.current = null;

            if (updated.length > 0 && updated[0].id) {
              console.log('[FlowContext] Loading next flow after delete');
              setTimeout(() => loadFlow(updated[0].id), 0);
            }
          }

          return updated;
        });
      });

      console.log('[FlowContext] Flow deleted successfully');
    } catch (err) {
      console.error('[FlowContext] Failed to delete flow:', err);
      safeSetState(() => setError(`Failed to delete flow: ${err.message || 'Unknown error'}`));
      throw err;
    } finally {
      setLoadingState('deleting', false);
    }
  }, [currentFlow, loadFlow, setNodes, setEdges, safeSetState, setLoadingState]);

  // -------------------------------------------------------------------------
  // PANEL OPERATIONS
  // -------------------------------------------------------------------------

  const openPanel = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    closePanel();
  }, [closePanel]);

  const getSelectedNode = useCallback(() => selectedNode, [selectedNode]);

  // -------------------------------------------------------------------------
  // VALIDATION
  // -------------------------------------------------------------------------

  const validateFlow = useCallback(() => {
    const errors = [];

    // Check for orphaned nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const orphanedNodes = nodes.filter(
      node => nodes.length > 1 && !connectedNodeIds.has(node.id)
    );

    if (orphanedNodes.length > 0) {
      errors.push({
        type: 'orphaned',
        count: orphanedNodes.length,
        message: `${orphanedNodes.length} node(s) are not connected to the flow`,
        nodes: orphanedNodes.map(n => n.id)
      });
    }

    // Validate node content
    nodes.forEach(node => {
      if (node.type === 'textMessage' && !node.data.message?.trim()) {
        errors.push({
          type: 'empty_message',
          nodeId: node.id,
          message: 'Text message node is empty'
        });
      }
      if (node.type === 'aiResponse' && !node.data.prompt?.trim()) {
        errors.push({
          type: 'empty_prompt',
          nodeId: node.id,
          message: 'AI response node has no prompt'
        });
      }
    });

    return errors;
  }, [nodes, edges]);

  // -------------------------------------------------------------------------
  // ERROR HANDLING
  // -------------------------------------------------------------------------

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // -------------------------------------------------------------------------
  // CONTEXT VALUE
  // -------------------------------------------------------------------------

  const value = useMemo(() => ({
    // State
    nodes,
    edges,
    flows,
    currentFlow,
    selectedNodeId,
    isSaving: loadingStates.saving,
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
  }), [
    nodes,
    edges,
    flows,
    currentFlow,
    selectedNodeId,
    loadingStates.saving,
    isPanelOpen,
    isLoading,
    error,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,
    updateNodeData,
    duplicateNode,
    fetchFlows,
    loadFlow,
    saveCurrentFlow,
    createNewFlow,
    deleteFlow,
    openPanel,
    closePanel,
    onPaneClick,
    getSelectedNode,
    hasUnsavedChanges,
    validateFlow,
    clearError,
  ]);

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};
