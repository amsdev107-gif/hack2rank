import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Trophy, Star, Plus, User, Heart, MessageCircle, Share } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment,
  arrayUnion,
  arrayRemove,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface DashboardProps {
  onTabChange: (tab: string) => void;
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  likes: string[];
  comments: string[];
  likesCount: number;
  commentsCount: number;
}

interface LeaderboardUser {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
  problemsSolved: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onTabChange }) => {
  const { currentUser, userData } = useAuth();
  const { addNotification } = useNotification();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

  // Load posts from Firestore
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Post[];
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, []);

  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('score', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(usersQuery);
        const leaderboardData = snapshot.docs.map((doc, index) => ({
          id: doc.id,
          name: doc.data().displayName || 'Anonymous',
          score: doc.data().score || 0,
          rank: index + 1,
          avatar: doc.data().photoURL,
          problemsSolved: doc.data().problemsSolved || 0
        })) as LeaderboardUser[];
        
        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      }
    };

    loadLeaderboard();
  }, []);

  const handleActionRequiringAuth = (action: string) => {
    if (!userData) {
      addNotification({
        type: 'warning',
        title: 'Authentication Required',
        message: `Please sign in to ${action}.`
      });
      const currentUrl = new URL(window.location);
      currentUrl.searchParams.set('redirect', 'home');
      window.history.replaceState({}, '', currentUrl);
      onTabChange('auth');
      return false;
    }
    return true;
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !currentUser || !userData) {
      return;
    }

    if (!handleActionRequiringAuth('create a post')) {
      return;
    }

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorName: userData.displayName,
        authorAvatar: userData.photoURL,
        content: newPostContent.trim(),
        timestamp: new Date(),
        likes: [],
        comments: [],
        likesCount: 0,
        commentsCount: 0
      });

      setNewPostContent('');
      addNotification({
        type: 'success',
        title: 'Post Created',
        message: 'Your post has been shared successfully!'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create post. Please try again.'
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId: string, currentLikes: string[]) => {
    if (!currentUser || !handleActionRequiringAuth('like posts')) {
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      const isLiked = currentLikes.includes(currentUser.uid);

      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid),
          likesCount: increment(-1)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
          likesCount: increment(1)
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update like. Please try again.'
      });
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const newsItems = [
    {
      id: 1,
      title: 'New Algorithm Challenge Released',
      description: 'Test your skills with our latest graph algorithms challenge',
      image: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop'
    },
    {
      id: 2,
      title: 'Weekly Coding Contest',
      description: 'Join thousands of developers in our weekly programming contest',
      image: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
      {/* User Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
      >
        <div className="flex flex-col items-center text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => userData ? onTabChange('profile') : handleActionRequiringAuth('view profile')}
            className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mb-4 transition-all duration-300"
          >
            {userData?.photoURL ? (
              <img
                src={userData.photoURL}
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-white font-bold text-2xl">
                {userData?.displayName?.[0] || <User size={24} />}
              </span>
            )}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => userData ? onTabChange('profile') : handleActionRequiringAuth('view profile')}
            className="text-white font-semibold text-lg mb-2 hover:text-teal-400 transition-all duration-300"
          >
            {userData?.displayName || 'Guest User'}
          </motion.button>
          
          {userData && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => onTabChange('profile')}
              className="text-teal-400 text-sm hover:underline mb-4 transition-all duration-300"
            >
              View Profile
            </motion.button>
          )}
          
          <div className="w-full space-y-4 mt-6">
            <h4 className="text-white font-medium mb-3">My Stats</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-teal-400 text-2xl font-bold">#{userData?.rank || '00000'}</div>
                <div className="text-gray-400 text-sm">Global Rank</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 text-2xl font-bold">{userData?.score || '0000'}</div>
                <div className="text-gray-400 text-sm">Total Score</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-blue-400 text-xl font-bold">{userData?.problemsSolved || '247'}</div>
                <div className="text-gray-400 text-sm">Problems Solved</div>
              </div>
              <div className="text-center">
                <div className="text-green-400 text-xl font-bold">85%</div>
                <div className="text-gray-400 text-sm">Learning Progress</div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Skills Mastered</span>
                <span className="text-yellow-400 font-bold">12/20</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Certificates Earned</span>
                <span className="text-green-400 font-bold">8</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Contest Wins</span>
                <span className="text-red-400 font-bold">3</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-2 space-y-6"
      >
        {/* Post Creation */}
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">
                {userData?.displayName?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Write something valuable..."
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                rows={3}
                disabled={!userData}
                onClick={() => !userData && handleActionRequiringAuth('create a post')}
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-gray-400 text-sm">
                  {newPostContent.length}/500 characters
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isPosting || !userData}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 flex items-center space-x-2"
                >
                  {isPosting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>{isPosting ? 'Posting...' : 'Post'}</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4 mb-6">
          {posts.slice(0, 6).map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                  {post.authorAvatar ? (
                    <img
                      src={post.authorAvatar}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {post.authorName[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-white font-medium">{post.authorName}</span>
                    <span className="text-gray-400 text-sm">{formatTimeAgo(post.timestamp)}</span>
                  </div>
                  <p className="text-gray-300 mb-4">{post.content}</p>
                  <div className="flex items-center space-x-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleLikePost(post.id, post.likes)}
                      className={`flex items-center space-x-2 transition-colors ${
                        currentUser && post.likes.includes(currentUser.uid)
                          ? 'text-red-400'
                          : 'text-gray-400 hover:text-red-400'
                      }`}
                    >
                      <Heart size={16} fill={currentUser && post.likes.includes(currentUser.uid) ? 'currentColor' : 'none'} />
                      <span>{post.likesCount || 0}</span>
                    </motion.button>
                    <button className="flex items-center space-x-2 text-gray-400 hover:text-teal-400 transition-colors">
                      <MessageCircle size={16} />
                      <span>{post.commentsCount || 0}</span>
                    </button>
                    <button className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors">
                      <Share size={16} />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {posts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">No posts yet</div>
              <p className="text-gray-500 text-sm">Be the first to share something valuable!</p>
            </div>
          )}
          
          {posts.length > 6 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTabChange('explore')}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all duration-300 flex items-center space-x-2 mx-auto"
              >
                <span>View All Posts</span>
                <span className="text-teal-200">({posts.length - 6} more)</span>
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Right Sidebar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        {/* Leaderboard */}
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg flex items-center">
              <Trophy className="mr-2 text-yellow-400" size={20} />
              Leaderboard
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
              className="text-teal-400 text-sm hover:underline"
            >
              {showAllLeaderboard ? 'Show Less' : 'View All'}
            </motion.button>
          </div>
          <div className="space-y-3">
            {(showAllLeaderboard ? leaderboard : leaderboard.slice(0, 6)).map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {user.rank}
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-white font-bold text-xs">
                        {user.name[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-300 text-sm font-medium">{user.name}</span>
                    <div className="text-gray-500 text-xs">
                      Rank #{user.rank}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono text-sm">{user.score.toLocaleString()}</div>
                  <div className="text-gray-400 text-xs">points</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* What's Going On */}
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold text-lg mb-4">What's Going On</h3>
          <div className="space-y-4">
            {newsItems.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-800/50 rounded-lg p-4 cursor-pointer transition-all"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-24 object-cover rounded-lg mb-3"
                />
                <h4 className="text-white font-medium text-sm mb-2">{item.title}</h4>
                <p className="text-gray-400 text-xs">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;