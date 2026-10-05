import mongoose from "mongoose";
import dotenv from 'dotenv'
import { seedDefaultDepartmentsAndIssueTypes } from "../utils/dbSeed.js";
dotenv.config()

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