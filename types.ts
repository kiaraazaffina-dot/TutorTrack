import React from 'react';

export enum ClassType {
  OneOnOne = 'One-on-One',
  Group = 'One-on-Two'
}

export enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  Late = 'Late',
  Cancelled = 'Cancelled'
}

export type StudentStatus = 'Active' | 'Archived';

export type ReportType = 'Session' | 'Beginning' | 'Mid' | 'End';

export interface ClassPackage {
  type: ClassType;
  total: number; // Total classes purchased
  active: boolean;
}

export interface SpeakingRubric {
  fluency: number;
  sentenceLength: number;
  pronunciation: number;
  confidence: number;
  opinionExpression: number;
}

export interface WritingRubric {
  grammarAccuracy: number;
  sentenceStructure: number;
  vocabularyRange: number;
  organisation: number;
  taskCompletion: number;
}

export interface ReadingRubric {
  readingFluency: number;
  accuracy: number;
  pronunciation: number;
  intonation: number;
  comprehension: number;
}

export interface ListeningRubric {
  overallUnderstanding: number;
  keyInfoRecognition: number;
  responseToQuestions: number;
  vocabularyAural: number;
  listeningStrategies: number;
}

export interface SkillProgress {
  id: string;
  date: string; // ISO Date
  reportType?: ReportType;
  reading: number; // Summary 0-100
  writing: number;
  listening: number;
  speaking: number;
  speakingRubric?: SpeakingRubric;
  writingRubric?: WritingRubric;
  readingRubric?: ReadingRubric;
  listeningRubric?: ListeningRubric;
  notes: string;
}

export interface Student {
  id: string;
  name: string;
  classTypes: ClassType[]; 
  email?: string;
  parentName?: string;
  notes: string;
  balance: number; 
  joinedDate: string;
  status: StudentStatus; 
  packages: ClassPackage[]; 
  progressHistory: SkillProgress[];
}

export interface StudentSessionStatus {
  studentId: string;
  status: AttendanceStatus;
  comment?: string; // Per-student comment for this lesson
  speakingRubric?: SpeakingRubric;
  writingRubric?: WritingRubric;
  readingRubric?: ReadingRubric;
  listeningRubric?: ListeningRubric;
}

export interface Session {
  id: string;
  studentIds: string[];
  date: string; // ISO date string
  durationMinutes: number;
  status: AttendanceStatus; // General status for the session (summary)
  studentStatuses: StudentSessionStatus[]; // Individual status per student
  type: ClassType; 
  topic: string;
  notes: string;
  price: number;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  method: string;
}

export interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
}
