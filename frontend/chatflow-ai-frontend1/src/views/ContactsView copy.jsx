import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, User, Tag, Phone, Trash2, Loader2, X, AlertTriangle } from 'lucide-react';

// API URL (from our backend)
const API_URL = 'http://localhost:8000';

// --- Add Contact Modal ---
const AddContactModal = ({ setShowModal, onContactAdded }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      setError('Name and Phone are required.');
      return;
    }
    // Add +91 if not present, basic validation
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone_number: formattedPhone,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to create contact');
      }

      const newContact = await response.json();
      onContactAdded(newContact); // Update parent state
      setShowModal(false); // Close modal

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => setShowModal(false)}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()} // Prevent closing on inner click
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-2xl font-semibold text-gray-800">Add New Contact</h3>
          <button
            onClick={() => setShowModal(false)}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Priya Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (with +91)*</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., +919876543210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., vip, facial, new_lead"
              />
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};


// --- Main Contacts View ---
export default function ContactsView() {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch contacts from backend
  useEffect(() => {
    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/contacts`);
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        const data = await response.json();
        setContacts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContacts();
  }, []);

  // Memoized search filtering
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone_number.includes(searchTerm) ||
      contact.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [contacts, searchTerm]);

  // Handler for when a new contact is added via modal
  const handleContactAdded = (newContact) => {
    // Add to state to update UI immediately
    setContacts(prevContacts => [newContact, ...prevContacts]);
  };
  
  // TODO: Add delete contact handler

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h2 className="text-3xl font-bold text-gray-800">Contacts ({contacts.length})</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by name, phone, or tag..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5 mr-1" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center h-64 bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertTriangle className="w-8 h-8 text-red-600 mr-4" />
            <span className="text-xl text-red-700 font-medium">Error: {error}</span>
          </div>
        )}

        {!isLoading && !error && filteredContacts.length === 0 && (
          <div className="flex justify-center items-center h-64 bg-white border border-gray-200 rounded-lg p-6">
            <span className="text-xl text-gray-500 font-medium">
              {contacts.length === 0 ? "You have no contacts yet." : "No contacts match your search."}
            </span>
          </div>
        )}

        {!isLoading && !error && filteredContacts.length > 0 && (
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {filteredContacts.map(contact => (
                <li key={contact._id} className="p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center mb-4 md:mb-0">
                    <div className="p-3 bg-gray-100 rounded-full mr-4">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{contact.name}</div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <Phone className="w-3 h-3 mr-1.5" />
                        {contact.phone_number}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Add Contact Modal Portal */}
      <AnimatePresence>
        {showAddModal && (
          <AddContactModal
            setShowModal={setShowAddModal}
            onContactAdded={handleContactAdded}
          />
        )}
      </AnimatePresence>
    </>
  );
}
