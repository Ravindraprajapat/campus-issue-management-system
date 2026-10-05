import fs from 'fs'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import Report from '../model/Report.js'
import Department from '../model/Department.js'
import IssueType from '../model/IssueType.js'
import User from '../model/User.js'
import uploadOnCloudinary from '../utils/cloudinary.js'
import { sendComplaintRegisteredNotification } from '../utils/notificationService.js'
import { getDepartmentForIssue, normalizeBuilding, normalizeDepartment } from '../utils/departmentMapping.js'

dotenv.config()

const GoogleAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'placeholder_key'
})

const TICKET_SECRET = process.env.JWT_SECRET || 'faultline_secure_verification_secret_2026'

// Build dynamic Gemini classification prompt from active MongoDB Departments and IssueTypes
export const buildDynamicGeminiPrompt = async (userDescription = '') => {
  const activeDepartments = await Department.find({ isActive: true }).sort({ name: 1 })
  const activeIssueTypes = await IssueType.find({ isActive: true }).populate('department', 'name code').sort({ name: 1 })

  const deptListText = activeDepartments.length > 0
    ? activeDepartments.map(d => `- DepartmentCode: "${d.code}", Name: "${d.name}" (${d.description || 'General maintenance'})`).join('\n')
    : '- DepartmentCode: "OTHER_MAINTENANCE_ISSUES", Name: "Other Maintenance Issues"'

  const issueListText = activeIssueTypes.length > 0
    ? activeIssueTypes.map(it => `- IssueCode: "${it.code}", Name: "${it.name}", DepartmentCode: "${it.departmentCode || it.department?.code}"`).join('\n')
    : '- IssueCode: "OTHER_MAINTENANCE", Name: "Other Maintenance", DepartmentCode: "OTHER_MAINTENANCE_ISSUES"'

  return `You are an infrastructure and facility issue classification AI for UniFix AI campus maintenance management system.
Analyze the uploaded image AND the student's text description carefully for physical campus maintenance issues.

STUDENT PROVIDED DESCRIPTION:
"${String(userDescription || '').trim() || 'No description provided'}"

### MANDATORY STRICT RULE: DO NOT INVENT DEPARTMENTS OR ISSUE TYPES.
You can ONLY choose an issue type code from the AVAILABLE ACTIVE ISSUE TYPES list below.
You can ONLY choose a department code from the AVAILABLE ACTIVE DEPARTMENTS list below.

AVAILABLE ACTIVE DEPARTMENTS:
${deptListText}

AVAILABLE ACTIVE ISSUE TYPES:
${issueListText}

### EVALUATION & CLASSIFICATION INSTRUCTIONS:
1. VISUAL & CONTEXT EVALUATION:
   - Determine if the image visually depicts a real physical infrastructure or facility maintenance asset/issue requiring repair.
   - Set "isValid": true if the photo visually shows a clear physical infrastructure issue.
   - Set "isValid": false if the photo is a selfie, portrait, clean plain wall with no damage, unrelated personal item, pet, food, screenshot, meme, poster, or text document.
   - Compare the photo with the student description.
   - Set "descriptionMatchesImage": true if the description aligns with the visual evidence in the photo.
   - Set "descriptionMatchesImage": false if the description conflicts with the photo (e.g. photo shows a broken projector, but description mentions a ceiling fan).

2. CATEGORY SELECTION (STRICT MATCH):
   - Set "issueIdentified": true if the issue matches an active issue type listed above with visual confidence >= 0.75.
   - Set "issueIdentified": false if the photo is blurry, dark, unclear, irrelevant, or does not confidently match any active issue type.
   - Select "issueTypeCode" ONLY from the AVAILABLE ACTIVE ISSUE TYPES codes listed above.
   - Select "departmentCode" ONLY from the department code matching that issue type in the list above.

3. CONFIDENCE & SEVERITY & CONTEXT:
   - "confidence": Float between 0.0 and 1.0.
   - "severity": Integer from 1 to 10.
   - "collegeContext": One of "CLASSROOM", "LAB", "CORRIDOR", "WASHROOM", "OFFICE", "CANTEEN", "LIBRARY", "CAMPUS_AREA", "OTHER".

Return ONLY a valid JSON object matching this schema:
{
  "isValid": boolean,
  "issueIdentified": boolean,
  "issueTypeCode": string,
  "departmentCode": string,
  "confidence": number,
  "severity": number,
  "collegeContext": string,
  "descriptionMatchesImage": boolean,
  "needsUserConfirmation": boolean,
  "reason": string
}`
}

