const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Types
export type AssignmentStatus = 'SUBMITTED' | 'IN_PROGRESS' | 'ASSIGNED';

export interface AssessmentMapping {
  id: string;
  assessorId: string;
  vendorId: string;
  parentAssessmentId: string;
  status: AssignmentStatus;
  createdAt: string;
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

export interface GetMappingsParams {
  page?: number;
  limit?: number;
  assessorId?: string;
  vendorId?: string;
  status?: AssignmentStatus;
  searchQuery?: string;
  assessorIds?: string;
  vendorIds?: string;
  assessmentIds?: string;
  statuses?: string;
}

export interface GetMappingsResponse {
  assignments: AssessmentMapping[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CreateMappingData {
  assessorId: string;
  vendorId: string;
  assessmentId: string;
  dueDate: string;
  amount: number;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

// API Functions

/**
 * Get all assessment mappings with pagination and filters
 */
export async function getMappings(
  params: GetMappingsParams = {}
): Promise<GetMappingsResponse> {
  const {
    page = 1,
    limit = 100,
    assessorId = '',
    vendorId = '',
    searchQuery = '',
    assessorIds = '',
    vendorIds = '',
    assessmentIds = '',
    statuses = ''
  } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    assessorId,
    vendorId,
    searchQuery,
    assessorIds,
    vendorIds,
    assessmentIds,
    statuses,
  });

  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch mappings: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new assessment mapping
 */
export async function createMapping(
  data: CreateMappingData
): Promise<AssessmentMapping> {
  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create mapping: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete an assessment mapping
 */
export async function deleteMapping(id: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete mapping: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update an assessment mapping
 */
export async function updateMapping(id: string, data: Partial<CreateMappingData>): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update mapping: ${response.statusText}`);
  }

  return response.json();
}
