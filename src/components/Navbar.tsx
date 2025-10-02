import React from 'react';
import { motion } from 'framer-motion';
import { Home, Zap, BookOpen, Compass, MessageCircle, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { currentUser, userData } = useAuth();

  // Check if user is admin - add more admin emails here
  const adminEmails = [
    'amanthemaster.279@gmail.com',
    'admin@hack2rank.com',
    'ndgaming458@gmail.com',
    'sciringservices@gmail.com' // Add more admin emails as needed
  ];
  const isAdmin = currentUser?.email && adminEmails.includes(currentUser.email.toLowerCase().trim());

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'arena', label: 'Arena', icon: Zap },
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
  ];

  // Add admin tab for admin users
  if (isAdmin) {
    navigationItems.push({ id: 'admin', label: 'Admin', icon: Settings });
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-4 left-4 right-4 z-50 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="text-teal-400 font-bold text-xl">
              Hack2rank
            </span>
          </motion.div>

          <div className="flex items-center space-x-4">
            {navigationItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-1 px-2 py-2 rounded-lg transition-all duration-200 text-sm ${
                  activeTab === item.id
                    ? 'text-teal-400 bg-teal-400/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={16} />
                <span className="font-medium hidden sm:inline">{item.label}</span>
              </motion.button>
            ))}
          </div>

          <div className="flex items-center">
            {currentUser ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onTabChange('profile')}
                  className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all max-w-[200px]"
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {userData?.displayName?.[0] || currentUser?.displayName?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 hidden sm:block">
                    <div className="text-white text-sm font-medium truncate">
                      {userData?.displayName || currentUser?.displayName || 'User'}
                    </div>
                    <div className="text-gray-400 text-xs truncate">
                      Rank #{userData?.rank || 'N/A'}
                    </div>
                  </div>
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTabChange('auth')}
                className="flex items-center space-x-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors text-sm"
              >
                <User size={16} />
                <span className="font-medium hidden sm:inline">Sign In</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;