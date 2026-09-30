import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../model/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables reliably from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') })
if (!process.env.MONGODB_URI) {
  dotenv.config()
}

export const seedAdmin = async () => {
  const mongoUri = process.env.MONGODB_URI
  const rawAdminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@paruluniversity.ac.in'
  const adminEmail = rawAdminEmail.trim().toLowerCase()
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin@parul23030310'

  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI is missing from environment variables.')
    process.exit(1)
  }

  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB successfully.')

    // Check if initial admin account already exists (case-insensitive check)
    const existingAdmin = await User.findOne({
      email: { $regex: `^${adminEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    })

    if (existingAdmin) {
      console.log(`ℹ️ Initial Admin account (${existingAdmin.email}) already exists with role '${existingAdmin.role}'. Skipping seed (idempotent).`)
      await mongoose.disconnect()
      process.exit(0)
    }

    // Hash password before saving, following existing User model conventions
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    const adminUser = await User.create({
      name: 'Parul University Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      mustChangePassword: true
    })

    console.log(`✅ Initial Admin account (${adminUser.email}) created successfully with role '${adminUser.role}'.`)
    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding Admin account:', error.message)
    try {
      await mongoose.disconnect()
    } catch {
      // Ignore disconnect error on failure exit
    }
    process.exit(1)
  }
}

// Run script if executed directly
seedAdmin()