// Generate secure HMAC-SHA256 signed verification token (includes description binding)
export const generateVerificationToken = ({ userId, imageBuffer, description, analysis }) => {
  const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex')
  const descriptionHash = crypto.createHash('sha256').update(String(description || '').trim().toLowerCase()).digest('hex')
  const payload = {
    userId: userId ? userId.toString() : '',
    imageHash,
    descriptionHash,
    isValid: analysis.isValid === true,
    department: analysis.department,
    issueType: analysis.issueType,
    confidence: analysis.confidence,
    severity: analysis.severity,
    collegeContext: analysis.collegeContext,
    timestamp: Date.now()
  }
  const payloadStr = JSON.stringify(payload)
  const signature = crypto.createHmac('sha256', TICKET_SECRET).update(payloadStr).digest('hex')
  return Buffer.from(JSON.stringify({ payload: payloadStr, sig: signature })).toString('base64')
}

// Verify secure HMAC-SHA256 signed verification token
export const verifyVerificationToken = ({ token, userId, imageBuffer, description }) => {
  if (!token) return null
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'))
    if (!decoded || !decoded.payload || !decoded.sig) return null

    const expectedSig = crypto.createHmac('sha256', TICKET_SECRET).update(decoded.payload).digest('hex')
    if (crypto.timingSafeEqual(Buffer.from(decoded.sig), Buffer.from(expectedSig)) === false) {
      console.warn('[SECURITY ALERT] Verification token signature mismatch!')
      return null
    }

    const payload = JSON.parse(decoded.payload)

    // Expiration check (30 minutes)
    if (Date.now() - payload.timestamp > 30 * 60 * 1000) {
      console.warn('[SECURITY] Verification token expired')
      return null
    }

    // User isolation check
    if (payload.userId !== (userId ? userId.toString() : '')) {
      console.warn('[SECURITY ALERT] Verification token userId mismatch!')
      return null
    }

    // Exact image hash check (prevents photo substitution!)
    const currentImageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex')
    if (payload.imageHash !== currentImageHash) {
      console.warn('[SECURITY ALERT] Image modified or replaced after verification!')
      return null
    }

    // Exact description hash check (if description changed after verification, token invalidates!)
    if (payload.descriptionHash) {
      const currentDescHash = crypto.createHash('sha256').update(String(description || '').trim().toLowerCase()).digest('hex')
      if (payload.descriptionHash !== currentDescHash) {
        console.warn('[SECURITY ALERT] Student description modified after verification! Invalidation triggered.')
        return null
      }
    }

    // AI validation check
    if (!payload.isValid || payload.confidence < 0.75) {
      console.warn('[SECURITY] Verification token contains invalid AI analysis')
      return null
    }

    return payload
  } catch (err) {
    console.error('Token verification error:', err.message)
    return null
  }
}

