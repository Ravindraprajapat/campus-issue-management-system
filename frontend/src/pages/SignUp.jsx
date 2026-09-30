import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, User, Phone, HardHat, Building, BookOpen, GraduationCap, Award, Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FcGoogle } from 'react-icons/fc'
import axios from 'axios'
import { serverUrl } from '../App'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../../firebase.js'
import { setUserData } from '../redux/userSlice.js'
import { useDispatch } from 'react-redux'

const PARUL_FACULTIES = [
  'Faculty of Engineering & Technology',
  'Faculty of IT & Computer Science',
  'Faculty of Pharmacy',
  'Faculty of Medicine',
  'Faculty of Nursing',
  'Faculty of Physiotherapy',
  'Faculty of Management Studies',
  'Faculty of Commerce',
  'Faculty of Law',
  'Faculty of Architecture & Planning',
  'Faculty of Applied Sciences',
  'Faculty of Agriculture',
  'Faculty of Design',
  'Faculty of Fine Arts',
  'Faculty of Liberal Arts',
  'Faculty of Social Work',
  'Faculty of Hotel Management & Catering Technology',
  'Faculty of Ayurved',
  'Faculty of Homeopathy'
]

import { PARUL_CAMPUS_BUILDINGS } from '../config/parulCampusConfig'

const CAMPUS_BUILDINGS = PARUL_CAMPUS_BUILDINGS

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const role = 'user'

  // Student specific fields
  const [studentId, setStudentId] = useState('')
  const [faculty, setFaculty] = useState('')
  const [course, setCourse] = useState('')
  const [semester, setSemester] = useState('')

  const [error, setError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSignUp = async () => {
    setError('')

    try {
      const payload = {
        name: fullName,
        mobile,
        email,
        password,
        role: 'user',
        studentId,
        faculty,
        course,
        semester
      }

      const result = await axios.post(`${serverUrl}/api/auth/signup`, payload, {
        withCredentials: true
      })

      if (result?.data?.token) localStorage.setItem('token', result.data.token)
      dispatch(setUserData(result.data))
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Sign up failed')
    }
  }

  const handleGoogleSignUp = async () => {
    if (!mobile) return alert('Mobile number is required')
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/auth/google-auth`,
        { name: result.user.displayName, email: result.user.email, mobile },
        { withCredentials: true }
      )
      if (data?.token) localStorage.setItem('token', data.token)
      dispatch(setUserData(data.user || data))
      navigate('/')
    } catch (err) {
      console.log('error in google signUp', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-white to-sky-100"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-xl shadow-sky-100 w-full max-w-md p-8 border border-sky-200 my-8"
      >
        <div className="text-center mb-6">
          <span className="text-xs font-bold text-sky-600 uppercase tracking-widest block mb-1">
            Parul University
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            Student Registration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Campus Issue Registration & Maintenance Management System
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3.5 py-2.5 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Full Name */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1 text-xs text-left">Full Name *</label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              type="text"
              className="w-full border border-sky-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
        </div>

        {/* STUDENT SPECIFIC FIELDS */}
        {/* Student ID */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1 text-xs text-left">Student ID / Enrollment No.</label>
          <div className="relative">
            <GraduationCap size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              type="text"
              className="w-full border border-sky-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              placeholder="e.g. 2101031001"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
            />
          </div>
        </div>

        {/* Faculty */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1 text-xs text-left">Faculty / Institute</label>
          <div className="relative">
            <BookOpen size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <select
              value={faculty}
              onChange={e => setFaculty(e.target.value)}
              className="w-full border border-sky-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            >
              <option value="">-- Select Faculty --</option>
              {PARUL_FACULTIES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Course & Semester */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-xs text-left">Course / Program</label>
            <input
              type="text"
              placeholder="e.g. B.Tech CSE"
              value={course}
              onChange={e => setCourse(e.target.value)}
              className="w-full border border-sky-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-xs text-left">Semester / Year</label>
            <input
              type="text"
              placeholder="e.g. Sem 6"
              value={semester}
              onChange={e => setSemester(e.target.value)}
              className="w-full border border-sky-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            />
          </div>
        </div>

        {/* Mobile */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1 text-xs text-left">Mobile Number *</label>
          <div className="relative">
            <Phone size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              type="text"
              className="w-full border border-sky-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
            />
          </div>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1 text-xs text-left">Student Email *</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              type="email"
              className="w-full border border-sky-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              placeholder="student@paruluniversity.ac.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-1 text-xs text-left">Password *</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full border border-sky-200 rounded-xl pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-[11px] text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignUp}
          className="w-full bg-sky-500 hover:bg-sky-600 font-bold py-3 rounded-xl text-white transition shadow-md shadow-sky-200 text-sm cursor-pointer"
        >
          CREATE STUDENT ACCOUNT
        </motion.button>

        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="px-3 text-xs text-slate-400 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignUp}
          className="w-full flex items-center justify-center gap-3 border border-sky-200 rounded-xl py-2.5 bg-white hover:bg-sky-50 transition cursor-pointer text-xs font-semibold text-slate-700"
        >
          <FcGoogle size={18} />
          <span>Student Sign Up with Google</span>
        </motion.button>

        <p className="text-center mt-6 text-xs text-slate-500">
          Already have an account?{' '}
          <span
            onClick={() => navigate('/signin')}
            className="text-sky-500 font-bold cursor-pointer hover:underline"
          >
            Sign In
          </span>
        </p>
      </motion.div>
    </motion.div>
  )
}

export default SignUp
