const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Types
export interface Category {
  id: string;
  name: string;
  questionsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetCategoriesParams {
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface GetCategoriesResponse {
  categories: Category[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CreateCategoryData {
  name: string;
}

export interface UpdateCategoryData {
  name: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

// API Functions

/**
 * Get all categories with pagination and search
 */
export async function getCategories(
  params: GetCategoriesParams = {}
): Promise<GetCategoriesResponse> {
  const { searchQuery = '', page, limit } = params;

  const queryParams = new URLSearchParams();
  queryParams.set('searchQuery', searchQuery);

  // Only add page and limit if they are provided (for pagination)
  // If not provided, backend returns all categories
  if (page !== undefined) {
    queryParams.set('page', page.toString());
  }
  if (limit !== undefined) {
    queryParams.set('limit', limit.toString());
  }

  const response = await fetch(`${API_BASE_URL}/categories/?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new category
 */
export async function createCategory(
  data: CreateCategoryData
): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/categories/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create category: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  data: UpdateCategoryData
): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update category: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a category (soft delete)
 */
export async function deleteCategory(id: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    throw new Error(`Failed to delete category: ${response.statusText}`);
  }

  return response.json();
}
