import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from './model/User.js'

dotenv.config()

async function migrateOfficers () {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB for officer assignedBuildings migration...')

    const officers = await User.find({ role: 'officer' })
    console.log(`Found ${officers.length} maintenance officers.`)

    for (const off of officers) {
      let buildings = off.assignedBuildings || []
      if (!Array.isArray(buildings)) buildings = []

      if (buildings.length === 0 && (off.assignedBuilding || off.assignedWard)) {
        const singleB = (off.assignedBuilding || off.assignedWard).trim()
        if (singleB) buildings = [singleB]
      }

      buildings = [...new Set(buildings.map(b => String(b).trim()).filter(Boolean))]

      off.assignedBuildings = buildings
      if (buildings.length > 0) {
        off.assignedBuilding = buildings[0]
        off.assignedWard = buildings[0]
      }
      await off.save()
      console.log(`Updated officer '${off.name}' (${off._id}): assignedBuildings =`, buildings)
    }

    console.log('Officer assignedBuildings migration completed successfully.')
    await mongoose.disconnect()
  } catch (err) {
    console.error('Migration error:', err)
    process.exit(1)
  }
}

migrateOfficers()
