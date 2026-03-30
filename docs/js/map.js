/* js/map.js — Leaflet.js OpenStreetMap integration
   Real map of NIT Hamirpur ground with:
   - Ground boundary polygon
   - Live GPS runner marker
   - Strava-style trail polyline
*/

const MapView = (() => {

    let map = null;
    let runnerMarker = null;
    let trailPolyline = null;
    let boundaryPolygon = null;
    let trailPoints = [];
    let initialized = false;
  
    /* Real NIT Hamirpur ground boundary coordinates */
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
    ];
  
    /* Center of the ground */
    const CENTER = [31.706095, 76.524876];
  
    function init() {
      if (initialized) return;
      if (!document.getElementById('leaflet-map')) return;
  
      /* Create map centered on NIT Hamirpur ground */
      map = L.map('leaflet-map', {
        center: CENTER,
        zoom: 18,
        zoomControl: false,
        attributionControl: false,
      });
  
      /* OpenStreetMap tile layer */
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
      }).addTo(map);
  
      /* Draw ground boundary polygon */
      boundaryPolygon = L.polygon(GROUND_BOUNDARY, {
        color: '#6db36d',
        weight: 2,
        fillColor: '#6db36d',
        fillOpacity: 0.1,
        dashArray: '6 4',
      }).addTo(map);
  
      /* Start/Finish marker */
      const startIcon = L.divIcon({
        className: '',
        html: '<div style="background:#e8b84b;color:#0a140a;font-family:Barlow Condensed,sans-serif;font-size:10px;font-weight:700;padding:3px 6px;border-radius:4px;white-space:nowrap;letter-spacing:1px;">START</div>',
        iconAnchor: [20, 10],
      });
      L.marker([31.705705, 76.524952], { icon: startIcon }).addTo(map);
  
      /* Runner marker (red dot) */
      const runnerIcon = L.divIcon({
        className: '',
        html: '<div id="map-runner-dot" style="width:16px;height:16px;background:#ff4d2e;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(255,77,46,0.6);"></div>',
        iconAnchor: [8, 8],
      });
      runnerMarker = L.marker(CENTER, { icon: runnerIcon }).addTo(map);
  
      /* Trail polyline */
      trailPolyline = L.polyline([], {
        color: '#ff4d2e',
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
  
      initialized = true;
    }
  
    /* Update runner position with real GPS coords */
    function updateRunner(lat, lng) {
      if (!map || !runnerMarker) return;
      const pos = [lat, lng];
      runnerMarker.setLatLng(pos);
      trailPoints.push(pos);
      trailPolyline.setLatLngs(trailPoints);
    }
  
    /* Clear trail for new run */
    function resetTrail() {
      trailPoints = [];
      if (trailPolyline) trailPolyline.setLatLngs([]);
      if (runnerMarker) runnerMarker.setLatLng(CENTER);
    }
  
    /* Replay a saved GPS trail (Strava-style) */
    function replayTrail(gpsTrail) {
      if (!map || !gpsTrail || gpsTrail.length < 2) return;
      resetTrail();
  
      let i = 0;
      const step = () => {
        if (i >= gpsTrail.length) return;
        const pos = [gpsTrail[i].lat, gpsTrail[i].lng];
        trailPoints.push(pos);
        trailPolyline.setLatLngs(trailPoints);
        runnerMarker.setLatLng(pos);
        i++;
        const delay = i < gpsTrail.length
          ? Math.min((gpsTrail[i].timestamp - gpsTrail[i-1].timestamp) / 20, 80)
          : 0;
        setTimeout(step, delay);
      };
      step();
      showToast('Replaying your run trail!');
    }
  
    /* Force map to re-render when tab becomes visible */
    function invalidate() {
      if (map) setTimeout(() => map.invalidateSize(), 100);
    }
  
    return { init, updateRunner, resetTrail, replayTrail, invalidate };
  })();