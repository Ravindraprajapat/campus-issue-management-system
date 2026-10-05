import mongoose from 'mongoose'

const issueTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      default: ''
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    departmentCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

issueTypeSchema.index({ code: 1, department: 1, isActive: 1 })

export default mongoose.model('IssueType', issueTypeSchema)
