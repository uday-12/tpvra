const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Types
export interface AssessmentQuestion {
  id: string;
  questionText: string;
  questionType: 'TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILE_UPLOAD' | 'NUMBER';
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  options: {
    id: number;
    option: string;
    sequence: number;
  }[];
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  title: string;
  questionsCount: number;
  createdAt: string;
}

export interface AssessmentDetails extends Assessment {
  questions: AssessmentQuestion[];
}

export interface GetAssessmentsParams {
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface GetAssessmentsResponse {
  assessments: Assessment[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CreateAssessmentData {
  title: string;
  questionIds: string[];
}

export interface UpdateAssessmentData {
  title?: string;
  questionIds?: string[];
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

// API Functions

/**
 * Get all assessments with pagination and search
 */
export async function getAssessments(
  params: GetAssessmentsParams = {}
): Promise<GetAssessmentsResponse> {
  const { searchQuery = '', page = 1, limit = 20 } = params;

  const queryParams = new URLSearchParams({
    searchQuery,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/assessments/?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assessments: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get assessment details by ID
 */
export async function getAssessmentById(id: string): Promise<AssessmentDetails> {
  const response = await fetch(`${API_BASE_URL}/assessments/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assessment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new assessment
 */
export async function createAssessment(
  data: CreateAssessmentData
): Promise<Assessment> {
  const response = await fetch(`${API_BASE_URL}/assessments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create assessment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update an assessment
 */
export async function updateAssessment(
  id: string,
  data: UpdateAssessmentData
): Promise<Assessment> {
  const response = await fetch(`${API_BASE_URL}/assessments/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update assessment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(id: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/assessments/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete assessment: ${response.statusText}`);
  }

  return response.json();
}
