import express from 'express'
import { isAuth } from '../middleware/isAuth.js';
import { upload } from '../middleware/multer.js';
import { createReport, getUserReports, verifyImage } from '../controllers/reportController.js';
const reportRouter = express.Router()
reportRouter.post("/verify-image", isAuth, upload.single("image"), verifyImage);
reportRouter.post("/report", isAuth, upload.single("image"), createReport);
reportRouter.get("/reports", isAuth, getUserReports);

export default reportRouter;