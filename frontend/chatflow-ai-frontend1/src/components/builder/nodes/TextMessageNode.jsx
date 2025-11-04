import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare, AlertCircle, Clock } from 'lucide-react';

const TextMessageNode = ({ data, selected }) => {
  // Extract message and delay with defaults
  const message = data?.message || '';
  const delay = data?.delay || 0;
  
  // Validation checks
  const hasMessage = message.trim().length > 0;
  const isLongMessage = message.length > 500;
  const isEmpty = !hasMessage;
  
  // Truncate for display
  const displayMessage = message.length > 150 
    ? message.substring(0, 150) + '...' 
    : message;

  return (
    <div 
      className={`
        w-72 rounded-lg border-2 bg-white shadow-lg transition-all duration-200
        ${selected 
          ? 'border-blue-500 shadow-blue-200 ring-2 ring-blue-200' 
          : isEmpty
            ? 'border-red-300 shadow-md hover:shadow-xl'
            : 'border-blue-300 shadow-md hover:shadow-xl'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="rounded-md bg-blue-500 p-1">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-blue-900">
            Send Message
          </span>
        </div>
        
        {delay > 0 && (
          <div className="flex items-center space-x-1 rounded-full bg-blue-200 px-2 py-0.5">
            <Clock className="w-3 h-3 text-blue-800" />
            <span className="text-xs font-medium text-blue-800">{delay}s</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-h-[60px] p-3">
        {hasMessage ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {displayMessage}
            </p>
            
            {isLongMessage && (
              <div className="flex items-start space-x-1 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Long message ({message.length} chars)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 font-medium">
              Message is empty. Click to edit.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-blue-100 bg-blue-25 px-3 py-1.5">
        <p className="text-xs text-gray-500">
          {hasMessage ? `${message.length} characters` : 'No message configured'}
        </p>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-blue-400 hover:!bg-blue-600 transition-colors !shadow-md"
        title="Connect from previous step"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-blue-600 hover:!bg-blue-700 transition-colors !shadow-md"
        title="Connect to next step"
      />
    </div>
  );
};

export default memo(TextMessageNode);