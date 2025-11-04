import React from 'react';
import { motion } from 'framer-motion';
import { Bot, X } from 'lucide-react';

// This is our main navigation component.
// It's animated for a premium feel, per our strategy.
export default function Sidebar({
  navItems,
  currentView,
  setCurrentView,
  onClose,
}) {
  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  };

  const navItemVariants = {
    open: {
      y: 0,
      opacity: 1,
      transition: {
        y: { stiffness: 1000, velocity: -100 },
      },
    },
    closed: {
      y: 50,
      opacity: 0,
      transition: {
        y: { stiffness: 1000 },
      },
    },
  };

  const handleNavClick = (view) => {
    setCurrentView(view);
    onClose(); // Close the sidebar on mobile after navigation
  };

  return (
    <motion.div
      className="absolute left-0 top-0 z-50 flex h-full w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white shadow-lg lg:static lg:z-auto lg:shadow-none"
      variants={sidebarVariants}
      initial="closed"
      animate="open"
      exit="closed"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center space-x-2">
          <Bot className="h-8 w-8 text-brand-primary" />
          <span className="text-xl font-bold text-gray-800">ATW ChatFlow AI</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <motion.ul
          variants={{
            open: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
            closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
          }}
          className="space-y-2"
        >
          {navItems.map((item) => (
            <motion.li key={item.name} variants={navItemVariants}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.view);
                }}
                className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150
                  ${
                    currentView === item.view
                      ? 'bg-brand-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </a>
            </motion.li>
          ))}
        </motion.ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <p className="text-xs text-gray-500">
          © 2025 ChatFlow AI. All rights reserved.
        </p>
      </div>
    </motion.div>
  );
}

