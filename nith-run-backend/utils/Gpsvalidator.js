/* utils/gpsValidator.js
   Validates GPS trails to prevent cheating.
   All checks are server-side so they can't be bypassed from the frontend.
*/

/* ── NIT Hamirpur Ground Boundary ──────────────────────────────────────────
   Real GPS coordinates of the NIT Hamirpur ground perimeter.
   Traced clockwise from Google Maps — 18 points for high precision.
   Format: [ [lat, lng], [lat, lng], ... ] — a closed polygon.
*/
const GROUND_BOUNDARY = [
    [31.705705, 76.524952],
    [31.706033, 76.525269],
    [31.706310, 76.525478],
    [31.706313, 76.525474],
    [31.706638, 76.525678],
    [31.706788, 76.525446],
    [31.706883, 76.525161],
    [31.706976, 76.524880],
    [31.706812, 76.524743],
    [31.706566, 76.524514],
    [31.706344, 76.524293],
    [31.706241, 76.524213],
    [31.706177, 76.524318],
    [31.705893, 76.524137],
    [31.705842, 76.524161],
    [31.705698, 76.524073],
    [31.705381, 76.524402],
    [31.705213, 76.524607],
    [31.705705, 76.524952], // close the polygon — back to start
  ];
  
  const LAP_DISTANCE_M   = 400;    // one lap = ~400 metres
  const MIN_LAP_SEC      = 60;     // no lap faster than 60 seconds (unrealistic)
  const MAX_SPEED_KMH    = 25;     // no human runs faster than 25 km/h sustained
  const MAX_SPEED_MS     = MAX_SPEED_KMH / 3.6;
  const TOLERANCE_FACTOR = 0.25;   // allow 25% variation in lap distance
  
  /* Haversine distance between two GPS points in metres */
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  
  /* Point-in-polygon (ray casting) — checks if a point is inside the ground */
  function pointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > lng) !== (yj > lng)) &&
                        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  
  /* Total trail distance in metres */
  function trailDistance(gpsTrail) {
    let total = 0;
    for (let i = 1; i < gpsTrail.length; i++) {
      total += haversine(
        gpsTrail[i-1].lat, gpsTrail[i-1].lng,
        gpsTrail[i].lat,   gpsTrail[i].lng
      );
    }
    return total;
  }
  
  /* Check max speed between any two consecutive points */
  function maxSpeedCheck(gpsTrail) {
    for (let i = 1; i < gpsTrail.length; i++) {
      const dist = haversine(
        gpsTrail[i-1].lat, gpsTrail[i-1].lng,
        gpsTrail[i].lat,   gpsTrail[i].lng
      );
      const timeSec = (gpsTrail[i].timestamp - gpsTrail[i-1].timestamp) / 1000;
      if (timeSec <= 0) continue;
      const speed = dist / timeSec; // metres/sec
      if (speed > MAX_SPEED_MS) return false;
    }
    return true;
  }
  
  /* Check that majority of points are inside the ground boundary */
  function onGroundCheck(gpsTrail) {
    if (!gpsTrail.length) return false;
    const insideCount = gpsTrail.filter(p =>
      pointInPolygon(p.lat, p.lng, GROUND_BOUNDARY)
    ).length;
    return (insideCount / gpsTrail.length) >= 0.8; // 80%+ of points must be on ground
  }
  
  /* Main validation function — returns { valid, reason } */
  function validateRun({ laps, durationSec, gpsTrail, splits }) {
  
    // 1. Must have GPS data
    if (!gpsTrail || gpsTrail.length < 10) {
      return { valid: false, reason: 'Insufficient GPS data' };
    }
  
    // 2. Distance must roughly match claimed laps
    const totalDistM = trailDistance(gpsTrail);
    const expectedDistM = laps * LAP_DISTANCE_M;
    const minDist = expectedDistM * (1 - TOLERANCE_FACTOR);
    const maxDist = expectedDistM * (1 + TOLERANCE_FACTOR);
    if (totalDistM < minDist || totalDistM > maxDist) {
      return { valid: false, reason: `Distance mismatch: GPS shows ${Math.round(totalDistM)}m, claimed ${expectedDistM}m` };
    }
  
    // 3. No lap faster than minimum
    if (splits && splits.length) {
      const fastLap = splits.find(s => s.durationSec < MIN_LAP_SEC);
      if (fastLap) {
        return { valid: false, reason: `Lap ${fastLap.lapNumber} too fast: ${fastLap.durationSec}s` };
      }
    }
  
    // 4. Speed check
    if (!maxSpeedCheck(gpsTrail)) {
      return { valid: false, reason: 'Unrealistic speed detected in GPS trace' };
    }
  
    // 5. Must be on the actual ground
    if (!onGroundCheck(gpsTrail)) {
      return { valid: false, reason: 'GPS trail not on NIT Hamirpur ground' };
    }
  
    return { valid: true, reason: null };
  }
  
  module.exports = { validateRun, haversine, trailDistance };