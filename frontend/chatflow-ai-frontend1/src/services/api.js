// // This is the single source of truth for all backend communication.
// // Per our strategy, this makes the app maintainable and testable.

// // We get the backend URL from an environment variable,
// // falling back to our dev server for the GTM plan.
// // const BASE_URL = import.meta.env.VITE_API_URL || 'http://45.117.183.187:8085/api';
// const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
// /**
//  * Helper function for handling API responses.
//  * This is expert-level practice to avoid repeating code.
//  */
// const handleResponse = async (response) => {
//   if (!response.ok) {
//     const error = await response.json().catch(() => ({
//       detail: 'An unknown error occurred',
//     }));
//     throw new Error(error.detail || `HTTP error! status: ${response.status}`);
//   }
//   return response.json();
// };

// /**
//  * A wrapper for fetch that includes our common headers and error handling.
//  */
// const apiFetch = async (endpoint, options = {}) => {
//   const config = {
//     ...options,
//     headers: {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     },
//   };

//   const response = await fetch(`${BASE_URL}${endpoint}`, config);
//   return handleResponse(response);
// };

// // --- Dashboard API ---
// export const getDashboardStats = () => {
//   return apiFetch('/dashboard/stats');
// };

// // --- Contacts API ---
// export const getContacts = () => {
//   return apiFetch('/contacts');
// };

// export const createContact = (contactData) => {
//   return apiFetch('/contacts', {
//     method: 'POST',
//     body: JSON.stringify(contactData),
//   });
// };

// // --- Chatbot Flow API ---
// export const getFlows = () => {
//   return apiFetch('/flows');
// };

// export const getFlowById = (id) => {
//   return apiFetch(`/flows/${id}`);
// };

// export const createFlow = (flowData) => {
//   return apiFetch('/flows', {
//     method: 'POST',
//     body: JSON.stringify(flowData),
//   });
// };

// export const updateFlow = (id, flowData) => {
//   return apiFetch(`/flows/${id}`, {
//     method: 'PUT',
//     body: JSON.stringify(flowData),
//   });
// };

// // --- Broadcast API --- (THIS WAS MISSING!)
// export const sendBroadcast = (broadcastData) => {
//   return apiFetch('/broadcast', {
//     method: 'POST',
//     body: JSON.stringify(broadcastData),
//   });
// };

// // We create an object to export all functions
// const api = {
//   getDashboardStats,
//   getContacts,
//   createContact,
//   getFlows,
//   getFlowById,
//   createFlow,
//   updateFlow,
//   sendBroadcast, // ← Added to default export
// };

// export default api;
// export { api };
// src/services/api.js
// Single source of truth for API calls.
// Dev: set VITE_API_URL=http://45.117.183.187:8085/api in .env
// Prod: leave VITE_API_URL undefined so BASE_URL falls back to '/api' (proxied by hosting).

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const parseJsonSafe = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const payload = await parseJsonSafe(response);
    const detail = (payload && (payload.detail || payload.error || payload.message)) || `HTTP ${response.status}`;
    const err = new Error(detail);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }
  // Return parsed JSON when possible, else raw text
  const json = await parseJsonSafe(response);
  return json !== null ? json : await response.text();
};

/**
 * apiFetch(endpoint, options, opts)
 * - endpoint : string (e.g. '/login' or '/dashboard/stats')
 * - options  : fetch options (method, body, headers)
 * - opts     : { withCredentials: boolean } -> include cookies when true
 */
export const apiFetch = async (endpoint, options = {}, opts = {}) => {
  const { withCredentials = false } = opts;

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers: { ...defaultHeaders, ...(options.headers || {}) },
    body: options.body,
    credentials: withCredentials ? 'include' : 'same-origin',
    redirect: 'manual',
  };

  // If body is an object and Content-Type is application/json, stringify
  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, fetchOptions);
  return handleResponse(response);
};

// --- Dashboard API ---
export const getDashboardStats = () => apiFetch('/dashboard/stats');

// --- Contacts API ---
export const getContacts = () => apiFetch('/contacts');
export const createContact = (contactData) =>
  apiFetch('/contacts', { method: 'POST', body: contactData });

// --- Flows API ---
export const getFlows = () => apiFetch('/flows');
export const getFlowById = (id) => apiFetch(`/flows/${id}`);
export const createFlow = (flowData) =>
  apiFetch('/flows', { method: 'POST', body: flowData });
export const updateFlow = (id, flowData) =>
  apiFetch(`/flows/${id}`, { method: 'PUT', body: flowData });

// --- Broadcast API ---
export const sendBroadcast = (broadcastData) =>
  apiFetch('/broadcast', { method: 'POST', body: broadcastData });

// --- Auth Example (if you need cookies/session) ---
export const loginWithCookies = (credentials) =>
  apiFetch('/login', { method: 'POST', body: credentials }, { withCredentials: true });

const api = {
  getDashboardStats,
  getContacts,
  createContact,
  getFlows,
  getFlowById,
  createFlow,
  updateFlow,
  sendBroadcast,
  loginWithCookies,
};

export default api;
