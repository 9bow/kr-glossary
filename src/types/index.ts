// Core data types based on SCHEMA.sql and API.yaml

// CategoryType removed - categories are no longer used
export type ValidationStatus = 'draft' | 'proposed' | 'validated';
export type OrganizationType = 'publisher' | 'university' | 'company' | 'community';
export type ContributionType = 'author' | 'editor' | 'reviewer';
export type ReferenceType = 'paper' | 'book' | 'documentation' | 'website';
export type UserRole = 'viewer' | 'contributor' | 'reviewer' | 'admin';

// Input type for term creation/editing
export type TermInput = Omit<Term, 'id' | 'status' | 'contributors' | 'validators' | 'metadata'> & {
  id?: string; // Optional for new terms
  status?: ValidationStatus;
  contributors?: Contributor[];
  validators?: Validator[];
  metadata?: Partial<Term['metadata']>;
};

export interface Term {
  english: string;
  korean: string;
  alternatives?: string[];
  pronunciation?: string;
  // Single definition (legacy compatibility)
  definition?: {
    korean: string;
    english: string;
  };
  // Multi-meaning support (new structure)
  meanings?: TermMeaning[];
  examples?: Example[];
  references?: Reference[];
  relatedTerms?: string[]; // Array of related terms in English
  status: ValidationStatus;
  contributors?: Contributor[];
  validators?: Validator[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    discussionUrl?: string;
  };
}

// Interface representing each meaning of a term
export interface TermMeaning {
  id: string; // Unique ID for meaning (e.g. "general", "programming", "ml-context")
  title: {
    korean: string;
    english: string;
  };
  definition: {
    korean: string;
    english: string;
  };
  examples?: Example[];
  references?: Reference[];
  context?: string; // Usage context description (e.g. "in machine learning", "in programming")
  // Individual metadata for each definition
  contributors?: Contributor[]; // Contributors to this definition
  validators?: Validator[]; // Organizations/people who validated this definition
  relatedPRs?: string[]; // Related PR URLs
  priority?: number; // Priority of definition (1 is highest)

  metadata?: {
    createdAt: string;
    updatedAt: string;
    discussionUrl?: string;
    sourceCommit?: string; // Commit hash when this definition was added
  };
}

export interface Example {
  korean: string;
  english: string;
  source?: string;
  sourceUrl?: string;
  // Additional metadata per usage example

  difficulty?: 'beginner' | 'intermediate' | 'advanced'; // Example difficulty
  contributor?: string; // User who provided the example
  verified?: boolean; // 검증된 예시인지 여부
  tags?: string[]; // 예시에 대한 태그들
}

export interface Reference {
  title: string;
  url?: string;
  type: ReferenceType;
  year?: number;
  // 참고문헌별 추가 메타데이터
  authors?: string[]; // 저자들
  publisher?: string; // 출판사 또는 발행처
  isbn?: string; // 도서의 경우 ISBN
  doi?: string; // 논문의 경우 DOI
  pages?: string; // 페이지 범위 (예: "123-145")
  volume?: string; // 저널 권호
  issue?: string; // 저널 호수
  language?: 'ko' | 'en' | 'ja' | 'zh' | 'other'; // 원문 언어
  accessDate?: string; // 웹사이트 접근 날짜
  contributor?: string; // 참고문헌을 추가한 사용자
  verified?: boolean; // 링크/내용이 검증되었는지 여부
  tags?: string[]; // 참고문헌 분류 태그
}

export interface Contributor {
  githubUsername: string;
  contributionType: ContributionType;
  timestamp: string;
}

export interface Validator {
  organizationId: string;
  validatedAt: string;
  validatorUsername: string;
}

export interface Organization {
  name: string;
  type: OrganizationType;
  homepage: string;
  githubOrg?: string;
  logo?: string;
  description: string;
  social?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
}

export interface User {
  githubUsername: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  organizationId?: string;
  firstContributionAt?: string;
  lastActiveAt?: string;
  permissions?: string[];
}

export interface SearchResult {
  term: Term;
  score: number;
  highlights?: {
    english?: string;
    korean?: string;
    definition?: string;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: PaginationInfo;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationError extends ErrorResponse {
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// Search parameters
export interface SearchParams {
  q: string;
  status?: ValidationStatus;
  fuzzy?: boolean;
  threshold?: number;
  limit?: number;
  page?: number;
  sort?: 'korean_asc' | 'korean_desc' | 'english_asc' | 'english_desc' | 'date_asc' | 'date_desc';
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
}
