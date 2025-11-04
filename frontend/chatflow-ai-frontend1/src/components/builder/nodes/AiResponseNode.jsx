import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot, AlertCircle, Sparkles } from 'lucide-react';

const AiResponseNode = ({ data, selected }) => {
  // Extract prompt and model with defaults
  const prompt = data?.prompt || '';
  const model = data?.model || 'gpt-4';

  // Validation checks
  const hasPrompt = prompt.trim().length > 0;
  const isEmpty = !hasPrompt;

  // Truncate for display
  const displayPrompt = prompt.length > 150
    ? prompt.substring(0, 150) + '...'
    : prompt;

  return (
    <div
      className={`
        w-72 rounded-lg border-2 bg-white shadow-lg transition-all duration-200
        ${selected
          ? 'border-purple-500 shadow-purple-200 ring-2 ring-purple-200'
          : isEmpty
            ? 'border-red-300 shadow-md hover:shadow-xl'
            : 'border-purple-300 shadow-md hover:shadow-xl'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="rounded-md bg-purple-500 p-1">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-purple-900">
            AI Response
          </span>
        </div>

        {model && (
          <div className="flex items-center space-x-1 rounded-full bg-purple-200 px-2 py-0.5">
            <Sparkles className="w-3 h-3 text-purple-800" />
            <span className="text-xs font-medium text-purple-800">{model}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-h-[60px] p-3">
        {hasPrompt ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Prompt:
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {displayPrompt}
            </p>
          </div>
        ) : (
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 font-medium">
              No prompt configured. Click to edit.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-purple-100 bg-purple-25 px-3 py-1.5">
        <p className="text-xs text-gray-500">
          {hasPrompt ? `${prompt.length} characters` : 'No prompt configured'}
        </p>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-purple-400 hover:!bg-purple-600 transition-colors !shadow-md"
        title="Connect from previous step"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-purple-600 hover:!bg-purple-700 transition-colors !shadow-md"
        title="Connect to next step"
      />
    </div>
  );
};

export default memo(AiResponseNode);
