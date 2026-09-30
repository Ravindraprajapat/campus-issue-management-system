/**
 * Parul University Campus Location Configuration
 * 
 * IMPORTANT:
 * DO NOT invent building names, room numbers, or coordinates.
 * This structure is provided for verified Parul University campus building & room data.
 * When real geospatial mapping data is provided, populate `parulBuildings` array below.
 */

export const parulBuildings = [
  // Example structure for verified data (uncomment and populate when real data is available):
  /*
  {
    id: "d_block",
    name: "D-Block",
    center: { latitude: 22.2887, longitude: 73.3634 },
    // Polygon bounds as [[lat, lng], [lat, lng], ...]
    bounds: null,
    rooms: ["D-Block 101", "D-Block 102", "D-Block 204"]
  }
  */
];

/**
 * Attempts to automatically detect a university building from GPS coordinates.
 * Returns building object or null if unmapped or unreliable.
 */
export const detectBuildingFromCoords = (latitude, longitude) => {
  if (!latitude || !longitude || !parulBuildings.length) return null;

  // If verified building polygons or point radius are added in parulBuildings:
  for (const b of parulBuildings) {
    if (b.bounds) {
      // Point in polygon check could go here if bounds exist
    } else if (b.center) {
      // Distance check within 100m if center exists
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
 * Returns room string or null if exact room mapping is unavailable.
 */
export const detectRoomFromCoords = (latitude, longitude) => {
  // GPS alone does not provide room-level precision without verified beacon/micro-location mapping.
  return null;
};
