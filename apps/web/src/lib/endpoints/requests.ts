export const REQUEST_ENDPOINTS = {
  LIST: "/api/requests",
  CREATE: "/api/requests",
  APPROVE: (id: number) => `/api/requests/${id}/approve`,
  DENY: (id: number) => `/api/requests/${id}/deny`,
  DELETE: (id: number) => `/api/requests/${id}`,
} as const;
