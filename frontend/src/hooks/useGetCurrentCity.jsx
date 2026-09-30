import React from 'react'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCurrentCity } from '../redux/userSlice'
import axios from 'axios'


const useGetCurrentCity = () => {
  const userData = useSelector(state => state.user)
  const dispatch = useDispatch()
  const apikey = import.meta.env.VITE_GEOAPIKEY
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async position => {
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apikey}`
      )
      console.log(result?.data?.results[0].city)
      dispatch(setCurrentCity(result?.data?.results[0].city))
    })
  },[userData])
}

export default useGetCurrentCity
