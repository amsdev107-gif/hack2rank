import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  CheckCircle, 
  Play, 
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  User,
  Target,
  Award,
  ArrowLeft,
  Search,
  Filter,
  Code,
  FileText,
  AlertCircle,
  Info,
  Quote,
  List,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface LearningModule {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  prerequisites: string[];
  objectives: string[];
  instructor: {
    name: string;
    avatar?: string;
    bio: string;
  };
  sections: LearningSection[];
  tags: string[];
  thumbnail?: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface LearningSection {
  id: string;
  title: string;
  content: ContentBlock[];
  order: number;
}

interface ContentBlock {
  id: string;
  type: 'text' | 'code' | 'keypoints' | 'info' | 'warning' | 'image' | 'quote';
  content: string;
  language?: string;
  caption?: string;
  order: number;
}

interface UserProgress {
  moduleId: string;
  completedSections: string[];
  currentSection: number;
  startedAt: Date;
  lastAccessedAt: Date;
  completed: boolean;
  completedAt?: Date;
}

const Learn: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const { addNotification } = useNotification();
  
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [userProgress, setUserProgress] = useState<{ [moduleId: string]: UserProgress }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBlocks, setCopiedBlocks] = useState<{ [blockId: string]: boolean }>({});
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'All', color: 'bg-gray-600' },
    { id: 'Web Development', name: 'Web Development', color: 'bg-blue-600' },
    { id: 'Algorithms', name: 'Algorithms', color: 'bg-teal-600' },
    { id: 'Data Structures', name: 'Data Structures', color: 'bg-purple-600' },
    { id: 'Machine Learning', name: 'Machine Learning', color: 'bg-green-600' },
    { id: 'Databases', name: 'Databases', color: 'bg-orange-600' },
    { id: 'System Design', name: 'System Design', color: 'bg-red-600' },
    { id: 'Mobile Development', name: 'Mobile Development', color: 'bg-pink-600' },
    { id: 'DevOps', name: 'DevOps', color: 'bg-indigo-600' },
  ];

  // Load published modules
  useEffect(() => {
    const modulesQuery = query(
      collection(db, 'learningModules'),
      where('published', '==', true)
    );

    const unsubscribe = onSnapshot(modulesQuery, (snapshot) => {
      const modulesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as LearningModule[];
      
      // Sort by createdAt in JavaScript instead of Firestore
      modulesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setModules(modulesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user progress
  useEffect(() => {
    if (!currentUser) return;

    const loadUserProgress = async () => {
      try {
        const progressDoc = await getDoc(doc(db, 'userProgress', currentUser.uid));
        if (progressDoc.exists()) {
          setUserProgress(progressDoc.data().modules || {});
        }
      } catch (error) {
        console.error('Error loading user progress:', error);
      }
    };

    loadUserProgress();
  }, [currentUser]);

  const filteredModules = modules.filter(module => {
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgressPercentage = (moduleId: string) => {
    const progress = userProgress[moduleId];
    if (!progress) return 0;
    
    const module = modules.find(m => m.id === moduleId);
    if (!module) return 0;
    
    return Math.round((progress.completedSections.length / module.sections.length) * 100);
  };

  const startModule = async (module: LearningModule) => {
    setSelectedModule(module);
    setCurrentSectionIndex(0);

    if (currentUser) {
      const progress = userProgress[module.id];
      if (progress) {
        setCurrentSectionIndex(progress.currentSection);
      } else {
        // Create new progress entry
        const newProgress: UserProgress = {
          moduleId: module.id,
          completedSections: [],
          currentSection: 0,
          startedAt: new Date(),
          lastAccessedAt: new Date(),
          completed: false
        };

        try {
          await setDoc(doc(db, 'userProgress', currentUser.uid), {
            modules: {
              ...userProgress,
              [module.id]: newProgress
            }
          });
          setUserProgress(prev => ({ ...prev, [module.id]: newProgress }));
        } catch (error) {
          console.error('Error saving progress:', error);
        }
      }
    }
  };

  const markSectionComplete = async (sectionId: string) => {
    if (!currentUser || !selectedModule) return;

    const progress = userProgress[selectedModule.id];
    if (!progress || progress.completedSections.includes(sectionId)) return;

    const updatedProgress = {
      ...progress,
      completedSections: [...progress.completedSections, sectionId],
      lastAccessedAt: new Date()
    };

    // Check if module is completed
    if (updatedProgress.completedSections.length === selectedModule.sections.length) {
      updatedProgress.completed = true;
      updatedProgress.completedAt = new Date();
      
      addNotification({
        type: 'success',
        title: 'Module Completed!',
        message: `Congratulations! You've completed "${selectedModule.title}"`
      });
    }

    try {
      await setDoc(doc(db, 'userProgress', currentUser.uid), {
        modules: {
          ...userProgress,
          [selectedModule.id]: updatedProgress
        }
      });
      setUserProgress(prev => ({ ...prev, [selectedModule.id]: updatedProgress }));
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const navigateSection = (direction: 'prev' | 'next') => {
    if (!selectedModule) return;

    const newIndex = direction === 'next' 
      ? Math.min(currentSectionIndex + 1, selectedModule.sections.length - 1)
      : Math.max(currentSectionIndex - 1, 0);
    
    setCurrentSectionIndex(newIndex);

    // Update current section in progress
    if (currentUser) {
      const progress = userProgress[selectedModule.id];
      if (progress) {
        const updatedProgress = {
          ...progress,
          currentSection: newIndex,
          lastAccessedAt: new Date()
        };

        setDoc(doc(db, 'userProgress', currentUser.uid), {
          modules: {
            ...userProgress,
            [selectedModule.id]: updatedProgress
          }
        });
        setUserProgress(prev => ({ ...prev, [selectedModule.id]: updatedProgress }));
      }
    }
  };

  const copyToClipboard = async (content: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedBlocks(prev => ({ ...prev, [blockId]: true }));
      setTimeout(() => {
        setCopiedBlocks(prev => ({ ...prev, [blockId]: false }));
      }, 2000);
      
      addNotification({
        type: 'success',
        title: 'Copied!',
        message: 'Code copied to clipboard'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy to clipboard'
      });
    }
  };

  const renderContentBlock = (block: ContentBlock) => {
    const baseClasses = "mb-6 rounded-lg";
    
    switch (block.type) {
      case 'text':
        return (
          <div key={block.id} className={`${baseClasses} text-gray-300 leading-relaxed`}>
            <p className="text-lg">{block.content}</p>
          </div>
        );

      case 'code':
        return (
          <div key={block.id} className={`${baseClasses} bg-gray-900 border border-gray-700`}>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-gray-400 text-sm font-mono">{block.language}</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => copyToClipboard(block.content, block.id)}
                className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
              >
                {copiedBlocks[block.id] ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedBlocks[block.id] ? 'Copied!' : 'Copy'}</span>
              </motion.button>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code className="text-gray-300 font-mono text-sm">{block.content}</code>
            </pre>
          </div>
        );

      case 'keypoints':
        return (
          <div key={block.id} className={`${baseClasses} bg-teal-900/20 border border-teal-500/30 p-4`}>
            <div className="flex items-center space-x-2 mb-3">
              <List className="text-teal-400" size={20} />
              <span className="text-teal-300 font-semibold">Key Points</span>
            </div>
            <div className="text-gray-300">
              {block.content.split('\n').map((point, index) => (
                <div key={index} className="flex items-start space-x-2 mb-2">
                  <span className="text-teal-400 mt-1">•</span>
                  <span>{point.replace(/^•\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'info':
        return (
          <div key={block.id} className={`${baseClasses} bg-blue-900/20 border border-blue-500/30 p-4`}>
            <div className="flex items-start space-x-3">
              <Info className="text-blue-400 mt-1 flex-shrink-0" size={20} />
              <div>
                <div className="text-blue-300 font-semibold mb-2">Information</div>
                <div className="text-gray-300">{block.content}</div>
              </div>
            </div>
          </div>
        );

      case 'warning':
        return (
          <div key={block.id} className={`${baseClasses} bg-yellow-900/20 border border-yellow-500/30 p-4`}>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="text-yellow-400 mt-1 flex-shrink-0" size={20} />
              <div>
                <div className="text-yellow-300 font-semibold mb-2">Warning</div>
                <div className="text-gray-300">{block.content}</div>
              </div>
            </div>
          </div>
        );

      case 'quote':
        return (
          <div key={block.id} className={`${baseClasses} bg-gray-800/50 border-l-4 border-purple-500 p-4`}>
            <div className="flex items-start space-x-3">
              <Quote className="text-purple-400 mt-1 flex-shrink-0" size={20} />
              <div className="text-gray-300 italic text-lg">{block.content}</div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div key={block.id} className={`${baseClasses}`}>
            <img 
              src={block.content} 
              alt={block.caption || 'Learning content'} 
              className="w-full rounded-lg"
            />
            {block.caption && (
              <p className="text-gray-400 text-sm mt-2 text-center italic">{block.caption}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderModuleView = () => {
    if (!selectedModule) return null;

    const currentSection = selectedModule.sections[currentSectionIndex];
    const progress = userProgress[selectedModule.id];
    const sectionCompleted = progress?.completedSections.includes(currentSection.id) || false;

    return (
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="w-80 bg-gray-900/60 backdrop-blur-xl border-r border-white/10 flex flex-col"
            >
              {/* Module Header */}
              <div className="p-6 border-b border-white/10">
                <button
                  onClick={() => setSelectedModule(null)}
                  className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Modules</span>
                </button>
                <h2 className="text-white font-bold text-lg mb-2">{selectedModule.title}</h2>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`${getDifficultyColor(selectedModule.difficulty)} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                    {selectedModule.difficulty}
                  </span>
                  <span className="text-gray-400 text-sm">{selectedModule.duration}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-teal-400">{getProgressPercentage(selectedModule.id)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(selectedModule.id)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Table of Contents */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-white font-semibold mb-4">Table of Contents</h3>
                <div className="space-y-2">
                  {selectedModule.sections.map((section, index) => {
                    const isCompleted = progress?.completedSections.includes(section.id) || false;
                    const isCurrent = index === currentSectionIndex;
                    
                    return (
                      <motion.button
                        key={section.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setCurrentSectionIndex(index)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isCurrent 
                            ? 'bg-teal-600/20 border border-teal-500/30 text-teal-300' 
                            : 'bg-gray-800/30 hover:bg-gray-800/50 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCompleted 
                              ? 'bg-green-500 text-white' 
                              : isCurrent 
                                ? 'bg-teal-500 text-white' 
                                : 'bg-gray-600 text-gray-300'
                          }`}>
                            {isCompleted ? <CheckCircle size={14} /> : index + 1}
                          </div>
                          <span className="font-medium">{section.title}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          <div className="bg-gray-900/60 backdrop-blur-xl border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {showSidebar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <div>
                  <h1 className="text-white font-bold text-xl">{currentSection.title}</h1>
                  <p className="text-gray-400 text-sm">
                    Section {currentSectionIndex + 1} of {selectedModule.sections.length}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {!sectionCompleted && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => markSectionComplete(currentSection.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle size={16} />
                    <span>Mark Complete</span>
                  </motion.button>
                )}
                {sectionCompleted && (
                  <div className="flex items-center space-x-2 text-green-400">
                    <CheckCircle size={16} />
                    <span className="text-sm">Completed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              {currentSection.content
                .sort((a, b) => a.order - b.order)
                .map(block => renderContentBlock(block))}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="bg-gray-900/60 backdrop-blur-xl border-t border-white/10 p-6">
            <div className="flex justify-between items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateSection('prev')}
                disabled={currentSectionIndex === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </motion.button>

              <div className="text-gray-400 text-sm">
                {currentSectionIndex + 1} / {selectedModule.sections.length}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigateSection('next')}
                disabled={currentSectionIndex === selectedModule.sections.length - 1}
                className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModulesList = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-4">Learn & Grow</h1>
        <p className="text-gray-400">
          Master new skills with our comprehensive, documentation-style learning modules
        </p>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search modules, topics, or technologies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-0"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === category.id
                      ? `${category.color} text-white`
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {category.name}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modules Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredModules.map((module, index) => {
            const progressPercentage = getProgressPercentage(module.id);
            const isStarted = progressPercentage > 0;
            const isCompleted = userProgress[module.id]?.completed || false;

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-900/50 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/10 hover:border-teal-500/30 transition-all duration-300 cursor-pointer"
                onClick={() => startModule(module)}
              >
                {/* Module Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-2">{module.title}</h3>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{module.description}</p>
                    </div>
                    {isCompleted && (
                      <div className="bg-green-500 text-white p-2 rounded-full">
                        <Award size={16} />
                      </div>
                    )}
                  </div>

                  {/* Module Meta */}
                  <div className="flex items-center space-x-3 mb-4">
                    <span className={`${getDifficultyColor(module.difficulty)} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                      {module.difficulty}
                    </span>
                    <div className="flex items-center text-gray-400 text-sm">
                      <Clock size={14} className="mr-1" />
                      {module.duration}
                    </div>
                    <div className="flex items-center text-gray-400 text-sm">
                      <BookOpen size={14} className="mr-1" />
                      {module.sections.length} sections
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {isStarted && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-teal-400">{progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Prerequisites */}
                  {module.prerequisites.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-gray-300 text-sm font-medium mb-2">Prerequisites:</h4>
                      <div className="flex flex-wrap gap-1">
                        {module.prerequisites.slice(0, 3).map((prereq, index) => (
                          <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                            {prereq}
                          </span>
                        ))}
                        {module.prerequisites.length > 3 && (
                          <span className="text-gray-400 text-xs">+{module.prerequisites.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {module.tags.slice(0, 4).map((tag, index) => (
                      <span key={index} className="bg-teal-600/20 text-teal-300 px-2 py-1 rounded-full text-xs">
                        #{tag}
                      </span>
                    ))}
                    {module.tags.length > 4 && (
                      <span className="text-gray-400 text-xs">+{module.tags.length - 4} more</span>
                    )}
                  </div>

                  {/* Instructor */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                      {module.instructor.avatar ? (
                        <img
                          src={module.instructor.avatar}
                          alt="Instructor"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User size={16} className="text-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{module.instructor.name}</div>
                      <div className="text-gray-400 text-xs">Instructor</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    {isCompleted ? (
                      <>
                        <Award size={18} />
                        <span>Review Module</span>
                      </>
                    ) : isStarted ? (
                      <>
                        <Play size={18} />
                        <span>Continue Learning</span>
                      </>
                    ) : (
                      <>
                        <BookOpen size={18} />
                        <span>Start Learning</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {filteredModules.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-400 text-lg">No modules found</p>
          <p className="text-gray-500 text-sm mt-2">
            {searchQuery ? `Try a different search term` : `No modules available in this category`}
          </p>
        </motion.div>
      )}
    </div>
  );

  return selectedModule ? renderModuleView() : renderModulesList();
};

export default Learn;