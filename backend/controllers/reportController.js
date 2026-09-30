import fs from 'fs'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import Report from '../model/Report.js'
import uploadOnCloudinary from '../utils/cloudinary.js'
import { sendComplaintRegisteredNotification } from '../utils/notificationService.js'
import User from '../model/User.js'
import { getDepartmentForIssue, DEPARTMENTS, normalizeBuilding, normalizeDepartment } from '../utils/departmentMapping.js'

dotenv.config()

const GoogleAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'placeholder_key'
})

const TICKET_SECRET = process.env.JWT_SECRET || 'faultline_secure_verification_secret_2026'

// Shared Gemini Prompt Text
const GEMINI_PROMPT_TEXT = `You are an infrastructure and facility issue classification AI for a university campus maintenance management system.
Analyze the uploaded image carefully for physical infrastructure, equipment, or facility maintenance issues.

### VISUAL ISSUE DETECTION RULES:
1. EVALUATE VISUAL INFRASTRUCTURE ISSUE:
   - Determine if the image visually depicts a real, plausible physical infrastructure or facility issue.
   - Set "isValid": true if the photo visually shows a clear, relevant physical infrastructure or facility asset/issue requiring maintenance.
   - Set "isValid": false if the image:
     * Is a selfie, face/body portrait, or personal photograph of a person.
     * Contains NO visible damage, maintenance issue, or relevant infrastructure asset (e.g. clean plain wall, normal room with no issue).
     * Is an unrelated personal item or object (e.g. pet, food, car, shoe, clothing, personal accessory) with no infrastructure issue.
     * Is a screenshot, meme, poster, text-only document, or non-photo graphics.
     * Does not contain sufficient visual evidence of a physical infrastructure or facility issue.

2. SPECIFIC ISSUE TYPE ("issueType"):
   - Choose the single best matching issue code:
     * Electrical: "FAN_NOT_WORKING", "LIGHT_NOT_WORKING", "AC_NOT_WORKING", "SWITCH_DAMAGED", "SOCKET_DAMAGED", "WIRING_ISSUE"
     * Plumbing: "WATER_LEAKAGE", "TAP_DAMAGED", "PIPE_LEAKAGE", "DRAIN_BLOCKAGE", "FLUSH_PROBLEM", "WATER_SUPPLY_ISSUE"
     * Infrastructure & Furniture: "CHAIR_DAMAGED", "TABLE_DAMAGED", "CUPBOARD_DAMAGED", "DOOR_DAMAGED", "DOOR_LOCK_DAMAGED", "SHELF_DAMAGED", "WINDOW_DAMAGED", "WALL_DAMAGE", "FLOOR_DAMAGE", "CEILING_DAMAGE"
     * Washroom: "WASHROOM_CLEANLINESS", "TOILET_DAMAGE", "FLUSH_PROBLEM", "WASH_BASIN_PROBLEM", "WASHROOM_LEAKAGE"
     * IT & Network: "WIFI_NOT_WORKING", "NETWORK_ISSUE", "LAN_ISSUE", "COMPUTER_NOT_WORKING", "PROJECTOR_NOT_WORKING", "CCTV_NOT_WORKING"
     * Cleanliness: "GARBAGE_OVERFLOW", "CLEANING_REQUIRED", "WASTE_DISPOSAL", "PEST_ISSUE"
     * Safety & Security: "BROKEN_RAILING", "FIRE_SAFETY_ISSUE", "EMERGENCY_EXIT_ISSUE", "DANGEROUS_WIRING", "SECURITY_ISSUE"
     * Lift & Mechanical: "LIFT_NOT_WORKING", "LIFT_DOOR_ISSUE", "GENERATOR_ISSUE", "WATER_PUMP_ISSUE", "MOTOR_ISSUE"
     * Outdoor & Campus: "ROAD_DAMAGE", "PARKING_ISSUE", "STREET_LIGHT_ISSUE", "DRAINAGE_ISSUE", "GARDEN_ISSUE", "CAMPUS_SIGNBOARD_DAMAGE"
     * Other: "OTHER_MAINTENANCE"

3. DEPARTMENT CLASSIFICATION ("department"):
   - Choose EXACTLY ONE department from this whitelist:
     "ELECTRICAL_ISSUES",
     "PLUMBING_WATER_ISSUES",
     "INFRASTRUCTURE_FURNITURE_ISSUES",
     "WASHROOM_ISSUES",
     "IT_NETWORK_ISSUES",
     "CLEANLINESS_WASTE_ISSUES",
     "SAFETY_SECURITY_ISSUES",
     "LIFT_MECHANICAL_ISSUES",
     "OUTDOOR_CAMPUS_ISSUES",
     "OTHER_MAINTENANCE_ISSUES"

4. PHYSICAL SETTING / LOCATION CONTEXT ("collegeContext"):
   - "CLASSROOM", "LAB", "CORRIDOR", "WASHROOM", "OFFICE", "CANTEEN", "LIBRARY", "CAMPUS_AREA", "OTHER", "UNKNOWN"

5. CONFIDENCE ("confidence"):
   - A floating-point number between 0.0 and 1.0 indicating visual confidence in the analysis.

6. SEVERITY ("severity"):
   - An integer score from 1 to 10 rating the severity of the detected physical issue.

Return ONLY a valid JSON object matching this schema:
{
  "isValid": boolean,
  "issueType": string,
  "department": string,
  "confidence": number,
  "severity": number,
  "collegeContext": string,
  "reason": string
}`

