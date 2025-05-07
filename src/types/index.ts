export interface Question {
  question: string;
  correctAnswer: string;
  options: string[];
}

export interface Assessment {
  id: string;
  createdAt: Date;
  questions: Question[];
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
} 