export const createReport = async (req, res) => {
  const tStart = Date.now()
  console.log('[REPORT] Submission received')
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' })
    }

    const latitude = Number(req.body.latitude)
    const longitude = Number(req.body.longitude)

    if (isNaN(latitude) || isNaN(longitude)) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' })
    }

    const building = req.body.building || req.body.ward || 'Parul University Campus'
    const room = req.body.room || ''
    const description = req.body.description || ''
    const localFilePath = req.file.path

    const imageBuffer = fs.readFileSync(localFilePath)

    let authoritativeDepartment = null
    let rawIssueType = 'OTHER_MAINTENANCE'
    let confidence = 0.8
    let severityScore = 5
    let collegeContext = 'OTHER'
    let usedToken = false

    // Check if secure verificationToken is provided
    const verificationToken = req.body.verificationToken
    const verifiedPayload = verifyVerificationToken({
      token: verificationToken,
      userId: req.userId,
      imageBuffer,
      description
    })

    if (verifiedPayload) {
      usedToken = true
      authoritativeDepartment = verifiedPayload.department
      rawIssueType = verifiedPayload.issueType || 'OTHER_MAINTENANCE'
      confidence = verifiedPayload.confidence || 0.8
      severityScore = verifiedPayload.severity || 5
      collegeContext = verifiedPayload.collegeContext || 'OTHER'
      console.log('[REPORT TIMING] Bypassed duplicate Gemini call using valid backend verification token')
    } else {
      console.log('[REPORT] No valid token found, running full backend Gemini verification fallback...')
      const tGeminiStart = Date.now()
      const base64Img = imageBuffer.toString('base64')
      const promptText = await buildDynamicGeminiPrompt(description)

      const result = await GoogleAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { text: promptText },
          { inlineData: { data: base64Img, mimeType: req.file.mimetype } }
        ],
        config: { responseMimeType: 'application/json' }
      })
      console.log(`[REPORT TIMING] Gemini API fallback call: ${Date.now() - tGeminiStart} ms`)

      const responseText = result.text || result?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      let cleanedText = responseText.trim()
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      }

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI response invalid format')
      }

      const parsed = JSON.parse(jsonMatch[0])

      const ALLOWED_COLLEGE_CONTEXTS = [
        'CLASSROOM', 'LAB', 'CORRIDOR', 'WASHROOM', 'OFFICE', 'CANTEEN',
        'LIBRARY', 'CAMPUS_AREA', 'OTHER'
      ]

      const rawIssueCode = String(parsed.issueTypeCode || parsed.issueType || 'OTHER_MAINTENANCE').toUpperCase()
      const rawAiDeptCode = String(parsed.departmentCode || parsed.department || '').toUpperCase()
      collegeContext = String(parsed.collegeContext || parsed.civicContext || 'OTHER').toUpperCase()
      confidence = Number(parsed.confidence) || 0
      const isValidFlag = parsed.isValid === true && parsed.issueIdentified !== false

      // Authoritative Department Resolution from MongoDB IssueType database record
      let issueTypeRecord = await IssueType.findOne({ code: rawIssueCode, isActive: true }).populate('department')
      if (!issueTypeRecord) {
        issueTypeRecord = await IssueType.findOne({
          $or: [
            { code: new RegExp(`^${rawIssueCode}$`, 'i') },
            { name: new RegExp(`^${rawIssueCode}$`, 'i') }
          ],
          isActive: true
        }).populate('department')
      }

      if (issueTypeRecord) {
        authoritativeDepartment = issueTypeRecord.department?.code || issueTypeRecord.departmentCode
        rawIssueType = issueTypeRecord.code
      } else {
        authoritativeDepartment = getDepartmentForIssue(rawIssueCode, rawAiDeptCode)
        rawIssueType = rawIssueCode
      }

      let rejectionReason = null
      if (!isValidFlag) {
        rejectionReason = parsed.reason || 'AI visual validation marked image as invalid (no clear infrastructure issue detected).'
      } else if (isNaN(confidence) || confidence < 0.75) {
        rejectionReason = `AI confidence score (${confidence.toFixed(2)}) is below threshold of 0.75.`
      } else if (!ALLOWED_COLLEGE_CONTEXTS.includes(collegeContext)) {
        rejectionReason = `College context '${collegeContext}' is invalid or UNKNOWN.`
      }

      if (rejectionReason !== null) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
        return res.status(400).json({
          success: false,
          message: `Invalid image: ${rejectionReason}`
        })
      }

      severityScore = Number(parsed.severity) || 5
    }

    // Severity & Priority bounds
    if (severityScore < 1) severityScore = 5
    if (severityScore > 10) severityScore = 10

    let priorityLevel = 'LOW'
    if (severityScore >= 7) priorityLevel = 'HIGH'
    else if (severityScore >= 4) priorityLevel = 'MEDIUM'

    // Cloudinary upload
    const tCloudStart = Date.now()
    const imageUrl = await uploadOnCloudinary(localFilePath)
    const tCloud = Date.now() - tCloudStart

    // Automatic Maintenance Officer Assignment (Department + assignedBuildings Match & Workload Balancing)
    const reportBuilding = String(building || req.body.ward || '').trim()

    let assignedOfficerId = null
    if (reportBuilding) {
      const normReportBuilding = normalizeBuilding(reportBuilding)
      const normReportDept = normalizeDepartment(authoritativeDepartment)

      const activeOfficers = await User.find({ role: 'officer', isActive: { $ne: false } }).sort({ createdAt: 1 })
      const eligibleOfficers = activeOfficers.filter(o => {
        if (o.isActive === false) return false
        if (normalizeDepartment(o.department) !== normReportDept) return false
        const oBuildings = (Array.isArray(o.assignedBuildings) && o.assignedBuildings.length > 0)
          ? o.assignedBuildings
          : [o.assignedBuilding || o.assignedWard].filter(Boolean)
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
        assignedOfficerId = officerWorkloads[0].officer._id
      }
    }

    // Save Report to MongoDB
    const tMongoStart = Date.now()
    const report = await Report.create({
      reportedBy: req.userId,
      imageUrl,
      location: {
        latitude,
        longitude,
        address: req.body.address || '',
        ward: reportBuilding,
        building: reportBuilding,
        room
      },
      description,
      department: authoritativeDepartment,
      issueType: rawIssueType || 'OTHER_MAINTENANCE',
      aiConfidence: confidence || 0.8,
      aiAnalysis: {
        detectedType: rawIssueType || 'OTHER',
        confidence: confidence || 0.8
      },
      severityScore,
      priorityLevel,
      assignedTo: assignedOfficerId
    })
    const tMongo = Date.now() - tMongoStart

    const tTotal = Date.now() - tStart
    console.log('[REPORT TIMING]', {
      totalTime: `${tTotal} ms`,
      geminiStatus: usedToken ? 'BYPASSED_TOKEN_VERIFIED' : 'EXECUTED_FALLBACK',
      cloudinaryTime: `${tCloud} ms`,
      mongoDbTime: `${tMongo} ms`
    })

    // Centralized Registration Notification
    const user = await User.findById(req.userId)
    if (user) {
      sendComplaintRegisteredNotification({ user, report }).catch(err => {
        console.error('Non-blocking registration notification error:', err)
      })
    }

    res.status(201).json({
      success: true,
      report
    })
  } catch (error) {
    console.error('Create report error:', error)
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit report'
    })
  }
}

