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

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => Promise.reject(error))

export const serverUrl =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.MODE === 'production'
    ? 'https://faultline-ai.onrender.com'
    : 'http://localhost:8000')

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
