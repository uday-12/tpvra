const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Types
export interface AdminDashboardResponse {
  assessors: {
    total: number;
    active: number;
    inactive: number;
  };
  vendors: {
    total: number;
    active: number;
    inactive: number;
  };
  assessments: {
    assigned: number;
    inProgress: number;
    submitted: number;
    total: number;
  };
}

/**
 * Get admin dashboard data
 */
export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  const response = await fetch(`${API_BASE_URL}/dashboard/admin`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch admin dashboard: ${response.statusText}`);
  }

  return response.json();
}

// Assessor Dashboard Types
export interface AssessorAssessment {
  id: string;
  status: string;
  assessmentName: string;
  vendorName: string;
  vendorId: string;
  questionsSubmitted: number;
  overallRisk: number;
  dueDate: string;
  submittedAt: string;
  submittedAssessmentId: string;
}

export interface AssessorDashboardParams {
  searchQuery?: string;
  risk?: string;
  vendorId?: string;
  assessmentId?: string;
  page?: number;
  limit?: number;
}

export interface AssessorDashboardResponse {
  data: AssessorAssessment[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Get assessor dashboard assessments
 */
export async function getAssessorDashboard(
  params: AssessorDashboardParams = {}
): Promise<AssessorDashboardResponse> {
  const {
    searchQuery = '',
    risk = '',
    vendorId = '',
    assessmentId = '',
    page = 1,
    limit = 20,
  } = params;

  const queryParams = new URLSearchParams({
    searchQuery,
    risk,
    vendorId,
    assessmentId,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/dashboard/assessor/assessments?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assessor dashboard: ${response.statusText}`);
  }

  return response.json();
}

// Assessment Metrics Types
export interface RiskByCategory {
  categoryName: string;
  averageScore: number;
}

export interface AssessmentQuestion {
  id: string;
  title: string;
  categoryName: string;
  defaultRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  assignedRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  riskThreatVulnerability?: string;
  recommendation?: string;
}

export interface AssessmentMetricsResponse {
  overallScore: number;
  riskByCategory: RiskByCategory[];
  questions: AssessmentQuestion[];
}

/**
 * Get assessment metrics for risk profile
 */
export async function getAssessmentMetrics(id: string): Promise<AssessmentMetricsResponse> {
  const response = await fetch(`${API_BASE_URL}/dashboard/assessment-metrics/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assessment metrics: ${response.statusText}`);
  }

  return response.json();
}

// Vendor Dashboard Types
export interface VendorAssessment {
  id: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'ASSIGNED';
  assessmentName: string;
  assessorName: string;
  questionsSubmitted: number;
  overallRisk: number;
  dueDate: string;
  submittedAt: string;
  submittedAssessmentId: string;
}

export interface VendorDashboardParams {
  searchQuery?: string;
  risk?: string;
  assessmentId?: string;
  page?: number;
  limit?: number;
}

export interface VendorDashboardResponse {
  data: VendorAssessment[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface VendorStatsResponse {
  pendingAssessments: number;
  pendingClarifications: number;
}

/**
 * Get vendor dashboard assessments
 */
export async function getVendorDashboard(
  params: VendorDashboardParams = {}
): Promise<VendorDashboardResponse> {
  const {
    searchQuery = '',
    risk = '',
    assessmentId = '',
    page = 1,
    limit = 20,
  } = params;

  const queryParams = new URLSearchParams({
    searchQuery,
    risk,
    assessmentId,
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/dashboard/vendor/assessments?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vendor dashboard: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get vendor stats (pending assessments and clarifications)
 */
export async function getVendorStats(): Promise<VendorStatsResponse> {
  const response = await fetch(`${API_BASE_URL}/dashboard/vendor/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vendor stats: ${response.statusText}`);
  }

  return response.json();
}
