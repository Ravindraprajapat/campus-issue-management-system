import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User, HardHat } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FcGoogle } from 'react-icons/fc'
import axios from 'axios'
import { serverUrl } from '../App'
import { useDispatch } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import { auth } from '../../firebase'

const SignIn = () => {
  const primaryColor = '#0EA5E9'
  const hoverColor = '#0284C7'
  const bgColor = '#F8FAFC'
  const borderColor = '#3B82F6'

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginRole, setLoginRole] = useState('user')
  const [error, setError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSignIn = async () => {
    setError('')
    const requestUrl = `${serverUrl}/api/auth/signin`
    console.log('[AUTH] Login request started')
    console.log('[AUTH] Request URL:', requestUrl)
    console.log('[AUTH] Request method: POST')
    console.log('[AUTH] Request started at:', new Date().toISOString())

    try {
      const result = await axios.post(
        requestUrl,
        { email, password },
        { withCredentials: true }
      )
      console.log('[AUTH] Login response received')
      console.log('[AUTH] Status:', result.status)

      const user = result?.data
      const hasToken = !!user?.token
      console.log(`[AUTH DEBUG] Login token received: ${hasToken}`)
      if (user?.token) {
        localStorage.setItem('token', user.token)
        console.log('[AUTH DEBUG] Token stored: true')
        console.log('[AUTH DEBUG] Token storage key: token')
      } else {
        console.log('[AUTH DEBUG] Token stored: false')
      }

      const { token, password: _p, ...safeUserData } = user || {}
      console.log('[AUTH] Response:', safeUserData)

      dispatch(setUserData(user))

      if (loginRole === 'admin') {
        if (user.role !== 'admin') {
          setError('Access denied. You are not an admin.')
          dispatch(setUserData(null))
          return
        }
        navigate('/admin/issues')
      } else if (loginRole === 'officer') {
        if (user.role !== 'officer') {
          setError('Access denied. You are not a maintenance staff member.')
          dispatch(setUserData(null))
          return
        }
        navigate('/officer/map')
      } else {
        if (user.role === 'admin') {
          navigate('/admin/issues')
        } else if (user.role === 'officer') {
          navigate('/officer/map')
        } else {
          navigate('/')
        }
      }
    } catch (err) {
      console.error('[AUTH] Login error:', err.message)
      if (err?.response) {
        console.error('[AUTH] Response status:', err.response.status)
        console.error('[AUTH] Response data:', err.response.data)
      } else if (err?.request) {
        console.error('[AUTH] Network error - No response received from server:', {
          url: requestUrl,
          code: err.code,
          message: err.message
        })
      } else {
        console.error('[AUTH] Setup error:', err.message)
      }
      setError(err?.response?.data?.message || 'Sign in failed')
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const requestUrl = `${serverUrl}/api/auth/google-auth`
      console.log('[AUTH] Google auth request started:', requestUrl)

      const { data, status } = await axios.post(
        requestUrl,
        {
          email: result.user.email,
          name: result.user.displayName
        },
        { withCredentials: true }
      )
      console.log('[AUTH] Google auth response received, status:', status)
      const hasToken = !!data?.token
      console.log(`[AUTH DEBUG] Login token received: ${hasToken}`)
      if (data?.token) {
        localStorage.setItem('token', data.token)
        console.log('[AUTH DEBUG] Token stored: true')
        console.log('[AUTH DEBUG] Token storage key: token')
      } else {
        console.log('[AUTH DEBUG] Token stored: false')
      }

      dispatch(setUserData(data.user || data))
      navigate('/')
    } catch (error) {
      console.error('[AUTH] Google auth error:', error.message, error?.response?.data || '')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: bgColor }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg w-full max-w-md p-8"
        style={{ border: `1px solid ${borderColor}` }}
      >
        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold mb-2 text-center"
          style={{ color: primaryColor }}
        >
          Welcome to UniFix AI
        </motion.h1>

        <p className="text-gray-600 mb-6 text-center">Sign in to your account</p>

        {/* Role Toggle */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-6">
          <button
            onClick={() => setLoginRole('user')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition cursor-pointer ${
              loginRole === 'user'
                ? 'bg-sky-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User size={15} />
            Student
          </button>
          <button
            onClick={() => setLoginRole('officer')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition cursor-pointer ${
              loginRole === 'officer'
                ? 'bg-sky-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <HardHat size={15} />
            Maintenance Staff
          </button>
          <button
            onClick={() => setLoginRole('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition cursor-pointer ${
              loginRole === 'admin'
                ? 'bg-sky-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck size={15} />
            Admin
          </button>
        </div>

        {loginRole === 'admin' && (
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-700 text-xs px-3 py-2 rounded-lg mb-4">
            <ShieldCheck size={14} />
            Admin credentials required for this portal
          </div>
        )}

        {loginRole === 'officer' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg mb-4">
            <HardHat size={14} />
            Maintenance Staff — access issues for your assigned building
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Email */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <label className="block text-gray-700 font-medium mb-1 text-left">Email</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              type="email"
              className="w-full border rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition"
              style={{ borderColor }}
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-4"
        >
          <label className="block text-gray-700 font-medium mb-1 text-left">Password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full border rounded-lg pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition"
              style={{ borderColor }}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            />
            <button
              type="button"
              className="absolute right-3 top-[11px] text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="text-right mb-4 font-medium cursor-pointer"
          style={{ color: primaryColor }}
          onClick={() => navigate('/forget-password')}
        >
          Forget Password?
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSignIn}
          className="w-full font-semibold py-2 rounded-lg text-white transition cursor-pointer"
          style={{ backgroundColor: primaryColor }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = hoverColor)}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = primaryColor)}
        >
          Sign In as {loginRole === 'admin' ? 'Admin' : loginRole === 'officer' ? 'Maintenance Staff' : 'Student'}
        </motion.button>

        {loginRole === 'user' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center my-6"
            >
              <div className="flex-1 h-px bg-gray-300" />
              <span className="px-3 text-sm text-gray-500 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-300" />
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 border rounded-lg py-2 bg-white hover:bg-gray-50 transition"
              style={{ borderColor }}
            >
              <FcGoogle size={20} />
              <span className="font-medium text-gray-700">Sign in using Google</span>
            </motion.button>
          </>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-6 cursor-pointer"
          onClick={() => navigate('/signup')}
        >
          Don't have an account?{' '}
          <span style={{ color: primaryColor, fontWeight: '600' }}>Sign Up</span>
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

export default SignIn
