import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Bot, AlertCircle, Copy, Trash2, Check } from 'lucide-react';
import { useFlow } from '../../context/FlowContext';

export default function PropertiesPanel() {
  const {
    getSelectedNode,
    selectedNodeId,
    updateNodeData,
    closePanel,
    duplicateNode,
    nodes,
    setNodes,
  } = useFlow();

  const [localData, setLocalData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const selectedNode = getSelectedNode();

  // Initialize local data when a new node is selected
  useEffect(() => {
    if (selectedNode) {
      setLocalData(selectedNode.data || {});
      setHasUnsavedChanges(false);
      setShowDeleteConfirm(false);
    }
  }, [selectedNode?.id]);

  // Handle input changes
  const onDataChange = (e) => {
    const { name, value } = e.target;
    setLocalData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  // Apply changes to the global state
  const applyChanges = () => {
    if (selectedNode && hasUnsavedChanges) {
      updateNodeData(selectedNode.id, localData);
      setHasUnsavedChanges(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  // Revert to original data
  const revertChanges = () => {
    if (selectedNode) {
      setLocalData(selectedNode.data || {});
      setHasUnsavedChanges(false);
    }
  };

  // Handle node deletion
  const handleDelete = () => {
    if (selectedNode) {
      setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
      closePanel();
    }
  };

  // Handle panel close with auto-save
  const handleClose = () => {
    if (hasUnsavedChanges) {
      applyChanges();
    }
    closePanel();
  };

  // Handle node duplication
  const handleDuplicate = () => {
    if (selectedNode) {
      duplicateNode(selectedNode.id);
    }
  };

  // Get node icon
  const getNodeIcon = () => {
    switch (selectedNode?.type) {
      case 'textMessage':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'aiResponse':
        return <Bot className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  // Get node type label
  const getNodeTypeLabel = () => {
    switch (selectedNode?.type) {
      case 'textMessage':
        return 'Send Message';
      case 'aiResponse':
        return 'AI Response';
      default:
        return 'Unknown Node';
    }
  };

  // Validate node data
  const validateNodeData = () => {
    const errors = [];
    
    if (selectedNode?.type === 'textMessage') {
      if (!localData.message || !localData.message.trim()) {
        errors.push('Message text cannot be empty');
      }
      if (localData.message && localData.message.length > 1000) {
        errors.push('Message text is too long (max 1000 characters)');
      }
    }
    
    if (selectedNode?.type === 'aiResponse') {
      if (localData.prompt && localData.prompt.length > 500) {
        errors.push('AI prompt is too long (max 500 characters)');
      }
    }
    
    return errors;
  };

  const validationErrors = validateNodeData();

  // Render editor based on node type
  const renderNodeEditor = () => {
    if (!selectedNode) return null;

    switch (selectedNode.type) {
      case 'textMessage':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message Text
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm resize-none"
                placeholder="Enter the message to send to the user..."
                value={localData.message || ''}
                onChange={onDataChange}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">This message will be sent to the user</p>
                <span className={`text-xs ${localData.message?.length > 900 ? 'text-red-600' : 'text-gray-400'}`}>
                  {localData.message?.length || 0}/1000
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="delay" className="block text-sm font-medium text-gray-700 mb-1">
                Delay (seconds)
              </label>
              <input
                type="number"
                id="delay"
                name="delay"
                min="0"
                max="60"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
                placeholder="0"
                value={localData.delay || 0}
                onChange={onDataChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                Wait this many seconds before sending the message
              </p>
            </div>
          </div>
        );

      case 'aiResponse':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
                AI Prompt (Optional)
              </label>
              <textarea
                id="prompt"
                name="prompt"
                rows={6}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none sm:text-sm resize-none"
                placeholder="Enter instructions for the AI..."
                value={localData.prompt || ''}
                onChange={onDataChange}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Leave empty to use chat history</p>
                <span className={`text-xs ${localData.prompt?.length > 450 ? 'text-red-600' : 'text-gray-400'}`}>
                  {localData.prompt?.length || 0}/500
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                AI Model
              </label>
              <select
                id="model"
                name="model"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none sm:text-sm"
                value={localData.model || 'gpt-4'}
                onChange={onDataChange}
              >
                <option value="gpt-4">GPT-4 (Most capable)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the AI model for this response
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center p-8 text-center">
            <p className="text-sm text-gray-500">No editor available for this node type</p>
          </div>
        );
    }
  };

  if (!selectedNode) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-40">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getNodeIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{getNodeTypeLabel()}</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
            title="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 font-medium">ID:</span>
          <code className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded font-mono">
            {selectedNode.id.slice(0, 20)}...
          </code>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 mb-1">Validation Errors</p>
                <ul className="text-xs text-red-700 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {renderNodeEditor()}

        {hasUnsavedChanges && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              You have unsaved changes. Click Apply to save them.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-3">
        <div className="flex space-x-2">
          <button
            onClick={applyChanges}
            disabled={!hasUnsavedChanges || validationErrors.length > 0}
            className={`
              flex-1 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${justSaved 
                ? 'bg-green-500 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {justSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              'Apply Changes'
            )}
          </button>
          
          {hasUnsavedChanges && (
            <button
              onClick={revertChanges}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Revert
            </button>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleDuplicate}
            className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            title="Duplicate this node"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            Duplicate
          </button>
          
          {showDeleteConfirm ? (
            <>
              <button
                onClick={handleDelete}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-red-700 bg-white border border-red-300 hover:bg-red-50 transition-colors"
              title="Delete this node"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}