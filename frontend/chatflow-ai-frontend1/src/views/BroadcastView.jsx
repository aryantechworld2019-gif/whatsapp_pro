import { useState } from 'react';
import { Megaphone, Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';
import api from '../services/api'; // ← FIXED: Changed from default import of sendBroadcast
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BroadcastView (improved)
 * - fixes AnimatePresence keying + aria-live
 * - defensive result handling
 * - char limit + remaining counter
 * - clearer dismiss behaviour for alerts
 */
const BroadcastView = () => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // client-side limits
  const MAX_CHARS = 2000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message?.trim() || status === 'loading') return;

    setStatus('loading');
    setError(null);
    setSuccessMessage('');

    try {
      // defensive: ensure API receives correct payload shape
      const payload = { message: message.trim(), tags: [] };
      const result = await api.sendBroadcast(payload); // ← FIXED: Using api.sendBroadcast

      // defensive extraction: some APIs return nested data
      const totalSent =
        result?.total_sent ?? result?.data?.total_sent ?? result?.sentCount ?? 0;

      setStatus('success');
      setSuccessMessage(`Broadcast sent to ${totalSent} contacts!`);
      setMessage(''); // clear after success
    } catch (err) {
      console.error('Broadcast failed:', err);
      const msg =
        (err && err.message) ||
        (err && err.error) ||
        'Failed to send broadcast. Please try again.';
      setStatus('error');
      setError(msg);
    }
  };

  /**
   * Render a single alert element; AnimatePresence requires stable keys
   */
  const renderAlert = () => {
    if (status === 'success' && successMessage) {
      return (
        <motion.div
          key="success-alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-3" />
            <strong className="font-bold">{successMessage}</strong>
          </div>
          <button
            onClick={() => {
              setSuccessMessage('');
              setStatus('idle');
            }}
            aria-label="Dismiss success"
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      );
    }

    if (status === 'error' && error) {
      return (
        <motion.div
          key="error-alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-3" />
            <strong className="font-bold">{error}</strong>
          </div>
          <button
            onClick={() => {
              setError(null);
              setStatus('idle');
            }}
            aria-label="Dismiss error"
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <div className="flex items-center mb-6">
        <Megaphone className="w-8 h-8 mr-3 text-brand-primary" />
        <h1 className="text-3xl font-bold text-gray-800">New Broadcast</h1>
      </div>

      <p className="text-gray-600 mb-8">
        Send a one-time message to all your contacts. This is great for promotions,
        updates, or announcements.
      </p>

      <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100">
        <form onSubmit={handleSubmit}>
          {/* Status Alert Area */}
          <div className="mb-6 min-h-[3rem]">
            {/* FIXED: Changed exitBeforeEnter to mode="wait" */}
            <AnimatePresence mode="wait">
              {renderAlert()}
            </AnimatePresence>
          </div>

          {/* Message Textarea */}
          <div className="mb-6">
            <label
              htmlFor="broadcastMessage"
              className="block text-lg font-semibold text-gray-700 mb-3"
            >
              Message
            </label>
            <textarea
              id="broadcastMessage"
              rows="8"
              maxLength={MAX_CHARS}
              className="w-full px-4 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:bg-white transition-colors"
              placeholder="Type your message here... e.g., '🎉 We're offering 20% off all facials this weekend! Book now!'"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === 'loading'}
              aria-describedby="charCountHint"
            ></textarea>
            <div className="flex justify-between items-center mt-2">
              <p id="charCountHint" className="text-sm text-gray-500">
                Note: This message will be sent to ALL contacts in your database.
              </p>
              <p className="text-sm text-gray-500">
                {message.length}/{MAX_CHARS}
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!message.trim() || status === 'loading'}
              className="flex items-center justify-center px-8 py-3 bg-brand-primary text-white text-base font-bold rounded-lg shadow-md hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Megaphone className="w-5 h-5 mr-2" />
                  Send Broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BroadcastView;