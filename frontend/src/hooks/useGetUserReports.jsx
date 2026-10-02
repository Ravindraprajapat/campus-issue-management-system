import { useDispatch } from 'react-redux'
import { useEffect } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'
import React from 'react'
import { setReports } from '../redux/reportSlice'

const useGetUserReports = () => {
  const dispatch = useDispatch()
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[AUTH DEBUG] GET /report/report-submit/reports')
        const result = await axios.get(
          `${serverUrl}/report/report-submit/reports`,
          { withCredentials: true }
        )
        console.log('[AUTH DEBUG] GET /report/report-submit/reports response received')
        dispatch(setReports(result.data.reports || result.data.report));
      } catch (error) {
        console.log('[AUTH DEBUG] GET /report/report-submit/reports error:', error.message)
      }
    }
    fetchData()
  }, [])
}

export default useGetUserReports;
