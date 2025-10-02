import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Edit, 
  MapPin, 
  Calendar, 
  Mail, 
  Phone, 
  Globe, 
  Github, 
  Linkedin, 
  Twitter,
  Save,
  X,
  Trophy,
  Star,
  Code,
  Users,
  Plus,
  Award,
  TrendingUp,
  BookOpen,
  Target,
  CheckCircle,
  ExternalLink,
  BarChart3,
  Zap,
  User,
  LogOut,
  Upload,
  FileText,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { doc, updateDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

interface ProfileProps {
  onTabChange?: (tab: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ onTabChange }) => {
  const { currentUser, userData, logout } = useAuth();
  const { addNotification } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [profileData, setProfileData] = useState({
    displayName: userData?.displayName || '',
    username: userData?.username || '',
    bio: userData?.bio || 'Passionate developer solving complex problems and building innovative solutions.',
    location: userData?.location || '',
    website: userData?.website || '',
    phone: userData?.phone || '',
    github: userData?.github || '',
    linkedin: userData?.linkedin || '',
    twitter: userData?.twitter || '',
    skills: userData?.skills || ['JavaScript', 'React', 'Node.js', 'Python', 'TypeScript'],
    interests: userData?.interests || ['Web Development', 'Machine Learning', 'System Design'],
    experience: userData?.experience || 'Senior Software Engineer',
    education: userData?.education || 'Computer Science Graduate',
    company: userData?.company || 'Tech Corporation',
    jobTitle: userData?.jobTitle || 'Full Stack Developer',
    bannerURL: userData?.bannerURL || '',
    resumeURL: userData?.resumeURL || '',
    portfolioURL: userData?.portfolioURL || ''
  });

  const certificates = [
    { id: 1, name: 'Algorithm Master', issuer: 'Hack2rank Arena', date: '2024-01-15', verified: true },
    { id: 2, name: 'React Expert', issuer: 'Hack2rank Learn', date: '2024-02-20', verified: true },
    { id: 3, name: 'System Design Pro', issuer: 'Hack2rank Arena', date: '2024-03-10', verified: false }
  ];

  const achievements = [
    { title: 'Top 1% Coder', description: 'Ranked in top 1% globally', icon: Trophy, color: 'from-yellow-400 to-orange-500' },
    { title: 'Problem Solver', description: 'Solved 500+ problems', icon: Code, color: 'from-blue-400 to-purple-500' },
    { title: 'Arena Champion', description: 'Won 10 coding contests', icon: Award, color: 'from-green-400 to-teal-500' },
    { title: 'Mentor', description: 'Helped 100+ developers', icon: Users, color: 'from-pink-400 to-red-500' }
  ];

  const skillCategories = {
    'Programming Languages': ['JavaScript', 'Python', 'Java', 'C++', 'TypeScript'],
    'Frameworks & Libraries': ['React', 'Node.js', 'Express', 'Django', 'Next.js'],
    'Databases': ['MongoDB', 'PostgreSQL', 'Redis', 'MySQL'],
    'Tools & Technologies': ['Git', 'Docker', 'AWS', 'Kubernetes', 'GraphQL']
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === userData?.username) return true;
    
    setCheckingUsername(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const uploadToCloudinary = async (file: File, preset: string = 'ml_default'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);

    try {
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dc4wxnekv/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Upload failed');
      }
      
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to upload image');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(file, 'profile_pictures');
      
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { photoURL: imageUrl });

      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile picture has been updated successfully.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to update profile picture. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingBanner(true);
    try {
      const bannerUrl = await uploadToCloudinary(file, 'ml_default');
      
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { bannerURL: bannerUrl });

      setProfileData({ ...profileData, bannerURL: bannerUrl });
      addNotification({
        type: 'success',
        title: 'Banner Updated',
        message: 'Your profile banner has been updated successfully.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to update banner. Please try again.'
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    if (profileData.username !== userData?.username) {
      const isAvailable = await checkUsernameAvailability(profileData.username);
      if (!isAvailable) {
        addNotification({
          type: 'error',
          title: 'Username Taken',
          message: 'This username is already taken. Please choose another one.'
        });
        return;
      }
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...profileData,
        updatedAt: new Date().toISOString()
      });

      setIsEditing(false);
      addNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update profile. Please try again.'
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onTabChange?.('home');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Logout Failed',
        message: 'Failed to logout. Please try again.'
      });
    }
  };

  const stats = [
    { label: 'Global Rank', value: `#${userData?.rank || '00000'}`, icon: Trophy, color: 'from-yellow-400 to-orange-500' },
    { label: 'Total Score', value: userData?.score || '0000', icon: Star, color: 'from-purple-400 to-pink-500' },
    { label: 'Problems Solved', value: userData?.problemsSolved || '247', icon: Code, color: 'from-blue-400 to-cyan-500' },
    { label: 'Followers', value: userData?.followers || '1.2K', icon: Users, color: 'from-green-400 to-teal-500' }
  ];

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'skills', label: 'Skills', icon: Code },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'resume', label: 'Resume & Portfolio', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden"
      >
        {/* Editable Cover Photo */}
        <div className="relative h-56 overflow-hidden group">
          {profileData.bannerURL ? (
            <img
              src={profileData.bannerURL}
              alt="Profile Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="h-full bg-gradient-to-br from-teal-500 via-purple-600 to-pink-600"></div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          
          {currentUser && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-50"
            >
              {uploadingBanner ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Upload size={18} />
              )}
            </motion.button>
          )}
          
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
        </div>

        {/* Profile Content */}
        <div className="relative px-8 pb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-8 -mt-20">
            {/* Profile Picture */}
            <div className="relative group">
              <div className="w-40 h-40 bg-gradient-to-br from-purple-400 via-pink-500 to-teal-400 rounded-full border-4 border-white/20 flex items-center justify-center overflow-hidden">
                {userData?.photoURL ? (
                  <img
                    src={userData.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-5xl">
                    {profileData.displayName?.[0] || 'U'}
                  </span>
                )}
              </div>
              
              {currentUser && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-4 right-4 bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-full transition-all duration-300 border border-white/20 disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Camera size={18} />
                  )}
                </motion.button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 mt-6 lg:mt-0">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-white text-4xl font-bold">
                      {profileData.displayName}
                    </h1>
                    {userData?.verified && (
                      <CheckCircle className="text-teal-400" size={24} />
                    )}
                  </div>
                  
                  {profileData.username && (
                    <p className="text-teal-400 text-lg font-medium">@{profileData.username}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-gray-300">
                    <span className="flex items-center space-x-1">
                      <MapPin size={16} className="text-gray-400" />
                      <span>{profileData.location || 'Location not set'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar size={16} className="text-gray-400" />
                      <span>Joined {new Date(userData?.createdAt || new Date()).toLocaleDateString()}</span>
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-lg">{profileData.jobTitle} at {profileData.company}</p>
                </div>

                {currentUser && (
                  <div className="flex space-x-3 mt-4 lg:mt-0">
                    {isEditing ? (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveProfile}
                          disabled={checkingUsername}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 border border-white/20 disabled:opacity-50"
                        >
                          <Save size={18} />
                          <span>{checkingUsername ? 'Checking...' : 'Save Changes'}</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsEditing(false)}
                          className="bg-gray-700/80 hover:bg-gray-600/80 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 border border-white/20"
                        >
                          <X size={18} />
                          <span>Cancel</span>
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsEditing(true)}
                          className="bg-gray-700/80 hover:bg-gray-600/80 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 border border-white/20"
                        >
                          <Edit size={18} />
                          <span>Edit Profile</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleLogout}
                          className="bg-red-600/80 hover:bg-red-700/80 text-white px-6 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 border border-white/20"
                        >
                          <LogOut size={18} />
                          <span>Logout</span>
                        </motion.button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group"
                  >
                    <div className="bg-gray-800/60 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/10 hover:border-white/20 transition-all duration-300">
                      <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl mx-auto mb-3 flex items-center justify-center`}>
                        <stat.icon className="text-white" size={24} />
                      </div>
                      <div className="text-white font-bold text-xl mb-1">{stat.value}</div>
                      <div className="text-gray-400 text-sm">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-2"
      >
        <div className="flex space-x-2">
          {tabItems.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* About Section */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-white text-xl font-semibold mb-4 flex items-center">
                <User className="mr-2 text-teal-400" size={20} />
                About Me
              </h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Display Name</label>
                    <input
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 border border-white/10"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Username (one-time selection)</label>
                    <input
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 border border-white/10"
                      placeholder="Choose a unique username"
                      disabled={!!userData?.username}
                    />
                    {userData?.username && (
                      <p className="text-yellow-400 text-xs mt-1">Username can only be set once</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 border border-white/10"
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Location</label>
                    <input
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 border border-white/10"
                      placeholder="Your location"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Website</label>
                    <input
                      value={profileData.website}
                      onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-500 border border-white/10"
                      placeholder="Your website"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-gray-300 leading-relaxed">{profileData.bio}</p>
              )}

              <div className="mt-6 space-y-3">
                <div className="flex items-center space-x-3 text-gray-300">
                  <Mail size={16} className="text-gray-400" />
                  <span>{userData?.email}</span>
                </div>
                {profileData.location && (
                  <div className="flex items-center space-x-3 text-gray-300">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{profileData.location}</span>
                  </div>
                )}
                {profileData.website && (
                  <div className="flex items-center space-x-3 text-gray-300">
                    <Globe size={16} className="text-gray-400" />
                    <a href={profileData.website} className="text-teal-400 hover:underline flex items-center space-x-1">
                      <span>{profileData.website}</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-white text-xl font-semibold mb-4 flex items-center">
                <Trophy className="mr-2 text-yellow-400" size={20} />
                Achievements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-800/50 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className={`w-10 h-10 bg-gradient-to-r ${achievement.color} rounded-lg mb-3 flex items-center justify-center`}>
                      <achievement.icon className="text-white" size={20} />
                    </div>
                    <h4 className="text-white font-medium text-sm mb-1">{achievement.title}</h4>
                    <p className="text-gray-400 text-xs">{achievement.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-6">
            {/* Skills Section */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-xl font-semibold flex items-center">
                  <Code className="mr-2 text-teal-400" size={20} />
                  Technical Skills
                </h3>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onTabChange?.('learn')}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 text-sm"
                >
                  <Plus size={16} />
                  <span>Acquire More Skills</span>
                </motion.button>
              </div>

              {Object.entries(skillCategories).map(([category, skills]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-gray-300 font-medium mb-3">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-teal-600/20 text-teal-300 px-3 py-2 rounded-full text-sm border border-teal-500/30 hover:border-teal-400/50 transition-all duration-300"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Interests Section */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-white text-xl font-semibold mb-4 flex items-center">
                <Target className="mr-2 text-purple-400" size={20} />
                Interests
              </h3>
              {isEditing ? (
                <div className="space-y-2">
                  {profileData.interests.map((interest, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        value={interest}
                        onChange={(e) => {
                          const newInterests = [...profileData.interests];
                          newInterests[index] = e.target.value;
                          setProfileData({ ...profileData, interests: newInterests });
                        }}
                        className="flex-1 bg-gray-800/50 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-white/10"
                      />
                      <button
                        onClick={() => {
                          const newInterests = profileData.interests.filter((_, i) => i !== index);
                          setProfileData({ ...profileData, interests: newInterests });
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setProfileData({ ...profileData, interests: [...profileData.interests, ''] })}
                    className="text-purple-400 hover:text-purple-300 flex items-center space-x-1 text-sm"
                  >
                    <Plus size={16} />
                    <span>Add Interest</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profileData.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="bg-purple-600/20 text-purple-300 px-3 py-2 rounded-full text-sm border border-purple-500/30"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-semibold flex items-center">
                <Award className="mr-2 text-yellow-400" size={20} />
                Certificates & Achievements
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTabChange?.('arena')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 text-sm"
              >
                <Zap size={16} />
                <span>Earn More Certificates</span>
              </motion.button>
            </div>

            <div className="space-y-4">
              {certificates.map((cert) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-800/50 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                        <Award className="text-white" size={24} />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{cert.name}</h4>
                        <p className="text-gray-400 text-sm">{cert.issuer}</p>
                        <p className="text-gray-500 text-xs">{new Date(cert.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {cert.verified && (
                        <CheckCircle className="text-green-400" size={20} />
                      )}
                      <ExternalLink className="text-gray-400 hover:text-white cursor-pointer" size={16} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="space-y-6">
            {/* Resume Section */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-white text-xl font-semibold mb-4 flex items-center">
                <FileText className="mr-2 text-blue-400" size={20} />
                Resume
              </h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Resume URL</label>
                    <input
                      value={profileData.resumeURL}
                      onChange={(e) => setProfileData({ ...profileData, resumeURL: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                      placeholder="Link to your resume (Google Drive, Dropbox, etc.)"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Job Title</label>
                    <input
                      value={profileData.jobTitle}
                      onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                      placeholder="Your current job title"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Company</label>
                    <input
                      value={profileData.company}
                      onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                      placeholder="Your current company"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Experience</label>
                    <textarea
                      value={profileData.experience}
                      onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                      rows={3}
                      placeholder="Brief description of your experience"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Education</label>
                    <input
                      value={profileData.education}
                      onChange={(e) => setProfileData({ ...profileData, education: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                      placeholder="Your educational background"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {profileData.resumeURL ? (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="text-blue-400" size={24} />
                          <div>
                            <h4 className="text-white font-medium">Resume</h4>
                            <p className="text-gray-400 text-sm">Click to view or download</p>
                          </div>
                        </div>
                        <a
                          href={profileData.resumeURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <ExternalLink size={16} />
                          <span>View Resume</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-400">No resume uploaded yet</p>
                      <p className="text-gray-500 text-sm mt-2">Add your resume URL to showcase your experience</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-medium mb-2">Current Position</h4>
                      <p className="text-gray-300">{profileData.jobTitle}</p>
                      <p className="text-gray-400 text-sm">{profileData.company}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                      <h4 className="text-white font-medium mb-2">Education</h4>
                      <p className="text-gray-300">{profileData.education}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-medium mb-2">Experience</h4>
                    <p className="text-gray-300">{profileData.experience}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Portfolio Section */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-white text-xl font-semibold mb-4 flex items-center">
                <Briefcase className="mr-2 text-green-400" size={20} />
                Portfolio
              </h3>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Portfolio URL</label>
                    <input
                      value={profileData.portfolioURL}
                      onChange={(e) => setProfileData({ ...profileData, portfolioURL: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-white/10"
                      placeholder="Link to your portfolio website"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">GitHub Profile</label>
                    <input
                      value={profileData.github}
                      onChange={(e) => setProfileData({ ...profileData, github: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-white/10"
                      placeholder="Your GitHub username or profile URL"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">LinkedIn Profile</label>
                    <input
                      value={profileData.linkedin}
                      onChange={(e) => setProfileData({ ...profileData, linkedin: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-white/10"
                      placeholder="Your LinkedIn profile URL"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Twitter Profile</label>
                    <input
                      value={profileData.twitter}
                      onChange={(e) => setProfileData({ ...profileData, twitter: e.target.value })}
                      className="w-full bg-gray-800/50 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-white/10"
                      placeholder="Your Twitter handle or profile URL"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {profileData.portfolioURL ? (
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Briefcase className="text-green-400" size={24} />
                          <div>
                            <h4 className="text-white font-medium">Portfolio Website</h4>
                            <p className="text-gray-400 text-sm">View my work and projects</p>
                          </div>
                        </div>
                        <a
                          href={profileData.portfolioURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <ExternalLink size={16} />
                          <span>View Portfolio</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-400">No portfolio added yet</p>
                      <p className="text-gray-500 text-sm mt-2">Add your portfolio URL to showcase your projects</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {profileData.github && (
                      <a
                        href={profileData.github.startsWith('http') ? profileData.github : `https://github.com/${profileData.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-800/50 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all flex items-center space-x-3"
                      >
                        <Github className="text-gray-300" size={24} />
                        <div>
                          <h4 className="text-white font-medium">GitHub</h4>
                          <p className="text-gray-400 text-sm">View repositories</p>
                        </div>
                      </a>
                    )}
                    
                    {profileData.linkedin && (
                      <a
                        href={profileData.linkedin.startsWith('http') ? profileData.linkedin : `https://linkedin.com/in/${profileData.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-800/50 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all flex items-center space-x-3"
                      >
                        <Linkedin className="text-blue-400" size={24} />
                        <div>
                          <h4 className="text-white font-medium">LinkedIn</h4>
                          <p className="text-gray-400 text-sm">Professional profile</p>
                        </div>
                      </a>
                    )}
                    
                    {profileData.twitter && (
                      <a
                        href={profileData.twitter.startsWith('http') ? profileData.twitter : `https://twitter.com/${profileData.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-800/50 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all flex items-center space-x-3"
                      >
                        <Twitter className="text-blue-400" size={24} />
                        <div>
                          <h4 className="text-white font-medium">Twitter</h4>
                          <p className="text-gray-400 text-sm">Follow updates</p>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Performance Analytics */}
            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-white text-xl font-semibold mb-6 flex items-center">
                <BarChart3 className="mr-2 text-blue-400" size={20} />
                Performance Analytics
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-gray-300 font-medium">Problem Solving</h4>
                    <TrendingUp className="text-green-400" size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">85%</div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-400 to-teal-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-gray-300 font-medium">Contest Rating</h4>
                    <Star className="text-yellow-400" size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">1847</div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-gray-300 font-medium">Learning Progress</h4>
                    <BookOpen className="text-purple-400" size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">92%</div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h4 className="text-white font-semibold mb-4">Recent Activity</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                    <span className="text-gray-300">Problems Solved Today</span>
                    <span className="text-teal-400 font-medium">12</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                    <span className="text-gray-300">Contest Participations</span>
                    <span className="text-purple-400 font-medium">23</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                    <span className="text-gray-300">Learning Hours</span>
                    <span className="text-blue-400 font-medium">156h</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-300">Streak Days</span>
                    <span className="text-green-400 font-medium">45</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h4 className="text-white font-semibold mb-4">Skill Distribution</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 text-sm">Algorithms</span>
                      <span className="text-gray-400 text-sm">90%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-teal-400 to-blue-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 text-sm">Data Structures</span>
                      <span className="text-gray-400 text-sm">85%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 text-sm">System Design</span>
                      <span className="text-gray-400 text-sm">75%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-green-400 to-teal-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Profile;