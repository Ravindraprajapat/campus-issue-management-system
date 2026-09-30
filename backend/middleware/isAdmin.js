import User from '../model/User.js'

export const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }
    req.user = user
    next()
  } catch (error) {
    return res.status(500).json({ message: 'Admin check error' })
  }
}

// Allows both admin and officer — attaches user to req
export const isAdminOrOfficer = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user || (user.role !== 'admin' && user.role !== 'officer')) {
      return res.status(403).json({ message: 'Access denied' })
    }
    if (user.role === 'officer' && user.mustChangePassword) {
      return res.status(403).json({
        success: false,
        mustChangePassword: true,
        message: 'First-time password change required before accessing maintenance dashboard.'
      })
    }
    req.user = user
    next()
  } catch (error) {
    return res.status(500).json({ message: 'Auth check error' })
  }
}
