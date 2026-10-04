import React, { useState } from 'react'
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
  FileText
} from 'lucide-react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import { serverUrl } from '../App'
import { useNavigate } from 'react-router-dom'
import { parulBuildings, detectBuildingFromCoords, detectRoomFromCoords } from '../config/parulCampusConfig'
import { compressImage } from '../utils/imageCompressor'

const Report = () => {
  const [image, setImage] = useState(null)
  const [verificationToken, setVerificationToken] = useState('')
  const [photoVerificationStatus, setPhotoVerificationStatus] = useState('idle') // 'idle' | 'verifying' | 'valid' | 'invalid'
  const [verificationMessage, setVerificationMessage] = useState('')

  const [location, setLocation] = useState(null) // { latitude, longitude, address }
  const [building, setBuilding] = useState('')
  const [room, setRoom] = useState('')
  const [description, setDescription] = useState('')

  // Flags to preserve student's manual selection
  const [isBuildingManuallySelected, setIsBuildingManuallySelected] = useState(false)
  const [isRoomManuallySelected, setIsRoomManuallySelected] = useState(false)

  const [locLoading, setLocLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const isVerified = photoVerificationStatus === 'valid'
  const isVerifying = photoVerificationStatus === 'verifying'

  const handleImageChange = async e => {
    const rawFile = e.target.files[0]
    if (rawFile) {
      setError('')
      setVerificationToken('')
      setVerificationMessage('Analyzing issue photo...')
      setPhotoVerificationStatus('verifying')

      try {
        // Optimize/compress image before upload
        const compressedFile = await compressImage(rawFile)
        setImage(compressedFile)

        const formData = new FormData()
        formData.append('image', compressedFile)

        console.log('[IMAGE VERIFY] Image verification request started:', `${serverUrl}/report/report-submit/verify-image`)
        const { data } = await axios.post(
          `${serverUrl}/report/report-submit/verify-image`,
          formData,
          { withCredentials: true }
        )
        console.log('[IMAGE VERIFY] Response received:', { success: data.success, isValid: data.isValid })

        if (data.success && data.isValid) {
          setVerificationToken(data.verificationToken || '')
          setPhotoVerificationStatus('valid')
          setVerificationMessage('Photo verified ✓')
        } else {
          setVerificationToken('')
          setPhotoVerificationStatus('invalid')
          const msg = data.message || 'Photo verification failed. Please upload a clear photo of the issue.'
          setError(msg)
        }
      } catch (err) {
        console.error('[IMAGE VERIFY] Image verification error:', err.message, err?.response?.data || '')
        setVerificationToken('')
        setPhotoVerificationStatus('invalid')
        const msg = err?.response?.data?.message || 'Photo verification failed. Please upload a clear photo of the issue.'
        setError(msg)
      }
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
          // Reverse geocode fallback for display address
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

        // Attempt automatic building detection if verified mapping exists
        const autoBuilding = detectBuildingFromCoords(latitude, longitude)
        if (autoBuilding && !isBuildingManuallySelected) {
          setBuilding(autoBuilding.name)
        }

        // Attempt automatic room detection if verified mapping exists
        const autoRoom = detectRoomFromCoords(latitude, longitude)
        if (autoRoom && !isRoomManuallySelected) {
          setRoom(autoRoom)
        }

        setLocLoading(false)
      },
      err => {
        setLocLoading(false)
        console.log('Geolocation error/denied:', err.message)
        // Allow manual building & room selection when GPS is unavailable/denied
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
    if (photoVerificationStatus !== 'valid') {
      return setError('Photo must pass AI verification before submitting report')
    }
    if (!image) return setError('Please upload an image of the reported issue')
    if (!location) return setError('Please fetch location or select building')
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
        room,
        latitude: location.latitude,
        longitude: location.longitude
      })

      const response = await axios.post(`${serverUrl}/report/report-submit/report`, formData, {
        withCredentials: true
      })
      console.log('[REPORT] Report submission response received, status:', response.status)

      setSuccess(true)
      setImage(null)
      setVerificationToken('')
      setPhotoVerificationStatus('idle')
      setVerificationMessage('')
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

        {/* Step 1: Upload Image */}
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
              {image ? image.name : 'Click to upload image'}
            </span>
            <span className='text-xs text-gray-400 mt-1 text-center'>
              Photo must clearly show the broken fan, light, projector, bench, leak, AC, etc.
            </span>
            <input
              type='file'
              accept='image/*'
              onChange={handleImageChange}
              disabled={isVerifying || loading}
              className='hidden'
            />
          </label>

          {/* Verification Status Badges */}
          {isVerifying && (
            <div className='mt-2.5 flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-700 text-xs px-3.5 py-2.5 rounded-xl font-medium'>
              <Loader2 size={15} className='animate-spin text-sky-500 shrink-0' />
              <span>Analyzing issue photo...</span>
            </div>
          )}

          {photoVerificationStatus === 'valid' && (
            <div className='mt-2.5 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3.5 py-2.5 rounded-xl font-semibold'>
              <CheckCircle size={15} className='text-emerald-600 shrink-0' />
              <span>Photo verified ✓</span>
            </div>
          )}

          {photoVerificationStatus === 'invalid' && (
            <div className='mt-2.5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-3.5 py-2.5 rounded-xl font-medium'>
              <AlertCircle size={15} className='text-red-500 shrink-0' />
              <span>Photo verification failed. Please upload a clear photo of the issue.</span>
            </div>
          )}
        </div>

        {/* Step 2: Location & Detection */}
        <div className='mb-6'>
          <label className='block text-gray-700 font-medium text-sm mb-2'>
            Location & Building
          </label>

          <div className='flex items-center gap-2 mb-3'>
            <div className={`flex-1 border rounded-xl px-3 py-2 text-sm text-gray-600 ${isVerified ? 'border-sky-200 bg-slate-50' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>
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
                <span className={`flex items-center gap-1.5 text-xs ${isVerified ? 'text-gray-400' : 'text-slate-400'}`}>
                  <MapPin size={14} />
                  GPS not fetched (Click pin to get location)
                </span>
              )}
            </div>

            <button
              type='button'
              onClick={handleGetLocation}
              disabled={!isVerified || isVerifying || locLoading}
              className='p-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sky-500'
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
                disabled={!isVerified || isVerifying}
                className='w-full border border-sky-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-sky-400 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200'
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
                disabled={!isVerified || isVerifying}
                className='w-full border border-sky-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-sky-400 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200'
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
                disabled={!isVerified || isVerifying}
                className='w-full border border-sky-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-sky-400 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200'
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
                disabled={!isVerified || isVerifying}
                className='w-full border border-sky-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-sky-400 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200'
              />
            )}
          </div>
        </div>

        {/* Step 3: Description */}
        <div className='mb-6'>
          <label className='block text-gray-700 font-medium text-sm mb-1 flex items-center gap-1'>
            <FileText size={14} className='text-sky-500' /> Additional Description (Optional)
          </label>
          <textarea
            rows={3}
            placeholder='Describe the issue (e.g. Second fan from front left is wobbling and making noise)'
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={!isVerified || isVerifying}
            className='w-full border border-sky-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-400 bg-white resize-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200'
          />
        </div>

        {/* Step 4: Submit */}
        <motion.button
          whileHover={!loading && !isVerifying && isVerified && { scale: 1.02 }}
          whileTap={!loading && !isVerifying && isVerified && { scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!isVerified || isVerifying || loading}
          className={`w-full flex items-center justify-center gap-2
                     text-white font-semibold py-3.5 rounded-xl shadow-md transition text-sm
                     ${
                       !isVerified || isVerifying || loading
                         ? 'bg-sky-300 opacity-60 cursor-not-allowed shadow-none'
                         : 'bg-sky-500 hover:bg-sky-600 cursor-pointer'
                     }`}
        >
          {loading ? (
            <>
              <Loader2 className='animate-spin' size={18} />
              Submitting issue report...
            </>
          ) : isVerifying ? (
            <>
              <Loader2 className='animate-spin' size={18} />
              Analyzing photo...
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
