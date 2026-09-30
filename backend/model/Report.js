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
        enum: [
          // Fine-Grained & Legacy Electrical
          "FAN_NOT_WORKING",
          "LIGHT_NOT_WORKING",
          "AC_NOT_WORKING",
          "SWITCH_DAMAGED",
          "SOCKET_DAMAGED",
          "WIRING_ISSUE",
          "FAN",
          "LIGHT",
          "AC",
          "PLUG_SOCKET",
          "ELECTRICAL",

          // Fine-Grained & Legacy Plumbing & Water
          "WATER_LEAKAGE",
          "TAP_DAMAGED",
          "PIPE_LEAKAGE",
          "DRAIN_BLOCKAGE",
          "FLUSH_PROBLEM",
          "WATER_SUPPLY_ISSUE",
          "WATER_LEAK",
          "PLUMBING",

          // Fine-Grained & Legacy Infrastructure & Furniture
          "CHAIR_DAMAGED",
          "TABLE_DAMAGED",
          "CUPBOARD_DAMAGED",
          "DOOR_DAMAGED",
          "DOOR_LOCK_DAMAGED",
          "SHELF_DAMAGED",
          "WINDOW_DAMAGED",
          "WALL_DAMAGE",
          "FLOOR_DAMAGE",
          "CEILING_DAMAGE",
          "BENCH",
          "CHAIR",
          "DESK",
          "DOOR",
          "WINDOW",
          "CLASSROOM_EQUIPMENT",

          // Fine-Grained & Legacy Washroom
          "WASHROOM_CLEANLINESS",
          "TOILET_DAMAGE",
          "WASH_BASIN_PROBLEM",
          "WASHROOM_LEAKAGE",
          "WASHROOM",

          // Fine-Grained & Legacy IT & Network
          "WIFI_NOT_WORKING",
          "NETWORK_ISSUE",
          "LAN_ISSUE",
          "COMPUTER_NOT_WORKING",
          "PROJECTOR_NOT_WORKING",
          "CCTV_NOT_WORKING",
          "PROJECTOR",
          "WIFI_NETWORK",
          "LAB_EQUIPMENT",

          // Fine-Grained & Legacy Cleanliness & Waste
          "GARBAGE_OVERFLOW",
          "CLEANING_REQUIRED",
          "WASTE_DISPOSAL",
          "PEST_ISSUE",
          "CLEANLINESS",
          "GARBAGE",

          // Fine-Grained & Legacy Safety & Security
          "BROKEN_RAILING",
          "FIRE_SAFETY_ISSUE",
          "EMERGENCY_EXIT_ISSUE",
          "DANGEROUS_WIRING",
          "SECURITY_ISSUE",

          // Fine-Grained & Legacy Lift & Mechanical
          "LIFT_NOT_WORKING",
          "LIFT_DOOR_ISSUE",
          "GENERATOR_ISSUE",
          "WATER_PUMP_ISSUE",
          "MOTOR_ISSUE",

          // Fine-Grained & Legacy Outdoor & Campus
          "ROAD_DAMAGE",
          "PARKING_ISSUE",
          "STREET_LIGHT_ISSUE",
          "DRAINAGE_ISSUE",
          "GARDEN_ISSUE",
          "CAMPUS_SIGNBOARD_DAMAGE",
          "POTHOLE",
          "ROAD_CRACK",
          "STREETLIGHT",
          "SPORTS_FACILITY",

          // Fine-Grained & Legacy Other
          "OTHER_MAINTENANCE",
          "HOSTEL_ISSUE",
          "CANTEEN_ISSUE",
          "LIBRARY_ISSUE",
          "OTHER"
        ],
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
      enum: [
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
      ],
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