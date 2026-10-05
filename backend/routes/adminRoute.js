import express from 'express'
import { isAuth } from '../middleware/isAuth.js'
import { isAdmin, isAdminOrOfficer } from '../middleware/isAdmin.js'
import {
  getAllReports,
  getWardSummary,
  assignOfficerToWard,
  getWardOfficers,
  getOfficerReports,
  updateReportStatus,
  assignOfficerToReport,
  getOfficers,
  getOfficerDetails,
  getAdminUsers,
  createOfficer,
  updateOfficer,
  toggleOfficerStatus,
  deleteOfficer,
  previewAutoAssignUnassigned,
  autoAssignUnassignedReports
} from '../controllers/adminController.js'

import {
  getDepartments,
  getActiveDepartments,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment
} from '../controllers/departmentController.js'

import {
  getIssueTypes,
  getActiveIssueTypes,
  createIssueType,
  updateIssueType,
  toggleIssueTypeStatus,
  deleteIssueType
} from '../controllers/issueTypeController.js'

const adminRouter = express.Router()

// Admin only
adminRouter.get('/reports', isAuth, isAdmin, getAllReports)
adminRouter.get('/reports/preview-auto-assign', isAuth, isAdmin, previewAutoAssignUnassigned)
adminRouter.post('/reports/auto-assign-unassigned', isAuth, isAdmin, autoAssignUnassignedReports)
adminRouter.patch('/reports/:id/status', isAuth, isAdmin, updateReportStatus)
adminRouter.patch('/reports/:id/assign', isAuth, isAdmin, assignOfficerToReport)
adminRouter.post('/reports/:id/assign', isAuth, isAdmin, assignOfficerToReport)
adminRouter.get('/building-summary', isAuth, isAdmin, getWardSummary)
adminRouter.post('/building-officer', isAuth, isAdmin, assignOfficerToWard)
adminRouter.get('/building-officers', isAuth, isAdmin, getWardOfficers)
adminRouter.get('/officers', isAuth, isAdmin, getOfficers)
adminRouter.get('/officers/:id', isAuth, isAdmin, getOfficerDetails)
adminRouter.post('/officers', isAuth, isAdmin, createOfficer)
adminRouter.put('/officers/:id', isAuth, isAdmin, updateOfficer)
adminRouter.patch('/officers/:id', isAuth, isAdmin, updateOfficer)
adminRouter.patch('/officers/:id/status', isAuth, isAdmin, toggleOfficerStatus)
adminRouter.delete('/officers/:id', isAuth, isAdmin, deleteOfficer)
adminRouter.get('/users', isAuth, isAdmin, getAdminUsers)

// Admin Department Management
adminRouter.get('/departments', isAuth, isAdmin, getDepartments)
adminRouter.post('/departments', isAuth, isAdmin, createDepartment)
adminRouter.put('/departments/:id', isAuth, isAdmin, updateDepartment)
adminRouter.patch('/departments/:id/status', isAuth, isAdmin, toggleDepartmentStatus)
adminRouter.delete('/departments/:id', isAuth, isAdmin, deleteDepartment)

// Admin Issue Type Management
adminRouter.get('/issue-types', isAuth, isAdmin, getIssueTypes)
adminRouter.post('/issue-types', isAuth, isAdmin, createIssueType)
adminRouter.put('/issue-types/:id', isAuth, isAdmin, updateIssueType)
adminRouter.patch('/issue-types/:id/status', isAuth, isAdmin, toggleIssueTypeStatus)
adminRouter.delete('/issue-types/:id', isAuth, isAdmin, deleteIssueType)

// Active list (accessible to authenticated users for dropdowns)
adminRouter.get('/active-departments', isAuth, getActiveDepartments)
adminRouter.get('/active-issue-types', isAuth, getActiveIssueTypes)

// Officer only (building-filtered)
adminRouter.get('/officer/reports', isAuth, isAdminOrOfficer, getOfficerReports)
adminRouter.patch('/officer/reports/:id/status', isAuth, isAdminOrOfficer, updateReportStatus)

export default adminRouter
