import React from "react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  Zap,
  Search,
  Trash2,
  MapPin,
  FileCheck,
  CheckCircle
} from "lucide-react";

/* ================== ANIMATION ================== */

const containerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

/* ================== STAT CARD ================== */

const StatCard = ({ count, label, icon: Icon, subtle }) => (
  <motion.div
    variants={fadeUp}
    whileHover={{ y: -8, scale: 1.03 }}
    className="
      bg-white rounded-2xl
      border border-gray-100
      shadow-sm hover:shadow-xl
      p-6 flex items-center gap-4
      transition-all duration-300
    "
  >
    <div
      className={`
        w-14 h-14 rounded-xl
        flex items-center justify-center
        ${subtle ? "bg-gray-100" : "bg-sky-100"}
      `}
    >
      <Icon size={24} className={subtle ? "text-gray-500" : "text-sky-600"} />
    </div>

    <div>
      <div className="text-3xl font-bold text-slate-900">{count}</div>
      <div className="text-sm text-slate-500 font-medium">{label}</div>
    </div>
  </motion.div>
);

/* ================== FEATURE CARD ================== */

const FeatureCard = ({ title, desc }) => (
  <motion.div
    variants={fadeUp}
    className="flex gap-4"
  >
    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
      <CheckCircle className="text-sky-600" size={22} />
    </div>

    <div>
      <h3 className="font-semibold text-lg text-slate-900 mb-2">
        {title}
      </h3>
      <p className="text-slate-500 text-sm leading-relaxed">
        {desc}
      </p>
    </div>
  </motion.div>
);

/* ================== DASHBOARD ================== */

const UserDashBoard = () => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <motion.main
        initial="hidden"
        animate="visible"
        variants={containerVariant}
        className="pt-[140px] pb-24 w-full"
      >
        <div className="w-full px-6 md:px-12 lg:px-20">

          {/* HERO */}
          <motion.div variants={fadeUp} className="text-center mb-28">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              UniFix AI
              <span className="block text-sky-500 text-2xl md:text-4xl mt-3 font-semibold">
                Smart Campus Infrastructure Management
              </span>
            </h1>

            <p className="text-lg text-slate-500 max-w-3xl mx-auto mb-12">
              AI-powered campus maintenance platform for reporting, verifying, routing, assigning, and tracking infrastructure issues.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  userData ? navigate("/report") : navigate("/signin")
                }
                className="bg-sky-500 text-white px-10 py-3 rounded-xl font-semibold shadow-lg cursor-pointer"
              >
                {userData ? "Report an Issue →" : "Login to Report →"}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/track-status")}
                className="bg-white border border-gray-200 px-10 py-3 rounded-xl font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Track Status
              </motion.button>
            </div>
          </motion.div>

          {/* STATS SECTION */}
          <motion.div
            variants={containerVariant}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-32"
          >
            <StatCard count="28" label="Classroom Fan Issues" icon={Zap} />
            <StatCard count="19" label="Light & Electrical" icon={AlertTriangle} />
            <StatCard count="14" label="Damaged Benches & Chairs" icon={Search} />
            <StatCard count="22" label="Washroom & Water Leakage" icon={Trash2} />
            <StatCard count="9" label="Wi-Fi & Network Equipment" icon={MapPin} subtle />
            <StatCard count="184" label="Total Issues Resolved" icon={FileCheck} subtle />
          </motion.div>

          {/* SMART AI INFO SECTION */}
          <motion.div variants={containerVariant} className="text-center mb-16">
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-6"
            >
              Smart Campus Maintenance AI
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-slate-500 max-w-3xl mx-auto mb-16"
            >
              Gemini AI verifies uploaded photos to establish valid visual evidence of university infrastructure issues, preventing false reports and ensuring maintenance teams focus on critical repairs.
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-left">
              <FeatureCard
                title="Automated Visual Verification"
                desc="AI scans uploaded images to ensure visible evidence of damaged university property (fans, lights, benches, AC, leaks) before submitting."
              />
              <FeatureCard
                title="Building & Room Selection"
                desc="Identifies university building and allows manual classroom selection so staff know exact repair locations."
              />
              <FeatureCard
                title="Verified Staff Resolution"
                desc="Maintenance staff must verify location proximity within 50 meters of the reported issue before marking resolved."
              />
            </div>
          </motion.div>

        </div>
      </motion.main>
    </div>
  );
};

export default UserDashBoard;