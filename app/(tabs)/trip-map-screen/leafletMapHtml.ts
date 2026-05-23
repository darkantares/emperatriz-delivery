export const LEAFLET_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #f0f2f5; }
    .wp-badge {
      position: absolute; top: -6px; right: -6px;
      background: #DC143C; border-radius: 10px; min-width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: white; font-weight: bold;
      border: 2px solid white; padding: 0 3px;
    }
    .courier-wrap { font-size: 22px; line-height: 1; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([18.4861, -69.9312], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: ''
    }).addTo(map);

    var segmentLines = [], traveledLine = null, courierMarker = null;
    var wpMarkers = [], wpData = [];
    var courierVisible = true, wpVisible = true;

    function sendMsg(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function makeStarIcon(wp) {
      var color = wp.type === 'PICKUP' ? '#2E7D32' : '#C62828';
      var w = 52, h = 52, cx = 26, cy = 26, outerR = 23, innerR = 9;
      var pts = [];
      for (var i = 0; i < 10; i++) {
        var angle = (i * Math.PI / 5) - Math.PI / 2;
        var r = (i % 2 === 0) ? outerR : innerR;
        pts.push((cx + r * Math.cos(angle)).toFixed(2) + ',' + (cy + r * Math.sin(angle)).toFixed(2));
      }
      var glowId = 'glow_' + Math.floor(Math.random() * 99999);
      var fontSize = wp.count > 9 ? 11 : 13;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
        + '<defs><filter id="' + glowId + '" x="-40%" y="-40%" width="180%" height="180%">'
        + '<feGaussianBlur stdDeviation="3" result="blur"/>'
        + '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'
        + '</filter></defs>'
        + '<polygon points="' + pts.join(' ') + '" fill="' + color + '" stroke="white" stroke-width="2.5" filter="url(#' + glowId + ')"/>';
      if (wp.count > 1) {
        svg += '<text x="' + cx + '" y="' + (cy + Math.round(fontSize * 0.38)) + '" text-anchor="middle" fill="white" font-size="' + fontSize + '" font-weight="bold" font-family="Arial,sans-serif">' + wp.count + '</text>';
      }
      svg += '</svg>';
      var html = '<div style="position:relative;display:inline-block;">' + svg + '</div>';
      return L.divIcon({ html: html, className: '', iconSize: [w, h], iconAnchor: [cx, cy] });
    }

    function makeWpIcon(wp, isTarget, orderNum) {
      if (isTarget) return makeStarIcon(wp);
      var color = wp.type === 'PICKUP' ? '#2E7D32' : '#C62828';
      var w = 28;
      var h = Math.round(w * 1.4);
      var r = Math.round(w * 0.3);
      var cx = w / 2, cy = w / 2;
      var fontSize = orderNum > 9 ? Math.round(r * 0.75) : Math.round(r * 0.95);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
        + '<path d="M' + cx + ' 0 C' + (cx - w/2) + ' 0 0 ' + (w/2) + ' 0 ' + cy
        + ' C0 ' + (cy + w * 0.45) + ' ' + cx + ' ' + h + ' ' + cx + ' ' + h
        + ' C' + cx + ' ' + h + ' ' + w + ' ' + (cy + w * 0.45) + ' ' + w + ' ' + cy
        + ' C' + w + ' ' + (w/2) + ' ' + (cx + w/2) + ' 0 ' + cx + ' 0Z" fill="' + color + '"/>'
        + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="white"/>'
        + '<text x="' + cx + '" y="' + (cy + Math.round(fontSize * 0.38)) + '" text-anchor="middle" fill="#000000" font-size="' + fontSize + '" font-weight="bold" font-family="Arial,sans-serif">' + orderNum + '</text>'
        + '</svg>';
      var html = '<div style="position:relative;display:inline-block;">' + svg;
      if (wp.count > 1) html += '<div class="wp-badge">' + wp.count + '</div>';
      html += '</div>';
      return L.divIcon({ html: html, className: '', iconSize: [w, h], iconAnchor: [w / 2, h] });
    }

    function initRoute(segmentCoords, waypoints, targetIdx) {
      segmentLines.forEach(function(l) { map.removeLayer(l); });
      segmentLines = [];
      if (traveledLine) { map.removeLayer(traveledLine); traveledLine = null; }
      wpMarkers.forEach(function(m) { map.removeLayer(m); });
      wpMarkers = []; wpData = waypoints;

      if (segmentCoords.length > 0) {
        var allCoords = [];
        segmentCoords.forEach(function(seg, i) {
          var color = (i === targetIdx) ? '#00BFFF' : '#A0A0A0';
          var line = L.polyline(seg, { color: color, weight: 5, opacity: (i === targetIdx) ? 1 : 0.6 }).addTo(map);
          segmentLines.push(line);
          allCoords = allCoords.concat(seg);
        });
        if (allCoords.length > 0) {
          map.fitBounds(L.polyline(allCoords).getBounds(), { padding: [40, 40] });
        }
      }

      waypoints.forEach(function(wp, i) {
        var m = L.marker([wp.latitude, wp.longitude], {
          icon: makeWpIcon(wp, i === targetIdx, i + 1),
          zIndexOffset: i === targetIdx ? 1000 : 0
        });
        m.on('click', function() { sendMsg({ type: 'MARKER_CLICK', groupIndex: i, deliveryId: wp.deliveryId }); });
        if (wpVisible) m.addTo(map);
        wpMarkers.push(m);
      });
    }

    function updatePosition(lat, lng) {
      var ll = [lat, lng];
      if (!courierMarker) {
        var icon = L.divIcon({ html: '<div class="courier-wrap">\uD83C\uDFCD\uFE0F</div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
        courierMarker = L.marker(ll, { icon: icon, zIndexOffset: 0 });
        if (courierVisible) courierMarker.addTo(map);
      } else {
        courierMarker.setLatLng(ll);
      }
    }

    function updateTraveled(coords) {
      if (traveledLine) map.removeLayer(traveledLine);
      if (coords.length > 1) {
        traveledLine = L.polyline(coords, { color: '#FFD700', weight: 5 }).addTo(map);
      }
    }

    function updateTarget(idx) {
      segmentLines.forEach(function(l, i) {
        l.setStyle({ color: (i === idx) ? '#00BFFF' : '#A0A0A0', opacity: (i === idx) ? 1 : 0.6 });
      });
      wpMarkers.forEach(function(m, i) {
        m.setIcon(makeWpIcon(wpData[i], i === idx, i + 1));
        m.setZIndexOffset(i === idx ? 1000 : 0);
      });
    }

    function setView(lat, lng, zoom) {
      map.setView([lat, lng], zoom !== undefined ? zoom : map.getZoom());
    }

    function updateVisibility(showCourier, showWaypoints) {
      courierVisible = showCourier;
      wpVisible = showWaypoints;
      if (courierMarker) {
        if (showCourier && !map.hasLayer(courierMarker)) map.addLayer(courierMarker);
        else if (!showCourier && map.hasLayer(courierMarker)) map.removeLayer(courierMarker);
      }
      wpMarkers.forEach(function(m) {
        if (showWaypoints && !map.hasLayer(m)) map.addLayer(m);
        else if (!showWaypoints && map.hasLayer(m)) map.removeLayer(m);
      });
    }

    function handleMessage(raw) {
      try {
        var msg = JSON.parse(raw);
        switch (msg.type) {
          case 'INIT_ROUTE':      initRoute(msg.segmentCoordinates, msg.waypoints, msg.targetGroupIndex); break;
          case 'UPDATE_POSITION': updatePosition(msg.latitude, msg.longitude); break;
          case 'UPDATE_TRAVELED': updateTraveled(msg.traveledCoords); break;
          case 'UPDATE_TARGET':   updateTarget(msg.groupIndex); break;
          case 'SET_VIEW':        setView(msg.latitude, msg.longitude, msg.zoom); break;
          case 'UPDATE_VISIBILITY': updateVisibility(msg.showCourier, msg.showWaypoints); break;
        }
      } catch(e) {}
    }

    document.addEventListener('message', function(e) { handleMessage(e.data); });
    window.addEventListener('message', function(e) { handleMessage(e.data); });
    sendMsg({ type: 'MAP_READY' });
  </script>
</body>
</html>`;
