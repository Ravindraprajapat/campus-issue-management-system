import React, { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import Navbar from '../components/Navbar'
import { Filter, MapPin, RefreshCw, ShieldAlert, Key, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { setUserData } from '../redux/userSlice.js'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
})

const STATUS_COLORS_MAP = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#22c55e'
}

function makeIcon(status) {
  const color = STATUS_COLORS_MAP[status] || '#94a3b8'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z"
      fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38]
  })
}

function ResizeMap() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 200) }, [map])
  return null
}

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (map && points && points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] })
    }
  }, [points, map])
  return null
}

const STATUS_COLORS = {
  PENDING: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  IN_PROGRESS: 'text-blue-600 bg-blue-50 border-blue-200',
  RESOLVED: 'text-green-600 bg-green-50 border-green-200'
}

const OfficerMap = () => {
  const dispatch = useDispatch()
  const { userData } = useSelector(state => state.user)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [officerBuildings, setOfficerBuildings] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)

  // Password Change Modal State
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [currentPasswordInput, setCurrentPasswordInput] = useState('')
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChangeError, setPasswordChangeError] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (userData?.mustChangePassword) {
      setShowPasswordChangeModal(true)
    }
  }, [userData])

  const fetchReports = async () => {
    setLoading(true)
    setRefreshing(true)
    try {
      const { data: repData } = await axios.get(`${serverUrl}/api/admin/officer/reports`, { withCredentials: true })
      setReports(repData.reports || [])
      const bldgs = repData.assignedBuildings || repData.buildings || (userData?.assignedBuildings?.length ? userData.assignedBuildings : (repData.building ? [repData.building] : (userData?.assignedBuilding ? [userData.assignedBuilding] : [])))
      setOfficerBuildings(Array.isArray(bldgs) ? bldgs : [bldgs])
      setLastUpdated(new Date())
    } catch (e) {
      if (e?.response?.data?.mustChangePassword) {
        setShowPasswordChangeModal(true)
      } else {
        console.error(e)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchReports() }, [])

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordChangeError('')

    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      setPasswordChangeError('All password fields are required.')
      return
    }

    if (newPasswordInput.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.')
      return
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('New password and confirm password do not match.')
      return
    }

    setChangingPassword(true)
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/auth/change-password`,
        {
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput
        },
        { withCredentials: true }
      )

      if (data.user) {
        dispatch(setUserData(data.user))
      }

      setShowPasswordChangeModal(false)
      setCurrentPasswordInput('')
      setNewPasswordInput('')
      setConfirmPasswordInput('')
      fetchReports()
    } catch (err) {
      setPasswordChangeError(err?.response?.data?.message || 'Password change failed.')
    } finally {
      setChangingPassword(false)
    }
  }

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return reports
    return reports.filter(r => r.status === statusFilter)
  }, [reports, statusFilter])

  const validReportPoints = useMemo(() => {
    return filtered
      .filter(r => r.location?.latitude && r.location?.longitude)
      .map(r => [r.location.latitude, r.location.longitude])
  }, [filtered])

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <div className="pt-[120px] pb-16 px-6 md:px-10 max-w-[1200px] mx-auto">

        {/* Header with top refresh button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-slate-900">Assigned Building Map</h1>
              {officerBuildings.map(bldg => (
                <span key={bldg} className="bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full border border-sky-200">
                  <MapPin size={13} className="inline mr-1" />
                  {bldg}
                </span>
              ))}
            </div>
            <p className="text-slate-500 text-sm">
              Issues reported in your assigned building / location
              {lastUpdated && (
                <span className="ml-2 text-slate-400">
                  · Last updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={fetchReports}
            disabled={loading || refreshing}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <RefreshCw size={15} className={(loading || refreshing) ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Filter by Status:</span>
            {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'IN_PROGRESS' ? 'In Progress' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Showing {filtered.length} of {reports.length} issue(s)
          </span>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[600px] relative"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={32} className="animate-spin text-sky-500" />
              <span className="text-sm font-medium">Loading assigned building map...</span>
            </div>
          ) : (
            <MapContainer
              center={[22.2887, 73.3634]}
              zoom={15}
              scrollWheelZoom
              className="h-full w-full"
            >
              <ResizeMap />
              <FitBounds points={validReportPoints} />
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {filtered
                .filter(r => r.location?.latitude && r.location?.longitude)
                .map(r => (
                  <Marker
                    key={r._id}
                    position={[r.location.latitude, r.location.longitude]}
                    icon={makeIcon(r.status)}
                  >
                    <Popup>
                      <div className="text-sm space-y-1">
                        <strong>{r.aiAnalysis?.detectedType?.replace(/_/g, ' ')}</strong>
                        <div className={`text-xs font-medium ${
                          r.status === 'PENDING' ? 'text-yellow-600' :
                          r.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {r.status?.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.location?.building || 'Campus'} {r.location?.room ? `· Room ${r.location.room}` : ''}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          )}
        </motion.div>

      </div>

      {/* Mandatory Password Change Modal */}
      <AnimatePresence>
        {showPasswordChangeModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-sky-100"
            >
              <div className="flex items-center gap-3 mb-4 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <ShieldAlert size={24} className="shrink-0" />
                <div>
                  <h3 className="font-bold text-sm">Security Password Change Required</h3>
                  <p className="text-[11px] text-amber-700">You are using a temporary password. Please set a new personal password to access your assigned building issues.</p>
                </div>
              </div>

              {passwordChangeError && (
                <div className="mb-4 bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200">
                  {passwordChangeError}
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs">Temporary Password *</label>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={currentPasswordInput}
                    onChange={e => setCurrentPasswordInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Enter current temporary password"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs">New Password *</label>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs">Confirm New Password *</label>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={confirmPasswordInput}
                    onChange={e => setConfirmPasswordInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Re-enter new password"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="flex items-center gap-1 hover:text-slate-800 transition cursor-pointer"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPass ? 'Hide passwords' : 'Show passwords'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  <span>{changingPassword ? 'Updating Password...' : 'Save New Password & Continue'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default OfficerMap
