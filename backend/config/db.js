import mongoose from "mongoose";
import dotenv from 'dotenv'
import dns from 'dns'
import { seedDefaultDepartmentsAndIssueTypes } from "../utils/dbSeed.js";
dotenv.config()

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
} catch (e) {
  // Ignore if custom DNS cannot be set
}

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Mongo DB is Connect SuccessFully ")
        await seedDefaultDepartmentsAndIssueTypes()
    } catch (error) {
        console.log(error); 
    }
}

export default connectDB;