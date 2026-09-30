import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ children, requiredRole }) => {
  const { userData } = useSelector(state => state.user)

  if (!userData) return <Navigate to="/signin" replace />

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowed.includes(userData.role)) return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
