import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Send, 
  Users, 
  Plus, 
  X, 
  MessageCircle,
  UserPlus,
  Hash,
  Clock,
  Check,
  CheckCheck,
  CheckCircle,
  MoreVertical,
  Trash2,
  Edit,
  UserMinus,
  Crown,
  Settings,
  LogOut,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { realtimeDb, db } from '../firebase/config';
import { 
  ref, 
  push, 
  onValue, 
  off, 
  set, 
  query, 
  orderByChild, 
  equalTo,
  serverTimestamp,
  get,
  remove,
  update
} from 'firebase/database';
import { 
  collection, 
  query as firestoreQuery, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  startAt,
  endAt
} from 'firebase/firestore';
import { Chat, Message } from '../types';

interface MessagesProps {
  onTabChange: (tab: string) => void;
}

interface OnlineStatus {
  [userId: string]: {
    isOnline: boolean;
    lastSeen: Date;
  };
}

const Messages: React.FC<MessagesProps> = ({ onTabChange }) => {
  const { currentUser, userData } = useAuth();
  const { addNotification } = useNotification();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>({});
  const [showChatOptions, setShowChatOptions] = useState<string | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update user's online status
  useEffect(() => {
    if (!currentUser) return;

    const userStatusRef = ref(realtimeDb, `status/${currentUser.uid}`);
    const connectedRef = ref(realtimeDb, '.info/connected');

    const updateStatus = (isOnline: boolean) => {
      const statusData = {
        isOnline,
        lastSeen: new Date().toISOString(),
        uid: currentUser.uid
      };
      set(userStatusRef, statusData);
    };

    // Set user as online when connected
    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        updateStatus(true);
        // Set user as offline when disconnected
        set(ref(realtimeDb, `status/${currentUser.uid}/isOnline`), false);
      }
    });

    // Update status every 30 seconds while active
    const statusInterval = setInterval(() => {
      updateStatus(true);
    }, 30000);

    // Set as online initially
    updateStatus(true);

    return () => {
      updateStatus(false);
      clearInterval(statusInterval);
      off(connectedRef, 'value', unsubscribeConnected);
    };
  }, [currentUser]);

  // Monitor online status of all users
  useEffect(() => {
    const statusRef = ref(realtimeDb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const statusData = snapshot.val();
        const onlineStatusMap: OnlineStatus = {};
        
        Object.keys(statusData).forEach(userId => {
          const userStatus = statusData[userId];
          const lastSeen = new Date(userStatus.lastSeen);
          const now = new Date();
          const timeDiff = now.getTime() - lastSeen.getTime();
          
          // Consider user offline if last seen more than 2 minutes ago
          const isOnline = userStatus.isOnline && timeDiff < 120000;
          
          onlineStatusMap[userId] = {
            isOnline,
            lastSeen
          };
        });
        
        setOnlineStatus(onlineStatusMap);
      }
    });

    return () => off(statusRef, 'value', unsubscribe);
  }, []);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!currentUser) {
      addNotification({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Please sign in to access messages.'
      });
      onTabChange('auth');
    }
  }, [currentUser, addNotification, onTabChange]);

  // Load user's chats
  useEffect(() => {
    if (!currentUser) return;

    const userChatsRef = ref(realtimeDb, `userChats/${currentUser.uid}`);
    const unsubscribe = onValue(userChatsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const chatIds = Object.keys(snapshot.val());
        const chatPromises = chatIds.map(async (chatId) => {
          const chatRef = ref(realtimeDb, `chats/${chatId}`);
          const chatSnapshot = await get(chatRef);
          if (chatSnapshot.exists()) {
            return { id: chatId, ...chatSnapshot.val() } as Chat;
          }
          return null;
        });
        
        const loadedChats = (await Promise.all(chatPromises)).filter(Boolean) as Chat[];
        setChats(loadedChats.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ));
      }
    });

    return () => off(userChatsRef, 'value', unsubscribe);
  }, [currentUser]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) return;

    const messagesRef = ref(realtimeDb, `messages/${activeChat.id}`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        const messagesList = Object.keys(messagesData).map(key => ({
          id: key,
          ...messagesData[key],
          timestamp: new Date(messagesData[key].timestamp)
        })) as Message[];
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
    });

    return () => off(messagesRef, 'value', unsubscribe);
  }, [activeChat]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    const searchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const searchTerm = searchQuery.toLowerCase().trim();
        
        // Search by display name (case-insensitive)
        const displayNameQuery = firestoreQuery(
          usersRef,
          orderBy('displayName'),
          startAt(searchTerm),
          endAt(searchTerm + '\uf8ff'),
          limit(10)
        );
        
        // Search by username (case-insensitive)
        const usernameQuery = firestoreQuery(
          usersRef,
          orderBy('username'),
          startAt(searchTerm),
          endAt(searchTerm + '\uf8ff'),
          limit(10)
        );
        
        // Execute both queries
        const [displayNameSnapshot, usernameSnapshot] = await Promise.all([
          getDocs(displayNameQuery),
          getDocs(usernameQuery)
        ]);
        
        const results = new Map();
        
        // Process display name results
        displayNameSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (doc.id !== currentUser?.uid && 
              userData.displayName?.toLowerCase().includes(searchTerm)) {
            results.set(doc.id, { id: doc.id, ...userData });
          }
        });
        
        // Process username results
        usernameSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (doc.id !== currentUser?.uid && 
              userData.username?.toLowerCase().includes(searchTerm)) {
            results.set(doc.id, { id: doc.id, ...userData });
          }
        });
        
        // If no results from ordered queries, do a broader search
        if (results.size === 0) {
          const broadQuery = firestoreQuery(
            usersRef,
            limit(50)
          );
          
          const broadSnapshot = await getDocs(broadQuery);
          broadSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (doc.id !== currentUser?.uid) {
              const displayName = userData.displayName?.toLowerCase() || '';
              const username = userData.username?.toLowerCase() || '';
              const email = userData.email?.toLowerCase() || '';
              
              if (displayName.includes(searchTerm) || 
                  username.includes(searchTerm) || 
                  email.includes(searchTerm)) {
                results.set(doc.id, { id: doc.id, ...userData });
              }
            }
          });
        }
        
        // Convert Map to Array and sort by relevance
        const sortedResults = Array.from(results.values())
          .sort((a, b) => {
            // Prioritize exact matches at the beginning
            const aDisplayName = a.displayName?.toLowerCase() || '';
            const aUsername = a.username?.toLowerCase() || '';
            const bDisplayName = b.displayName?.toLowerCase() || '';
            const bUsername = b.username?.toLowerCase() || '';
            
            const aStartsWithDisplay = aDisplayName.startsWith(searchTerm);
            const aStartsWithUsername = aUsername.startsWith(searchTerm);
            const bStartsWithDisplay = bDisplayName.startsWith(searchTerm);
            const bStartsWithUsername = bUsername.startsWith(searchTerm);
            
            if ((aStartsWithDisplay || aStartsWithUsername) && !(bStartsWithDisplay || bStartsWithUsername)) {
              return -1;
            }
            if (!(aStartsWithDisplay || aStartsWithUsername) && (bStartsWithDisplay || bStartsWithUsername)) {
              return 1;
            }
            
            return aDisplayName.localeCompare(bDisplayName);
          })
          .slice(0, 8);
        
        setSearchResults(sortedResults);
      } catch (error) {
        console.error('Search error:', error);
        addNotification({
          type: 'error',
          title: 'Search Failed',
          message: 'Failed to search users. Please try again.'
        });
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, currentUser, addNotification]);

  const createOrGetIndividualChat = async (otherUserId: string, otherUserData: any) => {
    if (!currentUser || !userData) return;

    // Check if chat already exists
    const existingChat = chats.find(chat => 
      chat.type === 'individual' && 
      chat.participants.includes(otherUserId)
    );

    if (existingChat) {
      setActiveChat(existingChat);
      return;
    }

    // Create new individual chat
    const chatId = `${[currentUser.uid, otherUserId].sort().join('_')}`;
    const newChat: Omit<Chat, 'id'> = {
      type: 'individual',
      participants: [currentUser.uid, otherUserId],
      participantDetails: {
        [currentUser.uid]: {
          name: userData.displayName,
          avatar: userData.photoURL
        },
        [otherUserId]: {
          name: otherUserData.displayName,
          avatar: otherUserData.photoURL
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Save chat
      await set(ref(realtimeDb, `chats/${chatId}`), newChat);
      
      // Add to user's chat lists
      await set(ref(realtimeDb, `userChats/${currentUser.uid}/${chatId}`), true);
      await set(ref(realtimeDb, `userChats/${otherUserId}/${chatId}`), true);

      addNotification({
        type: 'success',
        title: 'Chat Created',
        message: `Started conversation with ${otherUserData.displayName}`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create chat'
      });
    }
  };

  const createGroupChat = async () => {
    if (!currentUser || !userData || selectedUsers.length < 1) {
      addNotification({
        type: 'error',
        title: 'Invalid Group',
        message: 'Please select at least 1 user for a group chat'
      });
      return;
    }

    setLoading(true);
    try {
      const chatRef = push(ref(realtimeDb, 'chats'));
      const chatId = chatRef.key!;
      
      const participants = [currentUser.uid, ...selectedUsers];
      const participantDetails: { [key: string]: { name: string; avatar?: string } } = {
        [currentUser.uid]: {
          name: userData.displayName,
          avatar: userData.photoURL
        }
      };

      // Get participant details
      for (const userId of selectedUsers) {
        const userRef = ref(realtimeDb, `users/${userId}`);
        const userSnapshot = await get(userRef);
        if (userSnapshot.exists()) {
          const user = userSnapshot.val();
          participantDetails[userId] = {
            name: user.displayName,
            avatar: user.photoURL
          };
        }
      }

      const newChat: Omit<Chat, 'id'> = {
        type: 'group',
        name: groupName || `Group with ${participants.length} members`,
        participants,
        participantDetails,
        admins: [currentUser.uid], // Creator is admin
        createdBy: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await set(chatRef, newChat);

      // Add to all participants' chat lists
      for (const userId of participants) {
        await set(ref(realtimeDb, `userChats/${userId}/${chatId}`), true);
      }

      setShowCreateGroup(false);
      setGroupName('');
      setSelectedUsers([]);
      
      addNotification({
        type: 'success',
        title: 'Group Created',
        message: 'Group chat created successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create group chat'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!currentUser) return;

    try {
      // Remove from user's chat list
      await remove(ref(realtimeDb, `userChats/${currentUser.uid}/${chatId}`));
      
      // If it's an individual chat, remove from other user's list too
      const chat = chats.find(c => c.id === chatId);
      if (chat?.type === 'individual') {
        const otherUser = chat.participants.find(p => p !== currentUser.uid);
        if (otherUser) {
          await remove(ref(realtimeDb, `userChats/${otherUser}/${chatId}`));
        }
        // Delete the entire chat and messages
        await remove(ref(realtimeDb, `chats/${chatId}`));
        await remove(ref(realtimeDb, `messages/${chatId}`));
      }
      
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
      
      setShowDeleteConfirm(null);
      addNotification({
        type: 'success',
        title: 'Chat Deleted',
        message: 'Chat has been deleted successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete chat'
      });
    }
  };

  const leaveGroup = async (chatId: string) => {
    if (!currentUser) return;

    try {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;

      // Remove user from participants
      const updatedParticipants = chat.participants.filter(p => p !== currentUser.uid);
      const updatedParticipantDetails = { ...chat.participantDetails };
      delete updatedParticipantDetails[currentUser.uid];

      // Remove from admins if admin
      const updatedAdmins = chat.admins?.filter(a => a !== currentUser.uid) || [];

      // If no participants left, delete the group
      if (updatedParticipants.length === 0) {
        await remove(ref(realtimeDb, `chats/${chatId}`));
        await remove(ref(realtimeDb, `messages/${chatId}`));
      } else {
        // Update group
        await update(ref(realtimeDb, `chats/${chatId}`), {
          participants: updatedParticipants,
          participantDetails: updatedParticipantDetails,
          admins: updatedAdmins,
          updatedAt: new Date().toISOString()
        });
      }

      // Remove from user's chat list
      await remove(ref(realtimeDb, `userChats/${currentUser.uid}/${chatId}`));
      
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
      
      addNotification({
        type: 'success',
        title: 'Left Group',
        message: 'You have left the group successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to leave group'
      });
    }
  };

  const updateGroupName = async () => {
    if (!activeChat || !editingGroupName.trim() || !currentUser) return;

    // Check if user is admin
    if (!activeChat.admins?.includes(currentUser.uid)) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only group admins can edit group name'
      });
      return;
    }

    try {
      await update(ref(realtimeDb, `chats/${activeChat.id}`), {
        name: editingGroupName.trim(),
        updatedAt: new Date().toISOString()
      });
      
      setEditingGroupName('');
      setShowGroupSettings(false);
      
      addNotification({
        type: 'success',
        title: 'Group Updated',
        message: 'Group name updated successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update group name'
      });
    }
  };

  const removeUserFromGroup = async (userId: string) => {
    if (!activeChat || !currentUser) return;

    // Check if user is admin
    if (!activeChat.admins?.includes(currentUser.uid)) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only group admins can remove members'
      });
      return;
    }

    try {
      const updatedParticipants = activeChat.participants.filter(p => p !== userId);
      const updatedParticipantDetails = { ...activeChat.participantDetails };
      delete updatedParticipantDetails[userId];
      const updatedAdmins = activeChat.admins?.filter(a => a !== userId) || [];

      await update(ref(realtimeDb, `chats/${activeChat.id}`), {
        participants: updatedParticipants,
        participantDetails: updatedParticipantDetails,
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });

      // Remove from user's chat list
      await remove(ref(realtimeDb, `userChats/${userId}/${activeChat.id}`));
      
      addNotification({
        type: 'success',
        title: 'Member Removed',
        message: 'Member has been removed from the group'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove member'
      });
    }
  };

  const toggleAdmin = async (userId: string) => {
    if (!activeChat || !currentUser) return;

    // Check if user is admin
    if (!activeChat.admins?.includes(currentUser.uid)) {
      addNotification({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only group admins can manage admin roles'
      });
      return;
    }

    try {
      const isCurrentlyAdmin = activeChat.admins?.includes(userId);
      let updatedAdmins = activeChat.admins || [];

      if (isCurrentlyAdmin) {
        updatedAdmins = updatedAdmins.filter(a => a !== userId);
      } else {
        updatedAdmins.push(userId);
      }

      await update(ref(realtimeDb, `chats/${activeChat.id}`), {
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });
      
      addNotification({
        type: 'success',
        title: 'Admin Role Updated',
        message: `User ${isCurrentlyAdmin ? 'removed from' : 'added to'} admin role`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update admin role'
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !currentUser || !userData) return;

    const messageData = {
      senderId: currentUser.uid,
      senderName: userData.displayName,
      senderAvatar: userData.photoURL,
      content: newMessage.trim(),
      timestamp: serverTimestamp(),
      type: 'text' as const,
      chatId: activeChat.id
    };

    try {
      // Add message
      await push(ref(realtimeDb, `messages/${activeChat.id}`), messageData);
      
      // Update chat's last message
      await set(ref(realtimeDb, `chats/${activeChat.id}/lastMessage`), {
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        senderId: currentUser.uid,
        senderName: userData.displayName
      });
      
      await set(ref(realtimeDb, `chats/${activeChat.id}/updatedAt`), new Date().toISOString());
      
      setNewMessage('');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send message'
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }
    
    const otherParticipant = chat.participants.find(p => p !== currentUser?.uid);
    return chat.participantDetails[otherParticipant!]?.name || 'Unknown User';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'group') {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
          <Users className="text-white" size={20} />
        </div>
      );
    }
    
    const otherParticipant = chat.participants.find(p => p !== currentUser?.uid);
    const avatar = chat.participantDetails[otherParticipant!]?.avatar;
    const name = chat.participantDetails[otherParticipant!]?.name || 'U';
    
    return avatar ? (
      <img src={avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
    ) : (
      <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
        <span className="text-white font-bold">{name[0]}</span>
      </div>
    );
  };

  const getOnlineStatus = (userId: string) => {
    const status = onlineStatus[userId];
    if (!status) return { isOnline: false, lastSeen: 'Unknown' };
    
    return {
      isOnline: status.isOnline,
      lastSeen: status.isOnline ? 'Online' : formatLastSeen(status.lastSeen)
    };
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto p-6 gap-6">
      {/* Sidebar */}
      <div className="w-80 bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold">Messages</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateGroup(true)}
              className="p-2 bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              <Plus size={18} />
            </motion.button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          
          {/* Search Results */}
          {(searchResults.length > 0 || isSearching) && (
            <div className="mt-2 bg-gray-800/50 rounded-lg border border-white/10 max-h-48 overflow-y-auto">
              {isSearching && (
                <div className="p-3 text-center">
                  <div className="inline-flex items-center space-x-2 text-gray-400">
                    <div className="animate-spin w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Searching users...</span>
                  </div>
                </div>
              )}
              {searchResults.map((user) => (
                <motion.button
                  key={user.id}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  onClick={() => {
                    createOrGetIndividualChat(user.id, user);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="w-full p-3 flex items-center space-x-3 text-left hover:bg-white/5 transition-colors border-b border-gray-700/30 last:border-b-0"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 relative">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">{user.displayName?.[0] || 'U'}</span>
                    )}
                    {/* Online indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                      getOnlineStatus(user.id).isOnline ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{user.displayName}</div>
                    {user.username && (
                      <div className="text-teal-400 text-xs">@{user.username}</div>
                    )}
                    <div className="text-gray-500 text-xs">
                      {getOnlineStatus(user.id).lastSeen}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <UserPlus size={16} />
                  </div>
                </motion.button>
              ))}
              {!isSearching && searchResults.length === 0 && searchQuery.trim() && (
                <div className="p-4 text-center">
                  <div className="text-gray-400 text-sm">
                    No users found for "{searchQuery}"
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    Try searching by name, username, or email
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-400">No conversations yet</p>
              <p className="text-gray-500 text-sm mt-2">Search for users to start chatting</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {chats.map((chat) => (
                <div key={chat.id} className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveChat(chat)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      activeChat?.id === chat.id
                        ? 'bg-teal-600/20 border border-teal-500/30'
                        : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {getChatAvatar(chat)}
                        {/* Online indicator for individual chats */}
                        {chat.type === 'individual' && (() => {
                          const otherParticipant = chat.participants.find(p => p !== currentUser?.uid);
                          const status = getOnlineStatus(otherParticipant!);
                          return (
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                              status.isOnline ? 'bg-green-400' : 'bg-gray-500'
                            }`} />
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-medium truncate">{getChatName(chat)}</h3>
                          {chat.lastMessage && (
                            <span className="text-gray-400 text-xs">
                              {formatTime(new Date(chat.lastMessage.timestamp))}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-gray-400 text-sm truncate">
                            {chat.lastMessage.senderName}: {chat.lastMessage.content}
                          </p>
                        )}
                        {chat.type === 'group' && (
                          <div className="flex items-center mt-1">
                            <Users size={12} className="text-gray-500 mr-1" />
                            <span className="text-gray-500 text-xs">
                              {chat.participants.length} members
                            </span>
                          </div>
                        )}
                        {chat.type === 'individual' && (() => {
                          const otherParticipant = chat.participants.find(p => p !== currentUser?.uid);
                          const status = getOnlineStatus(otherParticipant!);
                          return (
                            <div className="text-gray-500 text-xs mt-1">
                              {status.lastSeen}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.button>
                  
                  {/* Chat Options */}
                  <div className="absolute top-2 right-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChatOptions(showChatOptions === chat.id ? null : chat.id);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical size={16} />
                    </motion.button>
                    
                    {showChatOptions === chat.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-0 top-8 bg-gray-800 rounded-lg border border-white/10 shadow-lg z-10 min-w-32"
                      >
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(chat.id);
                            setShowChatOptions(null);
                          }}
                          className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center space-x-2 rounded-lg"
                        >
                          <Trash2 size={14} />
                          <span className="text-sm">
                            {chat.type === 'group' ? 'Leave Group' : 'Delete Chat'}
                          </span>
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {getChatAvatar(activeChat)}
                  {/* Online indicator */}
                  {activeChat.type === 'individual' && (() => {
                    const otherParticipant = activeChat.participants.find(p => p !== currentUser?.uid);
                    const status = getOnlineStatus(otherParticipant!);
                    return (
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                        status.isOnline ? 'bg-green-400' : 'bg-gray-500'
                      }`} />
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">{getChatName(activeChat)}</h3>
                  {activeChat.type === 'group' ? (
                    <p className="text-gray-400 text-sm">{activeChat.participants.length} members</p>
                  ) : (() => {
                    const otherParticipant = activeChat.participants.find(p => p !== currentUser?.uid);
                    const status = getOnlineStatus(otherParticipant!);
                    return (
                      <p className={`text-sm ${status.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                        {status.lastSeen}
                      </p>
                    );
                  })()}
                </div>
              </div>
              
              {/* Group Settings Button */}
              {activeChat.type === 'group' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGroupSettings(true)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Settings size={20} />
                </motion.button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${message.senderId === currentUser.uid ? 'order-2' : 'order-1'}`}>
                    {message.senderId !== currentUser.uid && activeChat.type === 'group' && (
                      <p className="text-gray-400 text-xs mb-1 ml-2">{message.senderName}</p>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.senderId === currentUser.uid
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-800/50 text-gray-100'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === currentUser.uid ? 'text-teal-100' : 'text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-white/10">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <Send size={18} />
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-4 text-gray-400" size={64} />
              <h3 className="text-white text-xl font-semibold mb-2">Select a conversation</h3>
              <p className="text-gray-400">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-xl font-semibold">Create Group Chat</h3>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Group Name</label>
                  <input
                    type="text"
                    placeholder="Enter group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Add Members
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search users to add..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 border border-white/10"
                    />
                  </div>
                  
                  {/* Selected Users */}
                  {selectedUsers.length > 0 && (
                    <div className="mt-3">
                      <div className="text-gray-400 text-xs mb-2">Selected ({selectedUsers.length}):</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map((userId) => {
                          const user = searchResults.find(u => u.id === userId);
                          return user ? (
                            <div key={userId} className="bg-teal-600/20 text-teal-300 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                              <span>{user.displayName}</span>
                              <button
                                onClick={() => setSelectedUsers(prev => prev.filter(id => id !== userId))}
                                className="text-teal-400 hover:text-teal-300"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Search Results for Group Creation */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-gray-800/30 rounded-lg border border-white/10 max-h-32 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            if (!selectedUsers.includes(user.id)) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            }
                          }}
                          disabled={selectedUsers.includes(user.id)}
                          className="w-full p-2 flex items-center space-x-2 text-left hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{user.displayName?.[0] || 'U'}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-white text-xs">{user.displayName}</div>
                            {user.username && (
                              <div className="text-gray-400 text-xs">@{user.username}</div>
                            )}
                          </div>
                          {selectedUsers.includes(user.id) && (
                            <CheckCircle className="text-teal-400" size={14} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCreateGroup(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createGroupChat}
                    disabled={loading}
                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Group'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Settings Modal */}
      <AnimatePresence>
        {showGroupSettings && activeChat?.type === 'group' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-xl font-semibold">Group Settings</h3>
                <button
                  onClick={() => setShowGroupSettings(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Group Name */}
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Group Name</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder={activeChat.name}
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      className="flex-1 bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      disabled={!activeChat.admins?.includes(currentUser!.uid)}
                    />
                    {activeChat.admins?.includes(currentUser!.uid) && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={updateGroupName}
                        disabled={!editingGroupName.trim()}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Members */}
                <div>
                  <h4 className="text-gray-300 text-sm font-medium mb-3">
                    Members ({activeChat.participants.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeChat.participants.map((participantId) => {
                      const participant = activeChat.participantDetails[participantId];
                      const isAdmin = activeChat.admins?.includes(participantId);
                      const isCurrentUser = participantId === currentUser!.uid;
                      const canManage = activeChat.admins?.includes(currentUser!.uid) && !isCurrentUser;
                      const status = getOnlineStatus(participantId);

                      return (
                        <div key={participantId} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                                {participant?.avatar ? (
                                  <img
                                    src={participant.avatar}
                                    alt="Profile"
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  <span className="text-white font-bold text-sm">
                                    {participant?.name?.[0] || 'U'}
                                  </span>
                                )}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                                status.isOnline ? 'bg-green-400' : 'bg-gray-500'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-white text-sm font-medium">
                                  {participant?.name || 'Unknown'}
                                  {isCurrentUser && ' (You)'}
                                </span>
                                {isAdmin && (
                                  <Crown className="text-yellow-400" size={14} />
                                )}
                              </div>
                              <div className="text-gray-400 text-xs">{status.lastSeen}</div>
                            </div>
                          </div>
                          
                          {canManage && (
                            <div className="flex items-center space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleAdmin(participantId)}
                                className={`p-1 rounded transition-colors ${
                                  isAdmin 
                                    ? 'text-yellow-400 hover:text-yellow-300' 
                                    : 'text-gray-400 hover:text-yellow-400'
                                }`}
                                title={isAdmin ? 'Remove admin' : 'Make admin'}
                              >
                                <Shield size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => removeUserFromGroup(participantId)}
                                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                title="Remove from group"
                              >
                                <UserMinus size={16} />
                              </motion.button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      leaveGroup(activeChat.id);
                      setShowGroupSettings(false);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <LogOut size={16} />
                    <span>Leave Group</span>
                  </motion.button>
                  
                  <button
                    onClick={() => setShowGroupSettings(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 w-full max-w-sm"
            >
              <div className="text-center">
                <AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
                <h3 className="text-white text-lg font-semibold mb-2">
                  {chats.find(c => c.id === showDeleteConfirm)?.type === 'group' ? 'Leave Group?' : 'Delete Chat?'}
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  {chats.find(c => c.id === showDeleteConfirm)?.type === 'group' 
                    ? 'You will no longer receive messages from this group.'
                    : 'This action cannot be undone. All messages will be deleted.'
                  }
                </p>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const chat = chats.find(c => c.id === showDeleteConfirm);
                      if (chat?.type === 'group') {
                        leaveGroup(showDeleteConfirm);
                      } else {
                        deleteChat(showDeleteConfirm);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    {chats.find(c => c.id === showDeleteConfirm)?.type === 'group' ? 'Leave' : 'Delete'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Messages;