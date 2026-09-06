import axios, { AxiosInstance } from 'axios';

// Use relative paths for local API routes
const apiClient: AxiosInstance = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function loginUser(email: string) {
  const response = await apiClient.post('/api/login', {
    email,
  });
  return response.data;
}

export async function processSummary(formData: FormData) {
  const response = await apiClient.post('/api/summary', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export interface ServiceWriteUpRequest {
  service: string;
  transcript: string;
  prompt?: string;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export async function processServiceWriteUp(payload: ServiceWriteUpRequest) {
  const response = await apiClient.post('/api/service-writeup', payload);
  return response.data;
}

export default apiClient;
