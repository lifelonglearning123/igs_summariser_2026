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

/** Read one funding email into a structured opportunity card. */
export async function readOpportunity(payload: { email: string; prompt?: string }) {
  const response = await apiClient.post('/api/opportunity', payload);
  return response.data;
}

/** Read a batch of saved emails into a sorted, de-duplicated list of opportunities. */
export async function readInbox(payload: { emails: { raw: string }[]; prompt?: string }) {
  const response = await apiClient.post('/api/inbox', payload);
  return response.data;
}

/** Read the locally stored inbox. */
export async function loadInbox() {
  const response = await apiClient.get('/api/sync');
  return response.data;
}

/** Pull new mail from Outlook and read whatever looks like funding. */
export async function syncInbox(payload: {
  settings?: { outlookFolder?: string; lookbackDays?: number };
  dryRun?: boolean;
}) {
  const response = await apiClient.post('/api/sync', payload);
  return response.data;
}

/** Keep a call sheet against a stored opportunity so it is paid for once. */
export async function saveCallSheet(payload: { item_id: string; call_sheet: unknown }) {
  const response = await apiClient.put('/api/sync', payload);
  return response.data;
}

/** Forget one stored opportunity. */
export async function forgetOpportunity(id: string) {
  const response = await apiClient.delete('/api/sync', { params: { id } });
  return response.data;
}

/** Rank the client register against an opportunity that has already been read. */
export async function matchOpportunity(payload: {
  opportunity: unknown;
  register: unknown;
  prompt?: string;
  shortlist_size?: number;
}) {
  const response = await apiClient.post('/api/match', payload);
  return response.data;
}

export default apiClient;
