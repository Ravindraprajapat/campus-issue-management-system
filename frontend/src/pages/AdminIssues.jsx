import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import Navbar from '../components/Navbar'
import {
  Filter, RefreshCw, CheckCircle, Clock, AlertCircle, Building,
  ChevronDown, ChevronUp, UserCheck, Trash2, MapPin, X, UserPlus, Copy, Check, Key,
  Eye, Mail, Phone, Briefcase, Calendar, ShieldCheck, FileText, List, Zap, Search, Users, Loader2
} from 'lucide-react'

import { PARUL_CAMPUS_BUILDINGS } from '../config/parulCampusConfig'

import AdminDepartments from '../components/AdminDepartments'
import AdminIssueTypes from '../components/AdminIssueTypes'

const CAMPUS_BUILDINGS = PARUL_CAMPUS_BUILDINGS

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-100 text-green-700 border-green-200'
}
const STATUS_ICONS = {
  PENDING: <AlertCircle size={13} />,
  IN_PROGRESS: <Clock size={13} />,
  RESOLVED: <CheckCircle size={13} />
}
const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-gray-100 text-gray-600'
}

const DEFAULT_DEPARTMENTS_LIST = [
  { value: 'ELECTRICAL_ISSUES', label: 'Electrical Issues' },
  { value: 'PLUMBING_WATER_ISSUES', label: 'Plumbing & Water Issues' },
  { value: 'INFRASTRUCTURE_FURNITURE_ISSUES', label: 'Infrastructure & Furniture Issues' },
  { value: 'WASHROOM_ISSUES', label: 'Washroom Issues' },
  { value: 'IT_NETWORK_ISSUES', label: 'IT & Network Issues' },
  { value: 'CLEANLINESS_WASTE_ISSUES', label: 'Cleanliness & Waste Issues' },
  { value: 'SAFETY_SECURITY_ISSUES', label: 'Safety & Security Issues' },
  { value: 'LIFT_MECHANICAL_ISSUES', label: 'Lift & Mechanical Issues' },
  { value: 'OUTDOOR_CAMPUS_ISSUES', label: 'Outdoor & Campus Issues' },
  { value: 'OTHER_MAINTENANCE_ISSUES', label: 'Other Maintenance Issues' }
]

const DEPARTMENTS_LIST = DEFAULT_DEPARTMENTS_LIST

