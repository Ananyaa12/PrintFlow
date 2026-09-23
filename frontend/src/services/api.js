import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const getCsrfToken = () => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive httpOnly JWT cookies
})

api.interceptors.request.use((config) => {
  if (typeof document !== 'undefined') {
    const token = getCsrfToken()
    const method = (config.method || 'get').toUpperCase()
    if (token && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      config.headers = {
        ...config.headers,
        'X-CSRF-TOKEN': token,
      }
    }
  }
  return config
})

// Normalizes error responses so UI code can always read `error.message`
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      (error.code === 'ERR_NETWORK'
        ? 'Network error. Please check your connection and try again.'
        : 'Something went wrong. Please try again.')
    const fields = error.response?.data?.fields || null
    const status = error.response?.status
    return Promise.reject({ message, fields, status, raw: error })
  }
)

export default api

// ---------- Public API ----------
export const submitRequest = (formData, onUploadProgress) =>
  api.post('/api/requests', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })

export const getRequestStatus = (requestId) =>
  api.get(`/api/requests/${requestId}/status`)

// ---------- Admin auth ----------
export const adminLogin = (username, password) =>
  api.post('/api/admin/login', { username, password })

export const adminLogout = () => api.post('/api/admin/logout')

export const adminMe = () => api.get('/api/admin/me')

// ---------- Admin data ----------
export const getDashboard = () => api.get('/api/admin/dashboard')

export const listRequests = (params) => api.get('/api/admin/requests', { params })

export const getRequest = (reqId) => api.get(`/api/admin/requests/${reqId}`)

export const updateRequest = (reqId, data) => api.put(`/api/admin/requests/${reqId}`, data)

export const deleteRequest = (reqId, permanent = false) =>
  api.delete(`/api/admin/requests/${reqId}`, { params: { permanent } })

export const restoreRequest = (reqId) => api.post(`/api/admin/requests/${reqId}/restore`)

export const markPrinted = (reqId) => api.post(`/api/admin/requests/${reqId}/print`)

export const listTrash = (params) => api.get('/api/admin/trash', { params })

export const listHistory = (params) => api.get('/api/admin/history', { params })

export const getActivity = (requestId) => api.get(`/api/admin/activity/${requestId}`)

export const fileDownloadUrl = (fileId) => `${API_URL}/api/admin/files/${fileId}/download`

export const filePreviewUrl = (fileId) => `${API_URL}/api/admin/files/${fileId}/preview`

export const downloadFileBlob = (fileId) =>
  api.get(`/api/admin/files/${fileId}/download`, { responseType: 'blob' })

export const previewFileBlob = (fileId) =>
  api.get(`/api/admin/files/${fileId}/preview`, { responseType: 'blob' })
