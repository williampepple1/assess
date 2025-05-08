export interface Question {
  question: string;
  correctAnswer: string;
  options: string[];
}

export interface Assessment {
  id: string;
  title: string;
  questions: Question[];
  createdAt: Date;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
  answers: string[];
}

export type UserRole = 'user' | 'admin';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
} 