const AdminIssues = ({ defaultTab = 'issues' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab) // 'issues' | 'departments' | 'issuetypes'

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab)
    }
  }, [defaultTab])
  const [departmentsList, setDepartmentsList] = useState(DEFAULT_DEPARTMENTS_LIST)
  const DEPARTMENT_LABELS = Object.fromEntries(departmentsList.map(d => [d.value, d.label]))

  const [reports, setReports] = useState([])
  const [buildings, setBuildings] = useState([]) // building summary
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [filters, setFilters] = useState({ status: 'ALL', issue: 'ALL', building: 'ALL', department: 'ALL' })
  const [cleaning, setCleaning] = useState(false)
  const [cleanMsg, setCleanMsg] = useState('')

  // Building Overview search, filtering & accordion expansion state
  const [bSearchTerm, setBSearchTerm] = useState('')
  const [bDeptFilter, setBDeptFilter] = useState('ALL')
  const [bAssignmentFilter, setBAssignmentFilter] = useState('ALL') // ALL, ASSIGNED, UNASSIGNED
  const [expandedBuildings, setExpandedBuildings] = useState([])

  const toggleBuildingExpand = (bName) => {
    setExpandedBuildings(prev =>
      prev.includes(bName) ? prev.filter(b => b !== bName) : [...prev, bName]
    )
  }

  // Selected Officer Detail View State (for quick view from Building table)
  const [selectedOfficerId, setSelectedOfficerId] = useState(null)
  const [officerDetails, setOfficerDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  // Auto-Assign Unassigned State
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false)
  const [autoAssignPreview, setAutoAssignPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [executingAutoAssign, setExecutingAutoAssign] = useState(false)
  const [autoAssignMsg, setAutoAssignMsg] = useState('')

  // Maintenance Staff Account Creation Modal State
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    mobile: '',
    employeeId: '',
    department: '',
    designation: '',
    assignedBuildings: []
  })
  const [creatingStaff, setCreatingStaff] = useState(false)
  const [createStaffError, setCreateStaffError] = useState('')
  const [createdTempPassword, setCreatedTempPassword] = useState('')
  const [copiedCreds, setCopiedCreds] = useState(false)
  const [deptsLoading, setDeptsLoading] = useState(false)
  const [deptsError, setDeptsError] = useState('')

  const fetchActiveDepartments = useCallback(async () => {
    setDeptsLoading(true)
    setDeptsError('')
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/active-departments`, { withCredentials: true })
      if (data.success && Array.isArray(data.departments)) {
        setDepartmentsList(data.departments.map(d => ({ value: d.code, label: d.name })))
      } else {
        setDeptsError('Unable to load departments. Please try again.')
      }
    } catch (err) {
      console.error('Failed to fetch active departments:', err)
      setDeptsError('Unable to load departments. Please try again.')
    } finally {
      setDeptsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showStaffModal) {
      fetchActiveDepartments()
    }
  }, [showStaffModal, fetchActiveDepartments])

  const handleCreateStaffForProblem = (report) => {
    const targetDept = report?.department || ''
    const targetBldg = report?.location?.building || report?.location?.ward || ''

    setStaffForm({
      name: '',
      email: '',
      mobile: '',
      employeeId: '',
      department: targetDept,
      designation: '',
      assignedBuildings: targetBldg ? [targetBldg] : []
    })
    setShowStaffModal(true)
  }

  // filtersActive = any filter is set → show complaints table
  const filtersActive = filters.status !== 'ALL' || filters.issue !== 'ALL' || filters.building !== 'ALL' || filters.department !== 'ALL'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [reportsRes, buildingRes, officersRes, deptsRes] = await Promise.all([
        axios.get(`${serverUrl}/api/admin/reports`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/building-summary`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/officers`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/active-departments`, { withCredentials: true }).catch(() => null)
      ])
      setReports(reportsRes.data.reports || [])
      setBuildings(buildingRes.data.buildings || buildingRes.data.wards || [])
      setOfficers(officersRes.data.officers || [])
      if (deptsRes?.data?.departments && deptsRes.data.departments.length > 0) {
        setDepartmentsList(deptsRes.data.departments.map(d => ({ value: d.code, label: d.name })))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleOpenAutoAssignModal = async () => {
    setShowAutoAssignModal(true)
    setLoadingPreview(true)
    setAutoAssignMsg('')
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/reports/preview-auto-assign`, { withCredentials: true })
      setAutoAssignPreview(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleConfirmAutoAssign = async () => {
    setExecutingAutoAssign(true)
    try {
      const { data } = await axios.post(`${serverUrl}/api/admin/reports/auto-assign-unassigned`, {}, { withCredentials: true })
      setAutoAssignMsg(data.message)
      fetchAll()
      setTimeout(() => {
        setShowAutoAssignModal(false)
        setAutoAssignMsg('')
      }, 2500)
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.message || 'Failed to auto-assign reports.')
    } finally {
      setExecutingAutoAssign(false)
    }
  }

  const handleOpenOfficerDetails = async (officerId) => {
    setSelectedOfficerId(officerId)
    setLoadingDetails(true)
    setDetailsError('')
    setOfficerDetails(null)
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/officers/${officerId}`, { withCredentials: true })
      setOfficerDetails(data)
    } catch (err) {
      console.error(err)
      setDetailsError(err?.response?.data?.message || 'Failed to fetch staff details.')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCloseOfficerDetails = () => {
    setSelectedOfficerId(null)
    setOfficerDetails(null)
    setDetailsError('')
  }

  const handleAddBuildingToStaffForm = (bldg) => {
    if (!bldg) return
    if (!staffForm.assignedBuildings.includes(bldg)) {
      setStaffForm(prev => ({
        ...prev,
        assignedBuildings: [...prev.assignedBuildings, bldg]
      }))
    }
  }

  const handleRemoveBuildingFromStaffForm = (bldg) => {
    setStaffForm(prev => ({
      ...prev,
      assignedBuildings: prev.assignedBuildings.filter(b => b !== bldg)
    }))
  }

  const handleCreateStaffSubmit = async (e) => {
    e.preventDefault()
    setCreateStaffError('')
    setCreatedTempPassword('')
    if (!staffForm.name || !staffForm.email || !staffForm.department || !staffForm.assignedBuildings || staffForm.assignedBuildings.length === 0) {
      setCreateStaffError('Name, email, department, and at least one assigned building are required.')
      return
    }

    setCreatingStaff(true)
    try {
      const payload = {
        ...staffForm,
        assignedBuilding: staffForm.assignedBuildings[0]
      }
      const { data } = await axios.post(
        `${serverUrl}/api/admin/officers`,
        payload,
        { withCredentials: true }
      )
      setCreatedTempPassword(data.tempPassword)
      fetchAll()
    } catch (err) {
      setCreateStaffError(err?.response?.data?.message || 'Failed to create Maintenance Staff account.')
    } finally {
      setCreatingStaff(false)
    }
  }

  const handleCopyCredentials = () => {
    const text = `Parul University Maintenance Staff Credentials:\nEmail: ${staffForm.email}\nTemporary Password: ${createdTempPassword}`
    navigator.clipboard.writeText(text)
    setCopiedCreds(true)
    setTimeout(() => setCopiedCreds(false), 3000)
  }

  const handleCloseStaffModal = () => {
    setShowStaffModal(false)
    setCreatedTempPassword('')
    setCreateStaffError('')
    setCopiedCreds(false)
    setStaffForm({
      name: '',
      email: '',
      mobile: '',
      employeeId: '',
      department: '',
      designation: '',
      assignedBuildings: []
    })
  }

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/reports/${id}/status`,
        { status: newStatus },
        { withCredentials: true }
      )
      setReports(prev => prev.map(r => r._id === id ? data.report : r))
    } catch (err) { console.error(err) }
    finally { setUpdatingId(null) }
  }

  const handleAssignOfficerToReport = async (reportId, officerId) => {
    setUpdatingId(reportId)
    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/reports/${reportId}/assign`,
        { officerId: officerId || null },
        { withCredentials: true }
      )
      setReports(prev => prev.map(r => r._id === reportId ? data.report : r))
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.message || 'Failed to assign officer to report.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleAssignBuildingOfficer = async (buildingName, officerId) => {
    setAssigningBuilding(buildingName)
    try {
      await axios.post(
        `${serverUrl}/api/admin/building-officer`,
        { building: buildingName, ward: buildingName, officerId: officerId || null },
        { withCredentials: true }
      )
      const { data } = await axios.get(`${serverUrl}/api/admin/building-summary`, { withCredentials: true })
      setBuildings(data.buildings || data.wards || [])
    } catch (err) { console.error(err) }
    finally { setAssigningBuilding(null) }
  }

  const clearFilters = () => setFilters({ status: 'ALL', issue: 'ALL', building: 'ALL', department: 'ALL' })

  const uniqueBuildings = [...new Set(reports.map(r => r.location?.building).filter(Boolean))]
  const issueTypes = [
    'FAN', 'LIGHT', 'PROJECTOR', 'PLUG_SOCKET', 'ELECTRICAL', 'BENCH', 'CHAIR',
    'DESK', 'DOOR', 'WINDOW', 'AC', 'WATER_LEAK', 'PLUMBING', 'WASHROOM', 'CLEANLINESS',
    'WIFI_NETWORK', 'LAB_EQUIPMENT', 'CLASSROOM_EQUIPMENT', 'HOSTEL_ISSUE', 'CANTEEN_ISSUE',
    'LIBRARY_ISSUE', 'SPORTS_FACILITY', 'OTHER'
  ]

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'PENDING').length,
    inProgress: reports.filter(r => r.status === 'IN_PROGRESS').length,
    resolved: reports.filter(r => r.status === 'RESOLVED').length
  }

  // Filtered complaints
  const filtered = reports.filter(r => {
    if (filters.status !== 'ALL' && r.status !== filters.status) return false
    if (filters.issue !== 'ALL' && r.aiAnalysis?.detectedType !== filters.issue && r.issueType !== filters.issue) return false
    if (filters.building !== 'ALL' && (r.location?.building !== filters.building)) return false
    if (filters.department !== 'ALL' && r.department !== filters.department) return false
    return true
  })

  const normB = (v) => String(v || '').trim().toLowerCase()

  const totalBuildings = buildings.length
  const buildingsWithStaffCount = buildings.filter(b => {
    const bName = b.building || b.ward
    return officers.some(o => normB(o.assignedBuilding || o.assignedWard) === normB(bName))
  }).length
  const unassignedBuildingsCount = totalBuildings - buildingsWithStaffCount
  const totalStaffCount = officers.length

  const filteredBuildings = buildings.filter(b => {
    const bName = b.building || b.ward
    const bStaff = officers.filter(o => normB(o.assignedBuilding || o.assignedWard) === normB(bName))
    const isAssigned = bStaff.length > 0

    if (bAssignmentFilter === 'ASSIGNED' && !isAssigned) return false
    if (bAssignmentFilter === 'UNASSIGNED' && isAssigned) return false

    if (bDeptFilter !== 'ALL') {
      const hasDeptStaff = bStaff.some(o => normB(o.department) === normB(bDeptFilter))
      const bReports = reports.filter(r => normB(r.location?.building || r.location?.ward) === normB(bName))
      const hasDeptReport = bReports.some(r => normB(r.department) === normB(bDeptFilter))
      if (!hasDeptStaff && !hasDeptReport) return false
    }

    if (bSearchTerm.trim()) {
      const q = bSearchTerm.trim().toLowerCase()
      const nameMatch = bName.toLowerCase().includes(q)
      const staffMatch = bStaff.some(o => o.name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q) || (DEPARTMENT_LABELS[o.department] || o.department || '').toLowerCase().includes(q))
      if (!nameMatch && !staffMatch) return false
    }

    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <div className="pt-[120px] pb-16 px-6 md:px-10 max-w-[1400px] mx-auto">

        {/* 1. PAGE HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900">Building & Maintenance Assignment</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Auto Assignment: ON
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              Automatically assigned maintenance staff based on building, department and workload.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleOpenAutoAssignModal}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer">
              <Zap size={16} />
              Assignment Status & Diagnostics
            </button>
            <button onClick={() => setShowStaffModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer">
              <UserPlus size={16} />
              Create Staff Account
            </button>
            <button onClick={fetchAll} disabled={loading}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-200 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-2.5 font-bold text-xs transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'issues'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building size={16} /> Issue Complaints & Building Assignments
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2.5 font-bold text-xs transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'departments'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building size={16} /> Department Management
          </button>
          <button
            onClick={() => setActiveTab('issuetypes')}
            className={`px-4 py-2.5 font-bold text-xs transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'issuetypes'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap size={16} /> Issue Types
          </button>
        </div>

        {activeTab === 'departments' ? (
          <AdminDepartments />
        ) : activeTab === 'issuetypes' ? (
          <AdminIssueTypes />
        ) : (
          <>
            {cleanMsg && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
                {cleanMsg}
              </div>
            )}

        {/* 2. SUMMARY CARDS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Buildings', value: totalBuildings, icon: <Building size={20} className="text-sky-600" />, bg: 'bg-white', color: 'text-slate-900' },
            { label: 'Buildings with Assigned Staff', value: buildingsWithStaffCount, icon: <UserCheck size={20} className="text-emerald-600" />, bg: 'bg-emerald-50/60', color: 'text-emerald-700' },
            { label: 'Unassigned Buildings', value: unassignedBuildingsCount, icon: <AlertCircle size={20} className="text-amber-600" />, bg: 'bg-amber-50/60', color: 'text-amber-700' },
            { label: 'Total Maintenance Staff', value: totalStaffCount, icon: <Users size={20} className="text-indigo-600" />, bg: 'bg-indigo-50/60', color: 'text-indigo-700' }
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between`}>
              <div>
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">{s.label}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/80 shadow-xs border border-slate-100">
                {s.icon}
              </div>
            </div>
          ))}
        </motion.div>

        {/* 3. SEARCH + FILTER BAR FOR BUILDING OVERVIEW */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search building name, staff member, or department..."
                value={bSearchTerm}
                onChange={e => setBSearchTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white"
              />
              {bSearchTerm && (
                <button onClick={() => setBSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Department Filter */}
              <div className="relative">
                <select
                  value={bDeptFilter}
                  onChange={e => setBDeptFilter(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium focus:ring-2 focus:ring-sky-400 bg-white cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departmentsList.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Assignment Status Filter */}
              <div className="relative">
                <select
                  value={bAssignmentFilter}
                  onChange={e => setBAssignmentFilter(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium focus:ring-2 focus:ring-sky-400 bg-white cursor-pointer"
                >
                  <option value="ALL">All Assignment Statuses</option>
                  <option value="ASSIGNED">✓ Assigned</option>
                  <option value="UNASSIGNED">⚠ Unassigned</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {(bSearchTerm || bDeptFilter !== 'ALL' || bAssignmentFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setBSearchTerm('')
                    setBDeptFilter('ALL')
                    setBAssignmentFilter('ALL')
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  <X size={13} /> Reset Filters
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* DEFAULT VIEW: Expandable Building Overview + Staff Assignments */}
        <AnimatePresence mode="wait">
          {!filtersActive ? (
            <motion.div key="building-view"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}>

              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-sky-500" />
                  <h2 className="font-semibold text-slate-800 text-lg">Building Directory & Staff Workload</h2>
                </div>
                <span className="text-xs text-slate-400">({filteredBuildings.length} buildings)</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Loading building data...
                </div>
              ) : filteredBuildings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">
                  No buildings match the selected search or filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBuildings.map(w => {
                    const bName = w.building || w.ward
                    const bStaff = officers.filter(o => normB(o.assignedBuilding || o.assignedWard) === normB(bName))
                    const bReports = reports.filter(r => normB(r.location?.building || r.location?.ward) === normB(bName))
                    const isExpanded = expandedBuildings.includes(bName)
                    const isAssigned = bStaff.length > 0

                    return (
                      <div key={bName} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
                        {/* 6. COLLAPSED BUILDING ROW */}
                        <div
                          onClick={() => toggleBuildingExpand(bName)}
                          className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition"
                        >
                          <div className="flex items-center gap-3 min-w-[260px]">
                            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 shrink-0">
                              <Building size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-base">{bName}</h3>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-semibold text-slate-700">{w.total || bReports.length} Total Issues</span>
                                <span>•</span>
                                <span>{bStaff.length} Maintenance Staff</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Overview Badges */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-center gap-1">
                              <AlertCircle size={12} /> {w.pending} Pending
                            </span>
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <Clock size={12} /> {w.inProgress} In Progress
                            </span>
                            <span className="px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                              <CheckCircle size={12} /> {w.resolved} Resolved
                            </span>
                          </div>

                          {/* Maintenance Staff Overview Preview (Section 5, 16) */}
                          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 min-w-[200px]">
                            <Users size={14} className="text-slate-400 shrink-0" />
                            {bStaff.length > 0 ? (
                              <span className="font-medium text-slate-800 truncate max-w-[220px]">
                                {bStaff.slice(0, 2).map(s => s.name).join(', ')}
                                {bStaff.length > 2 && ` (+${bStaff.length - 2} more)`}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium">No Staff Assigned</span>
                            )}
                          </div>

                          {/* Assignment Status Pill (Section 4, 13) */}
                          <div className="flex items-center gap-3">
                            {isAssigned ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle size={12} /> ✓ Auto Assigned
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">Assigned automatically</div>
                              </div>
                            ) : (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  <AlertCircle size={12} /> ⚠ Unassigned
                                </span>
                                <div className="text-[10px] text-amber-600 mt-0.5">No eligible staff available</div>
                              </div>
                            )}

                            <button
                              type="button"
                              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* EXPANDED BUILDING SECTION (Section 6, 7, 8, 9, 10, 11, 12) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6"
                            >
                              {/* 7. BUILDING OVERVIEW SECTION */}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                  <Building size={14} className="text-sky-500" />
                                  <span>Building Overview — {bName}</span>
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="bg-white border border-slate-200/60 rounded-xl p-3.5 shadow-xs">
                                    <div className="text-xs text-slate-500 font-medium">Total Issues</div>
                                    <div className="text-xl font-bold text-slate-900 mt-0.5">{w.total || bReports.length}</div>
                                  </div>
                                  <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3.5 shadow-xs">
                                    <div className="text-xs text-amber-700 font-medium">Pending</div>
                                    <div className="text-xl font-bold text-amber-800 mt-0.5">{w.pending}</div>
                                  </div>
                                  <div className="bg-blue-50/80 border border-blue-200/60 rounded-xl p-3.5 shadow-xs">
                                    <div className="text-xs text-blue-700 font-medium">In Progress</div>
                                    <div className="text-xl font-bold text-blue-800 mt-0.5">{w.inProgress}</div>
                                  </div>
                                  <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl p-3.5 shadow-xs">
                                    <div className="text-xs text-emerald-700 font-medium">Resolved</div>
                                    <div className="text-xl font-bold text-emerald-800 mt-0.5">{w.resolved}</div>
                                  </div>
                                </div>
                              </div>

                              {/* 8. ASSIGNED MAINTENANCE STAFF SECTION (Multiple Staff) */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Users size={14} className="text-indigo-500" />
                                    <span>Assigned Maintenance Staff ({bStaff.length})</span>
                                  </h4>
                                  <span className="text-[11px] text-slate-400">Multiple officers assigned per department</span>
                                </div>

                                {bStaff.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {bStaff.map(o => {
                                      // 9. Workload Indicator: Active Workload = Pending + In Progress
                                      const activeWorkload = bReports.filter(r =>
                                        String(r.assignedTo?._id || r.assignedTo) === String(o._id) &&
                                        (r.status === 'PENDING' || r.status === 'IN_PROGRESS')
                                      ).length

                                      const initials = o.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST'

                                      return (
                                        <div key={o._id} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs relative hover:border-sky-300 transition">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-100 shrink-0">
                                                {initials}
                                              </div>
                                              <div>
                                                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                  <span>{o.name}</span>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenOfficerDetails(o._id); }}
                                                    title="View Officer Details"
                                                    className="text-sky-600 hover:text-sky-800 transition cursor-pointer p-0.5"
                                                  >
                                                    <Eye size={14} />
                                                  </button>
                                                </div>
                                                <div className="text-xs text-slate-400 truncate max-w-[170px]">{o.email}</div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                                              {DEPARTMENT_LABELS[o.department] || o.department || 'Maintenance'}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                              activeWorkload > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>
                                              Active Workload: {activeWorkload}
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  /* 12. UNASSIGNED STATE */
                                  <div className="bg-amber-50/70 border border-amber-200 text-amber-800 text-xs p-4 rounded-xl flex items-start gap-3">
                                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                      <div className="font-bold text-amber-900 text-sm">⚠ Unassigned — No eligible maintenance staff available</div>
                                      <div className="text-amber-700 text-xs mt-0.5">
                                        No active maintenance officer is currently assigned to <strong>{bName}</strong>. The system will automatically route issues when an officer with matching department and building is onboarded.
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 10. ISSUES SECTION & 11. ISSUE -> STAFF RELATIONSHIP */}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                  <FileText size={14} className="text-sky-500" />
                                  <span>Building Maintenance Issues ({bReports.length})</span>
                                </h4>

                                {bReports.length > 0 ? (
                                  <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600">
                                            <th className="text-left px-4 py-2.5 font-semibold">Issue Type</th>
                                            <th className="text-left px-4 py-2.5 font-semibold">Department</th>
                                            <th className="text-left px-4 py-2.5 font-semibold">Assigned Staff</th>
                                            <th className="text-left px-4 py-2.5 font-semibold">Priority</th>
                                            <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                                            <th className="text-left px-4 py-2.5 font-semibold">Reported Date</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {bReports.map(r => (
                                            <tr key={r._id} className="hover:bg-slate-50/80 transition">
                                              <td className="px-4 py-3 font-semibold text-slate-800">
                                                {r.issueType?.replace('_', ' ') || r.aiAnalysis?.detectedType?.replace('_', ' ') || 'Issue'}
                                                {r.location?.room && <span className="text-slate-400 font-normal ml-1"> (Room {r.location.room})</span>}
                                              </td>
                                              <td className="px-4 py-3 text-slate-600">
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                  {DEPARTMENT_LABELS[r.department] || r.department || 'N/A'}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3">
                                                {r.assignedTo ? (
                                                  <div className="font-semibold text-emerald-700 flex items-center gap-1">
                                                    <UserCheck size={12} />
                                                    <span>{r.assignedTo.name || 'Assigned Staff'}</span>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1">
                                                    <span className="text-amber-600 font-bold text-[11px] flex items-center gap-1">
                                                      <AlertCircle size={12} /> ⚠ Unassigned
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleCreateStaffForProblem(r)}
                                                      className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md transition cursor-pointer border border-amber-300"
                                                      title="Create Maintenance Staff for this issue"
                                                    >
                                                      <UserPlus size={10} /> + Create Staff for This Problem
                                                    </button>
                                                  </div>
                                                )}
                                              </td>
                                              <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_COLORS[r.priorityLevel] || 'bg-gray-100 text-gray-600'}`}>
                                                  {r.priorityLevel || 'LOW'}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[r.status]}`}>
                                                  {STATUS_ICONS[r.status]}
                                                  {r.status?.replace('_', ' ')}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-slate-400">
                                                {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center text-slate-400 text-xs">
                                    No complaints are registered for this building location yet.
                                  </div>
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

              <p className="mt-3 text-xs text-slate-400">
                Click any building card to expand detailed building overview, assigned staff list, and active issue details.
              </p>
            </motion.div>

          ) : (
            /* FILTERED VIEW: Complaints Table */
            <motion.div key="complaints-view"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}>

              <div className="flex items-center gap-2 mb-4">
                <Filter size={16} className="text-sky-500" />
                <h2 className="font-semibold text-slate-800">Campus Issues</h2>
                <span className="text-xs text-slate-400">({filtered.length} results)</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-20 text-slate-400">
                    <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">No issues match the selected filters</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">#</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Issue Type</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Reported By</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Building / Room</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Priority</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Staff</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Image</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Update Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r, i) => (
                          <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                            <td className="px-4 py-4 text-slate-400">{i + 1}</td>
                            <td className="px-4 py-4 font-medium text-slate-800">
                              {r.aiAnalysis?.detectedType?.replace('_', ' ') || 'N/A'}
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium text-slate-800">{r.reportedBy?.name || 'N/A'}</div>
                              <div className="text-xs text-slate-400">{r.reportedBy?.email}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-slate-800 font-semibold text-xs">{r.location?.building || r.location?.ward || 'Parul University'}</div>
                              {r.location?.room && (
                                <div className="text-xs text-sky-600 font-medium">Room: {r.location.room}</div>
                              )}
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {r.location?.address || `${r.location?.latitude?.toFixed(4)}, ${r.location?.longitude?.toFixed(4)}`}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[r.priorityLevel] || 'bg-gray-100 text-gray-600'}`}>
                                {r.priorityLevel || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[r.status]}`}>
                                {STATUS_ICONS[r.status]}
                                {r.status?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-600">
                              {(() => {
                                const rBuilding = (r.location?.building || r.location?.ward || '').trim().toLowerCase()
                                const rDept = String(r.department || '').trim().toLowerCase()
                                const eligibleOfficers = officers.filter(o => {
                                  if (o.role && o.role !== 'officer') return false
                                  if (String(o.department || '').trim().toLowerCase() !== rDept) return false
                                  const oBuilding = (o.assignedBuilding || o.assignedWard || '').trim().toLowerCase()
                                  return Boolean(rBuilding) && Boolean(oBuilding) && oBuilding === rBuilding
                                })
                                const optionsList = [...eligibleOfficers]
                                if (r.assignedTo && !optionsList.some(o => o._id === r.assignedTo._id)) {
                                  optionsList.unshift(r.assignedTo)
                                }

                                return (
                                  <div className="relative">
                                    <select
                                      value={r.assignedTo?._id || ''}
                                      disabled={updatingId === r._id}
                                      onChange={e => handleAssignOfficerToReport(r._id, e.target.value)}
                                      className="appearance-none border border-slate-200 rounded-lg px-2.5 py-1 pr-6 text-xs focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white cursor-pointer disabled:opacity-50 min-w-[130px]">
                                      <option value="">Unassigned</option>
                                      {optionsList.map(o => (
                                        <option key={o._id} value={o._id}>
                                          {o.name}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown size={11} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-4">
                              {r.imageUrl ? (
                                <a href={r.imageUrl} target="_blank" rel="noreferrer">
                                  <img src={r.imageUrl} alt="issue" className="w-12 h-12 object-cover rounded-lg border border-slate-200 hover:scale-110 transition" />
                                </a>
                              ) : <span className="text-slate-300 text-xs">No image</span>}
                            </td>
                            <td className="px-4 py-4">
                              <div className="relative">
                                <select value={r.status} disabled={updatingId === r._id}
                                  onChange={e => handleStatusChange(r._id, e.target.value)}
                                  className="appearance-none border border-slate-200 rounded-lg px-3 py-1.5 pr-7 text-xs focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white cursor-pointer disabled:opacity-50">
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="RESOLVED">Resolved</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
      </div>

      {/* AUTO-ASSIGN UNASSIGNED ISSUES MODAL */}
      <AnimatePresence>
        {showAutoAssignModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-indigo-100 relative my-8 overflow-hidden"
            >
              <button
                onClick={() => setShowAutoAssignModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="bg-indigo-950 text-white p-6">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
                  <Zap size={16} />
                  <span>Automatic Assignment System</span>
                </div>
                <h2 className="text-xl font-bold">Officer Assignment Diagnostics</h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Officer assignment is fully automatic. Issues are assigned immediately upon report submission or staff onboarding whenever an officer's department and assigned building match the complaint.
                </p>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {autoAssignMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl font-medium">
                    {autoAssignMsg}
                  </div>
                )}

                {loadingPreview ? (
                  <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
                    <RefreshCw size={18} className="animate-spin mr-2 text-indigo-500" />
                    Checking unassigned issues against active maintenance officers...
                  </div>
                ) : autoAssignPreview ? (
                  <div className="space-y-4">
                    {/* Summary metrics */}
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="text-lg font-bold text-slate-800">{autoAssignPreview.totalUnassigned}</div>
                        <div className="text-[11px] text-slate-500">Unassigned Total</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                        <div className="text-lg font-bold text-emerald-700">{autoAssignPreview.eligibleCount}</div>
                        <div className="text-[11px] text-emerald-600">Eligible to Assign</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <div className="text-lg font-bold text-amber-700">{autoAssignPreview.remainingUnassignedCount}</div>
                        <div className="text-[11px] text-amber-600">No Officer Match</div>
                      </div>
                    </div>

                    {/* Eligible Assignments List */}
                    {autoAssignPreview.eligibleAssignments?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
                          <CheckCircle size={14} className="text-emerald-600" />
                          <span>Eligible for Assignment ({autoAssignPreview.eligibleAssignments.length})</span>
                        </h4>
                        <div className="border border-emerald-100 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-emerald-50 text-emerald-900 font-semibold">
                              <tr>
                                <th className="p-2.5">Issue</th>
                                <th className="p-2.5">Building</th>
                                <th className="p-2.5">Department</th>
                                <th className="p-2.5">Matching Officer</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-50">
                              {autoAssignPreview.eligibleAssignments.map((item, idx) => (
                                <tr key={idx} className="hover:bg-emerald-50/50">
                                  <td className="p-2.5 font-medium text-slate-800">{item.issueType}</td>
                                  <td className="p-2.5 text-slate-600">{item.building}</td>
                                  <td className="p-2.5 text-slate-600">{DEPARTMENT_LABELS[item.department] || item.department}</td>
                                  <td className="p-2.5 font-semibold text-emerald-700">{item.matchingOfficer?.name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Remaining Unassigned List */}
                    {autoAssignPreview.remainingUnassigned?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-amber-600" />
                          <span>Will Remain Unassigned ({autoAssignPreview.remainingUnassigned.length})</span>
                        </h4>
                        <div className="border border-amber-100 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-amber-50 text-amber-900 font-semibold">
                              <tr>
                                <th className="p-2.5">Issue</th>
                                <th className="p-2.5">Building</th>
                                <th className="p-2.5">Department</th>
                                <th className="p-2.5">Status / Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-50">
                              {autoAssignPreview.remainingUnassigned.map((item, idx) => (
                                <tr key={idx} className="hover:bg-amber-50/50">
                                  <td className="p-2.5 font-medium text-slate-800">{item.issueType}</td>
                                  <td className="p-2.5 text-slate-600">{item.building}</td>
                                  <td className="p-2.5 text-slate-600">{DEPARTMENT_LABELS[item.department] || item.department}</td>
                                  <td className="p-2.5 text-amber-700 italic">{item.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>⚡ Matching officer assignment is saved automatically in MongoDB.</span>
                <button
                  type="button"
                  onClick={() => setShowAutoAssignModal(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  Close Diagnostics
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFICER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOfficerId && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-sky-100 relative my-8 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-6 relative">
                <button
                  onClick={handleCloseOfficerDetails}
                  className="absolute right-5 top-5 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={20} />
                </button>

                {loadingDetails ? (
                  <div className="flex items-center gap-3 py-4 text-sky-400">
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Loading staff profile details...</span>
                  </div>
                ) : detailsError ? (
                  <div className="text-red-400 py-4 text-sm">{detailsError}</div>
                ) : officerDetails?.officer ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs px-2.5 py-1 rounded-md font-medium uppercase tracking-wider">
                        Maintenance Staff Profile
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${
                        officerDetails.officer.mustChangePassword
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {officerDetails.officer.mustChangePassword ? 'Temporary Password (First-Login Pending)' : 'Account Active'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      {officerDetails.officer.name}
                      {officerDetails.officer.designation && (
                        <span className="text-sm font-normal text-slate-300">({officerDetails.officer.designation})</span>
                      )}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                      {DEPARTMENT_LABELS[officerDetails.officer.department] || officerDetails.officer.department || 'Maintenance Department'} • {officerDetails.officer.assignedBuilding || officerDetails.officer.assignedWard}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Modal Body */}
              {officerDetails?.officer && (
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                  {/* Profile Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-start gap-3">
                      <Mail className="text-sky-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Email Address</div>
                        <div className="text-xs font-semibold text-slate-800 break-all">{officerDetails.officer.email}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Mobile Number</div>
                        <div className="text-xs font-semibold text-slate-800">{officerDetails.officer.mobile || 'Not provided'}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Briefcase className="text-purple-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Employee / Staff ID</div>
                        <div className="text-xs font-semibold text-slate-800">{officerDetails.officer.employeeId || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Assigned Building / Location</div>
                        <div className="text-xs font-semibold text-slate-800">{officerDetails.officer.assignedBuilding || officerDetails.officer.assignedWard}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="text-amber-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Account Created</div>
                        <div className="text-xs font-semibold text-slate-800">
                          {new Date(officerDetails.officer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ShieldCheck className="text-sky-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Security Status</div>
                        <div className="text-xs font-semibold text-slate-800">
                          {officerDetails.officer.mustChangePassword ? 'Temp Password (First Login Pending)' : 'Password Set & Verified'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Officer Complaint Statistics */}
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                      <FileText size={16} className="text-sky-500" />
                      <span>Assigned Complaint Performance & Statistics</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-sky-700">{officerDetails.stats?.total || 0}</div>
                        <div className="text-xs text-sky-600 font-medium mt-0.5">Total Assigned</div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-700">{officerDetails.stats?.pending || 0}</div>
                        <div className="text-xs text-yellow-600 font-medium mt-0.5">Pending</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-blue-700">{officerDetails.stats?.inProgress || 0}</div>
                        <div className="text-xs text-blue-600 font-medium mt-0.5">In Progress</div>
                      </div>
                      <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-700">{officerDetails.stats?.resolved || 0}</div>
                        <div className="text-xs text-green-600 font-medium mt-0.5">Resolved</div>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Complaints Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                        <List size={16} className="text-sky-500" />
                        <span>Assigned Complaints List</span>
                      </h3>
                      <span className="text-xs text-slate-400">({officerDetails.assignedComplaints?.length || 0} complaints)</span>
                    </div>

                    {officerDetails.assignedComplaints?.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-8 text-center text-slate-400 text-xs">
                        No complaints are currently assigned to this maintenance staff member.
                      </div>
                    ) : (
                      <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-600">
                              <th className="text-left px-4 py-2.5 font-semibold">#</th>
                              <th className="text-left px-4 py-2.5 font-semibold">Issue Category</th>
                              <th className="text-left px-4 py-2.5 font-semibold">Reported By (Student)</th>
                              <th className="text-left px-4 py-2.5 font-semibold">Building & Room</th>
                              <th className="text-left px-4 py-2.5 font-semibold">Priority</th>
                              <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                              <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {officerDetails.assignedComplaints.map((c, idx) => (
                              <tr key={c._id} className="hover:bg-slate-50 transition">
                                <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800">
                                  {c.aiAnalysis?.detectedType?.replace('_', ' ') || c.issueType?.replace('_', ' ') || 'Issue'}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-800">{c.reportedBy?.name || 'Student'}</div>
                                  <div className="text-[10px] text-slate-400">{c.reportedBy?.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-800">{c.location?.building || c.location?.ward}</div>
                                  {c.location?.room && <div className="text-[10px] text-sky-600">Room: {c.location.room}</div>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_COLORS[c.priorityLevel] || 'bg-gray-100 text-gray-600'}`}>
                                    {c.priorityLevel || 'NORMAL'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[(c.status || '').toUpperCase()] || 'bg-gray-100 text-gray-700'}`}>
                                    {STATUS_ICONS[(c.status || '').toUpperCase()]}
                                    {c.status?.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                  {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
                <button
                  onClick={handleCloseOfficerDetails}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE MAINTENANCE STAFF ACCOUNT MODAL */}
      <AnimatePresence>
        {showStaffModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-sky-100 relative my-8"
            >
              <button
                onClick={handleCloseStaffModal}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-1 text-emerald-600 font-semibold text-lg">
                <UserPlus size={20} />
                <span>Create Maintenance Staff Account</span>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Admin-controlled staff creation. A secure temporary password will be generated automatically.
              </p>

              {createStaffError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4">
                  {createStaffError}
                </div>
              )}

              {createdTempPassword ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl leading-relaxed">
                    <p className="font-bold text-sm mb-1 text-emerald-900">Account Created Successfully!</p>
                    <p>Share these temporary credentials with the staff member. They will be prompted to set a new password on their first login.</p>
                  </div>

                  <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Staff Email</span>
                      <span className="text-sky-300 font-semibold text-sm">{staffForm.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Temporary Password</span>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-emerald-400 font-bold text-base tracking-wider">{createdTempPassword}</span>
                        <button
                          type="button"
                          onClick={handleCopyCredentials}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 px-3 py-1.5 rounded-lg text-xs font-sans transition cursor-pointer"
                        >
                          {copiedCreds ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          <span>{copiedCreds ? 'Copied!' : 'Copy Credentials'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-3 rounded-xl flex items-center gap-2">
                    <Key size={16} className="shrink-0 text-amber-600" />
                    <span><strong>Security Note:</strong> This temporary password will not be displayed again.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseStaffModal}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer mt-2"
                  >
                    Done & Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateStaffSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={staffForm.name}
                      onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">University / Official Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh.patel@paruluniversity.ac.in"
                      value={staffForm.email}
                      onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  {/* MULTI-SELECT Assigned Buildings / Work Locations */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">
                      Assigned Buildings / Work Locations *
                    </label>

                    {/* Selected Building Chips */}
                    {staffForm.assignedBuildings.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                        {staffForm.assignedBuildings.map(b => (
                          <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                            <span>{b}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBuildingFromStaffForm(b)}
                              className="text-sky-600 hover:text-sky-900 cursor-pointer font-bold ml-1 hover:bg-sky-200 px-1 rounded"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <select
                      value=""
                      onChange={e => {
                        handleAddBuildingToStaffForm(e.target.value)
                        e.target.value = ''
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white cursor-pointer"
                    >
                      <option value="">-- Add Building to Assignment List --</option>
                      {CAMPUS_BUILDINGS.filter(b => !staffForm.assignedBuildings.includes(b)).map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Select one or more buildings this staff member is responsible for.
                    </p>
                  </div>

                  {/* Employee ID & Mobile */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-xs">Employee / Staff ID</label>
                      <input
                        type="text"
                        placeholder="e.g. PU-STAFF-1024"
                        value={staffForm.employeeId}
                        onChange={e => setStaffForm({ ...staffForm, employeeId: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-xs">Mobile Number</label>
                      <input
                        type="text"
                        placeholder="10-digit mobile"
                        value={staffForm.mobile}
                        onChange={e => setStaffForm({ ...staffForm, mobile: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Department & Designation */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-xs">Department *</label>
                      {deptsLoading ? (
                        <div className="flex items-center gap-2 text-xs text-sky-600 bg-sky-50 border border-sky-200 p-2 rounded-xl">
                          <Loader2 size={13} className="animate-spin text-sky-500" />
                          <span>Loading departments...</span>
                        </div>
                      ) : deptsError ? (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-xl flex items-center justify-between">
                          <span>{deptsError}</span>
                          <button type="button" onClick={fetchActiveDepartments} className="text-sky-600 hover:underline font-bold text-[10px]">Retry</button>
                        </div>
                      ) : departmentsList.length === 0 ? (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between font-medium">
                          <span>No active departments available.</span>
                          <button type="button" onClick={fetchActiveDepartments} className="text-sky-600 hover:underline font-bold text-[10px] cursor-pointer ml-1">Retry</button>
                        </div>
                      ) : (
                        <select
                          required
                          value={staffForm.department}
                          onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white cursor-pointer"
                        >
                          <option value="">-- Select Department --</option>
                          {departmentsList.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-xs">Designation</label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Technician"
                        value={staffForm.designation}
                        onChange={e => setStaffForm({ ...staffForm, designation: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseStaffModal}
                      className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingStaff}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md"
                    >
                      {creatingStaff ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminIssues
