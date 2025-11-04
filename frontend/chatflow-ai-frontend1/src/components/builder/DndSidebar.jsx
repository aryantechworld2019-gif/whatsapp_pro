import React, { useState } from 'react';
import { MessageSquare, Bot, Calendar, HelpCircle, Sparkles } from 'lucide-react';

// Define our node types in a structured way
// This makes it easy to add new node types in the future
const NODE_TYPES = [
  {
    type: 'textMessage',
    label: 'Send Message',
    description: 'Send a text message to the user',
    icon: MessageSquare,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100',
  },
  {
    type: 'aiResponse',
    label: 'AI Response',
    description: 'Generate a dynamic response using AI',
    icon: Bot,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverBg: 'hover:bg-purple-100',
  },
  {
    type: 'appointmentBooking',
    label: 'Book Appointment',
    description: 'Let users schedule appointments',
    icon: Calendar,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverBg: 'hover:bg-green-100',
    comingSoon: true, // Mark as coming soon for GTM plan
  },
];

// Individual draggable node card component
// Extracted for better organization and reusability
const NodeCard = ({ nodeType, onDragStart, isBeingDragged }) => {
  const Icon = nodeType.icon;
  
  return (
    <div
      className={`
        relative mb-3 flex items-start space-x-3 rounded-lg border-2 p-3 transition-all duration-200
        ${nodeType.comingSoon 
          ? 'cursor-not-allowed opacity-60' 
          : 'cursor-grab active:cursor-grabbing hover:shadow-md'
        }
        ${isBeingDragged 
          ? 'opacity-50 scale-95' 
          : 'opacity-100 scale-100'
        }
        ${nodeType.bgColor} ${nodeType.borderColor} ${nodeType.hoverBg}
      `}
      onDragStart={(event) => !nodeType.comingSoon && onDragStart(event, nodeType)}
      draggable={!nodeType.comingSoon}
    >
      <div className="flex-shrink-0">
        <Icon className={`w-5 h-5 ${nodeType.iconColor}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 text-sm">
            {nodeType.label}
          </span>
          {nodeType.comingSoon && (
            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-medium">
              Soon
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-600">
          {nodeType.description}
        </p>
      </div>
    </div>
  );
};

// Main sidebar component
export default function DndSidebar() {
  const [draggingType, setDraggingType] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Enhanced drag start handler that stores both type and label
  // The label is used by the builder to give nodes better default names
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType.type);
    event.dataTransfer.setData('application/reactflow-label', nodeType.label);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingType(nodeType.type);
  };

  // Reset dragging state when drag ends
  // This clears any visual feedback we were showing during the drag
  const onDragEnd = () => {
    setDraggingType(null);
  };

  return (
    <aside className="flex flex-col h-full bg-white">
      {/* Header section with help button */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Node Library
          </h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            title="Show help"
          >
            <HelpCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Help text that can be toggled */}
        {showHelp ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700">
                <p className="font-medium mb-1">How to use:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Drag a node onto the canvas</li>
                  <li>Click the node to edit its settings</li>
                  <li>Connect nodes by dragging from one handle to another</li>
                  <li>Save your flow when you're done</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Drag nodes onto the canvas to build your chatbot flow
          </p>
        )}
      </div>

      {/* Scrollable node list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1" onDragEnd={onDragEnd}>
          {NODE_TYPES.map((nodeType) => (
            <NodeCard
              key={nodeType.type}
              nodeType={nodeType}
              onDragStart={onDragStart}
              isBeingDragged={draggingType === nodeType.type}
            />
          ))}
        </div>

        {/* Helpful tip at the bottom */}
        <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong className="text-gray-700">Pro tip:</strong> Click any node on the canvas to view and edit its properties in the panel on the right.
          </p>
        </div>
      </div>

      {/* Footer with stats or additional info */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          {NODE_TYPES.filter(n => !n.comingSoon).length} node types available
        </p>
      </div>
    </aside>
  );
}