import './App.css'
import { Route, Routes } from 'react-router-dom'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import Home from './pages/Home'
import ForgetPassword from './pages/ForgetPassword'
import Report from './pages/Report'
import TrackStatus from './pages/TrackStatus'
import useGetCurrentUser from './hooks/useGetCurrentUser'
import CityMap from './pages/CityMap'
import useGetUserReports from './hooks/useGetUserReports'
import useGetCurrentCity from './hooks/useGetCurrentCity'
import AdminIssues from './pages/AdminIssues'
import AdminOfficers from './pages/AdminOfficers'
import AdminMap from './pages/AdminMap'
import OfficerMap from './pages/OfficerMap'
import OfficerIssues from './pages/OfficerIssues'
import ProtectedRoute from './components/ProtectedRoute'

import axios from 'axios'

axios.defaults.timeout = 30000

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  const tokenExists = !!token
  let authAttached = false

  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`)
      authAttached = true
    } else if (config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`
      authAttached = true
    } else {
      config.headers = { Authorization: `Bearer ${token}` }
      authAttached = true
    }
  }

  console.log(`[API REQUEST] ${config.method?.toUpperCase() || 'GET'} ${config.url}`)
  console.log(`[AUTH DEBUG] Token available for API request: ${tokenExists}`)
  console.log(`[AUTH DEBUG] Authorization header attached: ${authAttached}`)
  console.log(`[AUTH DEBUG] Token storage key: token`)
  return config
}, error => {
  console.error('[API REQUEST ERROR]', error)
  return Promise.reject(error)
})

axios.interceptors.response.use(
  response => {
    console.log(`[API RESPONSE] ${response.status} ${response.config?.url}`)
    return response
  },
  error => {
    if (error.response) {
      console.error(`[API ERROR] ${error.response.status} ${error.config?.url}`, error.response.data)
    } else if (error.request) {
      console.error('[API NETWORK ERROR] Detailed diagnostics:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL || serverUrl,
        timeout: error.config?.timeout,
        message: error.message
      })
    } else {
      console.error('[API ERROR]', error.message)
    }
    return Promise.reject(error)
  }
)

export const serverUrl = 'https://campus-issue-management-system-g1mh.onrender.com'

function App () {
  useGetCurrentUser()
  useGetUserReports()
  useGetCurrentCity()
  return (
    <Routes>
      <Route path='/signup' element={<SignUp />} />
      <Route path='/signin' element={<SignIn />} />
      <Route path='/' element={<Home />} />
      <Route path='forget-password' element={<ForgetPassword />} />
      <Route path='/report' element={<Report />} />
      <Route path='/track-status' element={<TrackStatus />} />
      <Route path='/city-map' element={<CityMap />} />

      {/* Admin Routes */}
      <Route
        path='/admin/issues'
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminIssues />
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin/officers'
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminOfficers />
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin/map'
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminMap />
          </ProtectedRoute>
        }
      />

      {/* Officer Routes */}
      <Route
        path='/officer/map'
        element={
          <ProtectedRoute requiredRole="officer">
            <OfficerMap />
          </ProtectedRoute>
        }
      />
      <Route
        path='/officer/issues'
        element={
          <ProtectedRoute requiredRole="officer">
            <OfficerIssues />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
