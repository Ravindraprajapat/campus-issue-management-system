import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  FileText,
  Search,
  MapPin,
  Sun,
  Menu,
  X,
  LogOut,
  Users
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { userData } = useSelector((state) => state.user);
  const firstLetter = userData?.name?.charAt(0)?.toUpperCase();
  const role = userData?.role;

  /* ================= ROLE BASED NAV ITEMS ================= */

  let navItems = [];

  if (role === "admin") {
    navItems = [
      { name: "Dashboard", icon: FileText, path: "/admin/issues" },
      { name: "Campus Map", icon: MapPin, path: "/admin/map" },
      { name: "Maintenance Staff", icon: Users, path: "/admin/officers" }
    ];
  } else if (role === "officer") {
    navItems = [
      { name: "Assigned Building Map", icon: MapPin, path: "/officer/map" },
      { name: "Maintenance Issues", icon: FileText, path: "/officer/issues" }
    ];
  } else {
    // user OR not logged in
    navItems = [
      { name: "Home", icon: Home, path: "/" },
      { name: "Report an Issue", icon: FileText, path: "/report" },
      { name: "Track Status", icon: Search, path: "/track-status" },
      { name: "Campus Map", icon: MapPin, path: "/city-map" }
    ];
  }

  /* ================= PROTECTED PATHS ================= */

  const protectedPaths = ["/report", "/city-map", "/track-status", "/admin/issues", "/admin/officers", "/admin/map", "/officer/map", "/officer/issues"];

  const handleNavigation = (path) => {
    if (!userData && protectedPaths.includes(path)) {
      navigate("/signin");
    } else {
      navigate(path);
    }
  };

  const handleLogout = (e) => {
    e.stopPropagation();
    setProfileOpen(false);
    navigate("/signin");
  };

  return (
    <div className="fixed top-0 left-0 w-full z-[100]">
      {/* TOP INFO BAR */}
      <div className="bg-blue-600 text-white text-xs md:text-sm py-2 text-center font-medium">
        🎓 PARUL UNIVERSITY – Campus Issue Registration & Maintenance Management System 🎓
      </div>

      {/* NAVBAR */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white border-b border-gray-100"
      >
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">

          {/* LOGO */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold">
              PU
            </div>
            <div className="leading-none">
              <div className="font-bold text-lg text-slate-900">
                Faultline AI
              </div>
              <div className="text-slate-400 text-[10px] tracking-widest uppercase">
                Parul University
              </div>
            </div>
          </div>

          {/* DESKTOP NAV */}
          <ul className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full
                    text-sm font-medium transition cursor-pointer
                    ${
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    }
                  `}
                >
                  <item.icon size={16} />
                  {item.name}
                </button>
              );
            })}
          </ul>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-3 relative">

            <button className="hidden md:flex p-2 hover:bg-slate-100 rounded-full cursor-pointer">
              <Sun size={18} className="text-slate-500" />
            </button>

            {!userData ? (
              <button
                onClick={() => navigate("/signin")}
                className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Login
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen(!profileOpen);
                  }}
                  className="w-9 h-9 rounded-full bg-sky-500 text-white flex items-center justify-center font-semibold cursor-pointer"
                >
                  {firstLetter}
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
                    >
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 flex items-center gap-2 text-sm text-red-600 hover:bg-gray-50 cursor-pointer"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* MOBILE NAV */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-gray-100 bg-white"
            >
              <div className="flex flex-col p-4 gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      handleNavigation(item.path);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <item.icon size={16} />
                    {item.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
};

export default Navbar;