// Generate secure HMAC-SHA256 signed verification token
export const generateVerificationToken = ({ userId, imageBuffer, analysis }) => {
  const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex')
  const payload = {
    userId: userId ? userId.toString() : '',
    imageHash,
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
export const verifyVerificationToken = ({ token, userId, imageBuffer }) => {
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
    const currentHash = crypto.createHash('sha256').update(imageBuffer).digest('hex')
    if (payload.imageHash !== currentHash) {
      console.warn('[SECURITY ALERT] Image modified or replaced after verification!')
      return null
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
      imageBuffer
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

      const result = await GoogleAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { text: GEMINI_PROMPT_TEXT },
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

      rawIssueType = String(parsed.issueType || parsed.damageType || '').toUpperCase()
      const rawAiDept = String(parsed.department || '').toUpperCase()
      collegeContext = String(parsed.collegeContext || parsed.civicContext || '').toUpperCase()
      confidence = Number(parsed.confidence)
      const isValidFlag = parsed.isValid === true

      authoritativeDepartment = getDepartmentForIssue(rawIssueType, rawAiDept)

      let rejectionReason = null
      if (!isValidFlag) {
        rejectionReason = 'AI visual validation marked image as invalid (no clear infrastructure issue detected).'
      } else if (isNaN(confidence) || confidence < 0.75) {
        rejectionReason = `AI confidence score (${confidence}) is below threshold of 0.75.`
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

      const activeOfficers = await User.find({ role: 'officer' }).sort({ createdAt: 1 })
      const eligibleOfficers = activeOfficers.filter(o => {
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

    const localFilePath = req.file.path
    const imageBuffer = fs.readFileSync(localFilePath)
    const base64Img = imageBuffer.toString('base64')

    const tGeminiStart = Date.now()
    const result = await GoogleAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: GEMINI_PROMPT_TEXT },
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

    const rawIssueType = String(parsed.issueType || parsed.damageType || '').toUpperCase()
    const rawAiDept = String(parsed.department || '').toUpperCase()
    const collegeContext = String(parsed.collegeContext || parsed.civicContext || '').toUpperCase()
    const confidence = Number(parsed.confidence)
    const isValidFlag = parsed.isValid === true

    const authoritativeDepartment = getDepartmentForIssue(rawIssueType, rawAiDept)

    let rejectionReason = null
    if (!isValidFlag) {
      rejectionReason = 'Photo could not be verified as a valid campus maintenance issue.'
    } else if (isNaN(confidence) || confidence < 0.75) {
      rejectionReason = `AI confidence score (${confidence}) is below threshold of 0.75.`
    } else if (!ALLOWED_COLLEGE_CONTEXTS.includes(collegeContext)) {
      rejectionReason = `College context '${collegeContext}' is invalid or UNKNOWN.`
    }

    if (rejectionReason !== null) {
      console.log(`[REPORT TIMING] Image Verification REJECTED: ${Date.now() - tStart} ms (${rejectionReason})`)
      return res.status(400).json({
        success: false,
        isValid: false,
        message: rejectionReason
      })
    }

    let severityScore = Number(parsed.severity) || 5
    if (severityScore < 1) severityScore = 5
    if (severityScore > 10) severityScore = 10

    // Generate signed HMAC verification token for 0-ms duplicate bypass on submission
    const verificationToken = generateVerificationToken({
      userId: req.userId,
      imageBuffer,
      analysis: {
        isValid: true,
        department: authoritativeDepartment,
        issueType: rawIssueType,
        confidence,
        severity: severityScore,
        collegeContext
      }
    })

    console.log(`[REPORT TIMING] Image Verification ACCEPTED: ${Date.now() - tStart} ms (Gemini: ${tGemini} ms)`)

    return res.status(200).json({
      success: true,
      isValid: true,
      message: 'Photo verified ✓',
      verificationToken,
      analysis: {
        issueType: rawIssueType,
        department: authoritativeDepartment,
        confidence,
        collegeContext
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
