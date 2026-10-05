import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin,
  Image as ImageIcon,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building,
  School,
  FileText,
  Sparkles,
  Edit3,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import { serverUrl } from '../App'
import { useNavigate } from 'react-router-dom'
import { parulBuildings, detectBuildingFromCoords, detectRoomFromCoords } from '../config/parulCampusConfig'
import { compressImage } from '../utils/imageCompressor'

const Report = () => {
  const [image, setImage] = useState(null)
  const [rawFile, setRawFile] = useState(null)
  const [description, setDescription] = useState('')

  const [verificationToken, setVerificationToken] = useState('')
  const [photoVerificationStatus, setPhotoVerificationStatus] = useState('idle') // 'idle' | 'verifying' | 'valid' | 'invalid'
  const [verificationMessage, setVerificationMessage] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [isStudentConfirmed, setIsStudentConfirmed] = useState(false)

  const [location, setLocation] = useState(null) // { latitude, longitude, address }
  const [building, setBuilding] = useState('')
  const [room, setRoom] = useState('')

  // Flags to preserve student's manual selection
  const [isBuildingManuallySelected, setIsBuildingManuallySelected] = useState(false)
  const [isRoomManuallySelected, setIsRoomManuallySelected] = useState(false)

  const [locLoading, setLocLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const descriptionRef = useRef(null)

  const isVerified = photoVerificationStatus === 'valid' && isStudentConfirmed
  const isVerifying = photoVerificationStatus === 'verifying'

  const handleImageChange = async e => {
    const file = e.target.files[0]
    if (file) {
      setError('')
      setRawFile(file)
      setVerificationToken('')
      setAiAnalysis(null)
      setPhotoVerificationStatus('idle')
      setIsStudentConfirmed(false)
      setVerificationMessage('')

      try {
        const compressedFile = await compressImage(file)
        setImage(compressedFile)
      } catch (err) {
        console.error('Image compression error:', err)
        setImage(file)
      }
    }
  }

  const handleDescriptionChange = (e) => {
    const val = e.target.value
    setDescription(val)
    // If description is edited after verification, invalidate token so AI re-runs
    if (verificationToken || photoVerificationStatus === 'valid') {
      setVerificationToken('')
      setPhotoVerificationStatus('idle')
      setIsStudentConfirmed(false)
      setAiAnalysis(null)
    }
  }

  const handleAnalyzeIssue = async () => {
    if (!image) {
      return setError('Please upload a photo of the issue first')
    }

    setError('')
    setVerificationToken('')
    setAiAnalysis(null)
    setIsStudentConfirmed(false)
    setVerificationMessage('Analyzing photo & description with Gemini AI...')
    setPhotoVerificationStatus('verifying')

    try {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('description', description)

      console.log('[IMAGE VERIFY] Starting analysis request to:', `${serverUrl}/report/report-submit/verify-image`)
      const { data } = await axios.post(
        `${serverUrl}/report/report-submit/verify-image`,
        formData,
        { withCredentials: true }
      )
      console.log('[IMAGE VERIFY] Response received:', data)

      if (data.success && data.isValid && data.analysis) {
        setVerificationToken(data.verificationToken || '')
        setAiAnalysis(data.analysis)
        setPhotoVerificationStatus('valid')
        setVerificationMessage(data.message || 'Photo & description verified ✓')
      } else {
        setVerificationToken('')
        setPhotoVerificationStatus('invalid')
        setAiAnalysis(null)
        const msg = data.message || 'AI could not verify the photo. Please provide a clear photo or detailed description.'
        setError(msg)
      }
    } catch (err) {
      console.error('[IMAGE VERIFY] Analysis error:', err.message, err?.response?.data || '')
      setVerificationToken('')
      setPhotoVerificationStatus('invalid')
      setAiAnalysis(null)
      const msg = err?.response?.data?.message || err?.response?.data?.reason || 'Verification failed. Please upload a clear photo of the issue.'
      setError(msg)
    }
  }

  const handleGetLocation = () => {
    if (!isVerified || isVerifying) return

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    setLocLoading(true)

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords

        let address = `Parul University (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`

        try {
          const { data } = await axios.get(
            `https://nominatim.openstreetmap.org/reverse`,
            {
              params: {
                lat: latitude,
                lon: longitude,
                format: 'json',
                addressdetails: 1
              },
              headers: { 'Accept-Language': 'en' }
            }
          )
          if (data?.display_name) {
            address = data.display_name
          }
        } catch {
          // OpenStreetMap fail safe
        }

        setLocation({ latitude, longitude, address })

        const autoBuilding = detectBuildingFromCoords(latitude, longitude)
        if (autoBuilding && !isBuildingManuallySelected) {
          setBuilding(autoBuilding.name)
        }

        const autoRoom = detectRoomFromCoords(latitude, longitude)
        if (autoRoom && !isRoomManuallySelected) {
          setRoom(autoRoom)
        }

        setLocLoading(false)
      },
      err => {
        setLocLoading(false)
        console.log('Geolocation error/denied:', err.message)
        if (!location) {
          setLocation({
            latitude: 22.2887,
            longitude: 73.3634,
            address: 'Parul University Main Campus'
          })
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleBuildingChange = (e) => {
    const value = e.target.value
    setBuilding(value)
    setIsBuildingManuallySelected(true)
  }

  const handleRoomChange = (e) => {
    const value = e.target.value
    setRoom(value)
    setIsRoomManuallySelected(true)
  }

  const handleSubmit = async () => {
    if (loading || isVerifying) return
    if (photoVerificationStatus !== 'valid' || !isStudentConfirmed) {
      return setError('Please analyze photo and confirm AI result before submitting report')
    }
    if (!image) return setError('Please upload an image of the reported issue')
    if (!location) return setError('Please fetch GPS location or select building')
    if (!building.trim()) return setError('Please select or specify the Building / Location')
    if (!room.trim()) return setError('Please specify the Classroom / Room number')

    setLoading(true)
    setSuccess(false)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('verificationToken', verificationToken)
      formData.append('latitude', location.latitude)
      formData.append('longitude', location.longitude)
      formData.append('address', location.address)
      formData.append('building', building)
      formData.append('room', room)
      formData.append('description', description)

      console.log('[REPORT] Report submission request started:', {
        url: `${serverUrl}/report/report-submit/report`,
        building,
        room
      })

      const response = await axios.post(`${serverUrl}/report/report-submit/report`, formData, {
        withCredentials: true
      })
      console.log('[REPORT] Report submission response received, status:', response.status)

      setSuccess(true)
      setImage(null)
      setRawFile(null)
      setVerificationToken('')
      setPhotoVerificationStatus('idle')
      setVerificationMessage('')
      setAiAnalysis(null)
      setIsStudentConfirmed(false)
      setLocation(null)
      setBuilding('')
      setRoom('')
      setDescription('')
      setIsBuildingManuallySelected(false)
      setIsRoomManuallySelected(false)

      setTimeout(() => {
        setSuccess(false)
        navigate('/track-status')
      }, 1500)
    } catch (err) {
      console.error('[REPORT] Report submission error:', err.message, err?.response?.data || '')
      const msg = err?.response?.data?.message || 'Failed to submit issue report'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const selectedBuildingConfig = parulBuildings.find(b => b.name === building)

  return (
    <div className='min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4 pt-[110px] pb-12'>
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='bg-white w-full max-w-xl rounded-2xl shadow-xl p-8 border border-sky-200 my-4'
      >
        <h1 className='text-3xl font-bold text-center text-sky-600 mb-2'>
          Report a Campus Issue
        </h1>

        <p className='text-center text-gray-500 mb-8 text-sm'>
          UniFix AI — Smart Campus Infrastructure Management
        </p>

        {/* Success Alert */}
        {success && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className='flex items-center justify-center gap-2 bg-green-100 text-green-700 p-3 rounded-xl mb-6 text-sm font-semibold'
          >
            <CheckCircle size={20} />
            Issue Report Submitted Successfully!
          </motion.div>
        )}

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className='flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-6'
          >
            <AlertCircle size={18} className='flex-shrink-0' />
            <span>{error}</span>
          </motion.div>
        )}

        {/* STEP 1: UPLOAD PHOTO */}
        <div className='mb-6'>
          <label className='block text-gray-700 font-medium text-sm mb-2'>
            Upload Photo of Issue <span className='text-red-500'>*</span>
          </label>
          <label
            className='flex flex-col items-center justify-center
                            border-2 border-dashed border-sky-300
                            rounded-xl p-6 cursor-pointer hover:bg-sky-50 transition'
          >
            <ImageIcon size={36} className='text-sky-400 mb-2' />
            <span className='text-sm text-gray-600 font-medium'>
              {image ? image.name : 'Click to upload issue photo'}
            </span>
            <span className='text-xs text-gray-400 mt-1 text-center'>
              Photo must clearly show the broken fan, light, projector, bench, leak, AC, lab equipment, etc.
            </span>
            <input
              type='file'
              accept='image/*'
              onChange={handleImageChange}
              disabled={isVerifying || loading}
              className='hidden'
            />
          </label>
        </div>

        {/* STEP 2: DESCRIBE THE ISSUE (Textarea immediately below photo) */}
        <div className='mb-6'>
          <label className='block text-gray-700 font-medium text-sm mb-1 flex items-center gap-1'>
            <FileText size={15} className='text-sky-500' /> Describe the Issue
          </label>
          <p className='text-xs text-slate-400 mb-2'>
            Provide clear details to assist AI analysis (e.g. "Projector turns on but no display is coming.")
          </p>
          <textarea
            ref={descriptionRef}
            rows={3}
            placeholder='e.g. Second fan from front left in Room 204 is wobbling and making loud noise'
            value={description}
            onChange={handleDescriptionChange}
            disabled={isVerifying || loading}
            className='w-full border border-sky-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-400 bg-white resize-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200'
          />
        </div>

        {/* STEP 3: ANALYZE ISSUE BUTTON */}
        {!isStudentConfirmed && (
          <div className='mb-6'>
            <button
              type='button'
              onClick={handleAnalyzeIssue}
              disabled={!image || isVerifying || loading}
              className='w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl shadow-md transition text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isVerifying ? (
                <>
                  <Loader2 className='animate-spin' size={18} />
                  Analyzing photo + description with Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Analyze Issue with AI
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 4: AI ANALYSIS RESULT CARD */}
        {aiAnalysis && photoVerificationStatus === 'valid' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='mb-6 p-4 rounded-xl border border-sky-200 bg-sky-50/60'
          >
            <div className='flex items-center justify-between mb-3 pb-2 border-b border-sky-200'>
              <span className='text-xs font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5'>
                <Sparkles size={14} className='text-sky-600' /> AI Analysis Result
              </span>
              <span className='text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200'>
                {aiAnalysis.confidence ? `${(aiAnalysis.confidence * 100).toFixed(0)}% Confidence` : 'Verified'}
              </span>
            </div>

            {/* Mismatch Warning Alert */}
            {aiAnalysis.descriptionMatchesImage === false && (
              <div className='mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2'>
                <AlertTriangle size={16} className='text-amber-600 flex-shrink-0 mt-0.5' />
                <div>
                  <strong className='font-semibold block'>⚠ Possible Mismatch Noted</strong>
                  The photo and description might not align completely. Please verify details before continuing.
                </div>
              </div>
            )}

            <div className='space-y-2 text-xs text-slate-700 mb-4'>
              <div className='flex justify-between py-1 border-b border-sky-100'>
                <span className='font-semibold text-slate-500'>Detected Issue:</span>
                <span className='font-bold text-slate-900'>
                  {aiAnalysis.issueTypeName || aiAnalysis.issueType || aiAnalysis.detectedType || aiAnalysis.issueTypeCode || 'Issue Detected'}
                </span>
              </div>
              <div className='flex justify-between py-1 border-b border-sky-100'>
                <span className='font-semibold text-slate-500'>Department:</span>
                <span className='font-bold text-sky-600'>
                  {aiAnalysis.departmentName || aiAnalysis.department || aiAnalysis.departmentCode || 'Maintenance Department'}
                </span>
              </div>
              <div className='flex justify-between py-1 border-b border-sky-100'>
                <span className='font-semibold text-slate-500'>Severity Level:</span>
                <span className='font-semibold text-amber-700'>{aiAnalysis.severity || 5} / 10</span>
              </div>
              {aiAnalysis.reason && (
                <div className='pt-1 text-slate-600 italic bg-white/80 p-2.5 rounded-lg border border-sky-100'>
                  "{aiAnalysis.reason}"
                </div>
              )}
            </div>

            {/* CONFIRMATION BUTTONS */}
            {!isStudentConfirmed ? (
              <div className='flex flex-col sm:flex-row gap-2 pt-1'>
                <button
                  type='button'
                  onClick={() => setIsStudentConfirmed(true)}
                  className='flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs transition cursor-pointer'
                >
                  <CheckCircle size={15} />
                  Yes, Continue
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setIsStudentConfirmed(false)
                    if (descriptionRef.current) descriptionRef.current.focus()
                  }}
                  className='flex-1 flex items-center justify-center gap-1.5 bg-white border border-sky-300 text-sky-700 hover:bg-sky-50 font-semibold py-2.5 rounded-lg text-xs transition cursor-pointer'
                >
                  <Edit3 size={15} />
                  Edit Description
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setImage(null)
                    setRawFile(null)
                    setVerificationToken('')
                    setPhotoVerificationStatus('idle')
                    setAiAnalysis(null)
                    setIsStudentConfirmed(false)
                  }}
                  className='flex items-center justify-center gap-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium px-3 py-2.5 rounded-lg text-xs transition cursor-pointer'
                  title='Upload New Photo'
                >
                  <RefreshCw size={14} />
                  New Photo
                </button>
              </div>
            ) : (
              <div className='flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-lg font-semibold'>
                <span className='flex items-center gap-1.5'>
                  <CheckCircle size={15} className='text-emerald-600' />
                  AI Result Confirmed
                </span>
                <button
                  type='button'
                  onClick={() => setIsStudentConfirmed(false)}
                  className='text-sky-600 hover:underline font-medium text-[11px]'
                >
                  Re-evaluate
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 5: LOCATION & BUILDING (UNLOCKED AFTER CONFIRMATION) */}
        {isVerified && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-6'
          >
            <label className='block text-gray-700 font-medium text-sm mb-2'>
              Location & Building
            </label>

            <div className='flex items-center gap-2 mb-3'>
              <div className='flex-1 border border-sky-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-gray-600'>
                {locLoading ? (
                  <span className='flex items-center gap-2 text-sky-500 font-medium'>
                    <Loader2 size={14} className='animate-spin' />
                    Detecting location & building...
                  </span>
                ) : location ? (
                  <div>
                    <div className='flex items-center gap-1.5'>
                      <MapPin size={14} className='text-sky-500 flex-shrink-0' />
                      <span className='truncate text-xs'>{location.address}</span>
                    </div>
                  </div>
                ) : (
                  <span className='flex items-center gap-1.5 text-xs text-gray-400'>
                    <MapPin size={14} />
                    GPS not fetched (Click pin to get location)
                  </span>
                )}
              </div>

              <button
                type='button'
                onClick={handleGetLocation}
                disabled={locLoading}
                className='p-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                title='Get Current Location'
              >
                <MapPin size={18} />
              </button>
            </div>

            {/* Building Selector */}
            <div className='mb-3'>
              <label className='block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1'>
                <Building size={14} className='text-sky-500' /> Building / Location <span className='text-red-500'>*</span>
              </label>
              {parulBuildings.length > 0 ? (
                <select
                  value={building}
                  onChange={handleBuildingChange}
                  className='w-full border border-sky-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-sky-400 bg-white'
                >
                  <option value=''>-- Select Building --</option>
                  {parulBuildings.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type='text'
                  placeholder='e.g. D-Block, Engineering Building, Central Library'
                  value={building}
                  onChange={handleBuildingChange}
                  className='w-full border border-sky-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-sky-400 bg-white'
                />
              )}
            </div>

            {/* Room Selector / Input */}
            <div>
              <label className='block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1'>
                <School size={14} className='text-sky-500' /> Classroom / Room Number <span className='text-red-500'>*</span>
              </label>
              {selectedBuildingConfig?.rooms?.length > 0 ? (
                <select
                  value={room}
                  onChange={handleRoomChange}
                  className='w-full border border-sky-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-sky-400 bg-white'
                >
                  <option value=''>-- Select Room --</option>
                  {selectedBuildingConfig.rooms.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <input
                  type='text'
                  placeholder='e.g. Room 204, Lab 101, Washroom 2nd Floor'
                  value={room}
                  onChange={handleRoomChange}
                  className='w-full border border-sky-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-sky-400 bg-white'
                />
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 6: SUBMIT REPORT BUTTON */}
        <motion.button
          whileHover={!loading && isVerified && { scale: 1.02 }}
          whileTap={!loading && isVerified && { scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!isVerified || loading}
          className={`w-full flex items-center justify-center gap-2
                     text-white font-semibold py-3.5 rounded-xl shadow-md transition text-sm
                     ${
                       !isVerified || loading
                         ? 'bg-sky-300 opacity-60 cursor-not-allowed shadow-none'
                         : 'bg-sky-500 hover:bg-sky-600 cursor-pointer'
                     }`}
        >
          {loading ? (
            <>
              <Loader2 className='animate-spin' size={18} />
              Submitting issue report...
            </>
          ) : (
            <>
              <Send size={18} />
              Submit Issue Report
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  )
}

export default Report
