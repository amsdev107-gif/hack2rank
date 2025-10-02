import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Users, 
  BookOpen, 
  MessageSquare, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Eye,
  Upload,
  Code,
  FileText,
  AlertCircle,
  Info,
  Quote,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Target,
  User,
  Search,
  Filter,
  Copy,
  ChevronUp,
  ChevronDown,
  List,
  Type,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  onSnapshot,
  where
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
  language?: string; // for code blocks
  caption?: string; // for images
  order: number;
}

interface AdminPanelProps {
  onTabChange: (tab: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onTabChange }) => {
  const { currentUser, userData } = useAuth();
  const { addNotification } = useNotification();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showModuleEditor, setShowModuleEditor] = useState(false);
  const [loading, setLoading] = useState(false);

  // Module editor state
  const [editingModule, setEditingModule] = useState<Partial<LearningModule>>({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    duration: '',
    prerequisites: [],
    objectives: [],
    instructor: {
      name: userData?.displayName || '',
      avatar: userData?.photoURL || '',
      bio: ''
    },
    sections: [],
    tags: [],
    published: false
  });

  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newTag, setNewTag] = useState('');
  const [editingSection, setEditingSection] = useState<LearningSection | null>(null);
  const [showSectionEditor, setShowSectionEditor] = useState(false);

  // Check if user is admin
  const adminEmails = [
    'amanthemaster.279@gmail.com',
    'admin@hack2rank.com',
    'ndgaming458@gmail.com',
    'sciringservices@gmail.com'
  ];
  
  const isAdmin = currentUser?.email && adminEmails.includes(currentUser.email.toLowerCase().trim());

  useEffect(() => {
    if (!isAdmin) {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have admin privileges.'
      });
      onTabChange('home');
      return;
    }

    // Load data
    loadModules();
    loadUsers();
    loadPosts();
  }, [isAdmin, onTabChange, addNotification]);

  const loadModules = () => {
    const modulesQuery = query(collection(db, 'learningModules'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(modulesQuery, (snapshot) => {
      const modulesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as LearningModule[];
      setModules(modulesData);
    });
    return unsubscribe;
  };

  const loadUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const postsQuery = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(postsQuery);
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setPosts(postsData);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const createSampleModules = async () => {
    const sampleModules = [
      {
        title: 'React.js Fundamentals',
        description: 'Master the fundamentals of React.js including components, state management, and modern hooks. Build interactive user interfaces with confidence.',
        category: 'Web Development',
        difficulty: 'beginner' as const,
        duration: '6 hours',
        prerequisites: ['Basic JavaScript', 'HTML/CSS', 'ES6+ Features'],
        objectives: [
          'Understand React components and JSX syntax',
          'Master state management with hooks',
          'Build interactive user interfaces',
          'Handle events and forms effectively',
          'Implement component lifecycle methods'
        ],
        instructor: {
          name: userData?.displayName || 'Admin User',
          avatar: userData?.photoURL || '',
          bio: 'Experienced React developer with 5+ years building production applications'
        },
        sections: [
          {
            id: '1',
            title: 'Introduction to React',
            order: 1,
            content: [
              {
                id: '1-1',
                type: 'text' as const,
                content: 'React is a powerful JavaScript library for building user interfaces, created by Facebook. It has revolutionized frontend development with its component-based architecture and declarative programming style.',
                order: 1
              },
              {
                id: '1-2',
                type: 'keypoints' as const,
                content: '• Component-based architecture for reusable UI elements\n• Virtual DOM for optimal performance\n• Declarative programming style\n• Large ecosystem and active community\n• Backed by Facebook with regular updates',
                order: 2
              },
              {
                id: '1-3',
                type: 'info' as const,
                content: 'React was first released in 2013 and has since become one of the most popular frontend frameworks, powering websites like Facebook, Netflix, and Airbnb.',
                order: 3
              },
              {
                id: '1-4',
                type: 'code' as const,
                content: 'import React from \'react\';\n\nfunction Welcome(props) {\n  return <h1>Hello, {props.name}!</h1>;\n}\n\n// Usage\nfunction App() {\n  return (\n    <div>\n      <Welcome name="World" />\n      <Welcome name="React" />\n    </div>\n  );\n}\n\nexport default App;',
                language: 'jsx',
                order: 4
              }
            ]
          },
          {
            id: '2',
            title: 'Components and JSX',
            order: 2,
            content: [
              {
                id: '2-1',
                type: 'text' as const,
                content: 'JSX is a syntax extension for JavaScript that allows you to write HTML-like code in your React components. It makes your code more readable and expressive.',
                order: 1
              },
              {
                id: '2-2',
                type: 'warning' as const,
                content: 'JSX is not HTML! It compiles to JavaScript function calls. Remember to use className instead of class, and htmlFor instead of for.',
                order: 2
              },
              {
                id: '2-3',
                type: 'code' as const,
                content: '// JSX Example\nconst element = <h1>Hello, world!</h1>;\n\n// This JSX compiles to:\nconst element = React.createElement(\n  \'h1\',\n  null,\n  \'Hello, world!\'\n);\n\n// JSX with expressions\nconst name = \'React\';\nconst greeting = <h1>Hello, {name}!</h1>;',
                language: 'jsx',
                order: 3
              },
              {
                id: '2-4',
                type: 'quote' as const,
                content: 'JSX produces React "elements". We will explore rendering them to the DOM in the next section.',
                order: 4
              }
            ]
          },
          {
            id: '3',
            title: 'State and Props',
            order: 3,
            content: [
              {
                id: '3-1',
                type: 'text' as const,
                content: 'Props and state are the two main ways to manage data in React components. Props are read-only data passed from parent to child, while state is mutable data managed within a component.',
                order: 1
              },
              {
                id: '3-2',
                type: 'code' as const,
                content: 'import React, { useState } from \'react\';\n\nfunction Counter({ initialCount = 0 }) {\n  const [count, setCount] = useState(initialCount);\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        Increment\n      </button>\n      <button onClick={() => setCount(count - 1)}>\n        Decrement\n      </button>\n    </div>\n  );\n}',
                language: 'jsx',
                order: 2
              },
              {
                id: '3-3',
                type: 'keypoints' as const,
                content: '• Props are immutable and passed down from parent components\n• State is mutable and managed within the component\n• Use useState hook for functional components\n• State updates trigger re-renders\n• Always use setState functions to update state',
                order: 3
              }
            ]
          }
        ],
        tags: ['react', 'javascript', 'frontend', 'components', 'jsx', 'hooks'],
        published: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Python Data Structures & Algorithms',
        description: 'Deep dive into essential data structures and algorithms using Python. Perfect for technical interviews and competitive programming.',
        category: 'Algorithms',
        difficulty: 'intermediate' as const,
        duration: '8 hours',
        prerequisites: ['Python Basics', 'Object-Oriented Programming', 'Basic Math'],
        objectives: [
          'Master fundamental data structures',
          'Implement common algorithms',
          'Analyze time and space complexity',
          'Solve coding interview problems',
          'Optimize algorithm performance'
        ],
        instructor: {
          name: userData?.displayName || 'Admin User',
          avatar: userData?.photoURL || '',
          bio: 'Software engineer with expertise in algorithms and data structures, former Google interviewer'
        },
        sections: [
          {
            id: '1',
            title: 'Arrays and Lists',
            order: 1,
            content: [
              {
                id: '1-1',
                type: 'text' as const,
                content: 'Arrays and lists are fundamental data structures that store collections of elements. Understanding their properties and operations is crucial for efficient programming.',
                order: 1
              },
              {
                id: '1-2',
                type: 'code' as const,
                content: '# Python List Operations\nnumbers = [1, 2, 3, 4, 5]\n\n# Access elements\nfirst = numbers[0]  # O(1)\nlast = numbers[-1]  # O(1)\n\n# Add elements\nnumbers.append(6)      # O(1) amortized\nnumbers.insert(0, 0)   # O(n)\n\n# Remove elements\nnumbers.pop()          # O(1)\nnumbers.remove(3)      # O(n)\n\n# Search\nindex = numbers.index(4)  # O(n)\nexists = 4 in numbers     # O(n)',
                language: 'python',
                order: 2
              },
              {
                id: '1-3',
                type: 'keypoints' as const,
                content: '• Arrays provide O(1) random access by index\n• Dynamic arrays (Python lists) can grow and shrink\n• Insertion/deletion at beginning is O(n)\n• Appending is O(1) amortized\n• Searching unsorted arrays is O(n)',
                order: 3
              }
            ]
          },
          {
            id: '2',
            title: 'Binary Trees',
            order: 2,
            content: [
              {
                id: '2-1',
                type: 'text' as const,
                content: 'Binary trees are hierarchical data structures where each node has at most two children. They form the foundation for many advanced data structures.',
                order: 1
              },
              {
                id: '2-2',
                type: 'code' as const,
                content: 'class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef inorder_traversal(root):\n    """Left -> Root -> Right"""\n    if not root:\n        return []\n    \n    result = []\n    result.extend(inorder_traversal(root.left))\n    result.append(root.val)\n    result.extend(inorder_traversal(root.right))\n    return result\n\n# Example usage\nroot = TreeNode(1)\nroot.left = TreeNode(2)\nroot.right = TreeNode(3)\nprint(inorder_traversal(root))  # [2, 1, 3]',
                language: 'python',
                order: 2
              },
              {
                id: '2-3',
                type: 'info' as const,
                content: 'Tree traversals are fundamental operations. Inorder traversal of a BST gives elements in sorted order.',
                order: 3
              }
            ]
          }
        ],
        tags: ['python', 'algorithms', 'data-structures', 'interview-prep', 'coding'],
        published: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    try {
      for (const module of sampleModules) {
        await addDoc(collection(db, 'learningModules'), module);
      }
      addNotification({
        type: 'success',
        title: 'Sample Modules Created',
        message: 'React.js and Python modules have been created successfully.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create sample modules.'
      });
    }
  };

  const saveModule = async () => {
    if (!editingModule.title || !editingModule.description) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Title and description are required.'
      });
      return;
    }

    setLoading(true);
    try {
      const moduleData = {
        ...editingModule,
        instructor: {
          ...editingModule.instructor,
          name: editingModule.instructor?.name || userData?.displayName || 'Admin User',
          avatar: editingModule.instructor?.avatar || userData?.photoURL || ''
        },
        updatedAt: new Date()
      };

      if (isEditing && selectedModule) {
        await updateDoc(doc(db, 'learningModules', selectedModule.id), moduleData);
        addNotification({
          type: 'success',
          title: 'Module Updated',
          message: 'Learning module has been updated successfully.'
        });
      } else {
        await addDoc(collection(db, 'learningModules'), {
          ...moduleData,
          createdAt: new Date()
        });
        addNotification({
          type: 'success',
          title: 'Module Created',
          message: 'Learning module has been created successfully.'
        });
      }

      setShowModuleEditor(false);
      resetEditor();
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save module.'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetEditor = () => {
    setEditingModule({
      title: '',
      description: '',
      category: '',
      difficulty: 'beginner',
      duration: '',
      prerequisites: [],
      objectives: [],
      instructor: {
        name: userData?.displayName || '',
        avatar: userData?.photoURL || '',
        bio: ''
      },
      sections: [],
      tags: [],
      published: false
    });
    setSelectedModule(null);
    setIsEditing(false);
    setNewPrerequisite('');
    setNewObjective('');
    setNewTag('');
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;

    try {
      await deleteDoc(doc(db, 'learningModules', moduleId));
      addNotification({
        type: 'success',
        title: 'Module Deleted',
        message: 'Learning module has been deleted successfully.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete module.'
      });
    }
  };

  const toggleModulePublished = async (moduleId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'learningModules', moduleId), {
        published: !currentStatus,
        updatedAt: new Date()
      });
      addNotification({
        type: 'success',
        title: 'Module Updated',
        message: `Module ${!currentStatus ? 'published' : 'unpublished'} successfully.`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update module status.'
      });
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await deleteDoc(doc(db, 'posts', postId));
      addNotification({
        type: 'success',
        title: 'Post Deleted',
        message: 'Post has been deleted successfully.'
      });
      loadPosts();
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete post.'
      });
    }
  };

  const addPrerequisite = () => {
    if (newPrerequisite.trim()) {
      setEditingModule(prev => ({
        ...prev,
        prerequisites: [...(prev.prerequisites || []), newPrerequisite.trim()]
      }));
      setNewPrerequisite('');
    }
  };

  const removePrerequisite = (index: number) => {
    setEditingModule(prev => ({
      ...prev,
      prerequisites: prev.prerequisites?.filter((_, i) => i !== index) || []
    }));
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setEditingModule(prev => ({
        ...prev,
        objectives: [...(prev.objectives || []), newObjective.trim()]
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setEditingModule(prev => ({
      ...prev,
      objectives: prev.objectives?.filter((_, i) => i !== index) || []
    }));
  };

  const addTag = () => {
    if (newTag.trim()) {
      setEditingModule(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim().toLowerCase()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setEditingModule(prev => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || []
    }));
  };

  const addSection = () => {
    const newSection: LearningSection = {
      id: Date.now().toString(),
      title: 'New Section',
      content: [],
      order: (editingModule.sections?.length || 0) + 1
    };
    
    setEditingModule(prev => ({
      ...prev,
      sections: [...(prev.sections || []), newSection]
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<LearningSection>) => {
    setEditingModule(prev => ({
      ...prev,
      sections: prev.sections?.map(section => 
        section.id === sectionId ? { ...section, ...updates } : section
      ) || []
    }));
  };

  const deleteSection = (sectionId: string) => {
    setEditingModule(prev => ({
      ...prev,
      sections: prev.sections?.filter(section => section.id !== sectionId) || []
    }));
  };

  const addContentBlock = (sectionId: string, type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      order: 1,
      ...(type === 'code' && { language: 'javascript' })
    };

    setEditingModule(prev => ({
      ...prev,
      sections: prev.sections?.map(section => 
        section.id === sectionId 
          ? { 
              ...section, 
              content: [...section.content, newBlock].sort((a, b) => a.order - b.order)
            }
          : section
      ) || []
    }));
  };

  const updateContentBlock = (sectionId: string, blockId: string, updates: Partial<ContentBlock>) => {
    setEditingModule(prev => ({
      ...prev,
      sections: prev.sections?.map(section => 
        section.id === sectionId 
          ? {
              ...section,
              content: section.content.map(block => 
                block.id === blockId ? { ...block, ...updates } : block
              )
            }
          : section
      ) || []
    }));
  };

  const deleteContentBlock = (sectionId: string, blockId: string) => {
    setEditingModule(prev => ({
      ...prev,
      sections: prev.sections?.map(section => 
        section.id === sectionId 
          ? {
              ...section,
              content: section.content.filter(block => block.id !== blockId)
            }
          : section
      ) || []
    }));
  };

  const moveContentBlock = (sectionId: string, blockId: string, direction: 'up' | 'down') => {
    setEditingModule(prev => ({
      ...prev,
      sections: prev.sections?.map(section => {
        if (section.id !== sectionId) return section;
        
        const blocks = [...section.content];
        const blockIndex = blocks.findIndex(b => b.id === blockId);
        
        if (blockIndex === -1) return section;
        
        const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
        if (newIndex < 0 || newIndex >= blocks.length) return section;
        
        [blocks[blockIndex], blocks[newIndex]] = [blocks[newIndex], blocks[blockIndex]];
        
        // Update order values
        blocks.forEach((block, index) => {
          block.order = index + 1;
        });
        
        return { ...section, content: blocks };
      }) || []
    }));
  };

  if (!isAdmin) {
    return null;
  }

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Total Users</p>
            <p className="text-3xl font-bold">{users.length}</p>
          </div>
          <Users size={32} className="text-blue-200" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Learning Modules</p>
            <p className="text-3xl font-bold">{modules.length}</p>
          </div>
          <BookOpen size={32} className="text-green-200" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">Total Posts</p>
            <p className="text-3xl font-bold">{posts.length}</p>
          </div>
          <MessageSquare size={32} className="text-purple-200" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Published Modules</p>
            <p className="text-3xl font-bold">{modules.filter(m => m.published).length}</p>
          </div>
          <Eye size={32} className="text-orange-200" />
        </div>
      </motion.div>
    </div>
  );

  const renderModulesManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Learning Modules</h2>
        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={createSampleModules}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Samples</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              resetEditor();
              setShowModuleEditor(true);
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Module</span>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg mb-2">{module.title}</h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{module.description}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-500 mb-3">
                  <span className="bg-gray-700 px-2 py-1 rounded">{module.category}</span>
                  <span className={`px-2 py-1 rounded ${
                    module.difficulty === 'beginner' ? 'bg-green-600' :
                    module.difficulty === 'intermediate' ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>{module.difficulty}</span>
                  <span className="bg-gray-700 px-2 py-1 rounded">{module.duration}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {module.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="bg-teal-600/20 text-teal-300 px-2 py-1 rounded-full text-xs">
                      #{tag}
                    </span>
                  ))}
                  {module.tags.length > 3 && (
                    <span className="text-gray-400 text-xs">+{module.tags.length - 3} more</span>
                  )}
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${module.published ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedModule(module);
                    setEditingModule(module);
                    setShowModuleEditor(true);
                    setIsEditing(true);
                  }}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Edit size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleModulePublished(module.id, module.published)}
                  className={`p-2 ${module.published ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg transition-colors`}
                >
                  <Eye size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => deleteModule(module.id)}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </motion.button>
              </div>
              <span className="text-gray-400 text-xs">
                {module.sections.length} sections
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderUsersManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Users Management</h2>
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-white font-bold">{user.displayName?.[0] || 'U'}</span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{user.displayName || 'Anonymous'}</div>
                        <div className="text-sm text-gray-400">{user.username || 'No username'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">#{user.rank || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.score || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPostsManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Posts Management</h2>
      <div className="space-y-4">
        {posts.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{post.authorName?.[0] || 'U'}</span>
                  </div>
                  <div>
                    <span className="text-white font-medium">{post.authorName}</span>
                    <span className="text-gray-400 text-sm ml-2">
                      {post.timestamp ? new Date(post.timestamp).toLocaleDateString() : 'Unknown date'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-300 mb-4">{post.content}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>{post.likesCount || 0} likes</span>
                  <span>{post.commentsCount || 0} comments</span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => deletePost(post.id)}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderContentBlockEditor = (sectionId: string, block: ContentBlock) => {
    const getBlockIcon = (type: ContentBlock['type']) => {
      switch (type) {
        case 'text': return <Type size={16} />;
        case 'code': return <Code size={16} />;
        case 'keypoints': return <List size={16} />;
        case 'info': return <Info size={16} />;
        case 'warning': return <AlertTriangle size={16} />;
        case 'image': return <ImageIcon size={16} />;
        case 'quote': return <Quote size={16} />;
        default: return <FileText size={16} />;
      }
    };

    return (
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getBlockIcon(block.type)}
            <span className="text-white font-medium capitalize">{block.type}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => moveContentBlock(sectionId, block.id, 'up')}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => moveContentBlock(sectionId, block.id, 'down')}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={() => deleteContentBlock(sectionId, block.id)}
              className="p-1 text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {block.type === 'code' && (
          <div className="mb-3">
            <label className="block text-gray-300 text-sm mb-1">Language</label>
            <select
              value={block.language || 'javascript'}
              onChange={(e) => updateContentBlock(sectionId, block.id, { language: e.target.value })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="javascript">JavaScript</option>
              <option value="jsx">JSX</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="sql">SQL</option>
              <option value="bash">Bash</option>
            </select>
          </div>
        )}

        <div className="mb-3">
          <label className="block text-gray-300 text-sm mb-1">Content</label>
          <textarea
            value={block.content}
            onChange={(e) => updateContentBlock(sectionId, block.id, { content: e.target.value })}
            placeholder={`Enter ${block.type} content...`}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            rows={block.type === 'code' ? 8 : 4}
          />
        </div>

        {block.type === 'image' && (
          <div>
            <label className="block text-gray-300 text-sm mb-1">Caption (optional)</label>
            <input
              type="text"
              value={block.caption || ''}
              onChange={(e) => updateContentBlock(sectionId, block.id, { caption: e.target.value })}
              placeholder="Image caption..."
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}
      </div>
    );
  };

  const renderModuleEditor = () => (
    <AnimatePresence>
      {showModuleEditor && (
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
            className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-white text-xl font-semibold">
                {isEditing ? 'Edit Module' : 'Create New Module'}
              </h3>
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveModule}
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{loading ? 'Saving...' : 'Save Module'}</span>
                </motion.button>
                <button
                  onClick={() => {
                    setShowModuleEditor(false);
                    resetEditor();
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={editingModule.title || ''}
                    onChange={(e) => setEditingModule(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Module title..."
                    className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
                  <select
                    value={editingModule.category || ''}
                    onChange={(e) => setEditingModule(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-800/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select category...</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Algorithms">Algorithms</option>
                    <option value="Data Structures">Data Structures</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Databases">Databases</option>
                    <option value="System Design">System Design</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="DevOps">DevOps</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={editingModule.description || ''}
                  onChange={(e) => setEditingModule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Module description..."
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={editingModule.difficulty || 'beginner'}
                    onChange={(e) => setEditingModule(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full bg-gray-800/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Duration</label>
                  <input
                    type="text"
                    value={editingModule.duration || ''}
                    onChange={(e) => setEditingModule(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 4 hours"
                    className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={editingModule.published || false}
                      onChange={(e) => setEditingModule(prev => ({ ...prev, published: e.target.checked }))}
                      className="rounded bg-gray-800 border-gray-600 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Published</span>
                  </label>
                </div>
              </div>

              {/* Prerequisites */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Prerequisites</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newPrerequisite}
                    onChange={(e) => setNewPrerequisite(e.target.value)}
                    placeholder="Add prerequisite..."
                    className="flex-1 bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    onKeyPress={(e) => e.key === 'Enter' && addPrerequisite()}
                  />
                  <button
                    onClick={addPrerequisite}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingModule.prerequisites?.map((prereq, index) => (
                    <span
                      key={index}
                      className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                    >
                      <span>{prereq}</span>
                      <button
                        onClick={() => removePrerequisite(index)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Learning Objectives */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Learning Objectives</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="Add learning objective..."
                    className="flex-1 bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    onKeyPress={(e) => e.key === 'Enter' && addObjective()}
                  />
                  <button
                    onClick={addObjective}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  {editingModule.objectives?.map((objective, index) => (
                    <div
                      key={index}
                      className="bg-gray-700/50 text-gray-300 px-3 py-2 rounded-lg flex items-center justify-between"
                    >
                      <span>{objective}</span>
                      <button
                        onClick={() => removeObjective(index)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Tags</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="flex-1 bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingModule.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-teal-600/20 text-teal-300 px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                    >
                      <span>#{tag}</span>
                      <button
                        onClick={() => removeTag(index)}
                        className="text-teal-400 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Instructor Bio */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Instructor Bio</label>
                <textarea
                  value={editingModule.instructor?.bio || ''}
                  onChange={(e) => setEditingModule(prev => ({
                    ...prev,
                    instructor: { ...prev.instructor!, bio: e.target.value }
                  }))}
                  placeholder="Brief bio about the instructor..."
                  className="w-full bg-gray-800/50 text-white placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-gray-300 text-sm font-medium">Sections</label>
                  <button
                    onClick={addSection}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Add Section</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {editingModule.sections?.map((section, sectionIndex) => (
                    <div key={section.id} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          placeholder="Section title..."
                          className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 mr-4"
                        />
                        <button
                          onClick={() => deleteSection(section.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Content Blocks */}
                      <div className="space-y-3 mb-4">
                        {section.content.map((block) => renderContentBlockEditor(section.id, block))}
                      </div>

                      {/* Add Content Block */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => addContentBlock(section.id, 'text')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Type size={14} />
                          <span>Text</span>
                        </button>
                        <button
                          onClick={() => addContentBlock(section.id, 'code')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Code size={14} />
                          <span>Code</span>
                        </button>
                        <button
                          onClick={() => addContentBlock(section.id, 'keypoints')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <List size={14} />
                          <span>Key Points</span>
                        </button>
                        <button
                          onClick={() => addContentBlock(section.id, 'info')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Info size={14} />
                          <span>Info</span>
                        </button>
                        <button
                          onClick={() => addContentBlock(section.id, 'warning')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <AlertTriangle size={14} />
                          <span>Warning</span>
                        </button>
                        <button
                          onClick={() => addContentBlock(section.id, 'quote')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Quote size={14} />
                          <span>Quote</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'modules', label: 'Learning Modules', icon: BookOpen },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'posts', label: 'Posts', icon: MessageSquare },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-4">Admin Panel</h1>
        <p className="text-gray-400">Manage your platform content and users</p>
      </motion.div>

      {/* Admin Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-6 border border-white/10 mb-8"
      >
        <div className="flex flex-wrap gap-3">
          {adminTabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'modules' && renderModulesManagement()}
        {activeTab === 'users' && renderUsersManagement()}
        {activeTab === 'posts' && renderPostsManagement()}
      </motion.div>

      {/* Module Editor Modal */}
      {renderModuleEditor()}
    </div>
  );
};

export default AdminPanel;