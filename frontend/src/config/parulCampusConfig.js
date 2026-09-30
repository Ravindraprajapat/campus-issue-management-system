/**
 * Parul University Campus Location Configuration (Frontend)
 * Source of Truth: Official Parul University Campus Map
 */

export const PARUL_CAMPUS_BUILDINGS = [
  // Academic Blocks
  "A1 — Parul Institute of Engineering & Technology",
  "A2 — Parul Institute of Engineering & Technology (Diploma Studies) and HR Administration",
  "A3 — Parul Institute of Engineering & Technology (D Block)",
  "A4 — Parul Institute of Pharmacy",
  "A5 — Parul Institute of Engineering & Technology (Diploma Studies) and Gymnasium",
  "A6 — Parul Institute of Nursing",
  "A7 — Jawaharlal Nehru Homoeopathic Medical College and Parul Institute of Physiotherapy",
  "A8 — Parul Institute of Pharmacy & Research",
  "A9 — Parul Polytechnic Institute",
  "A10 — School of Pharmacy",
  "A11 — Medical Library & Insights-Centre for Counselling and Psychological Support",
  "A12 — Parul Institute of Medical Sciences & Research / Parul Institute of Public Health / Parul Institute of Paramedical & Health Sciences / Armed Forces Motivation Cell / Symphony Hall",
  "A13 — Parul Institute of Ayurved",
  "A14 — Parul Institute of Business Administration",
  "A15 — Faculty of Management Studies",
  "A16 — Parul Institute of Architecture & Research and Parul Institute of Physiotherapy & Research",
  "A17 — Parul Institute of Homoeopathy & Research",
  "A18 — Parul Institute of Ayurved & Research",
  "A19 — Parul Institute of Technology and Parul Institute of Hotel Management & Catering Technology",
  "A20 — Engineering Workshop",
  "A21 — Parul Institute of Applied Sciences and Parul Institute of Pharmaceutical Education & Research",
  "A22 — Parul Institute of Design / Parul Institute of Fine Arts / Parul Institute of Performing Arts",
  "A23 — Subhash Chandra Bose Bhawan (Parul Institute of Law, Parul Institute of Commerce, Parul Institute of Arts, College of Agriculture, Parul Institute of Social Work, Institute of Pharmaceutical Sciences, Centre for Continuing Education and Online Learning, Competitive Exam Cell, Center for Human Resource Development, Estate and Maintenance Department)",
  "A24 — Bhagat Singh Bhawan (Parul Institute of Computer Application, Parul Institute of Engineering & Technology, Office of Director Academics)",
  "A25 — C.V. Raman Centre (A Centre of Excellence for Advanced Computational Skills & Research)",
 " A26 — Lakshya 2047 Building (Centre for Future Skills)",

  // Administrative Blocks
  "C1 — Student Section",
  "C2 — Admission Cell",
  "C3 — Centre of International Relations & Research",
  "C4 — HR & Administration",
  "C5 — Office of the Hostel Superintendent & Chief Rector",

  // Hospitals
  "E1 — Parul Ayurved Hospital",
  "E2 — Parul Sevashram Hospital",
  "E3 — Khemdas Ayurved Hospital",
  "E4 — Parul Institute of Homoeopathy & Research Hospital",
  "E5 — Jawaharlal Nehru Homoeopathic Medical College Hospital",

  // Hostels
  "H1 — Shastri Bhawan - A",
  "H2 — Shastri Bhawan - B",
  "H3 — Shastri Bhawan - C",
  "H4 — Marie Curie Residence",
  "H5 — Sarojini Bhawan - A",
  "H6 — Sarojini Bhawan - B",
  "H7 — Sarojini Bhawan - C",
  "H8 — Indira Bhawan - A",
  "H9 — Indira Bhawan - B",
  "H10 — Indira Bhawan - C",
  "H11 — Albert Einstein Residence",
  "H12 — Kalam Bhawan - A",
  "H13 — Kalam Bhawan - B",
  "H14 — Kalam Bhawan - C",
  "H15 — Tagore Bhawan - A",
  "H16 — Tagore Bhawan - B",
  "H17 — Dhyan Bhawan",
  "H18 — Janki Bhawan",
  "H19 — Teresa Bhawan - A",
  "H20 — Teresa Bhawan - B",
  "H21 — Teresa Bhawan - C",
  "H22 — Shakuntala Bhawan - A",
  "H23 — Shakuntala Bhawan - B",
  "H24 — Shakuntala Bhawan - C",
  "H25 — Atal Bhawan - A1",
  "H26 — Atal Bhawan - A2",
  "H27 — Milka Bhawan - A",
  "H28 — Kalpana Bhawan - A",
  "H29 — Kalpana Bhawan - B",
  "H30 — Sardar Bhawan - A",
  "H31 — Sardar Bhawan - B",
  "H32 — Atal Bhawan - B",
  "H33 — Tagore Bhawan - C",

  // Other Campus Locations
  "Food Court & Canteen",
  "B1 — Central Bank of India",
  "Transport Office",
  "Pick and Drop Point",
  "P1 — Visitor's Parking",
  "P2 — Staff 2-Wheeler Parking",
  "P3 — Student 2-Wheeler Parking",
  "P4 — Bus Parking",
  "P5 — Staff 4-Wheeler Parking",
  "P6 — Staff 4-Wheeler Parking",
  "P7 — Staff 4-Wheeler Parking",
  "P8 — Staff 4-Wheeler Parking",
  "Sports Complex / Sports Ground",
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "Security Office",
  "Temple",
  "Swimming Pool",
  "Staff Quarters",
  "Mess",
  "Sewage Treatment Plant",
  "PU's Equestrian Horse Riding Arena",
  "Main Campus Outdoor Area"
]

export const parulBuildings = PARUL_CAMPUS_BUILDINGS.map(name => ({ name }))

/**
 * Attempts to automatically detect a university building from GPS coordinates.
 * Returns building object or null if unmapped.
 */
export const detectBuildingFromCoords = (latitude, longitude) => {
  if (!latitude || !longitude || !parulBuildings.length) return null;

  for (const b of parulBuildings) {
    if (b.center) {
      const latDiff = Math.abs(b.center.latitude - latitude);
      const lngDiff = Math.abs(b.center.longitude - longitude);
      if (latDiff < 0.001 && lngDiff < 0.001) {
        return b;
      }
    }
  }

  return null;
};

/**
 * Attempts to automatically detect room from GPS coordinates.
 * Returns null if room-level mapping does not exist.
 */
export const detectRoomFromCoords = (latitude, longitude) => {
  return null;
};
