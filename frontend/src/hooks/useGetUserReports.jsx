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
        const result = await axios.get(
          `${serverUrl}/report/report-submit/reports`,
          { withCredentials: true }
        )
        console.log(result.data.report)
         dispatch(setReports(result.data.reports));
      } catch (error) {
        console.log(error)
      }
    }
    fetchData()
  }, [])
}

export default useGetUserReports;
