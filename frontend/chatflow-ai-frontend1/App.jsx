import { useState } from 'react';
import { LayoutDashboard, Users, MessageSquare, Bot, Megaphone } from 'lucide-react';
import Sidebar from './src/components/layout/Sidebar';
import Header from './src/components/layout/Header';
import DashboardView from './src/views/DashboardView';
import ContactsView from './src/views/ContactsView';
import { ChatbotBuilderView } from './src/views/ChatbotBuilderView';
import BroadcastView from './src/views/BroadcastView';

// Navigation items for our sidebar
const navItems = [
  { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
  { name: 'Contacts', view: 'contacts', icon: Users },
  { name: 'Chatbot Builder', view: 'chatbot', icon: Bot },
  { name: 'Broadcast', view: 'broadcast', icon: Megaphone },
];

export const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'contacts':
        return <ContactsView />;
      case 'chatbot':
        return <ChatbotBuilderView />;
      case 'broadcast':
        return <BroadcastView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Sidebar with Overlay */}
      {isSidebarOpen && (
        <>
          {/* Backdrop/Overlay for mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Sidebar for mobile (slides in) */}
          <Sidebar
            navItems={navItems}
            currentView={currentView}
            setCurrentView={setCurrentView}
            onClose={() => setIsSidebarOpen(false)}
          />
        </>
      )}

      {/* Desktop Sidebar (always visible on large screens) */}
      <div className="hidden lg:block">
        <Sidebar
          navItems={navItems}
          currentView={currentView}
          setCurrentView={setCurrentView}
          onClose={() => {}} // No-op on desktop
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;