import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import {
  Plus,
  Search,
  Building,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Layers,
  Users,
  FileText
} from 'lucide-react'

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchDepartments = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/departments`, {
        withCredentials: true
      })
      if (data.success) {
        setDepartments(data.departments || [])
      }
    } catch (err) {
      console.error('Fetch departments error:', err)
      setError(err?.response?.data?.message || 'Failed to fetch departments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const openCreateModal = () => {
    setEditingDept(null)
    setName('')
    setDescription('')
    setError('')
    setModalOpen(true)
  }

  const openEditModal = (dept) => {
    setEditingDept(dept)
    setName(dept.name || '')
    setDescription(dept.description || '')
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Department name is required')

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (editingDept) {
        const { data } = await axios.put(
          `${serverUrl}/api/admin/departments/${editingDept._id}`,
          { name, description },
          { withCredentials: true }
        )
        if (data.success) {
          setSuccess('Department updated successfully')
          setModalOpen(false)
          fetchDepartments()
        }
      } else {
        const { data } = await axios.post(
          `${serverUrl}/api/admin/departments`,
          { name, description },
          { withCredentials: true }
        )
        if (data.success) {
          setSuccess('Department created successfully')
          setModalOpen(false)
          fetchDepartments()
        }
      }
    } catch (err) {
      console.error('Save department error:', err)
      setError(err?.response?.data?.message || 'Failed to save department')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (dept) => {
    setError('')
    setSuccess('')
    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/departments/${dept._id}/status`,
        {},
        { withCredentials: true }
      )
      if (data.success) {
        setSuccess(`Department "${dept.name}" ${data.department.isActive ? 'activated' : 'deactivated'}`)
        fetchDepartments()
      }
    } catch (err) {
      console.error('Toggle status error:', err)
      setError(err?.response?.data?.message || 'Failed to toggle status')
    }
  }

  const handleDelete = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete department "${dept.name}"?`)) return

    setError('')
    setSuccess('')
    try {
      const { data } = await axios.delete(
        `${serverUrl}/api/admin/departments/${dept._id}`,
        { withCredentials: true }
      )
      if (data.success) {
        setSuccess('Department deleted successfully')
        fetchDepartments()
      }
    } catch (err) {
      console.error('Delete department error:', err)
      setError(err?.response?.data?.message || 'Failed to delete department')
    }
  }

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building className="text-sky-500" size={22} />
            Department Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage university maintenance departments dynamically. Added departments automatically update assignment systems and AI context.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer"
        >
          <Plus size={16} />
          Add Department
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle size={16} /> {success}
          </span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-[11px] text-slate-400" />
        <input
          type="text"
          placeholder="Search department by name, code, or description..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-xs font-medium">
          <Loader2 className="animate-spin text-sky-500" size={20} />
          Loading departments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
          No departments found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(dept => (
            <motion.div
              key={dept._id}
              whileHover={{ y: -2 }}
              className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition ${
                dept.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    {dept.name}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    dept.isActive
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {dept.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-sky-600 font-semibold mb-2 bg-sky-50 px-2 py-0.5 rounded w-fit border border-sky-100">
                  {dept.code}
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                  {dept.description || 'No description provided.'}
                </p>
              </div>

              {/* Metrics */}
              <div className="pt-3 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2 text-[11px] text-center mb-4">
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 text-[9px] uppercase font-bold">Types</span>
                    <span className="font-bold text-slate-700 flex items-center justify-center gap-1">
                      <Layers size={11} className="text-sky-500" /> {dept.issueTypeCount || 0}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 text-[9px] uppercase font-bold">Staff</span>
                    <span className="font-bold text-slate-700 flex items-center justify-center gap-1">
                      <Users size={11} className="text-amber-500" /> {dept.staffCount || 0}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="block text-slate-400 text-[9px] uppercase font-bold">Reports</span>
                    <span className="font-bold text-slate-700 flex items-center justify-center gap-1">
                      <FileText size={11} className="text-emerald-500" /> {dept.reportCount || 0}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(dept)}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Edit2 size={13} /> Edit
                  </button>

                  <button
                    onClick={() => handleToggleStatus(dept)}
                    className={`flex items-center justify-center gap-1 font-semibold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      dept.isActive
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {dept.isActive ? <XCircle size={13} /> : <CheckCircle size={13} />}
                    {dept.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleDelete(dept)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer border border-red-200"
                    title="Delete Department (if unused)"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {editingDept
                  ? 'Update department details. Note that department code remains immutable for historical integrity.'
                  : 'Create a new maintenance department. A unique code will be generated automatically.'}
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Laboratory & Research Equipment"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the responsibilities and scope of this maintenance department..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-sky-400 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminDepartments
