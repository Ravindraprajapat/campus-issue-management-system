import React, { useState } from "react";
import { motion } from "framer-motion";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import { serverUrl } from "../App";

const ForgetPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${serverUrl}/api/auth/send-otp`,
        { email },
        { withCredentials: true }
      );
      setError("");
      setStep(2);
    } catch (error) {
      setError(error?.response?.data?.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${serverUrl}/api/auth/verify-otp`,
        { email, otp },
        { withCredentials: true }
      );
      setError("");
      setStep(3);
    } catch (error) {
      setError(error?.response?.data?.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${serverUrl}/api/auth/reset-password`,
        { email, newPassword },
        { withCredentials: true }
      );
      navigate("/signin");
    } catch (error) {
      setError(error?.response?.data?.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-sky-200"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <IoIosArrowRoundBack
            size={30}
            className="text-sky-500 cursor-pointer"
            onClick={() => navigate("/signin")}
          />
          <h1 className="text-2xl font-bold text-sky-500">
            Forgot Password
          </h1>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <label className="block text-gray-700 font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full border border-sky-200 rounded-lg px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="mt-5 w-full bg-sky-500 hover:bg-sky-600
                         text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? <ClipLoader size={20} color="white" /> : "Send OTP"}
            </button>
          </motion.div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <label className="block text-gray-700 font-medium mb-1">
              OTP
            </label>
            <input
              type="text"
              className="w-full border border-sky-200 rounded-lg px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="mt-5 w-full bg-sky-500 hover:bg-sky-600
                         text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? <ClipLoader size={20} color="white" /> : "Verify OTP"}
            </button>
          </motion.div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <label className="block text-gray-700 font-medium mb-1">
              New Password
            </label>
            <input
              type="password"
              className="w-full border border-sky-200 rounded-lg px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <label className="block text-gray-700 font-medium mb-1 mt-4">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full border border-sky-200 rounded-lg px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="mt-5 w-full bg-sky-500 hover:bg-sky-600
                         text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? (
                <ClipLoader size={20} color="white" />
              ) : (
                "Reset Password"
              )}
            </button>
          </motion.div>
        )}

        {err && (
          <p className="text-red-500 text-center mt-4 text-sm">
            *{err}
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default ForgetPassword;



