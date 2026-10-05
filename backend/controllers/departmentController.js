import Department from '../model/Department.js'
import IssueType from '../model/IssueType.js'
import User from '../model/User.js'
import Report from '../model/Report.js'
import { normalizeDepartment } from '../utils/departmentMapping.js'

// Generate safe unique code from name
const generateDepartmentCode = (name) => {
  return String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Admin: Get all departments with usage metrics
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 })
    const officers = await User.find({ role: 'officer' }).select('department')
    const reports = await Report.find().select('department')
    const issueTypes = await IssueType.find().select('department departmentCode')

    const result = departments.map(d => {
      const normCode = normalizeDepartment(d.code)
      const normName = normalizeDepartment(d.name)

      const staffCount = officers.filter(o => {
        const normO = normalizeDepartment(o.department)
        return normO === normCode || normO === normName
      }).length

      const reportCount = reports.filter(r => {
        const normR = normalizeDepartment(r.department)
        return normR === normCode || normR === normName
      }).length

      const issueTypeCount = issueTypes.filter(it => {
        const matchesId = String(it.department) === String(d._id)
        const matchesCode = normalizeDepartment(it.departmentCode) === normCode
        return matchesId || matchesCode
      }).length

      return {
        ...d.toObject(),
        staffCount,
        reportCount,
        issueTypeCount
      }
    })

    res.status(200).json({ success: true, departments: result })
  } catch (error) {
    console.error('getDepartments error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Public/Student/Officer: Get active departments only
export const getActiveDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 })
    res.status(200).json({ success: true, departments })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Create new department
export const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' })
    }

    const trimmedName = name.trim()
    const code = generateDepartmentCode(trimmedName)

    const existingName = await Department.findOne({
      $or: [
        { name: new RegExp(`^${trimmedName}$`, 'i') },
        { code: code }
      ]
    })

    if (existingName) {
      return res.status(400).json({ success: false, message: 'Department with this name or code already exists' })
    }

    const department = await Department.create({
      name: trimmedName,
      code,
      description: description ? description.trim() : '',
      isActive: true
    })

    res.status(201).json({ success: true, department })
  } catch (error) {
    console.error('createDepartment error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Update department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, isActive } = req.body

    const department = await Department.findById(id)
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' })
    }

    if (name && name.trim()) {
      const trimmedName = name.trim()
      const existing = await Department.findOne({
        _id: { $ne: id },
        name: new RegExp(`^${trimmedName}$`, 'i')
      })

      if (existing) {
        return res.status(400).json({ success: false, message: 'Another department with this name already exists' })
      }
      department.name = trimmedName
    }

    if (description !== undefined) {
      department.description = String(description).trim()
    }

    if (isActive !== undefined) {
      department.isActive = Boolean(isActive)
    }

    await department.save()
    res.status(200).json({ success: true, department })
  } catch (error) {
    console.error('updateDepartment error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Toggle department active status
export const toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params
    const department = await Department.findById(id)
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' })
    }

    department.isActive = !department.isActive
    await department.save()

    res.status(200).json({ success: true, department })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Safe delete department if unused
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params
    const department = await Department.findById(id)
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' })
    }

    const normCode = normalizeDepartment(department.code)
    const normName = normalizeDepartment(department.name)

    const issueTypeCount = await IssueType.countDocuments({
      $or: [
        { department: id },
        { departmentCode: department.code }
      ]
    })

    const officers = await User.find({ role: 'officer' })
    const staffCount = officers.filter(o => {
      const normO = normalizeDepartment(o.department)
      return normO === normCode || normO === normName
    }).length

    const reports = await Report.find()
    const reportCount = reports.filter(r => {
      const normR = normalizeDepartment(r.department)
      return normR === normCode || normR === normName
    }).length

    if (issueTypeCount > 0 || staffCount > 0 || reportCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department "${department.name}" because it has active issue types (${issueTypeCount}), staff (${staffCount}), or reports (${reportCount}). Please deactivate it instead.`
      })
    }

    await Department.findByIdAndDelete(id)
    res.status(200).json({ success: true, message: 'Department deleted successfully' })
  } catch (error) {
    console.error('deleteDepartment error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}
