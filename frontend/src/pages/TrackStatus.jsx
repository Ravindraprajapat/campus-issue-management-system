import React, { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, MapPin, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import Navbar from '../components/Navbar'
import axios from 'axios'
import { serverUrl } from '../App'
import { setReports } from '../redux/reportSlice'

const TrackStatus = () => {
  const dispatch = useDispatch()
  const { reports = [] } = useSelector(state => state.report) || {}

  const [queryId, setQueryId] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const result = await axios.get(
        `${serverUrl}/report/report-submit/reports`,
        { withCredentials: true }
      )
      dispatch(setReports(result.data.reports))
    } catch (e) {
      console.error(e)
    } finally {
      setRefreshing(false)
    }
  }, [dispatch])

  /* ---------------- FILTER LOGIC ---------------- */
  const filteredReports = useMemo(() => {
    let data = Array.isArray(reports) ? reports : []

    if (queryId) {
      data = data.filter(
        r =>
          r._id?.includes(queryId) ||
          r.reportedBy?.includes(queryId)
      )
    }

    if (statusFilter !== 'All') {
      data = data.filter(r => r.status === statusFilter)
    }

    return data
  }, [reports, queryId, statusFilter])

  return (
    <>
      <Navbar />

      <div className='pt-[120px] min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4'>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='max-w-6xl mx-auto'
        >
          {/* Heading */}
          <div className='flex items-center justify-between mb-6'>
            <h1 className='text-3xl font-bold text-sky-500'>
              Track Issue Status
            </h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className='flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer'
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Search + Filter */}
          <div className='flex flex-col md:flex-row gap-4 mb-8'>
            <div className='flex-1 flex items-center gap-2 border border-sky-200 rounded-lg px-3 py-2 bg-white'>
              <Search size={18} className='text-sky-500' />
              <input
                type='text'
                placeholder='Enter Complaint ID or User ID'
                className='w-full focus:outline-none text-sm'
                value={queryId}
                onChange={e => setQueryId(e.target.value)}
              />
            </div>

            <select
              className='border border-sky-200 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-sky-400'
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value='All'>All Status</option>
              <option value='PENDING'>Pending</option>
              <option value='IN_PROGRESS'>In Progress</option>
              <option value='RESOLVED'>Resolved</option>
            </select>
          </div>

          {/* Reports List */}
          <div className='space-y-6'>
            {filteredReports.length === 0 && (
              <div className='text-center text-slate-500'>
                No reports found
              </div>
            )}

            {filteredReports.map(report => (
              <motion.div
                key={report._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className='bg-white rounded-2xl shadow-lg border border-sky-200 p-6'
              >
                {/* STATUS BADGE */}
                <div
                  className={`mb-6 flex items-center gap-3 rounded-xl p-3 
                  ${
                    report.status === 'PENDING'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : report.status === 'RESOLVED'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <AlertCircle
                    className={
                      report.status === 'PENDING'
                        ? 'text-yellow-500'
                        : report.status === 'RESOLVED'
                        ? 'text-green-500'
                        : 'text-blue-500'
                    }
                  />
                  <div>
                    <div className='font-semibold text-slate-800'>
                      Status: {report.status}
                    </div>
                    <div className='text-sm text-slate-500'>
                      Priority: {report.priorityLevel}
                    </div>
                  </div>
                </div>

                {/* INFO + IMAGE WRAPPER */}
                <div className='flex flex-col md:flex-row gap-6'>
                  
                  {/* LEFT SIDE - DETAILS */}
                  <div className='flex-1'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>

                      <div className='flex items-center gap-3 border border-sky-200 rounded-lg p-3'>
                        <MapPin className='text-sky-500 shrink-0' />
                        <div>
                          <div className='text-sm font-medium text-slate-800'>
                            Building & Location
                          </div>
                          <div className='text-xs text-slate-600 font-semibold'>
                            {report.location?.building || 'Parul University Campus'}
                          </div>
                          {report.location?.room && (
                            <div className='text-xs text-sky-600 font-medium'>
                              Room: {report.location.room}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className='flex items-center gap-3 border border-sky-200 rounded-lg p-3'>
                        <Clock className='text-sky-500 shrink-0' />
                        <div>
                          <div className='text-sm font-medium text-slate-800'>
                            Reported On
                          </div>
                          <div className='text-xs text-slate-500'>
                            {report.createdAt
                              ? new Date(report.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })
                              : 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className='border border-sky-200 rounded-lg p-3'>
                        <div className='text-sm font-medium text-slate-800'>
                          Issue Category
                        </div>
                        <div className='text-xs text-slate-600 font-semibold'>
                          {report.aiAnalysis?.detectedType?.replace('_', ' ') || 'N/A'} (
                          {report.aiAnalysis?.confidence
                            ? Math.round(report.aiAnalysis.confidence * 100)
                            : 0}
                          %)
                        </div>
                      </div>

                      <div className='border border-sky-200 rounded-lg p-3'>
                        <div className='text-sm font-medium text-slate-800'>
                          Severity Score
                        </div>
                        <div className='text-xs text-slate-600 font-semibold'>
                          {report.severityScore || 'N/A'} / 10 ({report.priorityLevel || 'LOW'})
                        </div>
                      </div>

                      {report.description && (
                        <div className='sm:col-span-2 border border-sky-200 rounded-lg p-3 bg-slate-50'>
                          <div className='text-xs font-semibold text-slate-700'>
                            Description:
                          </div>
                          <div className='text-xs text-slate-600 mt-0.5'>
                            {report.description}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* RIGHT SIDE - IMAGE */}
                  {report.imageUrl && (
                    <div className='md:w-1/3 w-full'>
                      <img
                        src={report.imageUrl}
                        alt='Complaint'
                        className='w-full h-full max-h-72 object-cover rounded-xl border'
                      />
                    </div>
                  )}

                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default TrackStatus