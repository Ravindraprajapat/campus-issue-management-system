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
import { normalizeBuilding, normalizeDepartment } from '../utils/departmentMapping.js'

dotenv.config()

const GoogleAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'placeholder_key',
  httpOptions: { timeout: 60000 }
})

const TICKET_SECRET = process.env.JWT_SECRET || 'faultline_secure_verification_secret_2026'

const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-2.5-flash']

export const callGeminiWithFallback = async ({ contents, config }) => {
  let lastError = null
  for (const modelName of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await GoogleAi.models.generateContent({
          model: modelName,
          contents,
          config
        })
        return result
      } catch (err) {
        lastError = err
        const isTransient = err.message?.includes('fetch failed') || err.message?.includes('timeout') || err.message?.includes('503')
        console.warn(`[GEMINI] Model '${modelName}' (attempt ${attempt + 1}) failed: ${err.message?.slice(0, 120)}`)
        if (attempt === 0 && isTransient) {
          await new Promise(r => setTimeout(r, 1000))
        } else {
          break
        }
      }
    }
  }
  throw lastError
}

// Build dynamic Gemini classification prompt from active MongoDB Departments and IssueTypes
export const buildDynamicGeminiPrompt = async (userDescription = '') => {
  const activeDepartments = await Department.find({ isActive: true }).sort({ name: 1 })
  const activeIssueTypes = await IssueType.find({ isActive: true })
    .populate('department', 'name code isActive')
    .sort({ name: 1 })

  // An issue type is only truly active if its associated department is also active
  const validActiveIssueTypes = activeIssueTypes.filter(it => it.department && it.department.isActive !== false)

  const deptListText = activeDepartments.length > 0
    ? activeDepartments.map(d => `- DepartmentCode: "${d.code}", Name: "${d.name}" (${d.description || 'Campus department'})`).join('\n')
    : '(No active departments available)'

  const issueListText = validActiveIssueTypes.length > 0
    ? validActiveIssueTypes.map(it => `- IssueCode: "${it.code}", Name: "${it.name}", DepartmentCode: "${it.department?.code || it.departmentCode}"`).join('\n')
    : '(No active issue types available)'

  return `You are a strict security and facility issue classification AI for the UniFix AI campus maintenance management system.
Your mission is to evaluate uploaded images to determine whether they depict legitimate, physical university campus infrastructure, facility, laboratory, academic equipment, or maintenance issues.

STUDENT PROVIDED DESCRIPTION:
"${String(userDescription || '').trim() || 'No description provided'}"

### MANDATORY REJECTION RULES — STRICTLY REJECT UNAUTHORIZED / IRRELEVANT PHOTOS:
The system MUST reject any image that does not clearly depict legitimate university campus infrastructure, facility, laboratory equipment, or maintenance damage/fault.
You MUST set "isValid": false and "issueIdentified": false if the image contains or is:
1. Selfies, portraits, human faces, posing students/staff, group photos, random people.
2. Animals, pets, wildlife.
3. Food, meals, beverages, snacks, packaging.
4. Personal belongings (backpacks, clothing, personal footwear, private items).
5. Personal vehicles, cars, motorcycles, bicycles (unless directly involving campus facility infrastructure like a damaged university boom barrier).
6. Personal electronic devices (laptops, mobile phones, tablets, smartwatches) unrelated to fixed campus infrastructure.
7. Screenshots of any kind: chat/WhatsApp messages, websites, social media posts, error dialogues, mobile app screens, memes.
8. Posters, advertisements, flyers, certificates, student ID cards, physical paper documents, text-only notes or printouts.
9. Random outdoor landscapes, scenic views, or photos of normal buildings with NO visible damage or defect.
10. Normal, clean, undamaged infrastructure (e.g. clean plain wall with no damage, undamaged floor, working light, unbroken desk).
11. Text claims with no visible evidence (e.g. "internet down" or "software crashed" with only an undamaged desk or screen).
12. Ambiguous photos, blurry images, dark/unusable photos, or photos where damage cannot be clearly verified.
DO NOT GUESS. If there is no clear visual proof of a physical infrastructure, laboratory, or facility defect, REJECT IT.

### EVALUATION OF STUDENT DESCRIPTION VS. PHOTO:
- The student's description is supporting context only; IT CANNOT OVERRIDE THE IMAGE.
- If the image is a selfie or irrelevant, and the student writes "broken solar inverter", REJECT (isValid: false, issueIdentified: false, descriptionMatchesImage: false).
- If the image shows real infrastructure damage (e.g. broken projector), but the description claims something completely different (e.g. "ceiling fan is broken"), set "descriptionMatchesImage": false and "needsUserConfirmation": true.
- If the photo clearly depicts physical campus damage AND the description accurately reflects that damage, set "descriptionMatchesImage": true and "needsUserConfirmation": false.

### AUTHORITATIVE ACTIVE CATEGORIES:
Below are the currently configured active departments and issue types in the campus database.

AVAILABLE ACTIVE DEPARTMENTS:
${deptListText}

AVAILABLE ACTIVE ISSUE TYPES:
${issueListText}

### CLASSIFICATION RULES:
1. MATCHING ACTIVE ISSUE TYPE:
   - If the photo shows a legitimate campus maintenance or facility issue that clearly matches one of the active issue types above with confidence >= 0.75:
     - "isValid": true
     - "issueIdentified": true
     - "isUnknownCategory": false
     - "issueTypeCode": exact "IssueCode" from the active issue types list
     - "departmentCode": exact "DepartmentCode" corresponding to that issue type
     - "detectedIssueName": name of the matched issue type

2. LEGITIMATE CAMPUS ISSUE WITHOUT AN EXISTING ACTIVE ISSUE TYPE (PENDING CLASSIFICATION):
   - If the photo clearly shows a genuine, legitimate physical university campus maintenance, facility, laboratory, academic equipment, or infrastructure problem/damage, AND the description accurately reflects this visible defect, BUT there is NO active issue type in the list above that covers it:
     - "isValid": true
     - "issueIdentified": true
     - "isUnknownCategory": true
     - "issueTypeCode": "UNKNOWN"
     - "departmentCode": "UNKNOWN"
     - "detectedIssueName": a concise, descriptive title of the specific physical defect observed (e.g. based on what is visually broken or damaged in the image and description)
     - "reason": clear concise explanation describing the physical damage observed and that it does not match an existing predefined category

3. REJECTION OF IRRELEVANT / NON-FACILITY PHOTOS:
   - If the photo is NOT a legitimate campus maintenance, facility, or physical damage issue (selfies, food, undamaged walls, pets, personal items, screenshots, etc.):
     - "isValid": false
     - "issueIdentified": false
     - "isUnknownCategory": false
     - "issueTypeCode": "UNKNOWN"
     - "departmentCode": "UNKNOWN"
     - "detectedIssueName": ""
     - "reason": specific clear explanation of why it was rejected

Return ONLY a valid JSON object matching this exact schema:
{
  "isValid": boolean,
  "issueIdentified": boolean,
  "isUnknownCategory": boolean,
  "issueTypeCode": string,
  "departmentCode": string,
  "detectedIssueName": string,
  "confidence": number,
  "severity": number,
  "collegeContext": "MUST be strictly one of: CLASSROOM, LAB, CORRIDOR, WASHROOM, OFFICE, CANTEEN, LIBRARY, CAMPUS_AREA, OTHER",
  "descriptionMatchesImage": boolean,
  "needsUserConfirmation": boolean,
  "reason": string
}
`
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
    issueIdentified: analysis.issueIdentified === true,
    isPendingClassification: analysis.isPendingClassification === true,
    department: analysis.department || null,
    departmentName: analysis.departmentName || 'Not Classified',
    issueType: analysis.issueType || 'UNKNOWN',
    issueTypeName: analysis.issueTypeName || 'Pending Classification',
    detectedType: analysis.detectedType || analysis.issueTypeName || '',
    detectedIssueName: analysis.detectedIssueName || analysis.detectedType || analysis.issueTypeName || '',
    reason: analysis.reason || '',
    confidence: analysis.confidence,
    severity: analysis.severity,
    collegeContext: analysis.collegeContext,
    descriptionMatchesImage: analysis.descriptionMatchesImage === true,
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

    // AI validation check (Strict booleans and bounds)
    if (
      payload.isValid !== true ||
      payload.issueIdentified !== true ||
      payload.descriptionMatchesImage !== true ||
      typeof payload.confidence !== 'number' ||
      payload.confidence < 0.75
    ) {
      console.warn('[SECURITY] Verification token contains invalid AI analysis or unconfirmed status')
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
    let detectedTypeName = 'OTHER'
    let confidence = 0.8
    let severityScore = 5
    let collegeContext = 'OTHER'
    let usedToken = false
    let isPendingClassification = false
    let verificationReason = ''

    // Check if secure verificationToken is provided
    const verificationToken = req.body.verificationToken
    const verifiedPayload = verifyVerificationToken({
      token: verificationToken,
      userId: req.userId,
      imageBuffer,
      description
    })

    if (verifiedPayload) {
      if (verifiedPayload.isPendingClassification) {
        usedToken = true
        isPendingClassification = true
        authoritativeDepartment = null
        rawIssueType = verifiedPayload.detectedIssueName || verifiedPayload.detectedType || 'UNKNOWN'
        detectedTypeName = verifiedPayload.detectedIssueName || verifiedPayload.detectedType || 'Pending Classification'
        confidence = verifiedPayload.confidence || 0.8
        severityScore = verifiedPayload.severity || 5
        collegeContext = verifiedPayload.collegeContext || 'OTHER'
        verificationReason = verifiedPayload.reason || ''
        console.log('[REPORT TIMING] Bypassed duplicate Gemini call using valid pending-classification token')
      } else {
        // Re-verify that the issueType and its department are still active in MongoDB
        const activeIssue = await IssueType.findOne({ code: verifiedPayload.issueType, isActive: true }).populate('department')
        if (!activeIssue || !activeIssue.department || activeIssue.department.isActive === false) {
          if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path)
          }
          return res.status(400).json({
            success: false,
            message: 'This issue category or department is no longer active. Please re-verify your complaint.'
          })
        }

        usedToken = true
        authoritativeDepartment = activeIssue.department.code
        rawIssueType = activeIssue.code
        detectedTypeName = activeIssue.code
        confidence = verifiedPayload.confidence || 0.8
        severityScore = verifiedPayload.severity || 5
        collegeContext = verifiedPayload.collegeContext || 'OTHER'
        verificationReason = verifiedPayload.reason || ''
        console.log('[REPORT TIMING] Bypassed duplicate Gemini call using valid backend verification token')
      }
    } else {
      console.log('[REPORT] No valid token found, running full backend Gemini verification fallback...')
      const tGeminiStart = Date.now()
      const base64Img = imageBuffer.toString('base64')
      const promptText = await buildDynamicGeminiPrompt(description)

      const result = await callGeminiWithFallback({
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
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
        return res.status(400).json({
          success: false,
          message: 'Invalid image: This photo does not clearly show a university campus maintenance issue. Please upload a clear photo of the problem.'
        })
      }

      let parsed
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (e) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
        return res.status(400).json({
          success: false,
          message: 'Invalid image: AI classification output could not be parsed.'
        })
      }

      const ALLOWED_COLLEGE_CONTEXTS = [
        'CLASSROOM', 'LAB', 'CORRIDOR', 'WASHROOM', 'OFFICE', 'CANTEEN',
        'LIBRARY', 'CAMPUS_AREA', 'OTHER'
      ]

      const rawCollegeContext = String(parsed.collegeContext || 'OTHER').toUpperCase().trim()
      collegeContext = ALLOWED_COLLEGE_CONTEXTS.includes(rawCollegeContext)
        ? rawCollegeContext
        : (ALLOWED_COLLEGE_CONTEXTS.find(ctx => rawCollegeContext.includes(ctx)) || 'CAMPUS_AREA')
      confidence = Number(parsed.confidence) || 0

      // Strict validation checks (FAIL CLOSED)
      let rejectionReason = null
      if (
        typeof parsed.isValid !== 'boolean' ||
        typeof parsed.issueIdentified !== 'boolean' ||
        typeof parsed.descriptionMatchesImage !== 'boolean'
      ) {
        rejectionReason = 'AI response is missing required validation fields.'
      } else if (parsed.isValid !== true || parsed.issueIdentified !== true) {
        rejectionReason = parsed.reason || 'This photo does not clearly show a university campus maintenance issue. Please upload a clear photo of the problem.'
      } else if (parsed.descriptionMatchesImage !== true || parsed.needsUserConfirmation === true) {
        rejectionReason = 'The description does not match the uploaded photo. Please correct the description or upload the correct photo.'
      } else if (isNaN(confidence) || confidence < 0.75) {
        rejectionReason = `The issue could not be identified confidently. Please upload a clearer photo showing the problem.`
      }

      if (rejectionReason !== null) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
        return res.status(400).json({
          success: false,
          message: rejectionReason
        })
      }

      // MongoDB Active IssueType and Active Department Resolution
      const rawIssueCode = String(parsed.issueTypeCode || parsed.issueType || '').trim().toUpperCase()
      let issueTypeRecord = null
      if (rawIssueCode && rawIssueCode !== 'UNKNOWN') {
        issueTypeRecord = await IssueType.findOne({ code: rawIssueCode, isActive: true }).populate('department')
      }

      const isMatchedActiveType = Boolean(
        issueTypeRecord &&
        issueTypeRecord.department &&
        issueTypeRecord.department.isActive !== false
      )

      if (isMatchedActiveType) {
        authoritativeDepartment = issueTypeRecord.department.code
        rawIssueType = issueTypeRecord.code
        detectedTypeName = issueTypeRecord.code
        isPendingClassification = false
      } else {
        authoritativeDepartment = null
        rawIssueType = parsed.detectedIssueName || 'UNKNOWN'
        detectedTypeName = parsed.detectedIssueName || 'Pending Classification'
        isPendingClassification = true
      }

      severityScore = Number(parsed.severity) || 5
      verificationReason = parsed.reason || ''
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
    if (!isPendingClassification && reportBuilding && authoritativeDepartment) {
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

    const reportStatus = isPendingClassification ? 'PENDING_CLASSIFICATION' : 'PENDING'

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
      issueType: detectedTypeName || rawIssueType || 'OTHER_MAINTENANCE',
      aiDetectedIssue: detectedTypeName,
      aiConfidence: confidence || 0.8,
      aiAnalysis: {
        detectedType: detectedTypeName || rawIssueType || 'OTHER',
        confidence: confidence || 0.8,
        reason: verificationReason
      },
      severityScore,
      priorityLevel,
      status: reportStatus,
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
    const result = await callGeminiWithFallback({
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
      return res.status(400).json({
        success: false,
        isValid: false,
        issueIdentified: false,
        message: 'This photo does not clearly show a university campus maintenance issue. Please upload a clear photo of the problem.',
        reason: 'AI classification output could not be parsed.'
      })
    }

    let parsed
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      return res.status(400).json({
        success: false,
        isValid: false,
        issueIdentified: false,
        message: 'This photo does not clearly show a university campus maintenance issue. Please upload a clear photo of the problem.',
        reason: 'Malformed JSON from classifier.'
      })
    }

    const ALLOWED_COLLEGE_CONTEXTS = [
      'CLASSROOM', 'LAB', 'CORRIDOR', 'WASHROOM', 'OFFICE', 'CANTEEN',
      'LIBRARY', 'CAMPUS_AREA', 'OTHER'
    ]

    const rawCollegeContext = String(parsed.collegeContext || 'OTHER').toUpperCase().trim()
    const collegeContext = ALLOWED_COLLEGE_CONTEXTS.includes(rawCollegeContext)
      ? rawCollegeContext
      : (ALLOWED_COLLEGE_CONTEXTS.find(ctx => rawCollegeContext.includes(ctx)) || 'CAMPUS_AREA')
    const confidence = Number(parsed.confidence)

    // 1. Strict boolean & existence validation (FAIL CLOSED)
    if (
      typeof parsed.isValid !== 'boolean' ||
      typeof parsed.issueIdentified !== 'boolean' ||
      typeof parsed.descriptionMatchesImage !== 'boolean'
    ) {
      return res.status(400).json({
        success: false,
        isValid: false,
        issueIdentified: false,
        message: 'AI response is missing required validation fields.',
        reason: 'Incomplete validation flags.'
      })
    }

    // 2. Reject if AI marked image as invalid or issue unconfirmed
    if (parsed.isValid !== true || parsed.issueIdentified !== true) {
      const msg = parsed.reason || 'This photo does not clearly show a university campus maintenance issue. Please upload a clear photo of the problem.'
      return res.status(400).json({
        success: false,
        isValid: false,
        issueIdentified: false,
        message: msg,
        reason: msg
      })
    }

    // 3. Reject description mismatch (FAIL CLOSED: descriptionMatchesImage must be strictly true)
    if (parsed.descriptionMatchesImage !== true || parsed.needsUserConfirmation === true) {
      return res.status(400).json({
        success: false,
        isValid: false,
        issueIdentified: true,
        message: 'The description does not match the uploaded photo. Please correct the description or upload the correct photo.',
        reason: 'Description mismatch with visual evidence.'
      })
    }

    // 4. Confidence threshold check (>= 0.75)
    if (isNaN(confidence) || confidence < 0.75) {
      return res.status(400).json({
        success: false,
        isValid: false,
        issueIdentified: false,
        message: 'The issue could not be identified confidently. Please upload a clearer photo showing the problem.',
        reason: `AI confidence score (${isNaN(confidence) ? 'NaN' : confidence.toFixed(2)}) is below threshold of 0.75.`
      })
    }

    // 6. MongoDB Active IssueType and Active Department Resolution
    const rawIssueCode = String(parsed.issueTypeCode || parsed.issueType || '').trim().toUpperCase()
    let issueTypeRecord = null
    if (rawIssueCode && rawIssueCode !== 'UNKNOWN') {
      issueTypeRecord = await IssueType.findOne({ code: rawIssueCode, isActive: true }).populate('department')
    }

    const isMatchedActiveType = Boolean(
      issueTypeRecord &&
      issueTypeRecord.department &&
      issueTypeRecord.department.isActive !== false
    )

    let authoritativeDepartmentCode = null
    let authoritativeDepartmentName = 'Not Classified'
    let authoritativeIssueTypeCode = 'UNKNOWN'
    let authoritativeIssueTypeName = parsed.detectedIssueName || 'Pending Classification'
    let isPendingClassification = false

    if (isMatchedActiveType) {
      authoritativeDepartmentCode = issueTypeRecord.department.code
      authoritativeDepartmentName = issueTypeRecord.department.name
      authoritativeIssueTypeCode = issueTypeRecord.code
      authoritativeIssueTypeName = issueTypeRecord.name
      isPendingClassification = false
    } else {
      isPendingClassification = true
      authoritativeDepartmentCode = null
      authoritativeDepartmentName = 'Not Classified'
      authoritativeIssueTypeCode = 'UNKNOWN'
      authoritativeIssueTypeName = parsed.detectedIssueName || 'Pending Classification'
    }

    let severityScore = Number(parsed.severity) || 5
    if (severityScore < 1) severityScore = 5
    if (severityScore > 10) severityScore = 10

    const detectedTypeName = parsed.detectedIssueName || authoritativeIssueTypeName

    const verificationToken = generateVerificationToken({
      userId: req.userId,
      imageBuffer,
      description,
      analysis: {
        isValid: true,
        issueIdentified: true,
        isPendingClassification,
        department: authoritativeDepartmentCode,
        departmentName: authoritativeDepartmentName,
        issueType: authoritativeIssueTypeCode,
        issueTypeName: authoritativeIssueTypeName,
        detectedType: detectedTypeName,
        detectedIssueName: detectedTypeName,
        reason: parsed.reason || '',
        confidence,
        severity: severityScore,
        collegeContext,
        descriptionMatchesImage: true
      }
    })

    console.log(`[REPORT TIMING] Image Verification ACCEPTED (pendingClassification: ${isPendingClassification}): ${Date.now() - tStart} ms (Gemini: ${tGemini} ms)`)

    return res.status(200).json({
      success: true,
      isValid: true,
      issueIdentified: true,
      isPendingClassification,
      message: isPendingClassification
        ? 'Photo verified ✓ (New issue category pending admin classification)'
        : 'Photo & description verified ✓',
      verificationToken,
      analysis: {
        issueTypeCode: authoritativeIssueTypeCode,
        issueTypeName: authoritativeIssueTypeName,
        detectedType: detectedTypeName,
        issueType: authoritativeIssueTypeName,
        departmentCode: authoritativeDepartmentCode,
        departmentName: authoritativeDepartmentName,
        department: authoritativeDepartmentName,
        isPendingClassification,
        confidence,
        severity: severityScore,
        collegeContext,
        reason: parsed.reason || 'Visual evidence verified against campus maintenance criteria',
        descriptionMatchesImage: true,
        needsUserConfirmation: false
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
