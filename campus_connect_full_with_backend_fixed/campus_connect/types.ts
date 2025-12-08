
export enum Role {
  ADMIN = 'Admin',
  PROFESSOR = 'Professor',
  STUDENT = 'Student',
  MENTOR = 'Mentor',
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: Role;
  isActive: boolean;
  avatar: string;
  department?: string;
  studentId?: string;
}

export interface Comment {
  id: number;
  user: User;
  text: string;
  timestamp: string;
}

export interface Post {
  id: number;
  author: User;
  title: string;
  image: string; // URL or Base64 data
  description: string;
  fromDate?: string; // Optional
  toDate?: string;   // Optional
  venue?: string;    // Optional
  likes: number[]; // array of user IDs
  comments: Comment[];
  savedBy: number[]; // array of user IDs
  groupId?: number; // Group association for backend sync
  timestamp?: string; // Optional timestamp from backend
}

export interface StudyMaterial {
  id: number;
  uploader: User;
  title: string;
  subject: string;
  fileName: string;
  fileType: 'PDF' | 'DOC' | 'DOCX';
  description: string;
  likes: number[]; // array of user IDs
  comments: Comment[];
  savedBy: number[]; // array of user IDs
  url: string; // URL or Base64 data
  downloads: number;
}

export interface GroupPost extends Omit<Post, 'author'> {
  author: User; // Mentor
}

export interface Group {
  id: number;
  name: string;
  category: string;
  description: string;
  privacy: 'Public' | 'Private';
  maxMembers: number;
  mentor: User;
  posts: GroupPost[];
  membersCount: number;
  isActive: boolean; // New field
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  text?: string;
  file?: { 
    name: string; 
    type: string; 
    url: string; 
    mimeType: string 
  };
  timestamp: string;
  isRead?: boolean;
}
