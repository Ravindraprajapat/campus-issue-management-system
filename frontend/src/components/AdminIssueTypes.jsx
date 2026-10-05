import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import {
  Plus,
  Search,
  Layers,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Building
} from 'lucide-react'

const AdminIssueTypes = () => {
  const [issueTypes, setIssueTypes] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState(null)
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [itRes, deptRes] = await Promise.all([
        axios.get(`${serverUrl}/api/admin/issue-types`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/active-departments`, { withCredentials: true })
      ])

      if (itRes.data.success) {
        setIssueTypes(itRes.data.issueTypes || [])
      }
      if (deptRes.data.success) {
        setDepartments(deptRes.data.departments || [])
      }
    } catch (err) {
      console.error('Fetch issue types error:', err)
      setError(err?.response?.data?.message || 'Failed to fetch issue types')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreateModal = () => {
    setEditingIssue(null)
    setName('')
    setDepartmentId(departments[0]?._id || '')
    setDescription('')
    setError('')
    setModalOpen(true)
  }

  const openEditModal = (issue) => {
    setEditingIssue(issue)
    setName(issue.name || '')
    setDepartmentId(issue.department?._id || issue.department || '')
    setDescription(issue.description || '')
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Issue type name is required')
    if (!departmentId) return setError('Department is required')

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (editingIssue) {
        const { data } = await axios.put(
          `${serverUrl}/api/admin/issue-types/${editingIssue._id}`,
          { name, departmentId, description },
          { withCredentials: true }
        )
        if (data.success) {
          setSuccess('Issue type updated successfully')
          setModalOpen(false)
          fetchData()
        }
      } else {
        const { data } = await axios.post(
          `${serverUrl}/api/admin/issue-types`,
          { name, departmentId, description },
          { withCredentials: true }
        )
        if (data.success) {
          setSuccess('Issue type created successfully')
          setModalOpen(false)
          fetchData()
        }
      }
    } catch (err) {
      console.error('Save issue type error:', err)
      setError(err?.response?.data?.message || 'Failed to save issue type')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (issue) => {
    setError('')
    setSuccess('')
    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/issue-types/${issue._id}/status`,
        {},
        { withCredentials: true }
      )
      if (data.success) {
        setSuccess(`Issue type "${issue.name}" ${data.issueType.isActive ? 'activated' : 'deactivated'}`)
        fetchData()
      }
    } catch (err) {
      console.error('Toggle status error:', err)
      setError(err?.response?.data?.message || 'Failed to toggle status')
    }
  }

  const handleDelete = async (issue) => {
    if (!window.confirm(`Are you sure you want to delete issue type "${issue.name}"?`)) return

    setError('')
    setSuccess('')
    try {
      const { data } = await axios.delete(
        `${serverUrl}/api/admin/issue-types/${issue._id}`,
        { withCredentials: true }
      )
      if (data.success) {
        setSuccess('Issue type deleted successfully')
        fetchData()
      }
    } catch (err) {
      console.error('Delete issue type error:', err)
      setError(err?.response?.data?.message || 'Failed to delete issue type')
    }
  }

  const filtered = issueTypes.filter(it => {
    const matchesSearch =
      it.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (it.department?.name && it.department.name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesDept = deptFilter === 'ALL' || (it.department?._id === deptFilter || it.departmentCode === deptFilter)
    return matchesSearch && matchesDept
  })

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="text-sky-500" size={22} />
            Issue Type Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage infrastructure issue classifications and map them to Departments stored dynamically in MongoDB.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer"
        >
          <Plus size={16} />
          Add Issue Type
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

      {/* Search & Department Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-[11px] text-slate-400" />
          <input
            type="text"
            placeholder="Search issue type by name or code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-400 font-medium text-slate-700"
        >
          <option value="ALL">All Departments</option>
          {departments.map(d => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-xs font-medium">
          <Loader2 className="animate-spin text-sky-500" size={20} />
          Loading issue types...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
          No issue types found matching your criteria.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3.5">Issue Type Name</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Mapped Department</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(issue => (
                  <tr key={issue._id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold text-slate-900">
                      {issue.name}
                      {issue.description && (
                        <span className="block text-[11px] font-normal text-slate-400 truncate max-w-xs">
                          {issue.description}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 font-semibold text-[11px]">
                      {issue.code}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-semibold border border-sky-100 text-[11px]">
                        <Building size={12} className="text-sky-500" />
                        {issue.department?.name || issue.departmentCode}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        issue.isActive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {issue.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(issue)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                        title="Edit Issue Type"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(issue)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          issue.isActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200'
                        }`}
                        title={issue.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {issue.isActive ? <XCircle size={13} /> : <CheckCircle size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(issue)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer border border-red-200"
                        title="Delete Issue Type (if unused)"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {editingIssue ? 'Edit Issue Type' : 'Add New Issue Type'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Map issue type to a Department. AI will choose strictly from active database issue types.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Type Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Microscope Not Working"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={e => setDepartmentId(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-sky-400 bg-white font-medium text-slate-700"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Optional description of this issue classification..."
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
                    {submitting ? 'Saving...' : editingIssue ? 'Save Changes' : 'Create Issue Type'}
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

export default AdminIssueTypes
