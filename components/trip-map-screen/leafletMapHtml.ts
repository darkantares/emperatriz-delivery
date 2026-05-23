// Existing Leaflet map HTML — preserved as-is during refactor
export const LEAFLET_MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-marker { text-align: center; }
    .custom-marker div { display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var routePolylines = [];
    var courierMarker = null;
    var traveledPolyline = null;
    var waypointMarkers = [];

    function handleMessage(data) {
      var msg = typeof data === 'string' ? JSON.parse(data) : data;
      switch(msg.type) {
        case 'INIT_ROUTE':
          // Clear existing
          routePolylines.forEach(function(l) { map.removeLayer(l); });
          routePolylines = [];
          if (traveledPolyline) { map.removeLayer(traveledPolyline); traveledPolyline = null; }
          waypointMarkers.forEach(function(m) { map.removeLayer(m); });
          waypointMarkers = [];

          // Draw route segments
          msg.segmentCoordinates.forEach(function(seg, i) {
            var latlngs = seg.map(function(c) { return [c[0], c[1]]; });
            var polyline = L.polyline(latlngs, { color: '#2196F3', weight: 4, opacity: 0.7 }).addTo(map);
            routePolylines.push(polyline);
          });

          // Add waypoint markers
          var bounds = L.latLngBounds();
          msg.waypoints.forEach(function(wp, i) {
            if (!wp.latitude || !wp.longitude) return;
            var latlng = [wp.latitude, wp.longitude];
            bounds.extend(latlng);
            var color = wp.isFirstInRoute ? '#4CAF50' : wp.isLastInRoute ? '#F44336' : '#FF9800';
            var icon = L.divIcon({
              className: 'custom-marker',
              html: '<div style="width:32px;height:32px;border-radius:50%;background:'+color+';color:#fff;font-weight:bold;font-size:14px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)">' + wp.count + '</div>',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            var marker = L.marker(latlng, { icon: icon }).addTo(map);
            marker.on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_CLICK', deliveryId: wp.deliveryId }));
            });
            waypointMarkers.push(marker);
          });
          map.fitBounds(bounds, { padding: [40, 40] });
          break;

        case 'UPDATE_POSITION':
          if (courierMarker) {
            courierMarker.setLatLng([msg.latitude, msg.longitude]);
          } else {
            var icon = L.divIcon({
              className: 'custom-marker',
              html: '<div style="width:24px;height:24px;border-radius:50%;background:#2196F3;border:3px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            courierMarker = L.marker([msg.latitude, msg.longitude], { icon: icon }).addTo(map);
          }
          break;

        case 'SET_VIEW':
          map.setView([msg.latitude, msg.longitude], msg.zoom || 15);
          break;

        case 'UPDATE_TRAVELED':
          if (traveledPolyline) { map.removeLayer(traveledPolyline); }
          var latlngs = msg.traveledCoords.map(function(c) { return [c[0], c[1]]; });
          traveledPolyline = L.polyline(latlngs, { color: '#4CAF50', weight: 5, opacity: 0.9 }).addTo(map);
          break;

        case 'UPDATE_TARGET':
          waypointMarkers.forEach(function(m, i) {
            if (i === msg.groupIndex) {
              m.setZIndexOffset(1000);
            } else {
              m.setZIndexOffset(0);
            }
          });
          break;

        default:
          break;
      }
    }

    // Notify React that map is ready
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
  </script>
</body>
</html>
`;
