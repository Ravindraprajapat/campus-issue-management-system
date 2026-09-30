// Utility for campus map geometry helpers
export async function fetchWardPolygon(name) {
  return null
}

export function geojsonToLatLngs(geojson) {
  if (!geojson) return null
  if (geojson.type === 'Polygon') {
    return geojson.coordinates[0].map(([lng, lat]) => [lat, lng])
  }
  if (geojson.type === 'MultiPolygon') {
    return geojson.coordinates.map(polygon =>
      polygon[0].map(([lng, lat]) => [lat, lng])
    )
  }
  return null
}
