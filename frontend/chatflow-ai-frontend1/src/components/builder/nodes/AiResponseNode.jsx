import React from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

// This is the custom component for our 'aiResponse' node type.
export default function AiResponseNode({ data }) {
  return (
    <div className="w-64 rounded-lg border border-purple-300 bg-white shadow-sm">
      {/* Node Header */}
      <div className="flex items-center space-x-2 border-b border-purple-200 bg-purple-50 p-2">
        <Bot size={16} className="text-purple-500" />
        <span className="text-sm font-semibold text-purple-700">
          AI Response
        </span>
      </div>

      {/* Node Body */}
      <div className="min-h-[50px] p-3">
        <p className="text-sm text-gray-600 italic">
          AI will generate a response.
        </p>
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-white !bg-gray-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-white !bg-purple-500"
      />
    </div>
  );
}
