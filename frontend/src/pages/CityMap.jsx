import React, { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import axios from "axios";
import { serverUrl } from "../App";
import Navbar from "../components/Navbar";
import { Filter, Locate, RefreshCw, AlertTriangle } from "lucide-react";
import "leaflet/dist/leaflet.css";

/* ---------------- FIX MARKER ICON ---------------- */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png"
});

/* ---------------- FORCE MAP RESIZE FIX ---------------- */
function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map && map._container && typeof map.invalidateSize === 'function') {
        try {
          map.invalidateSize();
        } catch (e) {
          console.warn('ResizeMap invalidateSize suppressed:', e);
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/* ---------------- FIT MAP BOUNDS TO MARKERS ---------------- */
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !map._container) return;
    try {
      if (points && points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
      }
    } catch (e) {
      console.warn("FitBounds error:", e);
    }
  }, [points, map]);
  return null;
}

const CityMap = () => {
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const [filters, setFilters] = useState({
    category: "All",
    status: "All",
    severity: "All"
  });

  const fetchReports = async () => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      const { data } = await axios.get(`${serverUrl}/report/report-submit/reports`, {
        withCredentials: true
      });
      const repList = data.reports || [];
      setReports(repList);
    } catch (e) {
      console.error("CAMPUS MAP REPORT FETCH ERROR:", e);
      setReportsError("Unable to load campus reports.");
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  /* ---------------- FILTER REPORTS ACROSS CAMPUS ---------------- */
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Category filter (detectedType)
      if (filters.category !== "All") {
        const cat = r.aiAnalysis?.detectedType || "";
        if (cat.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }
      // Status filter
      if (filters.status !== "All") {
        const statusMap = {
          Pending: "PENDING",
          "In Progress": "IN_PROGRESS",
          Resolved: "RESOLVED"
        };
        const expectedStatus = statusMap[filters.status] || filters.status.toUpperCase();
        if (r.status !== expectedStatus) {
          return false;
        }
      }
      // Severity filter
      if (filters.severity !== "All") {
        const priority = r.priorityLevel || "";
        if (priority.toUpperCase() !== filters.severity.toUpperCase()) {
          return false;
        }
      }
      return true;
    });
  }, [reports, filters]);

  /* ---------------- GEOLOCATION ---------------- */
  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);
      },
      () => alert("Location permission denied")
    );
  };

  const validReportPoints = useMemo(() => {
    return filteredReports
      .filter(r => r.location?.latitude && r.location?.longitude)
      .map(r => [r.location.latitude, r.location.longitude]);
  }, [filteredReports]);

  return (
    <>
      <Navbar />

      <div className="pt-[120px] min-h-screen bg-gradient-to-b from-sky-50 via-white to-white pb-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-6">

          {/* FILTER PANEL */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full md:w-72 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-sky-500" />
                <h3 className="font-semibold text-slate-800">Campus Filters</h3>
              </div>
              <button
                onClick={fetchReports}
                disabled={loadingReports}
                className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                <RefreshCw size={12} className={loadingReports ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {["category", "status", "severity"].map(type => (
              <div className="mb-4" key={type}>
                <label className="text-sm font-medium text-slate-600 capitalize">
                  {type}
                </label>
                <select
                  className="mt-2 w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-400 text-sm"
                  value={filters[type]}
                  onChange={e =>
                    setFilters({ ...filters, [type]: e.target.value })
                  }
                >
                  <option>All</option>
                  {type === "category" && (
                    <>
                      <option value="FAN">Fan</option>
                      <option value="LIGHT">Light</option>
                      <option value="PROJECTOR">Projector</option>
                      <option value="PLUG_SOCKET">Plug / Socket</option>
                      <option value="BENCH">Bench</option>
                      <option value="CHAIR">Chair</option>
                      <option value="DOOR">Door</option>
                      <option value="WINDOW">Window</option>
                      <option value="AC">AC</option>
                      <option value="WATER_LEAK">Water Leak</option>
                      <option value="WASHROOM">Washroom</option>
                      <option value="CLEANLINESS">Cleanliness</option>
                      <option value="WIFI_NETWORK">Wi-Fi / Network</option>
                      <option value="ELECTRICAL">Electrical</option>
                    </>
                  )}
                  {type === "status" && (
                    <>
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                    </>
                  )}
                  {type === "severity" && (
                    <>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </>
                  )}
                </select>
              </div>
            ))}

            <button
              onClick={detectLocation}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg transition text-sm font-medium cursor-pointer"
            >
              <Locate size={16} />
              Detect My Location
            </button>
          </motion.div>

          {/* MAP SECTION */}
          <div className="flex-1">
            <div className="h-[650px] w-full rounded-2xl overflow-hidden shadow-md border border-slate-100 relative">

              {/* OVERLAY BANNER */}
              {loadingReports ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-sky-500" />
                  Loading campus issue map...
                </div>
              ) : reportsError ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 text-red-700 px-4 py-2 rounded-xl shadow-md border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  {reportsError}
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-600">
                  No campus issues found matching selected filters.
                </div>
              ) : null}

              <MapContainer
                center={[22.2887, 73.3634]}
                zoom={15}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <ResizeMap />
                <FitBounds points={validReportPoints} />

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* User Geolocation Marker */}
                {userLocation && (
                  <>
                    <Marker position={userLocation}>
                      <Popup>You are here 📍</Popup>
                    </Marker>

                    <Circle
                      center={userLocation}
                      radius={300}
                      pathOptions={{ color: "#0EA5E9" }}
                    />
                  </>
                )}

                {/* Real Campus Report Markers */}
                {filteredReports.map(r => {
                  if (!r.location?.latitude || !r.location?.longitude) return null;
                  return (
                    <Marker
                      key={r._id}
                      position={[r.location.latitude, r.location.longitude]}
                    >
                      <Popup minWidth={220}>
                        <div className="p-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 border-b pb-1">
                            <strong className="text-slate-800 text-sm">
                              {r.aiAnalysis?.detectedType?.replace(/_/g, ' ') || "Campus Issue"}
                            </strong>
                            <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold">
                              {r.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                            <p><strong>Issue ID:</strong> {r._id}</p>
                            <p><strong>Building:</strong> {r.location?.building || "Parul University"}</p>
                            {r.location?.room && <p><strong>Room:</strong> {r.location.room}</p>}
                            <p><strong>Priority:</strong> {r.priorityLevel || r.severityScore || "N/A"}</p>
                            <p><strong>Location:</strong> {r.location?.address || `${r.location?.latitude?.toFixed(4)}, ${r.location?.longitude?.toFixed(4)}`}</p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

              </MapContainer>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CityMap;