export const getUserReports = async (req, res) => {
  try {
    const userId = req.userId
    const reports = await Report.find({ reportedBy: userId }).sort({ createdAt: -1 })
    res.status(200).json({ success: true, reports })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Failed to fetch reports' })
  }
}

export const verifyImage = async (req, res) => {
  const tStart = Date.now()
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, isValid: false, message: 'Image file is required' })
    }

    const description = req.body.description || ''
    const localFilePath = req.file.path
    const imageBuffer = fs.readFileSync(localFilePath)
    const base64Img = imageBuffer.toString('base64')

    const promptText = await buildDynamicGeminiPrompt(description)

    const tGeminiStart = Date.now()
    const result = await GoogleAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: promptText },
        { inlineData: { data: base64Img, mimeType: req.file.mimetype } }
      ],
      config: { responseMimeType: 'application/json' }
    })
    const tGemini = Date.now() - tGeminiStart

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath)
    }

    const responseText = result.text || result?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    }

    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(400).json({ success: false, isValid: false, message: 'AI response invalid format' })
    }

    const parsed = JSON.parse(jsonMatch[0])

    const ALLOWED_COLLEGE_CONTEXTS = [
      'CLASSROOM', 'LAB', 'CORRIDOR', 'WASHROOM', 'OFFICE', 'CANTEEN',
      'LIBRARY', 'CAMPUS_AREA', 'OTHER'
    ]

    const rawIssueCode = String(parsed.issueTypeCode || parsed.issueType || parsed.detectedType || parsed.issue || 'OTHER_MAINTENANCE').toUpperCase()
    const rawAiDeptCode = String(parsed.departmentCode || parsed.department || parsed.departmentName || '').toUpperCase()
    const collegeContext = String(parsed.collegeContext || parsed.civicContext || 'OTHER').toUpperCase()
    const confidence = Number(parsed.confidence) || 0
    const isValidFlag = parsed.isValid === true && parsed.issueIdentified !== false

    // Query MongoDB for authoritative IssueType and Department relationship
    let issueTypeRecord = await IssueType.findOne({ code: rawIssueCode, isActive: true }).populate('department')
    if (!issueTypeRecord) {
      issueTypeRecord = await IssueType.findOne({
        $or: [
          { code: new RegExp(`^${rawIssueCode}$`, 'i') },
          { name: new RegExp(`^${rawIssueCode}$`, 'i') }
        ],
        isActive: true
      }).populate('department')
    }

    let authoritativeDepartmentCode = 'OTHER_MAINTENANCE_ISSUES'
    let authoritativeDepartmentName = 'Other Maintenance Issues'
    let authoritativeIssueTypeCode = 'OTHER_MAINTENANCE'
    let authoritativeIssueTypeName = 'Other Maintenance'

    if (issueTypeRecord) {
      authoritativeIssueTypeCode = issueTypeRecord.code
      authoritativeIssueTypeName = issueTypeRecord.name || issueTypeRecord.code
      authoritativeDepartmentCode = issueTypeRecord.department?.code || issueTypeRecord.departmentCode || 'OTHER_MAINTENANCE_ISSUES'
      
      if (issueTypeRecord.department && typeof issueTypeRecord.department === 'object' && issueTypeRecord.department.name) {
        authoritativeDepartmentName = issueTypeRecord.department.name
      } else {
        const deptDoc = await Department.findOne({ code: authoritativeDepartmentCode })
        authoritativeDepartmentName = deptDoc?.name || DEPARTMENT_LABELS[authoritativeDepartmentCode] || authoritativeDepartmentCode
      }
    } else {
      authoritativeDepartmentCode = getDepartmentForIssue(rawIssueCode, rawAiDeptCode)
      authoritativeIssueTypeCode = rawIssueCode

      const deptDoc = await Department.findOne({ code: authoritativeDepartmentCode })
      authoritativeDepartmentName = deptDoc?.name || DEPARTMENT_LABELS[authoritativeDepartmentCode] || authoritativeDepartmentCode

      authoritativeIssueTypeName = rawIssueCode
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }

    const descriptionMatchesImage = parsed.descriptionMatchesImage !== false
    const needsUserConfirmation = parsed.needsUserConfirmation === true || !descriptionMatchesImage

    let rejectionReason = null
    if (!isValidFlag) {
      rejectionReason = parsed.reason || 'Photo could not be verified as a valid campus maintenance issue.'
    } else if (isNaN(confidence) || confidence < 0.75) {
      rejectionReason = `AI confidence score (${confidence.toFixed(2)}) is below threshold of 0.75.`
    } else if (!ALLOWED_COLLEGE_CONTEXTS.includes(collegeContext)) {
      rejectionReason = `College context '${collegeContext}' is invalid or UNKNOWN.`
    }

    if (rejectionReason !== null) {
      console.log(`[REPORT TIMING] Image Verification REJECTED: ${Date.now() - tStart} ms (${rejectionReason})`)
      return res.status(400).json({
        success: false,
        isValid: false,
        message: rejectionReason,
        reason: rejectionReason
      })
    }

    let severityScore = Number(parsed.severity) || 5
    if (severityScore < 1) severityScore = 5
    if (severityScore > 10) severityScore = 10

    const verificationToken = generateVerificationToken({
      userId: req.userId,
      imageBuffer,
      description,
      analysis: {
        isValid: true,
        department: authoritativeDepartmentCode,
        issueType: authoritativeIssueTypeCode,
        confidence,
        severity: severityScore,
        collegeContext
      }
    })

    console.log(`[REPORT TIMING] Image Verification ACCEPTED: ${Date.now() - tStart} ms (Gemini: ${tGemini} ms)`)

    return res.status(200).json({
      success: true,
      isValid: true,
      issueIdentified: true,
      message: descriptionMatchesImage ? 'Photo & description verified ✓' : '⚠ Mismatch detected between photo and description',
      verificationToken,
      analysis: {
        issueTypeCode: authoritativeIssueTypeCode,
        issueTypeName: authoritativeIssueTypeName,
        detectedType: authoritativeIssueTypeCode,
        issueType: authoritativeIssueTypeName,
        departmentCode: authoritativeDepartmentCode,
        departmentName: authoritativeDepartmentName,
        department: authoritativeDepartmentName,
        confidence,
        severity: severityScore,
        collegeContext,
        reason: parsed.reason || 'Visual evidence matches maintenance criteria',
        descriptionMatchesImage,
        needsUserConfirmation
      }
    })
  } catch (error) {
    console.error('Verify image error:', error)
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    return res.status(500).json({
      success: false,
      isValid: false,
      message: error.message || 'Image verification failed due to server error'
    })
  }
}
