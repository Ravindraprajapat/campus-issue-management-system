import React, { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import Navbar from '../components/Navbar'
import { MapPin, Building, ChevronDown, ChevronUp, X, User, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

/* ── Fix default icon path (prevents broken img) ── */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
})

/* ── Custom SVG DivIcon for Issue Markers ── */
function makeMarkerIcon(status, priority) {
  let color = '#0ea5e9' // sky blue default
  if (status === 'RESOLVED') {
    color = '#10b981' // emerald green
  } else if (status === 'IN_PROGRESS') {
    color = '#3b82f6' // royal blue
  } else if (priority === 'HIGH' || status === 'PENDING') {
    color = '#ef4444' // red
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 36 44">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="18" cy="18" r="7" fill="white"/>
    </svg>`

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42]
  })
}

function ResizeMap() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 200) }, [map])
  return null
}

const STATUS_COLORS = {
  PENDING: 'text-yellow-700 bg-yellow-100 border-yellow-200',
  IN_PROGRESS: 'text-blue-700 bg-blue-100 border-blue-200',
  RESOLVED: 'text-green-700 bg-green-100 border-green-200'
}

const STATUS_ICONS = {
  PENDING: <AlertCircle size={12} className="inline mr-1" />,
  IN_PROGRESS: <Clock size={12} className="inline mr-1" />,
  RESOLVED: <CheckCircle size={12} className="inline mr-1" />
}

const AdminMap = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [buildingFilter, setBuildingFilter] = useState('ALL')
  const [expandedBuilding, setExpandedBuilding] = useState(null)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/reports`, { withCredentials: true })
      setReports(data.reports || [])
    } catch (e) {
      console.error('Failed to fetch admin reports:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports() }, [])

  /* ── Group reports strictly by actual location.building ── */
  const buildingSummary = useMemo(() => {
    if (!reports.length) return []

    const map = {}
    reports.forEach(r => {
      const bName = (r.location?.building && r.location.building.trim())
        ? r.location.building.trim()
        : 'Building Not Specified'

      if (!map[bName]) {
        map[bName] = {
          building: bName,
          total: 0,
          pending: 0,
          inProgress: 0,
          resolved: 0,
          reports: []
        }
      }
      map[bName].reports.push(r)
      map[bName].total++
      if (r.status === 'PENDING') map[bName].pending++
      else if (r.status === 'IN_PROGRESS') map[bName].inProgress++
      else if (r.status === 'RESOLVED') map[bName].resolved++
    })

    return Object.values(map).sort((a, b) => (b.pending + b.inProgress) - (a.pending + a.inProgress))
  }, [reports])

  /* ── Filter valid GPS coordinate reports for map rendering ── */
  const validGpsReports = useMemo(() => {
    return reports.filter(r => {
      const lat = Number(r.location?.latitude)
      const lng = Number(r.location?.longitude)
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0)
    })
  }, [reports])

  /* ── Building detail modal filtered reports ── */
  const modalReports = useMemo(() => {
    if (!selectedBuilding) return []
    const targetBuilding = selectedBuilding.trim()
    const bObj = buildingSummary.find(b => (b.building || '').trim() === targetBuilding)
    const reps = bObj?.reports || []
    return buildingFilter === 'ALL' ? reps : reps.filter(r => r.status === buildingFilter)
  }, [selectedBuilding, buildingSummary, buildingFilter])

  const selectBuilding = (bName) => {
    setSelectedBuilding(bName ? bName.trim() : null)
    setBuildingFilter('ALL')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <div className="pt-[120px] pb-10 px-4 md:px-8 max-w-[1500px] mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Parul University Campus Map</h1>
            <p className="text-slate-500 mt-1">Real-time GPS issue distribution & building summary</p>
          </div>
          <button onClick={fetchReports} disabled={loading}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        <div className="flex gap-5 h-[700px]">

          {/* ── LEFT PANEL: Building Summary ── */}
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-y-auto">

            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 z-10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Building size={16} className="text-sky-500" />
                  Building Summary
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Parul University Campus Buildings</p>
              </div>
              <span className="text-xs bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full">
                {buildingSummary.length}
              </span>
            </div>

            {loading ? (
              <div className="p-6 text-slate-400 text-sm text-center flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Loading building data...
              </div>
            ) : buildingSummary.length === 0 ? (
              <div className="p-6 text-slate-400 text-sm text-center">No building issue data found</div>
            ) : (
              <div className="p-3 space-y-2">
                {buildingSummary.map(item => {
                  const { building, pending, inProgress, resolved, total, reports: bReports } = item
                  const isExpanded = expandedBuilding === building

                  return (
                    <div key={building}
                      className={`rounded-xl border transition ${
                        isExpanded
                          ? 'border-sky-300 bg-sky-50/50'
                          : 'border-slate-100 hover:border-sky-200 hover:bg-slate-50'
                      }`}>

                      {/* Building Header */}
                      <div className="flex items-center justify-between p-3 cursor-pointer"
                        onClick={() => setExpandedBuilding(isExpanded ? null : building)}>
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Building size={14} className="text-sky-500 shrink-0" />
                          <span className="font-semibold text-sm text-slate-800 leading-tight truncate">{building}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{total}</span>
                          {isExpanded
                            ? <ChevronUp size={14} className="text-slate-400" />
                            : <ChevronDown size={14} className="text-slate-400" />}
                        </div>
                      </div>

                      {/* Status Pills */}
                      <div className="px-3 pb-2 flex gap-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">{pending} Pending</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{inProgress} In Progress</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">{resolved} Resolved</span>
                      </div>

                      {/* View Issues Button */}
                      <div className="px-3 pb-3">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            selectBuilding(building)
                          }}
                          className="w-full text-xs bg-sky-500 hover:bg-sky-600 text-white py-1.5 rounded-lg font-medium transition cursor-pointer shadow-xs">
                          View Issues →
                        </button>
                      </div>

                      {/* Expanded Officer / Staff Info */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-slate-100 bg-white rounded-b-xl">
                            <div className="p-3 space-y-1.5">
                              {bReports.filter(r => r.assignedTo).length > 0 ? (
                                [...new Map(
                                  bReports
                                    .filter(r => r.assignedTo)
                                    .map(r => [r.assignedTo._id, r.assignedTo])
                                ).values()].map(officer => (
                                  <div key={officer._id} className="flex items-center gap-2 text-xs text-slate-600">
                                    <User size={11} className="text-sky-500" />
                                    <span className="font-medium">{officer.name}</span>
                                    {officer.department && <span className="text-[10px] text-slate-400">({officer.department})</span>}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400">No staff assigned</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* ── MAP CONTAINER: Actual GPS Markers Only ── */}
          <div className="flex-1 rounded-2xl overflow-hidden shadow-md border border-slate-100 relative">
            {!loading && (
              <MapContainer
                center={[22.2887, 73.3634]}
                zoom={15}
                scrollWheelZoom
                className="h-full w-full">
                <ResizeMap />
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render Markers for Valid GPS Reports Only */}
                {validGpsReports.map(r => {
                  const lat = Number(r.location.latitude)
                  const lng = Number(r.location.longitude)

                  return (
                    <Marker
                      key={r._id}
                      position={[lat, lng]}
                      icon={makeMarkerIcon(r.status, r.priorityLevel)}
                    >
                      <Popup minWidth={240}>
                        <div className="p-1 space-y-2">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                            <strong className="text-slate-900 text-sm font-bold">
                              {r.aiAnalysis?.detectedType?.replace('_', ' ') || 'Campus Issue'}
                            </strong>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${STATUS_COLORS[r.status] || 'bg-slate-100'}`}>
                              {STATUS_ICONS[r.status]}
                              {r.status?.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1">
                            <div>
                              <span className="text-slate-400">Building: </span>
                              <span className="font-semibold text-slate-800">
                                {r.location?.building || 'Building Not Specified'}
                              </span>
                            </div>

                            {r.location?.room && (
                              <div>
                                <span className="text-slate-400">Room: </span>
                                <span className="font-medium text-sky-600">{r.location.room}</span>
                              </div>
                            )}

                            <div>
                              <span className="text-slate-400">Priority: </span>
                              <span className={`font-semibold ${
                                r.priorityLevel === 'HIGH' ? 'text-red-600' :
                                r.priorityLevel === 'MEDIUM' ? 'text-orange-600' : 'text-slate-600'
                              }`}>
                                {r.priorityLevel || 'NORMAL'}
                              </span>
                            </div>

                            {r.reportedBy?.name && (
                              <div>
                                <span className="text-slate-400">Reported By: </span>
                                <span className="font-medium text-slate-700">{r.reportedBy.name}</span>
                              </div>
                            )}

                            {r.location?.address && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                {r.location.address}
                              </div>
                            )}
                          </div>

                          {r.imageUrl && (
                            <div className="pt-1">
                              <a href={r.imageUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={r.imageUrl}
                                  alt="Issue evidence"
                                  className="w-full h-24 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition"
                                />
                              </a>
                            </div>
                          )}

                          <button
                            onClick={() => selectBuilding((r.location?.building || '').trim() || 'Building Not Specified')}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white text-xs py-1.5 rounded-lg font-medium transition cursor-pointer mt-1">
                            View All Building Issues →
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            )}

            {loading && (
              <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50">
                <RefreshCw size={20} className="animate-spin mr-2" /> Loading map & GPS markers...
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
          <span className="font-medium">Marker Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Pending / High Priority
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Resolved
          </span>
          <span className="text-slate-400 ml-auto">
            Displaying {validGpsReports.length} of {reports.length} reports with valid GPS coordinates
          </span>
        </div>

        {/* ── BUILDING DETAIL MODAL ── */}
        <AnimatePresence>
          {selectedBuilding && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4"
              onClick={() => setSelectedBuilding(null)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col border border-sky-100">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building size={18} className="text-sky-500" />
                      <h2 className="text-xl font-bold text-slate-900">{selectedBuilding}</h2>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {(() => {
                        const targetBuilding = selectedBuilding.trim()
                        const bObj = buildingSummary.find(b => (b.building || '').trim() === targetBuilding)
                        return bObj ? (
                          <>
                            <span className="text-xs text-slate-500 font-semibold">{bObj.total} total</span>
                            <span className="text-xs text-yellow-600 font-semibold">{bObj.pending} pending</span>
                            <span className="text-xs text-blue-600 font-semibold">{bObj.inProgress} in progress</span>
                            <span className="text-xs text-green-600 font-semibold">{bObj.resolved} resolved</span>
                          </>
                        ) : null
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={buildingFilter}
                      onChange={e => setBuildingFilter(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none cursor-pointer bg-white">
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                    <button
                      onClick={() => setSelectedBuilding(null)}
                      className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition">
                      <X size={18} className="text-slate-500" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-3">
                  {modalReports.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No issues found matching selected status filter</div>
                  ) : (
                    modalReports.map(r => (
                      <div key={r._id}
                        className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900 text-sm">
                                {r.aiAnalysis?.detectedType?.replace('_', ' ') || 'Unknown Issue'}
                              </span>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_COLORS[r.status] || 'bg-slate-100'}`}>
                                {STATUS_ICONS[r.status]}
                                {r.status?.replace('_', ' ')}
                              </span>
                            </div>

                            {r.location?.room && (
                              <p className="text-xs text-sky-600 font-medium mb-1">
                                Room / Location: {r.location.room}
                              </p>
                            )}

                            <p className="text-xs text-slate-400 mb-2 truncate">
                              {r.location?.address || `${r.location?.latitude?.toFixed(5)}, ${r.location?.longitude?.toFixed(5)}`}
                            </p>

                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                              <span>👤 {r.reportedBy?.name || 'Anonymous'}</span>
                              {r.assignedTo && (
                                <span className="text-sky-600 font-medium">🔧 {r.assignedTo.name}</span>
                              )}
                              <span>📅 {new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                              <span className={`font-semibold ${
                                r.priorityLevel === 'HIGH' ? 'text-red-500' :
                                r.priorityLevel === 'MEDIUM' ? 'text-orange-500' : 'text-slate-400'
                              }`}>⚡ {r.priorityLevel || 'LOW'}</span>
                            </div>
                          </div>

                          {r.imageUrl && (
                            <a href={r.imageUrl} target="_blank" rel="noreferrer">
                              <img src={r.imageUrl} alt="Issue"
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0 hover:scale-105 transition" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AdminMap
