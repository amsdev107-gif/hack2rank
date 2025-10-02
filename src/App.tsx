import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Learn from './components/Learn';
import Messages from './components/Messages';
import Profile from './components/Profile';
import Explore from './components/Explore';
import AdminPanel from './components/AdminPanel';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // Listen for auth redirect events
  React.useEffect(() => {
    const handleAuthRedirect = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('authRedirect', handleAuthRedirect as EventListener);
    return () => window.removeEventListener('authRedirect', handleAuthRedirect as EventListener);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard onTabChange={setActiveTab} />;
      case 'arena':
        return (
          <div className="p-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Arena - Coming Soon</h2>
              <p className="text-gray-400">Compete with other developers in coding challenges</p>
            </motion.div>
          </div>
        );
      case 'learn':
        return <Learn />;
      case 'explore':
        return (
          <Explore onTabChange={setActiveTab} />
        );
      case 'messages':
        return <Messages onTabChange={setActiveTab} />;
      case 'profile':
        return <Profile />;
      case 'auth':
        return <Auth />;
      case 'admin':
        return <AdminPanel onTabChange={setActiveTab} />;
      default:
        return <Dashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="pt-16">
        {renderContent()}
      </main>
    </div>
  );
};

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;