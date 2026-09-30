import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from './model/User.js'
import Report from './model/Report.js'
import { normalizeBuilding, normalizeDepartment } from './utils/departmentMapping.js'

dotenv.config()

async function fixAndVerify() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('=== RUNNING NORMALIZED OFFICER ASSIGNMENT FIX & VERIFICATION ===')

  // 1. Normalize existing Officer records in MongoDB (removing leading/trailing whitespace from assignedBuilding)
  const officers = await User.find({ role: 'officer' })
  for (const o of officers) {
    const origB = o.assignedBuilding || ''
    const trimmedB = origB.trim()
    if (origB !== trimmedB) {
      console.log(`[Sanitizing Officer Record] Trimming building for ${o.name}: "${origB}" -> "${trimmedB}"`)
      o.assignedBuilding = trimmedB
      o.assignedWard = trimmedB
      await o.save()
    }
  }

  // 2. Re-evaluate unassigned reports using normalized matching
  const unassignedReports = await Report.find({
    $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }]
  })

  console.log(`\nRe-evaluating ${unassignedReports.length} unassigned report(s)...`)
  let assignedCount = 0

  for (const report of unassignedReports) {
    const rBuilding = normalizeBuilding(report.location?.building || report.location?.ward)
    const rDept = normalizeDepartment(report.department)

    const matchingOfficer = officers.find(o =>
      o.role === 'officer' &&
      normalizeDepartment(o.department) === rDept &&
      normalizeBuilding(o.assignedBuilding || o.assignedWard) === rBuilding
    )

    if (matchingOfficer) {
      report.assignedTo = matchingOfficer._id
      await report.save()
      assignedCount++
      console.log(`✓ [ASSIGNED] Report ${report._id} (${report.issueType}, ${report.location?.building}) assigned to ${matchingOfficer.name}`)
    } else {
      console.log(`- [UNASSIGNED] Report ${report._id} (${report.issueType}, ${report.location?.building}) has no matching officer`)
    }
  }

  // 3. Verify Kara Kumar's assigned complaints count
  const kara = await User.findOne({ name: /kara/i })
  const karaReports = await Report.find({ assignedTo: kara._id })
  console.log(`\nKara Kumar (${kara._id}) Assigned Complaints Count: ${karaReports.length}`)
  karaReports.forEach(r => {
    console.log(`  - ${r.issueType} (${r.location?.building}) [Status: ${r.status}]`)
  })

  // 4. Verify CEILING_DAMAGE report directly
  const ceilingReport = await Report.findById('6abb721f9c61dd3e4ad11a74').populate('assignedTo', 'name email')
  console.log('\nCEILING_DAMAGE Report state after normalization:', {
    _id: ceilingReport._id.toString(),
    issueType: ceilingReport.issueType,
    department: ceilingReport.department,
    building: ceilingReport.location?.building,
    assignedTo: ceilingReport.assignedTo ? {
      _id: ceilingReport.assignedTo._id.toString(),
      name: ceilingReport.assignedTo.name
    } : null
  })

  await mongoose.disconnect()
}

fixAndVerify().catch(console.error)
