import { useState, Fragment, useEffect } from 'react';
import { useFlow } from '../../context/FlowContext';
import { ChevronDown, Save, Plus, Check, AlertCircle, X } from 'lucide-react';
import { Menu, Transition, Dialog } from '@headlessui/react';

export const FlowSelector = () => {
  const { flows, currentFlow, loadFlow, createNewFlow, saveCurrentFlow, isSaving } = useFlow();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showSavedState, setShowSavedState] = useState(false);

  // Auto-hide the "Saved!" state after 2 seconds to give clear feedback
  // without permanently changing the button appearance
  useEffect(() => {
    if (isSaving) {
      setShowSavedState(true);
      const timer = setTimeout(() => {
        setShowSavedState(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  // Validate the flow name to ensure it meets our requirements
  const validateFlowName = (name) => {
    if (!name.trim()) {
      return 'Flow name cannot be empty';
    }
    if (name.trim().length < 3) {
      return 'Flow name must be at least 3 characters';
    }
    if (name.length > 50) {
      return 'Flow name must be less than 50 characters';
    }
    // Check for duplicate names to avoid confusion
    if (flows.some(flow => flow.name.toLowerCase() === name.trim().toLowerCase())) {
      return 'A flow with this name already exists';
    }
    return '';
  };

  const handleCreateNew = () => {
    const error = validateFlowName(newFlowName);
    if (error) {
      setValidationError(error);
      return;
    }

    // All validation passed, create the flow
    createNewFlow(newFlowName.trim());
    setNewFlowName('');
    setValidationError('');
    setIsModalOpen(false);
  };

  // Clear validation errors when user types to give immediate feedback
  const handleNameChange = (e) => {
    setNewFlowName(e.target.value);
    if (validationError) {
      setValidationError('');
    }
  };

  // Handle keyboard shortcuts for better UX
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !validationError) {
      handleCreateNew();
    }
    if (e.key === 'Escape') {
      setIsModalOpen(false);
      setValidationError('');
    }
  };

  const currentFlowName = currentFlow ? currentFlow.name : 'Select a flow';

  return (
    <>
      <div className="flex items-center space-x-3">
        {/* Flow Selector Dropdown with improved visual hierarchy */}
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex w-full justify-center items-center gap-x-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all duration-200 min-w-[200px]">
              <span className="flex-1 text-left truncate">{currentFlowName}</span>
              <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Menu.Button>
          </div>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 z-10 mt-2 w-64 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
              <div className="py-1 max-h-80 overflow-y-auto">
                {flows.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-500 mb-2">No flows yet</p>
                    <p className="text-xs text-gray-400">Create your first flow to get started</p>
                  </div>
                ) : (
                  flows
                    .filter(flow => flow && flow.id) // Filter out invalid flows
                    .map((flow, index) => (
                      <Menu.Item key={flow.id || `flow-${index}`}>
                        {({ active }) => (
                          <button
                            onClick={() => flow.id && loadFlow(flow.id)}
                            disabled={!flow.id}
                            className={`
                              ${active ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700'}
                              ${currentFlow?.id === flow.id ? 'bg-indigo-100 font-semibold' : ''}
                              ${!flow.id ? 'opacity-50 cursor-not-allowed' : ''}
                              group flex w-full items-center px-4 py-2.5 text-sm transition-colors duration-150
                            `}
                          >
                            <span className="truncate flex-1 text-left">{flow.name || 'Unnamed Flow'}</span>
                            {currentFlow?.id === flow.id && (
                              <Check className="w-4 h-4 text-indigo-600 ml-2 flex-shrink-0" />
                            )}
                          </button>
                        )}
                      </Menu.Item>
                    ))
                )}
                <div className="border-t border-gray-200 my-1" />
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className={`
                        ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                        group flex w-full items-center px-4 py-2.5 text-sm font-medium transition-colors duration-150
                      `}
                    >
                      <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                      Create New Flow
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
        
        {/* Enhanced Save Button with smooth state transitions */}
        <button
          onClick={saveCurrentFlow}
          disabled={!currentFlow || isSaving}
          className={`
            inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm
            transition-all duration-300 ease-in-out min-w-[100px]
            ${showSavedState
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-indigo-600 hover:bg-indigo-700'
            }
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label={showSavedState ? 'Flow saved successfully' : 'Save current flow'}
        >
          {showSavedState ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save
            </>
          )}
        </button>
      </div>

      {/* Enhanced "Create New Flow" Modal with validation */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => {
            setIsModalOpen(false);
            setValidationError('');
            setNewFlowName('');
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>
          
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                      Create New Flow
                    </Dialog.Title>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Close modal"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mb-4">
                    Give your new chatbot flow a descriptive name that helps you identify its purpose.
                  </p>
                  
                  <div className="mt-4">
                    <label htmlFor="flowName" className="block text-sm font-medium text-gray-700 mb-1">
                      Flow Name
                    </label>
                    <input
                      type="text"
                      id="flowName"
                      value={newFlowName}
                      onChange={handleNameChange}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className={`
                        block w-full rounded-lg px-4 py-2.5 text-sm shadow-sm
                        transition-colors duration-200
                        ${validationError 
                          ? 'border-2 border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }
                        focus:outline-none focus:ring-2
                      `}
                      placeholder="e.g., Customer Support Flow"
                      maxLength={50}
                    />
                    
                    {/* Character counter for user guidance */}
                    <div className="flex items-center justify-between mt-1.5">
                      <div>
                        {validationError && (
                          <div className="flex items-center text-red-600 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                            <span>{validationError}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {newFlowName.length}/50
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setValidationError('');
                        setNewFlowName('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNew}
                      disabled={!newFlowName.trim() || newFlowName.trim().length < 3}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Create Flow
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};