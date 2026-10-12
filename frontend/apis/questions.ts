const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Types
export type QuestionType = 'TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILE_UPLOAD' | 'NUMBER';
export type RiskRating = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QuestionOption {
  id: number;
  option: string;
  sequence: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Question {
  id: string;
  questionText: string;
  questionType: QuestionType;
  riskRating: RiskRating;
  options: QuestionOption[];
  categoryId: string;
  category: Category;
  rtv?: string;
  recommendation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetQuestionsParams {
  searchQuery?: string;
  categoryId?: string;
  questionType?: QuestionType;
  riskRating?: RiskRating;
  page?: number;
  limit?: number;
}

export interface GetQuestionsResponse {
  questions: Question[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface QuestionOptionInput {
  id: number;
  option: string;
  sequence: number;
}

export interface CreateQuestionData {
  questionText: string;
  questionType: QuestionType;
  riskRating: RiskRating;
  categoryId: string;
  options?: QuestionOptionInput[];
  rtv?: string;
  recommendation?: string;
}

export interface UpdateQuestionData {
  questionText?: string;
  questionType?: QuestionType;
  riskRating?: RiskRating;
  categoryId?: string;
  options?: QuestionOptionInput[];
  rtv?: string;
  recommendation?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

// API Functions

/**
 * Get all questions with pagination and filters
 */
export async function getQuestions(
  params: GetQuestionsParams = {}
): Promise<GetQuestionsResponse> {
  const {
    searchQuery = '',
    categoryId = '',
    questionType,
    riskRating,
    page,
    limit
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set('searchQuery', searchQuery);
  queryParams.set('categoryId', categoryId);

  // Only add page and limit if they are provided (for pagination)
  // If not provided, backend returns all questions
  if (page !== undefined) {
    queryParams.set('page', page.toString());
  }
  if (limit !== undefined) {
    queryParams.set('limit', limit.toString());
  }

  // Only add optional params if they exist
  if (questionType) {
    queryParams.append('questionType', questionType);
  }
  if (riskRating) {
    queryParams.append('riskRating', riskRating);
  }

  const response = await fetch(`${API_BASE_URL}/questions/?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch questions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a question by ID
 */
export async function getQuestionById(id: string): Promise<Question> {
  const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch question: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new question
 */
export async function createQuestion(
  data: CreateQuestionData
): Promise<ApiResponse> {
  // For BOOLEAN type, automatically add Yes/No options
  const payload = { ...data };
  if (data.questionType === 'BOOLEAN') {
    payload.options = [
      { id: 1, option: 'Yes', sequence: 1 },
      { id: 2, option: 'No', sequence: 2 }
    ];
  }

  const response = await fetch(`${API_BASE_URL}/questions/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create question: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update a question
 */
export async function updateQuestion(
  id: string,
  data: UpdateQuestionData
): Promise<ApiResponse> {
  // For BOOLEAN type, automatically add Yes/No options
  const payload = { ...data };
  if (data.questionType === 'BOOLEAN') {
    payload.options = [
      { id: 1, option: 'Yes', sequence: 1 },
      { id: 2, option: 'No', sequence: 2 }
    ];
  }

  const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update question: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a question (soft delete)
 */
export async function deleteQuestion(id: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    throw new Error(`Failed to delete question: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Bulk delete questions (soft delete)
 */
export async function bulkDeleteQuestions(ids: string[]): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/questions/bulk`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    throw new Error(`Failed to bulk delete questions: ${response.statusText}`);
  }

  return response.json();
}

export interface BulkUploadQuestionData {
  questionText: string;
  questionType: QuestionType;
  riskRating: RiskRating;
  categoryId: string;
  options?: QuestionOptionInput[];
  rtv?: string;
  recommendation?: string;
}

export interface BulkUploadQuestionsPayload {
  questions: BulkUploadQuestionData[];
}

/**
 * Bulk upload questions
 */
export async function bulkUploadQuestions(
  data: BulkUploadQuestionsPayload
): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/questions/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to bulk upload questions: ${response.statusText}`);
  }

  return response.json();
}
