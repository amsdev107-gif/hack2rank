import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Plus, 
  User, 
  Search,
  Filter,
  TrendingUp,
  Clock,
  Send,
  X
} from 'lucide-react';
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
  where,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  likes: string[];
  comments: Comment[];
  likesCount: number;
  commentsCount: number;
  tags?: string[];
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
}

interface ExploreProps {
  onTabChange: (tab: string) => void;
}

const Explore: React.FC<ExploreProps> = ({ onTabChange }) => {
  const { currentUser, userData } = useAuth();
  const { addNotification } = useNotification();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  // Load posts from Firestore
  useEffect(() => {
    const loadPosts = () => {
      let postsQuery;
      
      if (sortBy === 'recent') {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      } else {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('likesCount', 'desc'),
          limit(20)
        );
      }

      const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
          comments: doc.data().comments || []
        })) as Post[];
        setPosts(postsData);
      });

      return unsubscribe;
    };

    const unsubscribe = loadPosts();
    return () => unsubscribe();
  }, [sortBy]);

  const handleActionRequiringAuth = (action: string) => {
    if (!userData) {
      addNotification({
        type: 'warning',
        title: 'Authentication Required',
        message: `Please sign in to ${action}.`
      });
      const currentUrl = new URL(window.location);
      currentUrl.searchParams.set('redirect', 'explore');
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
      // Extract hashtags from content
      const hashtags = newPostContent.match(/#\w+/g) || [];
      const tags = hashtags.map(tag => tag.substring(1).toLowerCase());

      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorName: userData.displayName,
        authorAvatar: userData.photoURL,
        content: newPostContent.trim(),
        timestamp: new Date(),
        likes: [],
        comments: [],
        likesCount: 0,
        commentsCount: 0,
        tags: tags
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

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() || !currentUser || !userData) {
      return;
    }

    if (!handleActionRequiringAuth('comment on posts')) {
      return;
    }

    setIsCommenting(true);
    try {
      const comment = {
        id: Date.now().toString(),
        authorId: currentUser.uid,
        authorName: userData.displayName,
        authorAvatar: userData.photoURL,
        content: newComment.trim(),
        timestamp: new Date()
      };

      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: arrayUnion(comment),
        commentsCount: increment(1)
      });

      setNewComment('');
      addNotification({
        type: 'success',
        title: 'Comment Added',
        message: 'Your comment has been posted successfully!'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to add comment. Please try again.'
      });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleSharePost = async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.authorName}`,
          text: post.content,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${post.content}\n\n- ${post.authorName} on Hack2rank`);
        addNotification({
          type: 'success',
          title: 'Copied to Clipboard',
          message: 'Post content has been copied to your clipboard!'
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Share Failed',
        message: 'Failed to share post. Please try again.'
      });
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const filteredPosts = posts.filter(post =>
    searchQuery === '' || 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.tags && post.tags.some(tag => tag.includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-4">Explore</h1>
        <p className="text-gray-400">
          Discover and share knowledge with the developer community
        </p>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search posts, users, or hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSortBy('recent')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                sortBy === 'recent'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Clock size={16} />
              <span>Recent</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSortBy('popular')}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                sortBy === 'popular'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <TrendingUp size={16} />
              <span>Popular</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Post Creation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10 mb-6"
      >
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
              placeholder="Share your thoughts, ask questions, or help others... Use #hashtags to categorize your post!"
              className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              rows={4}
              disabled={!userData}
              onClick={() => !userData && handleActionRequiringAuth('create a post')}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-gray-400 text-sm">
                {newPostContent.length}/1000 characters
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
                <span>{isPosting ? 'Posting...' : 'Share Post'}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {filteredPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                {post.authorAvatar ? (
                  <img
                    src={post.authorAvatar}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-white font-bold">
                    {post.authorName[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-white font-medium">{post.authorName}</span>
                  <span className="text-gray-400 text-sm">{formatTimeAgo(post.timestamp)}</span>
                </div>
                <p className="text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>
                
                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="bg-teal-600/20 text-teal-300 px-2 py-1 rounded-full text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
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
                    <Heart size={18} fill={currentUser && post.likes.includes(currentUser.uid) ? 'currentColor' : 'none'} />
                    <span>{post.likesCount || 0}</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                    className="flex items-center space-x-2 text-gray-400 hover:text-teal-400 transition-colors"
                  >
                    <MessageCircle size={18} />
                    <span>{post.commentsCount || 0}</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSharePost(post)}
                    className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Share size={18} />
                    <span>Share</span>
                  </motion.button>
                </div>

                {/* Comments Section */}
                {selectedPost?.id === post.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-700"
                  >
                    {/* Add Comment */}
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {userData?.displayName?.[0] || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                          rows={2}
                          disabled={!userData}
                          onClick={() => !userData && handleActionRequiringAuth('comment on posts')}
                        />
                        <div className="flex justify-end mt-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAddComment(post.id)}
                            disabled={!newComment.trim() || isCommenting || !userData}
                            className="px-4 py-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm flex items-center space-x-1"
                          >
                            {isCommenting ? (
                              <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                            ) : (
                              <Send size={14} />
                            )}
                            <span>{isCommenting ? 'Posting...' : 'Comment'}</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3">
                      {post.comments.map((comment, commentIndex) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: commentIndex * 0.05 }}
                          className="flex items-start space-x-3"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                            {comment.authorAvatar ? (
                              <img
                                src={comment.authorAvatar}
                                alt="Profile"
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="text-white font-bold text-sm">
                                {comment.authorName[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-800/50 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-white font-medium text-sm">{comment.authorName}</span>
                                <span className="text-gray-400 text-xs">{formatTimeAgo(comment.timestamp)}</span>
                              </div>
                              <p className="text-gray-300 text-sm">{comment.content}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {searchQuery ? `No posts found for "${searchQuery}"` : 'No posts yet'}
            </div>
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'Try a different search term' : 'Be the first to share something valuable!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;