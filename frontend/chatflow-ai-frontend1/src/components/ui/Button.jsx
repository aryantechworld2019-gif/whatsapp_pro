import { Loader2 } from 'lucide-react';

/**
 * A generic, reusable button component with variants.
 *
 * @param {React.ReactNode} children - The button's content.
 * @param {function} onClick - Click handler.
 * @param {'primary' | 'secondary'} [variant='primary'] - Button style variant.
 * @param {string} [type='button'] - Button type (e.g., 'submit').
 * @param {boolean} [disabled=false] - Whether the button is disabled.
 * @param {boolean} [isLoading=false] - If true, shows a loading spinner.
 * @param {React.ElementType} [icon] - An optional icon component (e.g., Plus).
 * @param {string} [className] - Additional class names.
 */
export default function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  isLoading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseClasses = "px-4 py-2 font-medium rounded-lg transition-all flex items-center justify-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg disabled:bg-blue-300',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-lg disabled:bg-gray-100',
  };

  const finalDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={finalDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      ) : (
        Icon && <Icon className="w-5 h-5 mr-2" />
      )}
      {children}
    </button>
  );
}
