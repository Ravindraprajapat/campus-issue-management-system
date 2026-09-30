import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRouter from './routes/authRoute.js'
import userRouter from './routes/userRoute.js'
import reportRouter from './routes/reportRoute.js'
import adminRouter from './routes/adminRoute.js'



dotenv.config()
const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  'http://localhost:5173',
  'https://faultline-ai-xi.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
)

app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Faultline AI Backend is running"
  });
});

app.use('/api/auth', authRouter)
app.use('/api/user', userRouter)
app.use('/report/report-submit',reportRouter);
app.use('/api/admin', adminRouter);


app.listen(PORT, () => {
  connectDB()
  console.log(`Server is running at port ${PORT}...`)
})
