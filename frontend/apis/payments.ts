const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface Payment {
  id: string;
  vendorName: string;
  assessorName: string;
  assessmentName: string;
  amount: number;
  date: string;
  status: string;
  paymentMethod: string;
  invoiceUrl: string;
}

export interface PaymentsResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface FetchPaymentsParams {
  page?: number;
  limit?: number;
  vendorId?: string[];
  assessorId?: string[];
  assessmentId?: string[];
  paidDate?: string;
  paymentMethod?: string;
}

export interface FilterOption {
  id: string;
  name: string;
}

export interface PaymentFilters {
  vendors: FilterOption[];
  assessors: FilterOption[];
  assessments: FilterOption[];
  paymentMethods: string[];
}

export async function fetchPayments(params: FetchPaymentsParams = {}): Promise<PaymentsResponse> {
  const { page = 1, limit = 10, vendorId, assessorId, assessmentId, paidDate, paymentMethod } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  // Append array filters — each value as a separate query param
  if (vendorId?.length) {
    vendorId.forEach((id) => queryParams.append('vendorId', id));
  }
  if (assessorId?.length) {
    assessorId.forEach((id) => queryParams.append('assessorId', id));
  }
  if (assessmentId?.length) {
    assessmentId.forEach((id) => queryParams.append('assessmentId', id));
  }
  if (paidDate) {
    queryParams.set('paidDate', paidDate);
  }
  if (paymentMethod) {
    queryParams.set('paymentMethod', paymentMethod);
  }

  const response = await fetch(`${API_BASE_URL}/payments?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch payments: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchPaymentFilters(): Promise<PaymentFilters> {
  const response = await fetch(`${API_BASE_URL}/payments/filters`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch payment filters: ${response.statusText}`);
  }

  return response.json();
}
