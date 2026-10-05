import Department from '../model/Department.js'
import IssueType from '../model/IssueType.js'

const INITIAL_DEPARTMENTS = [
  {
    name: 'Electrical Issues',
    code: 'ELECTRICAL_ISSUES',
    description: 'Classroom, lab, corridor, and campus electrical systems, fans, lights, AC, switches, and wiring.',
    issueTypes: [
      { name: 'Fan Not Working', code: 'FAN_NOT_WORKING', description: 'Ceiling or wall fan malfunction' },
      { name: 'Light Not Working', code: 'LIGHT_NOT_WORKING', description: 'Tube light or LED bulb failure' },
      { name: 'AC Not Working', code: 'AC_NOT_WORKING', description: 'Air conditioner cooling or power issue' },
      { name: 'Switch Damaged', code: 'SWITCH_DAMAGED', description: 'Broken or malfunctioning electrical switch' },
      { name: 'Socket Damaged', code: 'SOCKET_DAMAGED', description: 'Damaged power outlet or plug socket' },
      { name: 'Wiring Issue', code: 'WIRING_ISSUE', description: 'Exposed, damaged, or hazardous electrical wiring' }
    ]
  },
  {
    name: 'Plumbing & Water Issues',
    code: 'PLUMBING_WATER_ISSUES',
    description: 'Water supply, pipe leakages, taps, drains, flush systems, and plumbing fixtures.',
    issueTypes: [
      { name: 'Water Leakage', code: 'WATER_LEAKAGE', description: 'General water leakage in building or campus' },
      { name: 'Tap Damaged', code: 'TAP_DAMAGED', description: 'Leaking, broken, or missing tap' },
      { name: 'Pipe Leakage', code: 'PIPE_LEAKAGE', description: 'Cracked or bursting water supply pipe' },
      { name: 'Drain Blockage', code: 'DRAIN_BLOCKAGE', description: 'Clogged drainage or sink outlet' },
      { name: 'Flush Problem', code: 'FLUSH_PROBLEM', description: 'Toilet flush valve or tank malfunction' },
      { name: 'Water Supply Issue', code: 'WATER_SUPPLY_ISSUE', description: 'No water supply or low pressure' }
    ]
  },
  {
    name: 'Infrastructure & Furniture Issues',
    code: 'INFRASTRUCTURE_FURNITURE_ISSUES',
    description: 'Classroom benches, tables, chairs, doors, locks, windows, walls, floors, and ceilings.',
    issueTypes: [
      { name: 'Chair Damaged', code: 'CHAIR_DAMAGED', description: 'Broken or unsteady chair' },
      { name: 'Table Damaged', code: 'TABLE_DAMAGED', description: 'Damaged study or laboratory table' },
      { name: 'Cupboard Damaged', code: 'CUPBOARD_DAMAGED', description: 'Broken cupboard or cabinet door' },
      { name: 'Door Damaged', code: 'DOOR_DAMAGED', description: 'Damaged room door or hinges' },
      { name: 'Door Lock Damaged', code: 'DOOR_LOCK_DAMAGED', description: 'Broken or jammed door lock' },
      { name: 'Shelf Damaged', code: 'SHELF_DAMAGED', description: 'Broken or loose shelf' },
      { name: 'Window Damaged', code: 'WINDOW_DAMAGED', description: 'Broken window pane or latch' },
      { name: 'Wall Damage', code: 'WALL_DAMAGE', description: 'Cracked or damaged plaster/paint' },
      { name: 'Floor Damage', code: 'FLOOR_DAMAGE', description: 'Broken tile or floor surface' },
      { name: 'Ceiling Damage', code: 'CEILING_DAMAGE', description: 'Leaking or damaged false ceiling' }
    ]
  },
  {
    name: 'Washroom Issues',
    code: 'WASHROOM_ISSUES',
    description: 'Washroom cleanliness, toilets, wash basins, mirrors, and sanitation facilities.',
    issueTypes: [
      { name: 'Washroom Cleanliness', code: 'WASHROOM_CLEANLINESS', description: 'Unclean or unsanitary washroom conditions' },
      { name: 'Toilet Damage', code: 'TOILET_DAMAGE', description: 'Damaged toilet seat or ceramic fixture' },
      { name: 'Wash Basin Problem', code: 'WASH_BASIN_PROBLEM', description: 'Clogged or broken wash basin' },
      { name: 'Washroom Leakage', code: 'WASHROOM_LEAKAGE', description: 'Water pooling or leaking in washroom' }
    ]
  },
  {
    name: 'IT & Network Issues',
    code: 'IT_NETWORK_ISSUES',
    description: 'Computers, projectors, Wi-Fi access points, LAN sockets, CCTV cameras, and IT hardware.',
    issueTypes: [
      { name: 'Wi-Fi Not Working', code: 'WIFI_NOT_WORKING', description: 'Campus Wi-Fi connectivity failure' },
      { name: 'Network Issue', code: 'NETWORK_ISSUE', description: 'General internet or network outage' },
      { name: 'LAN Issue', code: 'LAN_ISSUE', description: 'Damaged Ethernet port or LAN cable' },
      { name: 'Computer Not Working', code: 'COMPUTER_NOT_WORKING', description: 'Lab computer power or hardware failure' },
      { name: 'Projector Not Working', code: 'PROJECTOR_NOT_WORKING', description: 'Classroom projector display or lamp issue' },
      { name: 'CCTV Not Working', code: 'CCTV_NOT_WORKING', description: 'Security camera offline or damaged' }
    ]
  },
  {
    name: 'Cleanliness & Waste Issues',
    code: 'CLEANLINESS_WASTE_ISSUES',
    description: 'Garbage bins, campus litter, waste disposal, pest control, and general housekeeping.',
    issueTypes: [
      { name: 'Garbage Overflow', code: 'GARBAGE_OVERFLOW', description: 'Overflowing dustbin or waste container' },
      { name: 'Cleaning Required', code: 'CLEANING_REQUIRED', description: 'Corridor or classroom sweeping/mopping needed' },
      { name: 'Waste Disposal', code: 'WASTE_DISPOSAL', description: 'Improperly dumped waste or debris' },
      { name: 'Pest Issue', code: 'PEST_ISSUE', description: 'Insects, rodents, or pest infestation' }
    ]
  },
  {
    name: 'Safety & Security Issues',
    code: 'SAFETY_SECURITY_ISSUES',
    description: 'Fire extinguishers, railings, emergency exits, security hazards, and dangerous wiring.',
    issueTypes: [
      { name: 'Broken Railing', code: 'BROKEN_RAILING', description: 'Damaged staircase or balcony railing' },
      { name: 'Fire Safety Issue', code: 'FIRE_SAFETY_ISSUE', description: 'Expired fire extinguisher or blocked hose' },
      { name: 'Emergency Exit Issue', code: 'EMERGENCY_EXIT_ISSUE', description: 'Blocked or locked emergency exit' },
      { name: 'Dangerous Wiring', code: 'DANGEROUS_WIRING', description: 'Exposed high-voltage wire hazard' },
      { name: 'Security Issue', code: 'SECURITY_ISSUE', description: 'Damaged gate, boundary fence, or security light' }
    ]
  },
  {
    name: 'Lift & Mechanical Issues',
    code: 'LIFT_MECHANICAL_ISSUES',
    description: 'Building elevators, lift doors, generators, water pumps, motors, and mechanical assets.',
    issueTypes: [
      { name: 'Lift Not Working', code: 'LIFT_NOT_WORKING', description: 'Elevator completely out of service' },
      { name: 'Lift Door Issue', code: 'LIFT_DOOR_ISSUE', description: 'Lift door jammed or sensor failure' },
      { name: 'Generator Issue', code: 'GENERATOR_ISSUE', description: 'Backup generator failure during outage' },
      { name: 'Water Pump Issue', code: 'WATER_PUMP_ISSUE', description: 'Water pumping motor failure' },
      { name: 'Motor Issue', code: 'MOTOR_ISSUE', description: 'General mechanical motor fault' }
    ]
  },
  {
    name: 'Outdoor & Campus Issues',
    code: 'OUTDOOR_CAMPUS_ISSUES',
    description: 'Campus roads, streetlights, outdoor drainage, parking areas, gardens, and signboards.',
    issueTypes: [
      { name: 'Road Damage', code: 'ROAD_DAMAGE', description: 'Potholes or cracked campus pathway' },
      { name: 'Parking Issue', code: 'PARKING_ISSUE', description: 'Damaged parking shade or barrier' },
      { name: 'Street Light Issue', code: 'STREET_LIGHT_ISSUE', description: 'Non-functional streetlight on campus road' },
      { name: 'Drainage Issue', code: 'DRAINAGE_ISSUE', description: 'Outdoor storm drain overflow or blockage' },
      { name: 'Garden Issue', code: 'GARDEN_ISSUE', description: 'Overgrown trees or broken garden sprinkler' },
      { name: 'Campus Signboard Damage', code: 'CAMPUS_SIGNBOARD_DAMAGE', description: 'Broken or faded directional signboard' }
    ]
  },
  {
    name: 'Other Maintenance Issues',
    code: 'OTHER_MAINTENANCE_ISSUES',
    description: 'Miscellaneous campus infrastructure or unclassified maintenance requests.',
    issueTypes: [
      { name: 'Other Maintenance', code: 'OTHER_MAINTENANCE', description: 'General unclassified maintenance request' }
    ]
  }
]

export const seedDefaultDepartmentsAndIssueTypes = async () => {
  try {
    for (const deptData of INITIAL_DEPARTMENTS) {
      let dept = await Department.findOne({ code: deptData.code })
      if (!dept) {
        dept = await Department.create({
          name: deptData.name,
          code: deptData.code,
          description: deptData.description,
          isActive: true
        })
        console.log(`[DB SEED] Created Department: ${dept.name} (${dept.code})`)
      }

      for (const issueData of deptData.issueTypes) {
        const existingIssue = await IssueType.findOne({ code: issueData.code })
        if (!existingIssue) {
          await IssueType.create({
            name: issueData.name,
            code: issueData.code,
            description: issueData.description,
            department: dept._id,
            departmentCode: dept.code,
            isActive: true
          })
          console.log(`[DB SEED] Created IssueType: ${issueData.name} -> ${dept.code}`)
        }
      }
    }
  } catch (err) {
    console.error('[DB SEED ERROR] Failed to seed default departments & issue types:', err.message)
  }
}
