import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    // 🔹 Who reported
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔹 Uploaded image
    imageUrl: {
      type: String,
      required: true,
    },

    // 🔹 Location
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      address: String,
      ward: {
        type: String,
        default: 'Unknown'
      },
      building: {
        type: String,
        default: ''
      },
      room: {
        type: String,
        default: ''
      }
    },

    // 🔹 Optional User Description
    description: {
      type: String,
      default: ''
    },

    // 🔹 AI Analysis Result
    aiAnalysis: {
      detectedType: {
        type: String,
      },
      confidence: {
        type: Number, // 0 to 1
      },
    },

    // 🔹 Final Computed Severity Score (1–10)
    severityScore: {
      type: Number,
      min: 1,
      max: 10,
    },

    // 🔹 Priority decided from severity
    priorityLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
    },

    // 🔹 Complaint lifecycle
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED"],
      default: "PENDING",
    },

    // 🔹 Assigned Admin / Officer
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // 🔹 Department Classification & Issue Routing
    department: {
      type: String,
      default: "OTHER_MAINTENANCE_ISSUES",
      index: true
    },
    issueType: {
      type: String,
      default: ""
    },
    aiConfidence: {
      type: Number,
      default: 0.0
    }
  },
  { timestamps: true }
);

reportSchema.index({ department: 1, 'location.building': 1 });

export default mongoose.model("Report", reportSchema);