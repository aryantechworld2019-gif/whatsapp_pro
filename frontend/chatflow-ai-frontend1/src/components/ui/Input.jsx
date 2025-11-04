import { forwardRef } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * A generic, reusable input component with label and error handling.
 *
 * @param {string} id - Unique ID for the input and label.
 * @param {string} label - The label text.
 * @param {string} type - Input type (e.g., 'text', 'email').
 * @param {string} [error] - An error message to display.
 * @param {string} [className] - Additional class names for the wrapper.
 * @param {React.InputHTMLAttributes} props - Other standard input props.
 */
const Input = forwardRef(({ id, label, type = 'text', error, className = '', ...props }, ref) => {
  const baseClasses = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2";
  const errorClasses = "border-red-500 text-red-700 focus:ring-red-500";
  const defaultClasses = "border-gray-300 focus:ring-blue-500";

  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        ref={ref}
        className={`${baseClasses} ${error ? errorClasses : defaultClasses}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
