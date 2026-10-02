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
  'https://campus-issue-management-system-wine.vercel.app',
  'https://faultline-ai-xi.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  next()
})

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      return callback(null, origin)
    },
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
