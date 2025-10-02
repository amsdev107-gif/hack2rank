export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  skills?: string[];
  interests?: string[];
  experience?: string;
  education?: string;
  company?: string;
  jobTitle?: string;
  bannerURL?: string;
  resumeURL?: string;
  portfolioURL?: string;
  rank?: number;
  score?: number;
  problemsSolved?: number;
  followers?: number;
  following?: number;
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  chatId: string;
  content: string;
  timestamp: Date;
  read?: boolean;
  type: 'text' | 'image' | 'file';
  senderName: string;
  senderAvatar?: string;
}

export interface Chat {
  id: string;
  type: 'individual' | 'group';
  participants: string[];
  participantDetails: { [userId: string]: { name: string; avatar?: string } };
  admins?: string[]; // For group chats
  createdBy?: string; // Who created the group
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: string;
    senderName: string;
  };
  name?: string; // For group chats
  createdAt: Date;
  updatedAt: Date;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  tags: string[];
  submissions: number;
  successRate: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  thumbnail?: string;
  enrolled: number;
}