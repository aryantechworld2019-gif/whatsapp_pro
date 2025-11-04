import React from 'react';
import { Menu, UserCircle, Bell } from 'lucide-react';

export default function Header({ onMenuClick }) {
  return (
    <header className="flex h-16 w-full flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8">
      {/* This is the mobile menu button.
        We use 'lg:hidden' to only show it on mobile.
      */}
      <button
        onClick={onMenuClick}
        className="text-gray-600 hover:text-brand-primary lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu size={24} />
      </button>

      {/* This is a spacer on mobile.
        On desktop, we can have a global search bar here.
      */}
      <div className="flex-1 lg:block">
        {/* <input type="text" placeholder="Search..." className="hidden lg:block w-64 p-2 border rounded-lg" /> */}
      </div>

      {/* Right-side icons */}
      <div className="flex items-center space-x-4">
        <button
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-primary"
          aria-label="Notifications"
        >
          <Bell size={22} />
        </button>
        <button
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-primary"
          aria-label="User profile"
        >
          <UserCircle size={22} />
        </button>
      </div>
    </header>
  );
}

