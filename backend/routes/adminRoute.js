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
  previewAutoAssignUnassigned,
  autoAssignUnassignedReports
} from '../controllers/adminController.js'

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
adminRouter.get('/users', isAuth, isAdmin, getAdminUsers)

// Officer only (building-filtered)
adminRouter.get('/officer/reports', isAuth, isAdminOrOfficer, getOfficerReports)
adminRouter.patch('/officer/reports/:id/status', isAuth, isAdminOrOfficer, updateReportStatus)

export default adminRouter
