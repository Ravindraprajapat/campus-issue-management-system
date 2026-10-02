import { useEffect } from 'react'
import axios from 'axios'
import { serverUrl } from '../App'
import { useDispatch } from 'react-redux'
import { setUserData } from '../redux/userSlice'
const useGetCurrentUser = () => {
    const dispatch = useDispatch();
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('[AUTH DEBUG] GET /api/user/current')
        const result = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true 
        })
        console.log('[AUTH DEBUG] GET /api/user/current response received')
        dispatch(setUserData(result.data))    
      } catch (error) {
        console.log('[AUTH DEBUG] GET /api/user/current error:', error.message)   
      } 
    }
    fetchUser() 
  }, [])  
}
  
export default useGetCurrentUser
