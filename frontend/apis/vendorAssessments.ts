const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Types
export type AssessmentStatus = 'SUBMITTED' | 'IN_PROGRESS' | 'ASSIGNED';

export interface VendorAssessment {
  id: string;
  assessorId: string;
  vendorId: string;
  parentAssessmentId: string;
  submittedAssessmentId?: string; // Used when status is IN_PROGRESS or SUBMITTED
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  daysLeft: number;
  assignedDate: string;
  assessor: {
    id: string;
    name: string;
    email: string;
  };
  vendor: {
    id: string;
    name: string;
    email: string;
  };
  parentAssessment: {
    id: string;
    title: string;
  };
}

export interface GetVendorAssessmentsParams {
  page?: number;
  limit?: number;
  assessorId?: string;
  vendorId?: string;
  status?: AssessmentStatus;
  assessmentName?: string;
  assessorIds?: string;
  vendorIds?: string;
  statuses?: string;
  fetchBy?: 'pending' | 'submitted';
  searchQuery?: string;
  assessmentIds?: string;
}

export interface GetVendorAssessmentsResponse {
  assignments: VendorAssessment[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

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

export interface VendorAssessmentDetails {
  id: string;
  assessorId: string;
  vendorId: string;
  parentAssessmentId: string;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  daysLeft: number;
  assignedDate: string;
  assessor: {
    id: string;
    name: string;
    email: string;
  };
  vendor: {
    id: string;
    name: string;
    email: string;
  };
  parentAssessment: {
    id: string;
    title: string;
    questions: AssessmentQuestion[];
  };
}

export interface AnswerInput {
  questionId: string;
  questionType: 'TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILE_UPLOAD' | 'NUMBER';
  answer: string;
  answerExplanation: string;
  fileId: string;
  supportingFileId: string;
  selectedOptions: string[];
}

export interface SaveDraftData {
  answers: AnswerInput[];
  submit: boolean;
}

export interface SaveDraftResponse {
  success: boolean;
  message: string;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  data: {
    fileName: string;
    filePath: string;
    fileSize: number;
    fileExtension: string;
    s3Key: string;
    uploadedFileId: string;
  };
}

export interface SavedAnswerFile {
  url: string;
  name: string;
  s3_key?: string;
}

export interface SavedAnswerOption {
  id: number;
  option: string;
  sequence: number;
}

export interface SavedAnswer {
  questionId: string;
  questionText: string;
  questionType: 'TEXT' | 'BOOLEAN' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILE_UPLOAD' | 'NUMBER';
  options: SavedAnswerOption[] | null; // Array of option objects
  answer: string | null;
  answerFile: SavedAnswerFile | null;
  explanation: string | null;
  supportingFile: SavedAnswerFile | null;
  riskRating: string;
  assignedRiskRating: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssessmentReviewResponse {
  id: string;
  vendorName: string;
  submittedAt: string;
  questions: SavedAnswer[];
}

export interface AssessorFiltersDataResponse {
  pendingCount: number;
  submittedCount: number;
  statusCounts: {
    status: string;
    count: number;
  }[];
  vendorCounts: {
    id: string;
    name: string;
    count: number;
  }[];
  assessmentCounts: {
    id: string;
    name: string;
    count: number;
  }[];
}

export interface ClarificationRequestData {
  assessorVendorAssessmentId: string;
  questionId: string;
  clarificationRequested: string;
  dueDate: string;
}

export interface OrderSummaryResponse {
  amount: number;
  currency: string;
  assessmentId: string;
  assessmentTitle: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone?: string;
}

export interface ClarificationRequestResponse {
  success: boolean;
  message: string;
}

// API Functions

/**
 * Get vendor assessments with pagination and filters
 */
export async function getVendorAssessments(
  params: GetVendorAssessmentsParams = {}
): Promise<GetVendorAssessmentsResponse> {
  const {
    page = 1,
    limit = 20,
    assessorId = '',
    vendorId = '',
    status,
    assessmentName = '',
    assessorIds = '',
    vendorIds = '',
    statuses = '',
    fetchBy = 'pending',
    searchQuery = '',
    assessmentIds = ''
  } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    assessorId,
    vendorId,
    assessmentName,
    assessorIds,
    vendorIds,
    statuses,
    fetchBy,
    searchQuery,
    assessmentIds,
  });

  if (status) {
    queryParams.append('status', status);
  }

  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vendor assessments: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get vendor assignment details (not the full assessment with questions)
 */
export async function getVendorAssessmentDetails(
  id: string
): Promise<VendorAssessmentDetails> {
  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assignment details: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get assessment questions by parent assessment ID
 */
export async function getAssessmentQuestions(
  parentAssessmentId: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/assessments/${parentAssessmentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assessment questions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a file
 */
export async function uploadFile(
  file: File,
  folderName: string = 'uploads',
  fileType: string = 'header'
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folderName', folderName);
  formData.append('fileType', fileType);

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete uploaded file
 */
export async function deleteFile(fileKey: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/files/${fileKey}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save assessment draft
 */
export async function saveAssessmentDraft(
  id: string,
  data: SaveDraftData
): Promise<SaveDraftResponse> {
  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/${id}/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to save draft: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get saved assessment answers for review
 */
export async function getAssessmentReview(
  id: string
): Promise<AssessmentReviewResponse> {
  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/${id}/review`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assessment review: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get assessor filters data including pending and submitted counts
 */
export async function getAssessorFiltersData(
  assessmentName: string = ''
): Promise<AssessorFiltersDataResponse> {
  const queryParams = new URLSearchParams({
    assessmentName,
  });

  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/assessor-filters-data?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assessor filters data: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Request clarification from vendor on a specific question
 */
export async function requestClarification(
  data: ClarificationRequestData
): Promise<ClarificationRequestResponse> {
  const response = await fetch(`${API_BASE_URL}/clarifications/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to request clarification: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get presigned URL for file download
 */
export async function getFilePresignedUrl(
  fileKey: string,
  fileName?: string
): Promise<{ success: boolean; data: { url: string; expiresIn: number } }> {
  const queryParams = fileName ? `?fileName=${encodeURIComponent(fileName)}` : '';
  const response = await fetch(`${API_BASE_URL}/files/url/${encodeURIComponent(fileKey)}${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to get file URL: ${response.statusText}`);
  }

  return response.json();
}


/**
 * Get order summary for payment
 */
export async function getOrderSummary(
  id: string
): Promise<OrderSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/${id}/order-summary`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to get order summary: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create Razorpay Order
 */
export async function createOrder(
  id: string
): Promise<CreateOrderResponse> {
  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/${id}/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to create order: ${response.statusText}`);
  }

  return response.json();
}
