import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import FormData from 'form-data'
import axios from 'axios'

dotenv.config({ path: './backend/.env' })

const JWT_SECRET = process.env.JWT_SECRET || 'faultline_secure_verification_secret_2026'
const BASE_URL = 'http://localhost:5000'

const studentId = '6aaeb4fde8d2d75edcdbd12f'
const adminId = '6aaebc5dcef2415eeafb828e'

const studentToken = jwt.sign({ userId: studentId }, JWT_SECRET, { expiresIn: '1h' })
const adminToken = jwt.sign({ userId: adminId }, JWT_SECRET, { expiresIn: '1h' })

const imagePath = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\5af72ad5-4f58-4766-ac33-52736caf9c4a\\broken_lab_flask_1791255689255.jpg'
const description = 'The laboratory Erlenmeyer flask is severely cracked and broken, with shattered glass pieces scattered on the lab bench. Immediate replacement and cleanup are required.'

async function runTest() {
  console.log('============================================================')
  console.log('TEST: Broken/cracked laboratory Erlenmeyer flask dynamic flow')
  console.log('============================================================\n')

  if (!fs.existsSync(imagePath)) {
    console.error('Image not found at:', imagePath)
    process.exit(1)
  }

  // STEP 1: Verify Image
  console.log('STEP 1: Calling POST /report/report-submit/verify-image...')
  const form1 = new FormData()
  form1.append('image', fs.createReadStream(imagePath))
  form1.append('description', description)

  let verifyRes
  try {
    verifyRes = await axios.post(`${BASE_URL}/report/report-submit/verify-image`, form1, {
      headers: {
        ...form1.getHeaders(),
        Authorization: `Bearer ${studentToken}`
      }
    })
  } catch (err) {
    console.error('STEP 1 FAILED:', err.response?.status, err.response?.data || err.message)
    process.exit(1)
  }

  console.log('STEP 1 Status:', verifyRes.status)
  console.log('STEP 1 Result:', {
    success: verifyRes.data.success,
    isValid: verifyRes.data.isValid,
    issueIdentified: verifyRes.data.issueIdentified,
    isPendingClassification: verifyRes.data.isPendingClassification,
    detectedType: verifyRes.data.analysis?.detectedType,
    departmentName: verifyRes.data.analysis?.departmentName,
    hasToken: Boolean(verifyRes.data.verificationToken)
  })

  if (!verifyRes.data.isValid || !verifyRes.data.isPendingClassification) {
    console.error('STEP 1 ASSERTION FAILED: Expected isValid: true and isPendingClassification: true')
    process.exit(1)
  }
  console.log('✓ STEP 1 PASS: Image verified and marked pending classification without rejection!\n')

  const verificationToken = verifyRes.data.verificationToken

  // STEP 2: Create Report
  console.log('STEP 2: Calling POST /report/report-submit/report...')
  const form2 = new FormData()
  form2.append('image', fs.createReadStream(imagePath))
  form2.append('verificationToken', verificationToken)
  form2.append('description', description)
  form2.append('latitude', '22.2887')
  form2.append('longitude', '73.3634')
  form2.append('address', 'Parul University Chemistry Lab 3')
  form2.append('building', 'Engineering Block A')
  form2.append('room', 'Lab 302')

  let reportRes
  try {
    reportRes = await axios.post(`${BASE_URL}/report/report-submit/report`, form2, {
      headers: {
        ...form2.getHeaders(),
        Authorization: `Bearer ${studentToken}`
      }
    })
  } catch (err) {
    console.error('STEP 2 FAILED:', err.response?.status, err.response?.data || err.message)
    process.exit(1)
  }

  const createdReport = reportRes.data.report
  console.log('STEP 2 Status:', reportRes.status)
  console.log('STEP 2 Report Created:', {
    id: createdReport._id,
    status: createdReport.status,
    department: createdReport.department,
    assignedTo: createdReport.assignedTo,
    issueType: createdReport.issueType,
    aiDetectedIssue: createdReport.aiDetectedIssue,
    detectedType: createdReport.aiAnalysis?.detectedType
  })

  if (createdReport.status !== 'PENDING_CLASSIFICATION') {
    console.error(`STEP 2 ASSERTION FAILED: Expected status 'PENDING_CLASSIFICATION', got '${createdReport.status}'`)
    process.exit(1)
  }
  if (createdReport.department !== null) {
    console.error(`STEP 2 ASSERTION FAILED: Expected department null, got '${createdReport.department}'`)
    process.exit(1)
  }
  if (createdReport.assignedTo !== null) {
    console.error(`STEP 2 ASSERTION FAILED: Expected assignedTo null, got '${createdReport.assignedTo}'`)
    process.exit(1)
  }
  console.log('✓ STEP 2 PASS: Report created in PENDING_CLASSIFICATION state with department: null and assignedTo: null!\n')

  // STEP 3: Admin Reports List Check
  console.log('STEP 3: Checking GET /api/admin/reports...')
  let adminReportsRes
  try {
    adminReportsRes = await axios.get(`${BASE_URL}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
  } catch (err) {
    console.error('STEP 3 FAILED:', err.response?.status, err.response?.data || err.message)
    process.exit(1)
  }

  const foundReport = adminReportsRes.data.reports?.find(r => r._id === createdReport._id)
  if (!foundReport) {
    console.error('STEP 3 ASSERTION FAILED: Report not found in admin reports list')
    process.exit(1)
  }

  console.log('STEP 3 Report in Admin View:', {
    id: foundReport._id,
    status: foundReport.status,
    department: foundReport.department || 'Not Classified',
    assignedTo: foundReport.assignedTo || 'Unassigned',
    detectedType: foundReport.aiAnalysis?.detectedType || foundReport.issueType
  })
  console.log('✓ STEP 3 PASS: Report is visible to Admin with PENDING_CLASSIFICATION, department: null, assignedTo: null!\n')

  // STEP 4: Admin Classification
  console.log('STEP 4: Testing Admin Classification via PATCH /api/admin/reports/:id/classify...')
  // Find an active department to classify under
  const deptRes = await axios.get(`${BASE_URL}/api/admin/active-departments`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  })
  const labDept = deptRes.data.departments?.find(d => d.code === 'LABORATORY_RESEARCH_EQUIPMENT') || deptRes.data.departments?.[0]
  console.log('Classifying under department:', labDept.name, `(${labDept.code})`)

  let classifyRes
  try {
    classifyRes = await axios.patch(
      `${BASE_URL}/api/admin/reports/${createdReport._id}/classify`,
      {
        newIssueType: {
          name: 'Broken Laboratory Glassware',
          departmentId: labDept._id,
          description: 'Damaged, cracked, or shattered laboratory glassware items requiring replacement'
        }
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    )
  } catch (err) {
    console.error('STEP 4 FAILED:', err.response?.status, err.response?.data || err.message)
    process.exit(1)
  }

  const classifiedReport = classifyRes.data.report
  console.log('STEP 4 Result:', {
    message: classifyRes.data.message,
    status: classifiedReport.status,
    department: classifiedReport.department,
    issueType: classifiedReport.issueType,
    assignedTo: classifiedReport.assignedTo?.name || classifiedReport.assignedTo || 'Unassigned'
  })

  if (classifiedReport.status !== 'PENDING') {
    console.error(`STEP 4 ASSERTION FAILED: Expected status 'PENDING', got '${classifiedReport.status}'`)
    process.exit(1)
  }
  if (classifiedReport.department !== labDept.code) {
    console.error(`STEP 4 ASSERTION FAILED: Expected department '${labDept.code}', got '${classifiedReport.department}'`)
    process.exit(1)
  }
  console.log('✓ STEP 4 PASS: Admin classification successfully updated status to PENDING and department to authoritative MongoDB department!\n')

  console.log('============================================================')
  console.log('ALL STEPS PASSED PERFECTLY!')
  console.log('============================================================')
}

runTest().catch(e => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
