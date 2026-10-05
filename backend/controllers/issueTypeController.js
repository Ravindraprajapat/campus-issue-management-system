import IssueType from '../model/IssueType.js'
import Department from '../model/Department.js'
import Report from '../model/Report.js'
import { normalizeDepartment } from '../utils/departmentMapping.js'

// Generate safe unique code from name
const generateIssueTypeCode = (name) => {
  return String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Admin: Get all issue types
export const getIssueTypes = async (req, res) => {
  try {
    const issueTypes = await IssueType.find()
      .populate('department', 'name code isActive')
      .sort({ name: 1 })
    res.status(200).json({ success: true, issueTypes })
  } catch (error) {
    console.error('getIssueTypes error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Public/Student/Officer: Get active issue types
export const getActiveIssueTypes = async (req, res) => {
  try {
    const issueTypes = await IssueType.find({ isActive: true })
      .populate('department', 'name code isActive')
      .sort({ name: 1 })
    res.status(200).json({ success: true, issueTypes })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Create new issue type
export const createIssueType = async (req, res) => {
  try {
    const { name, departmentId, description } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Issue type name is required' })
    }
    if (!departmentId) {
      return res.status(400).json({ success: false, message: 'Department is required' })
    }

    const dept = await Department.findById(departmentId)
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Selected department not found' })
    }

    if (!dept.isActive) {
      return res.status(400).json({ success: false, message: 'Selected department is inactive. Please activate it first.' })
    }

    const trimmedName = name.trim()
    const code = generateIssueTypeCode(trimmedName)

    const existing = await IssueType.findOne({
      $or: [
        { name: new RegExp(`^${trimmedName}$`, 'i') },
        { code }
      ]
    })

    if (existing) {
      return res.status(400).json({ success: false, message: 'Issue type with this name or code already exists' })
    }

    const issueType = await IssueType.create({
      name: trimmedName,
      code,
      description: description ? description.trim() : '',
      department: dept._id,
      departmentCode: dept.code,
      isActive: true
    })

    const populated = await IssueType.findById(issueType._id).populate('department', 'name code isActive')
    res.status(201).json({ success: true, issueType: populated })
  } catch (error) {
    console.error('createIssueType error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Update issue type
export const updateIssueType = async (req, res) => {
  try {
    const { id } = req.params
    const { name, departmentId, description, isActive } = req.body

    const issueType = await IssueType.findById(id)
    if (!issueType) {
      return res.status(404).json({ success: false, message: 'Issue type not found' })
    }

    if (name && name.trim()) {
      const trimmedName = name.trim()
      const existing = await IssueType.findOne({
        _id: { $ne: id },
        name: new RegExp(`^${trimmedName}$`, 'i')
      })

      if (existing) {
        return res.status(400).json({ success: false, message: 'Another issue type with this name already exists' })
      }
      issueType.name = trimmedName
    }

    if (departmentId) {
      const dept = await Department.findById(departmentId)
      if (!dept) {
        return res.status(404).json({ success: false, message: 'Selected department not found' })
      }
      issueType.department = dept._id
      issueType.departmentCode = dept.code
    }

    if (description !== undefined) {
      issueType.description = String(description).trim()
    }

    if (isActive !== undefined) {
      issueType.isActive = Boolean(isActive)
    }

    await issueType.save()
    const populated = await IssueType.findById(issueType._id).populate('department', 'name code isActive')
    res.status(200).json({ success: true, issueType: populated })
  } catch (error) {
    console.error('updateIssueType error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Toggle active status
export const toggleIssueTypeStatus = async (req, res) => {
  try {
    const { id } = req.params
    const issueType = await IssueType.findById(id)
    if (!issueType) {
      return res.status(404).json({ success: false, message: 'Issue type not found' })
    }

    issueType.isActive = !issueType.isActive
    await issueType.save()
    const populated = await IssueType.findById(issueType._id).populate('department', 'name code isActive')

    res.status(200).json({ success: true, issueType: populated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: Safe delete if unused
export const deleteIssueType = async (req, res) => {
  try {
    const { id } = req.params
    const issueType = await IssueType.findById(id)
    if (!issueType) {
      return res.status(404).json({ success: false, message: 'Issue type not found' })
    }

    const normCode = normalizeDepartment(issueType.code)

    const reportCount = await Report.countDocuments({
      $or: [
        { issueType: issueType.code },
        { 'aiAnalysis.detectedType': issueType.code }
      ]
    })

    if (reportCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete issue type "${issueType.name}" because it is referenced in ${reportCount} report(s). Please deactivate it instead.`
      })
    }

    await IssueType.findByIdAndDelete(id)
    res.status(200).json({ success: true, message: 'Issue type deleted successfully' })
  } catch (error) {
    console.error('deleteIssueType error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}
