import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'
import fs from "fs"
dotenv.config()
const uploadOnCloudinary = async file => {
  cloudinary.config({
    cloud_name: process.env.MY_CLOUD_NAME,
    api_key: process.env.MY_API_KEY,
    api_secret:process.env.MY_CLOUD_SECRET
  })
  try {
    const result = await cloudinary.uploader.upload(file)
     fs.unlinkSync(file)
     return result.secure_url
  } catch (error) {
    fs.unlinkSync(file)
    console.log(error)
  }
}

export default uploadOnCloudinary
