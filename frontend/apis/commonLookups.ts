import { authClient } from '@/lib/auth-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Types
export interface LookupItem {
  id: string;
  name: string;
}

export interface AssessorLookup extends LookupItem {
  email: string;
}

export interface VendorLookup extends LookupItem {
  email: string;
}

export interface AssessmentLookup extends LookupItem {
  title: string;
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  searchQuery?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// API Functions

/**
 * Get all assessors for dropdown/lookup
 */
export async function getAssessors(): Promise<AssessorLookup[]> {
  const { data, error } = await authClient.admin.listUsers({
    query: {
      limit: 1000, // Get all assessors
      offset: 0,
      filterField: "role",
      filterValue: "assessor",
      filterOperator: "contains",
    },
  });

  if (error) {
    throw new Error(`Failed to fetch assessors: ${error.message}`);
  }

  // Map the response to the expected format
  return data?.users?.map((user: any) => ({
    id: user.id,
    name: user.assessorName || user.name || user.email,
    email: user.email,
  })) || [];
}

/**
 * Get all vendors for dropdown/lookup
 */
export async function getVendors(): Promise<VendorLookup[]> {
  const { data, error } = await authClient.admin.listUsers({
    query: {
      limit: 1000, // Get all vendors
      offset: 0,
      filterField: "role",
      filterValue: "vendor",
      filterOperator: "contains",
    },
  });

  if (error) {
    throw new Error(`Failed to fetch vendors: ${error.message}`);
  }

  // Map the response to the expected format
  return data?.users?.map((user: any) => ({
    id: user.id,
    name: user.companyName || user.name || user.email,
    email: user.email,
  })) || [];
}

/**
 * Get all assessments for dropdown/lookup
 * Since there's no dedicated parent-assessments endpoint,
 * we extract unique assessments from existing assignments
 */
export async function getAssessments(): Promise<AssessmentLookup[]> {
  try {
    // Use smaller limit to avoid backend validation errors
    const response = await fetch(`${API_BASE_URL}/assessor-vendor-assessments/?page=1&limit=100&assessorId=&vendorId=`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('Failed to fetch assessments, returning empty array');
      return [];
    }

    const data = await response.json();

    // Extract unique parent assessments from assignments
    const assessmentsMap = new Map<string, AssessmentLookup>();

    if (data.assignments && Array.isArray(data.assignments)) {
      data.assignments.forEach((assignment: any) => {
        if (assignment.parentAssessment) {
          const assessment = assignment.parentAssessment;
          if (!assessmentsMap.has(assessment.id)) {
            assessmentsMap.set(assessment.id, {
              id: assessment.id,
              name: assessment.title,
              title: assessment.title,
            });
          }
        }
      });
    }

    return Array.from(assessmentsMap.values());
  } catch (error) {
    console.error('Error fetching assessments:', error);
    // Return empty array instead of throwing to prevent UI from breaking
    return [];
  }
}

/**
 * Get assessors with pagination for dropdown (infinite scroll)
 */
export async function getAssessorsPaginated(
  params: PaginatedParams = {}
): Promise<PaginatedResponse<AssessorLookup>> {
  const { page = 1, limit = 10, searchQuery = '' } = params;
  const offset = (page - 1) * limit;

  const { data, error } = await authClient.admin.listUsers({
    query: {
      limit,
      offset,
      filterField: "role",
      filterValue: "assessor",
      filterOperator: "contains",
      ...(searchQuery && { searchField: "name", searchValue: searchQuery, searchOperator: "contains" }),
    },
  });

  if (error) {
    throw new Error(`Failed to fetch assessors: ${error.message}`);
  }

  const users = data?.users?.map((user: any) => ({
    id: user.id,
    name: user.assessorName || user.name || user.email,
    email: user.email,
  })) || [];

  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: users,
    totalCount,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Get vendors with pagination for dropdown (infinite scroll)
 */
export async function getVendorsPaginated(
  params: PaginatedParams = {}
): Promise<PaginatedResponse<VendorLookup>> {
  const { page = 1, limit = 10, searchQuery = '' } = params;
  const offset = (page - 1) * limit;

  const { data, error } = await authClient.admin.listUsers({
    query: {
      limit,
      offset,
      filterField: "role",
      filterValue: "vendor",
      filterOperator: "contains",
      ...(searchQuery && { searchField: "name", searchValue: searchQuery, searchOperator: "contains" }),
    },
  });

  if (error) {
    throw new Error(`Failed to fetch vendors: ${error.message}`);
  }

  const users = data?.users?.map((user: any) => ({
    id: user.id,
    name: user.companyName || user.name || user.email,
    email: user.email,
  })) || [];

  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: users,
    totalCount,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
