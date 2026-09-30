import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import Navbar from '../components/Navbar'
import {
  Users, Search, RefreshCw, ChevronDown, UserPlus, Eye, Mail, Phone, Briefcase,
  Calendar, ShieldCheck, FileText, List, Building, Key, Copy, Check, X
} from 'lucide-react'

import { PARUL_CAMPUS_BUILDINGS } from '../config/parulCampusConfig'

const CAMPUS_BUILDINGS = PARUL_CAMPUS_BUILDINGS

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-100 text-green-700 border-green-200'
}
const STATUS_ICONS = {
  PENDING: '🟡',
  IN_PROGRESS: '🔵',
  RESOLVED: '🟢'
}
const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-gray-100 text-gray-600'
}

const DEPARTMENTS_LIST = [
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

const DEPARTMENT_LABELS = Object.fromEntries(DEPARTMENTS_LIST.map(d => [d.value, d.label]))

const getOfficerBuildings = (officer) => {
  let buildings = []
  if (Array.isArray(officer?.assignedBuildings) && officer.assignedBuildings.length > 0) {
    buildings = officer.assignedBuildings
  } else if (officer?.assignedBuilding || officer?.assignedWard) {
    buildings = [officer.assignedBuilding || officer.assignedWard]
  }
  return [...new Set(buildings.map(b => String(b || '').trim()).filter(Boolean))]
}

const AdminOfficers = () => {
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)

  // Search & Filters
  const [officerSearch, setOfficerSearch] = useState('')
  const [officerDeptFilter, setOfficerDeptFilter] = useState('ALL')
  const [officerBuildingFilter, setOfficerBuildingFilter] = useState('ALL')
  const [officerPwdFilter, setOfficerPwdFilter] = useState('ALL')

  // Officer Detail Modal
  const [selectedOfficerId, setSelectedOfficerId] = useState(null)
  const [officerDetails, setOfficerDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  // Create Staff Modal State
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

  const fetchOfficers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/officers`, { withCredentials: true })
      setOfficers(data.officers || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOfficers()
  }, [fetchOfficers])

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
      fetchOfficers()
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

  // Filtered Officers List
  const filteredOfficers = officers.filter(o => {
    const oBldgs = getOfficerBuildings(o)

    if (officerDeptFilter !== 'ALL' && String(o.department || '').trim().toLowerCase() !== officerDeptFilter.trim().toLowerCase()) return false
    
    if (officerBuildingFilter !== 'ALL') {
      const targetB = officerBuildingFilter.trim().toLowerCase()
      const matchB = oBldgs.some(b => b.trim().toLowerCase() === targetB)
      if (!matchB) return false
    }

    if (officerPwdFilter === 'ACTIVE' && o.mustChangePassword) return false
    if (officerPwdFilter === 'TEMP_PWD' && !o.mustChangePassword) return false

    if (officerSearch.trim()) {
      const q = officerSearch.toLowerCase().trim()
      const nameMatch = o.name?.toLowerCase().includes(q)
      const emailMatch = o.email?.toLowerCase().includes(q)
      const deptMatch = (DEPARTMENT_LABELS[o.department] || o.department || '').toLowerCase().includes(q)
      const buildingMatch = oBldgs.some(b => b.toLowerCase().includes(q))
      const empIdMatch = o.employeeId?.toLowerCase().includes(q)
      if (!nameMatch && !emailMatch && !deptMatch && !buildingMatch && !empIdMatch) return false
    }

    return true
  })

  // Summary Metrics
  const summaryStats = {
    totalStaff: officers.length,
    activeStaff: officers.filter(o => !o.mustChangePassword).length,
    tempPassword: officers.filter(o => o.mustChangePassword).length,
    totalAssignedComplaints: officers.reduce((sum, o) => sum + (o.stats?.total || 0), 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <div className="pt-[120px] pb-16 px-6 md:px-10 max-w-[1400px] mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-emerald-600" size={30} />
              <span>Maintenance Staff Management</span>
            </h1>
            <p className="text-slate-500 mt-1">
              Manage maintenance officers, multi-building assignments, and complaint workload
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowStaffModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer">
              <UserPlus size={16} />
              + Create Staff Account
            </button>
            <button onClick={fetchOfficers} disabled={loading}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="text-3xl font-bold text-slate-900">{summaryStats.totalStaff}</div>
            <div className="text-sm text-slate-500 mt-1">Total Maintenance Staff</div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm p-5">
            <div className="text-3xl font-bold text-emerald-700">{summaryStats.activeStaff}</div>
            <div className="text-sm text-emerald-600 font-medium mt-1">Active (Password Set)</div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 shadow-sm p-5">
            <div className="text-3xl font-bold text-amber-700">{summaryStats.tempPassword}</div>
            <div className="text-sm text-amber-600 font-medium mt-1">Temporary Password</div>
          </div>
          <div className="bg-sky-50 rounded-xl border border-sky-100 shadow-sm p-5">
            <div className="text-3xl font-bold text-sky-700">{summaryStats.totalAssignedComplaints}</div>
            <div className="text-sm text-sky-600 font-medium mt-1">Total Assigned Complaints</div>
          </div>
        </motion.div>

        {/* Search & Filter Header */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6 space-y-3">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by staff name, email, department, assigned buildings, staff ID..."
                value={officerSearch}
                onChange={e => setOfficerSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              />
              {officerSearch && (
                <button onClick={() => setOfficerSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Department Filter */}
              <div className="relative">
                <select
                  value={officerDeptFilter}
                  onChange={e => setOfficerDeptFilter(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium focus:ring-2 focus:ring-emerald-400 bg-white cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {DEPARTMENTS_LIST.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Building Filter */}
              <div className="relative">
                <select
                  value={officerBuildingFilter}
                  onChange={e => setOfficerBuildingFilter(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium focus:ring-2 focus:ring-emerald-400 bg-white cursor-pointer max-w-[180px] truncate"
                >
                  <option value="ALL">All Work Locations</option>
                  {CAMPUS_BUILDINGS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Account/Password Status Filter */}
              <div className="relative">
                <select
                  value={officerPwdFilter}
                  onChange={e => setOfficerPwdFilter(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium focus:ring-2 focus:ring-emerald-400 bg-white cursor-pointer"
                >
                  <option value="ALL">All Account Statuses</option>
                  <option value="ACTIVE">Active (Password Set)</option>
                  <option value="TEMP_PWD">Temp Password (Pending)</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>

              {(officerDeptFilter !== 'ALL' || officerBuildingFilter !== 'ALL' || officerPwdFilter !== 'ALL' || officerSearch) && (
                <button
                  onClick={() => {
                    setOfficerSearch('')
                    setOfficerDeptFilter('ALL')
                    setOfficerBuildingFilter('ALL')
                    setOfficerPwdFilter('ALL')
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  <X size={13} /> Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2 text-emerald-500" /> Loading maintenance staff members...
            </div>
          ) : filteredOfficers.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm">
              No maintenance staff members match the selected search or filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600">
                    <th className="text-left px-5 py-3.5 font-semibold">Staff Member</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Department</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Assigned Work Locations</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Account Status</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Assigned Complaints</th>
                    <th className="text-right px-5 py-3.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOfficers.map(o => {
                    const bldgs = getOfficerBuildings(o)
                    const visibleBldgs = bldgs.slice(0, 2)
                    const hiddenCount = bldgs.length - 2

                    return (
                      <tr key={o._id} className="hover:bg-slate-50/80 transition">
                        {/* Name & Email */}
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{o.name}</span>
                            {o.employeeId && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                {o.employeeId}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{o.email}</div>
                          {o.designation && <div className="text-[11px] text-slate-500 italic">{o.designation}</div>}
                        </td>

                        {/* Department */}
                        <td className="px-5 py-4">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                            {DEPARTMENT_LABELS[o.department] || o.department || 'General Maintenance'}
                          </span>
                        </td>

                        {/* Assigned Buildings Chips */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1 max-w-[240px]">
                            {bldgs.length === 0 ? (
                              <span className="text-slate-300 text-xs">Unassigned</span>
                            ) : (
                              <>
                                {visibleBldgs.map(b => (
                                  <span key={b} className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-100 truncate max-w-[140px]" title={b}>
                                    {b}
                                  </span>
                                ))}
                                {hiddenCount > 0 && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200" title={bldgs.slice(2).join(', ')}>
                                    +{hiddenCount} more
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* Account Status */}
                        <td className="px-5 py-4">
                          {o.mustChangePassword ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Key size={12} className="text-amber-600" />
                              <span>Temp Password</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck size={12} className="text-emerald-600" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        {/* Assigned Complaints Stats Summary */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-slate-800">{o.stats?.total || 0} Total</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-yellow-600 font-semibold">{o.stats?.pending || 0} P</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-blue-600 font-semibold">{o.stats?.inProgress || 0} IP</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-emerald-600 font-semibold">{o.stats?.resolved || 0} R</span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenOfficerDetails(o._id)}
                            className="inline-flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer border border-sky-200"
                          >
                            <Eye size={13} />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

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
                      {DEPARTMENT_LABELS[officerDetails.officer.department] || officerDetails.officer.department || 'Maintenance Department'}
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

                    <div className="flex items-start gap-3 md:col-span-2">
                      <Building className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Assigned Buildings / Work Locations</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(() => {
                            const bldgs = getOfficerBuildings(officerDetails.officer)
                            return bldgs.length > 0 ? bldgs.map(b => (
                              <span key={b} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                                {b}
                              </span>
                            )) : <span className="text-xs text-slate-400">No assigned buildings</span>
                          })()}
                        </div>
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
                      <select
                        required
                        value={staffForm.department}
                        onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white cursor-pointer"
                      >
                        <option value="">-- Select Department --</option>
                        {DEPARTMENTS_LIST.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
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

export default AdminOfficers
