import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * A generic, reusable modal component.
 *
 * @param {boolean} isOpen - Whether the modal is open or not.
 * @param {function} onClose - Function to call when the modal should close.
 * @param {string} title - The title to display in the modal header.
 * @param {React.ReactNode} children - The content to display in the modal body.
 * @param {React.ReactNode} footer - The content to display in the modal footer (e.g., buttons).
 */
export default function Modal({ isOpen, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose} // Close on overlay click
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
            onClick={e => e.stopPropagation()} // Prevent closing on inner click
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              {children}
            </div>
            
            {/* Modal Footer */}
            {footer && (
              <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
