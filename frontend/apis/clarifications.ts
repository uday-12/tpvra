const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Types
export type ClarificationStatus = 'PENDING' | 'SUBMITTED';

export interface ClarificationOption {
  id: number;
  option: string;
  sequence: number;
}

export interface Clarification {
  id: string;
  clarificationRequested: string;
  questionId: string;
  questionText: string;
  questionType?: 'TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILE_UPLOAD' | 'NUMBER';
  questionOptions?: ClarificationOption[] | null;
  assessmentId: string;
  assessmentName: string;
  assessorId: string;
  assessorName: string;
  vendorId: string;
  vendorName: string;
  requestedAt: string;
  dueDate: string;
  daysLeft: number;
  status: ClarificationStatus;
  submittedAnswer: string;
  submittedAnswerFilePath: string;
}

export interface GetClarificationsParams {
  page?: number;
  limit?: number;
  vendorIds?: string;
  assessorIds?: string;
  assessmentIds?: string;
  fetchBy?: 'pending' | 'submitted';
}

export interface GetClarificationsResponse {
  clarifications: Clarification[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface AssessorCount {
  id: string;
  name: string;
  count: number;
}

export interface AssessmentCount {
  id: string;
  name: string;
  count: number;
}

export interface VendorCount {
  id: string;
  name: string;
  count: number;
}

export interface GetClarificationFiltersResponse {
  pendingCount: number;
  submittedCount: number;
  statusCounts: StatusCount[];
  assessorCounts: AssessorCount[];
  vendorCounts: VendorCount[];
  assessmentCounts: AssessmentCount[];
}

export interface SubmitClarificationData {
  response: string;
  fileId?: string;
}

export interface SubmitClarificationResponse {
  success: boolean;
  message: string;
}

export interface ClarificationFile {
  id: string;
  name: string;
  url: string;
  s3_key?: string;
}

export interface SubmittedClarificationResponse {
  id: string;
  questionText: string;
  questionType?: 'TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILE_UPLOAD' | 'NUMBER';
  questionOptions?: ClarificationOption[] | null;
  originalAnswer: string;
  clarificationRequested: string;
  clarificationAnswer: string;
  clarificationFile?: ClarificationFile;
}

// API Functions

/**
 * Get clarifications with pagination and filters
 */
export async function getClarifications(
  params: GetClarificationsParams = {}
): Promise<GetClarificationsResponse> {
  const {
    page = 1,
    limit = 20,
    vendorIds = '',
    assessorIds = '',
    assessmentIds = '',
    fetchBy = 'pending'
  } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    vendorIds,
    assessorIds,
    assessmentIds,
    fetchBy,
  });

  const response = await fetch(`${API_BASE_URL}/clarifications/?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch clarifications: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get clarification filter data
 */
export async function getClarificationFilters(
  vendorId: string = '',
  assessorId: string = '',
  assessmentName: string = ''
): Promise<GetClarificationFiltersResponse> {
  const queryParams = new URLSearchParams({
    vendorId,
    assessorId,
    assessmentName,
  });

  const response = await fetch(`${API_BASE_URL}/clarifications/filters?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch clarification filters: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Submit clarification response
 */
export async function submitClarificationResponse(
  clarificationId: string,
  data: SubmitClarificationData
): Promise<SubmitClarificationResponse> {
  const response = await fetch(`${API_BASE_URL}/clarifications/${clarificationId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit clarification response: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get submitted clarification response details
 */
export async function getSubmittedClarificationResponse(
  clarificationId: string
): Promise<SubmittedClarificationResponse> {
  const response = await fetch(`${API_BASE_URL}/clarifications/${clarificationId}/submitted-response`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch submitted clarification response: ${response.statusText}`);
  }

  return response.json();
}
