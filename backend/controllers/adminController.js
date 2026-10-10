import Report from '../model/Report.js'
import User from '../model/User.js'
import Department from '../model/Department.js'
import IssueType from '../model/IssueType.js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { sendComplaintResolvedNotification } from '../utils/notificationService.js'
import { DEPARTMENTS, normalizeBuilding, normalizeDepartment } from '../utils/departmentMapping.js'

// Helper to reliably retrieve assigned buildings array for an officer
export const getOfficerBuildings = (officer) => {
  let buildings = []
  if (Array.isArray(officer?.assignedBuildings) && officer.assignedBuildings.length > 0) {
    buildings = officer.assignedBuildings
  } else if (officer?.assignedBuilding || officer?.assignedWard) {
    buildings = [officer.assignedBuilding || officer.assignedWard]
  }
  return [...new Set(buildings.map(b => String(b || '').trim()).filter(Boolean))]
}

// Admin: get ALL reports
export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reportedBy', 'name email mobile studentId faculty course semester')
      .populate('assignedTo', 'name email assignedBuilding assignedBuildings assignedWard employeeId department designation')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, reports })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get building summary — each building with its assigned officers and issue counts
export const getWardSummary = async (req, res) => {
  try {
    // All maintenance officers
    const officers = await User.find({ role: 'officer' }).select('name email assignedBuilding assignedBuildings assignedWard employeeId department designation')

    // All reports
    const reports = await Report.find().select('location status department')

    // Build building map based ONLY on location.building
    const buildingMap = {}
    reports.forEach(r => {
      const b = (r.location?.building && r.location.building.trim())
        ? r.location.building.trim()
        : 'Building Not Specified'

      if (!buildingMap[b]) buildingMap[b] = { total: 0, pending: 0, inProgress: 0, resolved: 0, pendingClassification: 0 }
      buildingMap[b].total++
      if (r.status === 'PENDING') buildingMap[b].pending++
      else if (r.status === 'PENDING_CLASSIFICATION') {
        buildingMap[b].pending++
        buildingMap[b].pendingClassification++
      }
      else if (r.status === 'IN_PROGRESS') buildingMap[b].inProgress++
      else if (r.status === 'RESOLVED') buildingMap[b].resolved++
    })

    // Merge with officer assignments (supports multiple officers per building)
    const result = Object.entries(buildingMap).map(([building, counts]) => {
      const buildingOfficers = officers.filter(o => {
        const oBuildings = getOfficerBuildings(o)
        return oBuildings.some(b => normalizeBuilding(b) === normalizeBuilding(building))
      })
      return {
        building,
        ward: building, // backwards compatibility
        officer: buildingOfficers[0] || null, // legacy compatibility
        officers: buildingOfficers,
        ...counts
      }
    }).sort((a, b) => (b.pending + b.inProgress) - (a.pending + a.inProgress))

    res.status(200).json({ success: true, buildings: result, wards: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: assign officer to a building
export const assignOfficerToWard = async (req, res) => {
  try {
    const { ward, building: reqBuilding, officerId } = req.body
    const targetBuilding = reqBuilding || ward

    if (!targetBuilding) return res.status(400).json({ message: 'Building / Ward is required' })

    if (officerId) {
      const officer = await User.findById(officerId)
      if (!officer || officer.role !== 'officer') {
        return res.status(400).json({ message: 'Invalid maintenance staff officer' })
      }

      const existingBldgs = getOfficerBuildings(officer)
      if (!existingBldgs.some(b => normalizeBuilding(b) === normalizeBuilding(targetBuilding))) {
        existingBldgs.push(targetBuilding.trim())
      }

      await User.findByIdAndUpdate(officerId, {
        assignedBuildings: existingBldgs,
        assignedBuilding: existingBldgs[0],
        assignedWard: existingBldgs[0]
      })
    }

    res.status(200).json({ success: true, building: targetBuilding, officerId })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get all building-officer mappings
export const getWardOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: 'officer' }).select('name email assignedBuilding assignedBuildings department designation')
    res.status(200).json({ success: true, officers })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Officer: get reports strictly filtered by assignedTo === officer._id (SECURITY ENFORCED)
export const getOfficerReports = async (req, res) => {
  try {
    const officer = req.user || (await User.findById(req.userId))

    if (!officer || (officer.role !== 'officer' && officer.role !== 'admin')) {
      return res.status(403).json({ message: 'Maintenance Staff or Admin access required' })
    }

    const officerBuildings = getOfficerBuildings(officer)
    const normOfficerBuildings = officerBuildings.map(b => normalizeBuilding(b))
    const normDept = normalizeDepartment(officer.department)

    let query = {}

    if (officer.role === 'officer') {
      // Canonical authorization: Officer sees ONLY reports explicitly assigned to their User._id
      query = { assignedTo: officer._id }
    }

    let reports = await Report.find(query)
      .populate('reportedBy', 'name email mobile studentId faculty course semester')
      .populate('assignedTo', 'name email assignedBuilding assignedBuildings assignedWard department')
      .sort({ createdAt: -1 })

    if (officer.role === 'officer') {
      // SECURITY CRITICAL SERVER-SIDE ENFORCEMENT:
      // Verify assignedTo === officer._id AND department match AND building is inside assignedBuildings
      reports = reports.filter(r => {
        const rDeptMatch = normalizeDepartment(r.department) === normDept
        const rBldgMatch = normOfficerBuildings.includes(normalizeBuilding(r.location?.building || r.location?.ward))
        return rDeptMatch && rBldgMatch
      })
    }

    res.status(200).json({
      success: true,
      reports,
      ward: officerBuildings[0] || '',
      building: officerBuildings[0] || '',
      assignedBuildings: officerBuildings,
      officerDepartment: officer.department || ''
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin / Officer: assign officer to a report with strict department & assignedBuildings validation
export const assignOfficerToReport = async (req, res) => {
  try {
    const { id } = req.params
    const { officerId, assignedTo } = req.body
    const targetOfficerId = officerId !== undefined ? officerId : assignedTo

    const existingReport = await Report.findById(id)
    if (!existingReport) return res.status(404).json({ success: false, message: 'Report not found' })

    if (targetOfficerId) {
      const officer = await User.findById(targetOfficerId)
      if (!officer || officer.role !== 'officer') {
        return res.status(400).json({ success: false, message: 'Invalid maintenance staff officer' })
      }

      if (officer.isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign complaint to an inactive or deactivated maintenance staff member.'
        })
      }

      // 1. Department match validation
      if (normalizeDepartment(existingReport.department) !== normalizeDepartment(officer.department)) {
        return res.status(400).json({
          success: false,
          message: 'Selected officer department does not match the report department category.'
        })
      }

      // 2. Building match validation (Check if report building is in officer's assignedBuildings)
      const rBuilding = existingReport.location?.building || existingReport.location?.ward || ''
      const oBuildings = getOfficerBuildings(officer)
      const isBuildingMatch = oBuildings.some(b => normalizeBuilding(b) === normalizeBuilding(rBuilding))

      if (!rBuilding || !isBuildingMatch) {
        return res.status(400).json({
          success: false,
          message: 'Selected officer assigned buildings do not include the report building location.'
        })
      }

      existingReport.assignedTo = officer._id
    } else {
      existingReport.assignedTo = null
    }

    await existingReport.save()
    const report = await Report.findById(id)
      .populate('reportedBy', 'name email mobile studentId faculty course semester')
      .populate('assignedTo', 'name email assignedBuilding assignedBuildings assignedWard department')

    res.status(200).json({ success: true, report })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin / Officer: update report status
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, latitude, longitude, officerId, assignedTo } = req.body

    const existingReport = await Report.findById(id)
    if (!existingReport) return res.status(404).json({ success: false, message: 'Report not found' })

    const updateData = {}

    if (status) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' })
      }
      updateData.status = status

      // 🔹 PROXIMITY GATE FOR RESOLUTION
      if (status === 'RESOLVED') {
        const officerLat = Number(latitude)
        const officerLng = Number(longitude)

        if (isNaN(officerLat) || isNaN(officerLng)) {
          return res.status(400).json({
            success: false,
            message: 'Live GPS location is required to resolve a complaint.'
          })
        }

        const complaintLat = existingReport.location?.latitude
        const complaintLng = existingReport.location?.longitude

        if (typeof complaintLat !== 'number' || typeof complaintLng !== 'number' || isNaN(complaintLat) || isNaN(complaintLng)) {
          return res.status(400).json({
            success: false,
            message: 'Complaint location coordinates are invalid or missing.'
          })
        }

        // Haversine distance in meters
        const MAX_RESOLUTION_DISTANCE_METERS = 50

        const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
          const R = 6371000 // Earth radius in meters
          const dLat = ((lat2 - lat1) * Math.PI) / 180
          const dLon = ((lon2 - lon1) * Math.PI) / 180
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          return R * c
        }

        const distanceMeters = calculateDistanceMeters(
          officerLat,
          officerLng,
          complaintLat,
          complaintLng
        )

        console.log(`[Resolution Check] Calculated distance: ${distanceMeters.toFixed(2)}m (Max: ${MAX_RESOLUTION_DISTANCE_METERS}m)`)

        if (distanceMeters > MAX_RESOLUTION_DISTANCE_METERS) {
          return res.status(400).json({
            success: false,
            message: `Cannot resolve this complaint. You must be within ${MAX_RESOLUTION_DISTANCE_METERS} meters of the reported location.`
          })
        }
      }
    }

    // 🔹 OFFICER ASSIGNMENT VALIDATION IF PROVIDED
    const targetOfficerId = officerId !== undefined ? officerId : assignedTo
    if (targetOfficerId !== undefined) {
      if (targetOfficerId) {
        const officer = await User.findById(targetOfficerId)
        if (!officer || officer.role !== 'officer') {
          return res.status(400).json({ success: false, message: 'Invalid maintenance staff officer' })
        }

        if (officer.isActive === false) {
          return res.status(400).json({
            success: false,
            message: 'Cannot assign complaint to an inactive or deactivated maintenance staff member.'
          })
        }

        // 1. Department match validation
        if (normalizeDepartment(existingReport.department) !== normalizeDepartment(officer.department)) {
          return res.status(400).json({
            success: false,
            message: 'Officer department/building does not match the report.'
          })
        }

        // 2. Building match validation
        const rBuilding = existingReport.location?.building || ''
        const oBuildings = getOfficerBuildings(officer)
        const isBuildingMatch = oBuildings.some(b => normalizeBuilding(b) === normalizeBuilding(rBuilding))

        if (!rBuilding || !isBuildingMatch) {
          return res.status(400).json({
            success: false,
            message: 'Officer department/building does not match the report.'
          })
        }

        updateData.assignedTo = officer._id
      } else {
        updateData.assignedTo = null
      }
    }

    const isNewlyResolved = status === 'RESOLVED' && existingReport.status !== 'RESOLVED'

    const report = await Report.findByIdAndUpdate(id, updateData, { new: true })
      .populate('reportedBy', 'name email mobile')
      .populate('assignedTo', 'name email assignedBuilding assignedBuildings assignedWard department')

    // Trigger Resolution Notification (Twilio + Nodemailer) if newly resolved
    if (isNewlyResolved && report?.reportedBy) {
      sendComplaintResolvedNotification({ user: report.reportedBy, report }).catch(err => {
        console.error('Non-blocking resolution notification error:', err)
      })
    }

    res.status(200).json({ success: true, report })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get all officers list with aggregate stats & assignedBuildings
export const getOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: 'officer' })
      .select('-password -resetOtp -otpExpires -isOtpVerified')
      .sort({ createdAt: -1 })

    const officerIds = officers.map(o => o._id)
    const reportStats = await Report.aggregate([
      { $match: { assignedTo: { $in: officerIds } } },
      {
        $group: {
          _id: { officer: '$assignedTo', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ])

    const statsMap = {}
    reportStats.forEach(item => {
      const offId = item._id.officer.toString()
      if (!statsMap[offId]) {
        statsMap[offId] = { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0 }
      }
      const st = (item._id.status || '').toUpperCase()
      const cnt = item.count
      statsMap[offId].total += cnt
      if (st === 'PENDING') statsMap[offId].pending += cnt
      else if (st === 'IN_PROGRESS' || st === 'IN PROGRESS') statsMap[offId].inProgress += cnt
      else if (st === 'RESOLVED') statsMap[offId].resolved += cnt
      else if (st === 'REJECTED') statsMap[offId].rejected += cnt
    })

    const officersWithStats = officers.map(o => {
      const st = statsMap[o._id.toString()] || { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0 }
      const bldgs = getOfficerBuildings(o)
      return {
        ...o.toObject(),
        isActive: o.isActive !== false,
        assignedBuildings: bldgs,
        stats: st
      }
    })

    res.status(200).json({ success: true, officers: officersWithStats })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get detailed officer information with assigned complaints and statistics
export const getOfficerDetails = async (req, res) => {
  try {
    const { id } = req.params
    const officer = await User.findOne({ _id: id, role: 'officer' }).select('-password -resetOtp -otpExpires -isOtpVerified')
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Maintenance staff member not found.' })
    }

    const officerObj = officer.toObject()
    officerObj.isActive = officer.isActive !== false
    officerObj.assignedBuildings = getOfficerBuildings(officer)

    const assignedComplaints = await Report.find({ assignedTo: officer._id })
      .populate('reportedBy', 'name email mobile studentId faculty course semester')
      .sort({ createdAt: -1 })

    const stats = {
      total: assignedComplaints.length,
      pending: assignedComplaints.filter(r => (r.status || '').toUpperCase() === 'PENDING').length,
      inProgress: assignedComplaints.filter(r => ['IN_PROGRESS', 'IN PROGRESS'].includes((r.status || '').toUpperCase())).length,
      resolved: assignedComplaints.filter(r => (r.status || '').toUpperCase() === 'RESOLVED').length,
      rejected: assignedComplaints.filter(r => (r.status || '').toUpperCase() === 'REJECTED').length
    }

    res.status(200).json({
      success: true,
      officer: officerObj,
      stats,
      assignedComplaints
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get all admin users
export const getAdminUsers = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('name email')
    res.status(200).json({ success: true, admins })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: create Maintenance Staff account with multiple assignedBuildings & explicit department
export const createOfficer = async (req, res) => {
  try {
    const { name, email, mobile, employeeId, department, designation, assignedBuilding, assignedBuildings: reqAssignedBuildings } = req.body

    let buildingsArray = Array.isArray(reqAssignedBuildings) && reqAssignedBuildings.length > 0
      ? reqAssignedBuildings
      : (assignedBuilding ? [assignedBuilding] : [])

    buildingsArray = [...new Set(buildingsArray.map(b => String(b || '').trim()).filter(Boolean))]

    if (!name || !email || !department || buildingsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, department, and at least one assigned building are required.'
      })
    }

    const normDept = String(department).trim()
    const dbDept = await Department.findOne({ code: normDept, isActive: true })
    if (!dbDept && !DEPARTMENTS.includes(normDept)) {
      return res.status(400).json({ success: false, message: 'Invalid department specified. Please select a valid active campus department.' })
    }

    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' })
    }

    if (employeeId) {
      const existingEmp = await User.findOne({ employeeId })
      if (existingEmp) {
        return res.status(400).json({ success: false, message: 'Staff member with this Employee ID already exists.' })
      }
    }

    // Generate secure temporary password
    const tempPassword = 'PU-' + crypto.randomBytes(4).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const primaryBuilding = buildingsArray[0]

    const officer = await User.create({
      name,
      email,
      mobile: mobile || '',
      role: 'officer',
      employeeId: employeeId || '',
      department: normDept,
      designation: designation || '',
      assignedBuildings: buildingsArray,
      assignedBuilding: primaryBuilding,
      assignedWard: primaryBuilding,
      password: hashedPassword,
      mustChangePassword: true
    })

    // 🔹 AUTOMATIC OFFICER ASSIGNMENT TRIGGER (RECHECK UNASSIGNED COMPLAINTS)
    // Automatically assign existing UNASSIGNED reports matching officer.department AND any of officer.assignedBuildings
    let autoAssignedCount = 0
    try {
      const unassignedReports = await Report.find({
        $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }]
      })

      const allOfficers = await User.find({ role: 'officer', isActive: { $ne: false } }).sort({ createdAt: 1 })

      for (const report of unassignedReports) {
        const rDeptNorm = normalizeDepartment(report.department)
        const rBldgNorm = normalizeBuilding(report.location?.building || report.location?.ward)

        const eligibleOfficers = allOfficers.filter(o => {
          if (o.isActive === false) return false
          if (normalizeDepartment(o.department) !== rDeptNorm) return false
          const oBuildings = getOfficerBuildings(o).map(b => normalizeBuilding(b))
          return oBuildings.includes(rBldgNorm)
        })

        if (eligibleOfficers.length > 0) {
          const workloads = await Promise.all(eligibleOfficers.map(async (off) => {
            const activeCount = await Report.countDocuments({
              assignedTo: off._id,
              status: { $in: ['PENDING', 'IN_PROGRESS'] }
            })
            return { officer: off, activeCount }
          }))
          workloads.sort((a, b) => a.activeCount - b.activeCount)
          report.assignedTo = workloads[0].officer._id
          await report.save()
          autoAssignedCount++
        }
      }

      if (autoAssignedCount > 0) {
        console.log(`[Auto Officer Assignment] Automatically assigned ${autoAssignedCount} existing unassigned report(s) matching department '${normDept}' & buildings [${buildingsArray.join(', ')}].`)
      }
    } catch (recheckErr) {
      console.error('Non-blocking error during unassigned report re-check:', recheckErr.message)
    }

    const userObj = officer.toObject()
    delete userObj.password

    return res.status(201).json({
      success: true,
      message: autoAssignedCount > 0
        ? `Maintenance Staff account created successfully. Automatically assigned ${autoAssignedCount} matching unassigned complaint(s).`
        : 'Maintenance Staff account created successfully.',
      user: userObj,
      tempPassword,
      autoAssignedCount
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Preview auto-assignment for unassigned reports using department + assignedBuildings match & workload balancing
export const previewAutoAssignUnassigned = async (req, res) => {
  try {
    const unassignedReports = await Report.find({
      status: { $ne: 'PENDING_CLASSIFICATION' },
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: null }
      ]
    }).populate('reportedBy', 'name email')

    const officers = await User.find({ role: 'officer', isActive: { $ne: false } }).sort({ createdAt: 1 })

    const eligibleAssignments = []
    const remainingUnassigned = []

    for (const report of unassignedReports) {
      const reportBuilding = String(report.location?.building || report.location?.ward || '').trim()
      const reportDept = report.department

      if (!reportBuilding || !reportDept) {
        remainingUnassigned.push({
          reportId: report._id,
          issueType: report.issueType || report.aiAnalysis?.detectedType,
          department: reportDept || 'N/A',
          building: reportBuilding || 'N/A',
          reason: 'Missing building or department'
        })
        continue
      }

      // Filter eligible officers (department matches AND reportBuilding is in officer.assignedBuildings)
      const eligibleOfficers = officers.filter(o => {
        if (o.role !== 'officer' || o.isActive === false) return false
        if (normalizeDepartment(o.department) !== normalizeDepartment(reportDept)) return false
        const oBuildings = getOfficerBuildings(o)
        return oBuildings.some(b => normalizeBuilding(b) === normalizeBuilding(reportBuilding))
      })

      if (eligibleOfficers.length > 0) {
        // Workload-based selection: count active PENDING/IN_PROGRESS reports
        const workloads = await Promise.all(eligibleOfficers.map(async (off) => {
          const activeCount = await Report.countDocuments({
            assignedTo: off._id,
            status: { $in: ['PENDING', 'IN_PROGRESS'] }
          })
          return { officer: off, activeCount }
        }))
        workloads.sort((a, b) => a.activeCount - b.activeCount)
        const matchingOfficer = workloads[0].officer

        eligibleAssignments.push({
          reportId: report._id,
          issueType: report.issueType || report.aiAnalysis?.detectedType,
          department: reportDept,
          building: reportBuilding,
          matchingOfficer: {
            _id: matchingOfficer._id,
            name: matchingOfficer.name,
            email: matchingOfficer.email,
            department: matchingOfficer.department,
            assignedBuildings: getOfficerBuildings(matchingOfficer),
            assignedBuilding: matchingOfficer.assignedBuilding || matchingOfficer.assignedWard
          }
        })
      } else {
        remainingUnassigned.push({
          reportId: report._id,
          issueType: report.issueType || report.aiAnalysis?.detectedType,
          department: reportDept,
          building: reportBuilding,
          reason: `No active officer matching department '${reportDept}' and building '${reportBuilding}'`
        })
      }
    }

    res.status(200).json({
      success: true,
      totalUnassigned: unassignedReports.length,
      eligibleCount: eligibleAssignments.length,
      remainingUnassignedCount: remainingUnassigned.length,
      eligibleAssignments,
      remainingUnassigned
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Execute auto-assignment for unassigned reports using department + assignedBuildings match & workload balancing
export const autoAssignUnassignedReports = async (req, res) => {
  try {
    const unassignedReports = await Report.find({
      status: { $ne: 'PENDING_CLASSIFICATION' },
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: null }
      ]
    })

    const officers = await User.find({ role: 'officer', isActive: { $ne: false } }).sort({ createdAt: 1 })

    let assignedCount = 0
    const assignedLog = []
    const unassignedLog = []

    for (const report of unassignedReports) {
      const reportBuilding = String(report.location?.building || report.location?.ward || '').trim()
      const reportDept = report.department

      if (!reportBuilding || !reportDept) {
        unassignedLog.push({
          reportId: report._id,
          issueType: report.issueType,
          department: reportDept || 'N/A',
          building: reportBuilding || 'N/A',
          reason: 'Missing building or department'
        })
        continue
      }

      const eligibleOfficers = officers.filter(o => {
        if (o.role !== 'officer' || o.isActive === false) return false
        if (normalizeDepartment(o.department) !== normalizeDepartment(reportDept)) return false
        const oBuildings = getOfficerBuildings(o)
        return oBuildings.some(b => normalizeBuilding(b) === normalizeBuilding(reportBuilding))
      })

      if (eligibleOfficers.length > 0) {
        const workloads = await Promise.all(eligibleOfficers.map(async (off) => {
          const activeCount = await Report.countDocuments({
            assignedTo: off._id,
            status: { $in: ['PENDING', 'IN_PROGRESS'] }
          })
          return { officer: off, activeCount }
        }))
        workloads.sort((a, b) => a.activeCount - b.activeCount)
        const matchingOfficer = workloads[0].officer

        report.assignedTo = matchingOfficer._id
        await report.save()
        assignedCount++
        assignedLog.push({
          reportId: report._id,
          issueType: report.issueType,
          department: reportDept,
          building: reportBuilding,
          assignedToOfficer: matchingOfficer.name
        })
      } else {
        unassignedLog.push({
          reportId: report._id,
          issueType: report.issueType,
          department: reportDept,
          building: reportBuilding,
          reason: 'No matching officer'
        })
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${assignedCount} unassigned report(s) to matching officers.`,
      assignedCount,
      remainingUnassignedCount: unassignedLog.length,
      assignedLog,
      unassignedLog
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: update existing Maintenance Staff account
export const updateOfficer = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, mobile, employeeId, department, designation, assignedBuilding, assignedBuildings: reqAssignedBuildings, isActive } = req.body

    const officer = await User.findOne({ _id: id, role: 'officer' })
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Maintenance staff member not found.' })
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ success: false, message: 'Full name cannot be empty.' })
      }
      officer.name = name.trim()
    }

    if (email !== undefined) {
      const normEmail = email.trim().toLowerCase()
      if (!normEmail) {
        return res.status(400).json({ success: false, message: 'Email cannot be empty.' })
      }
      const existingEmail = await User.findOne({ email: normEmail, _id: { $ne: id } })
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Another user with this email already exists.' })
      }
      officer.email = normEmail
    }

    if (employeeId !== undefined) {
      const normEmpId = String(employeeId || '').trim()
      if (normEmpId) {
        const existingEmp = await User.findOne({ employeeId: normEmpId, _id: { $ne: id } })
        if (existingEmp) {
          return res.status(400).json({ success: false, message: 'Another staff member with this Employee ID already exists.' })
        }
      }
      officer.employeeId = normEmpId
    }

    if (mobile !== undefined) {
      officer.mobile = String(mobile || '').trim()
    }

    if (designation !== undefined) {
      officer.designation = String(designation || '').trim()
    }

    if (department !== undefined) {
      const normDept = String(department).trim()
      if (!normDept) {
        return res.status(400).json({ success: false, message: 'Department cannot be empty.' })
      }
      const dbDept = await Department.findOne({ code: normDept, isActive: true })
      if (!dbDept && !DEPARTMENTS.includes(normDept)) {
        return res.status(400).json({ success: false, message: 'Invalid department specified. Please select a valid active campus department.' })
      }
      officer.department = normDept
    }

    if (reqAssignedBuildings !== undefined || assignedBuilding !== undefined) {
      let buildingsArray = Array.isArray(reqAssignedBuildings) && reqAssignedBuildings.length > 0
        ? reqAssignedBuildings
        : (assignedBuilding ? [assignedBuilding] : [])

      buildingsArray = [...new Set(buildingsArray.map(b => String(b || '').trim()).filter(Boolean))]
      if (buildingsArray.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one assigned building / work location is required.' })
      }
      officer.assignedBuildings = buildingsArray
      officer.assignedBuilding = buildingsArray[0]
      officer.assignedWard = buildingsArray[0]
    }

    if (isActive !== undefined) {
      officer.isActive = Boolean(isActive)
    }

    await officer.save()

    const userObj = officer.toObject()
    delete userObj.password
    userObj.isActive = officer.isActive !== false
    userObj.assignedBuildings = getOfficerBuildings(officer)

    return res.status(200).json({
      success: true,
      message: 'Maintenance Staff account updated successfully.',
      officer: userObj
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: toggle active status of Maintenance Staff account (activate / deactivate)
export const toggleOfficerStatus = async (req, res) => {
  try {
    const { id } = req.params
    const officer = await User.findOne({ _id: id, role: 'officer' })
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Maintenance staff member not found.' })
    }

    if (req.body.isActive !== undefined) {
      officer.isActive = Boolean(req.body.isActive)
    } else {
      officer.isActive = officer.isActive === false ? true : false
    }

    await officer.save()

    return res.status(200).json({
      success: true,
      message: `Staff account ${officer.isActive ? 'activated' : 'deactivated'} successfully.`,
      isActive: officer.isActive,
      officerId: officer._id
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Safe delete Maintenance Staff account
export const deleteOfficer = async (req, res) => {
  try {
    const { id } = req.params
    const officer = await User.findOne({ _id: id, role: 'officer' })
    if (!officer) {
      return res.status(404).json({ success: false, message: 'Maintenance staff member not found.' })
    }

    // Safety dependency check: verify if staff is referenced in any Report records
    const complaintCount = await Report.countDocuments({ assignedTo: officer._id })
    if (complaintCount > 0) {
      return res.status(400).json({
        success: false,
        hasDependencies: true,
        complaintCount,
        message: `Cannot delete staff member '${officer.name}' because they are assigned to ${complaintCount} complaint(s). Deactivate the account instead to preserve historical records and audit trail.`
      })
    }

    // No dependencies: safe to permanently delete
    await User.findByIdAndDelete(officer._id)

    return res.status(200).json({
      success: true,
      message: `Maintenance staff member '${officer.name}' has been permanently deleted.`
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Classify a complaint pending classification into an authoritative IssueType
export const classifyReport = async (req, res) => {
  try {
    const { id } = req.params
    const { issueTypeId, issueTypeCode, newIssueType } = req.body

    const report = await Report.findById(id)
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' })
    }

    let resolvedIssueType = null

    // Option 1: Inline creation of new IssueType mapped to existing active Department
    if (newIssueType && newIssueType.name && newIssueType.departmentId) {
      const { name, departmentId, description } = newIssueType
      const dept = await Department.findById(departmentId)
      if (!dept) {
        return res.status(404).json({ success: false, message: 'Selected department not found' })
      }
      if (!dept.isActive) {
        return res.status(400).json({ success: false, message: 'Selected department is inactive. Please activate it first.' })
      }

      const trimmedName = name.trim()
      const code = String(newIssueType.code || trimmedName)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')

      // Check if issue type already exists
      resolvedIssueType = await IssueType.findOne({
        $or: [{ name: new RegExp(`^${trimmedName}$`, 'i') }, { code }]
      }).populate('department', 'name code isActive')

      if (!resolvedIssueType) {
        const created = await IssueType.create({
          name: trimmedName,
          code,
          description: description ? description.trim() : '',
          department: dept._id,
          departmentCode: dept.code,
          isActive: true
        })
        resolvedIssueType = await IssueType.findById(created._id).populate('department', 'name code isActive')
      }
    } else if (issueTypeId) {
      resolvedIssueType = await IssueType.findById(issueTypeId).populate('department', 'name code isActive')
    } else if (issueTypeCode) {
      resolvedIssueType = await IssueType.findOne({ code: String(issueTypeCode).trim().toUpperCase(), isActive: true }).populate('department', 'name code isActive')
    } else {
      return res.status(400).json({ success: false, message: 'Issue type ID, code, or new issue type details are required' })
    }

    if (!resolvedIssueType) {
      return res.status(404).json({ success: false, message: 'Issue type not found or inactive' })
    }

    if (!resolvedIssueType.department || resolvedIssueType.department.isActive === false) {
      return res.status(400).json({ success: false, message: 'Associated department is missing or inactive' })
    }

    // Update report fields
    report.issueType = resolvedIssueType.name || resolvedIssueType.code
    report.department = resolvedIssueType.department.code
    report.status = 'PENDING'

    // Run existing automatic officer assignment logic for this report
    const reportBuilding = String(report.location?.building || report.location?.ward || '').trim()
    let assignedOfficer = null

    if (reportBuilding) {
      const normReportBuilding = normalizeBuilding(reportBuilding)
      const normReportDept = normalizeDepartment(report.department)

      const activeOfficers = await User.find({ role: 'officer', isActive: { $ne: false } }).sort({ createdAt: 1 })
      const eligibleOfficers = activeOfficers.filter(o => {
        if (o.isActive === false) return false
        if (normalizeDepartment(o.department) !== normReportDept) return false
        const oBuildings = getOfficerBuildings(o)
        return oBuildings.some(b => normalizeBuilding(b) === normReportBuilding)
      })

      if (eligibleOfficers.length > 0) {
        // Workload-based selection: select officer with lowest active workload
        const officerWorkloads = await Promise.all(eligibleOfficers.map(async (off) => {
          const activeCount = await Report.countDocuments({
            assignedTo: off._id,
            status: { $in: ['PENDING', 'IN_PROGRESS'] }
          })
          return { officer: off, activeCount }
        }))
        officerWorkloads.sort((a, b) => a.activeCount - b.activeCount)
        assignedOfficer = officerWorkloads[0].officer
        report.assignedTo = assignedOfficer._id
      } else {
        report.assignedTo = null
      }
    }

    await report.save()

    const updatedReport = await Report.findById(report._id)
      .populate('reportedBy', 'name email mobile studentId faculty course semester')
      .populate('assignedTo', 'name email assignedBuilding assignedBuildings assignedWard department designation employeeId')

    return res.status(200).json({
      success: true,
      message: `Complaint successfully classified under ${resolvedIssueType.name} (${resolvedIssueType.department.name}).${assignedOfficer ? ` Auto-assigned to ${assignedOfficer.name}.` : ' No matching staff member currently assigned to this building.'}`,
      report: updatedReport
    })
  } catch (error) {
    console.error('classifyReport error:', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}


