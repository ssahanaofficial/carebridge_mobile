/**
 * PatientLocationMap Component
 * Interactive map component supporting 2 km emergency radius precision,
 * separate GPS hardware accuracy indicators (Good <=50m, Caution 50-500m, Poor >500m),
 * real-time Firestore bed & ICU telemetry, and hospital selection.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import {
  MapPin,
  Crosshair,
  Compass,
  Navigation,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  RefreshCw,
  Edit3,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { HospitalProvider } from '../../services/hospitalDirectoryService';
import {
  GpsLocationData,
  calculateBearing,
  calculateHaversineDistanceKm,
} from '../../services/gpsLocationService';
import { Colors } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PatientLocationMapProps {
  patientLocation: GpsLocationData;
  hospitalsWithin2km: HospitalProvider[];
  hospitalsOutside2km: HospitalProvider[];
  selectedHospital: HospitalProvider | null;
  onSelectHospital: (hospital: HospitalProvider) => void;
  onRefreshLocation: () => void;
  onManualAddressClick?: () => void;
  isLoadingLocation?: boolean;
}

export function PatientLocationMap({
  patientLocation,
  hospitalsWithin2km,
  hospitalsOutside2km,
  selectedHospital,
  onSelectHospital,
  onRefreshLocation,
  onManualAddressClick,
  isLoadingLocation = false,
}: PatientLocationMapProps) {
  const [mapMode, setMapMode] = useState<'radar' | 'satellite'>('radar');
  const [showExtendedList, setShowExtendedList] = useState(false);

  const { latitude, longitude, accuracy, accuracyTier, accuracyLabel, accuracyDescription } =
    patientLocation;

  // Combine hospitals for map rendering (prioritize 2km, then closest 5 outside 2km)
  const displayHospitals = useMemo(() => {
    return [...hospitalsWithin2km, ...hospitalsOutside2km.slice(0, 5)];
  }, [hospitalsWithin2km, hospitalsOutside2km]);

  // Generate interactive Leaflet Web Map HTML
  const leafletHtml = useMemo(() => {
    const lat = latitude;
    const lng = longitude;
    const accuracyM = accuracy || 50;

    const markersJson = JSON.stringify(
      displayHospitals.map((h) => ({
        id: h.id,
        name: h.name,
        address: h.address,
        lat: h.coordinates.lat,
        lng: h.coordinates.lng,
        distanceKm: h.distanceKm,
        etaMins: h.etaMins,
        beds: h.availableResources.beds,
        icu: h.availableResources.icu,
        isWithin2km: h.distanceKm <= 2.0,
        isSelected: selectedHospital?.id === h.id,
      }))
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html { margin: 0; padding: 0; height: 100%; width: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #map { height: 100%; width: 100%; }
    .patient-pulse-marker {
      width: 22px; height: 22px;
      background: #0284C7;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(2, 132, 199, 0.8);
      position: relative;
    }
    .custom-popup .leaflet-popup-content-wrapper {
      border-radius: 12px;
      padding: 4px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    }
    .popup-title { font-weight: 800; font-size: 13px; color: #0F172A; margin-bottom: 2px; }
    .popup-meta { font-size: 11px; color: #64748B; margin-bottom: 6px; }
    .popup-beds { font-size: 11px; font-weight: 700; color: #0D9488; margin-bottom: 8px; }
    .popup-btn {
      background: #0D9488; color: #FFF;
      border: none; border-radius: 6px;
      padding: 6px 10px; font-weight: 700; font-size: 11px;
      cursor: pointer; width: 100%; text-align: center;
    }
    .radius-legend {
      position: absolute; bottom: 10px; right: 10px; z-index: 1000;
      background: rgba(255,255,255,0.92); padding: 5px 8px; border-radius: 6px;
      font-size: 10px; font-weight: 700; color: #0F766E; border: 1px solid #CCFBF1;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="radius-legend">⭕ 2.0 km Search Perimeter</div>
  <script>
    const patientLat = ${lat};
    const patientLng = ${lng};
    const accuracy = ${accuracyM};
    const hospitals = ${markersJson};

    const map = L.map('map', { zoomControl: false }).setView([patientLat, patientLng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // 1. Patient GPS Location Marker (Pulsing blue icon)
    const patientIcon = L.divIcon({
      className: '',
      html: '<div class="patient-pulse-marker"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    L.marker([patientLat, patientLng], { icon: patientIcon })
      .addTo(map)
      .bindTooltip("<b>Your GPS Location</b><br/>±" + accuracy + "m accuracy", { permanent: false, direction: 'top' });

    // 2. 2.0 km Emergency Radius Perimeter Circle
    L.circle([patientLat, patientLng], {
      radius: 2000,
      color: '#0D9488',
      fillColor: '#14B8A6',
      fillOpacity: 0.10,
      weight: 2,
      dashArray: '5, 5'
    }).addTo(map);

    // 3. Hospital Markers
    hospitals.forEach(h => {
      const isSelected = h.isSelected;
      const isWithin = h.isWithin2km;
      const pinColor = isSelected ? '#F59E0B' : (isWithin ? '#0D9488' : '#64748B');

      const svgPin = \`
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="\${pinColor}"/>
          <circle cx="14" cy="14" r="8" fill="#FFFFFF"/>
          <path d="M12.5 9.5H15.5V12.5H18.5V15.5H15.5V18.5H12.5V15.5H9.5V12.5H12.5V9.5Z" fill="\${pinColor}"/>
        </svg>
      \`;

      const hospIcon = L.divIcon({
        className: '',
        html: svgPin,
        iconSize: [28, 36],
        iconAnchor: [14, 36]
      });

      const marker = L.marker([h.lat, h.lng], { icon: hospIcon }).addTo(map);

      const popupContent = \`
        <div class="custom-popup">
          <div class="popup-title">\${h.name}</div>
          <div class="popup-meta">📍 \${h.distanceKm} km away • ETA: ~\${h.etaMins} mins \${h.isWithin2km ? '• <span style="color:#0D9488;font-weight:700">Within 2km</span>' : ''}</div>
          <div class="popup-beds">🛏️ \${h.beds} General Beds | 🫀 \${h.icu} ICU Beds</div>
          <button class="popup-btn" onclick="window.parent.postMessage({ type: 'SELECT_HOSPITAL', id: '\${h.id}' }, '*')">
            \${isSelected ? 'Currently Selected ✓' : 'Select Hospital'}
          </button>
        </div>
      \`;
      marker.bindPopup(popupContent);
    });
  </script>
</body>
</html>`;
  }, [latitude, longitude, accuracy, displayHospitals, selectedHospital]);

  // Open native navigation app
  const handleOpenDirections = () => {
    if (!selectedHospital) return;
    const dest = encodeURIComponent(
      `${selectedHospital.name}, ${selectedHospital.address}`
    );
    const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${dest}`;
    Linking.openURL(url).catch(() => {});
  };

  // SVG Radar layout parameters (Mobile Native Visual View)
  const radarRadius = 110;
  const radarCenter = 120;
  const maxSearchRangeKm = 3.0; // Viewport up to 3 km

  return (
    <View style={styles.container}>
      {/* ======================================================= */}
      {/* 1. SEPARATE GPS HARDWARE ACCURACY BANNER                */}
      {/* ======================================================= */}
      <View
        style={[
          styles.accuracyCard,
          accuracyTier === 'good'
            ? styles.accuracyCardGood
            : accuracyTier === 'caution'
            ? styles.accuracyCardCaution
            : styles.accuracyCardPoor,
        ]}
      >
        <View style={styles.accuracyHeaderRow}>
          <View style={styles.accuracyTitleGroup}>
            {accuracyTier === 'good' ? (
              <CheckCircle2 size={17} color="#15803D" />
            ) : accuracyTier === 'caution' ? (
              <AlertTriangle size={17} color="#B45309" />
            ) : (
              <AlertOctagon size={17} color="#B91C1C" />
            )}
            <Text
              style={[
                styles.accuracyLabelText,
                accuracyTier === 'good'
                  ? styles.accuracyTextGood
                  : accuracyTier === 'caution'
                  ? styles.accuracyTextCaution
                  : styles.accuracyTextPoor,
              ]}
            >
              GPS Telemetry: {accuracyLabel}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onRefreshLocation}
            style={styles.refreshLocBtn}
            disabled={isLoadingLocation}
            activeOpacity={0.7}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#0D9488" />
            ) : (
              <>
                <RefreshCw size={13} color="#0D9488" />
                <Text style={styles.refreshLocBtnText}>Refresh</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.accuracyDescText}>{accuracyDescription}</Text>

        {/* Captured Coordinates + Search Radius Tag */}
        <View style={styles.coordsFooterRow}>
          <View style={styles.coordsPill}>
            <Crosshair size={12} color="#0284C7" />
            <Text style={styles.coordsPillText}>
              {latitude.toFixed(5)}°, {longitude.toFixed(5)}°
            </Text>
          </View>

          <View style={styles.radiusPill}>
            <Text style={styles.radiusPillText}>Search Perimeter: 2.0 km</Text>
          </View>

          {accuracyTier === 'poor' && onManualAddressClick && (
            <TouchableOpacity
              onPress={onManualAddressClick}
              style={styles.manualEntryBtn}
              activeOpacity={0.8}
            >
              <Edit3 size={11} color="#B91C1C" />
              <Text style={styles.manualEntryBtnText}>Enter Address</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ======================================================= */}
      {/* 2. INTERACTIVE MAP / RADAR VIEW                         */}
      {/* ======================================================= */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Compass size={16} color="#0D9488" />
            <Text style={styles.mapSectionTitle}>
              {Platform.OS === 'web'
                ? 'Interactive Emergency Map (2.0 km Range)'
                : '2.0 km Emergency Radius Radar'}
            </Text>
          </View>

          {selectedHospital && (
            <TouchableOpacity
              onPress={handleOpenDirections}
              style={styles.directionsBtn}
              activeOpacity={0.7}
            >
              <Navigation size={13} color="#0D9488" />
              <Text style={styles.directionsBtnText}>Directions</Text>
              <ExternalLink size={11} color="#0D9488" />
            </TouchableOpacity>
          )}
        </View>

        {/* Map Container */}
        <View style={styles.mapViewport}>
          {Platform.OS === 'web' ? (
            // Web Interactive Leaflet Map
            // @ts-ignore
            <iframe
              key={`leaflet-${latitude}-${longitude}-${displayHospitals.length}`}
              srcDoc={leafletHtml}
              title="CareBridge 2km Emergency Radius Map"
              style={styles.webIframe}
            />
          ) : (
            // Native Interactive SVG Radar Map
            <View style={styles.nativeRadarWrap}>
              <Svg width={radarCenter * 2} height={radarCenter * 2}>
                {/* Background Concentric Distance Rings */}
                {/* 1.0 km Ring */}
                <Circle
                  cx={radarCenter}
                  cy={radarCenter}
                  r={(radarRadius * 1.0) / maxSearchRangeKm}
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                  strokeDasharray="4, 4"
                  fill="transparent"
                />
                {/* 2.0 km Search Boundary Ring (Highlighted Teal) */}
                <Circle
                  cx={radarCenter}
                  cy={radarCenter}
                  r={(radarRadius * 2.0) / maxSearchRangeKm}
                  stroke="#0D9488"
                  strokeWidth="2"
                  strokeDasharray="6, 4"
                  fill="rgba(20, 184, 166, 0.08)"
                />
                {/* 3.0 km Outer Boundary Ring */}
                <Circle
                  cx={radarCenter}
                  cy={radarCenter}
                  r={radarRadius}
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  fill="transparent"
                />

                {/* Crosshair Axis Lines */}
                <Line
                  x1={radarCenter - radarRadius}
                  y1={radarCenter}
                  x2={radarCenter + radarRadius}
                  y2={radarCenter}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <Line
                  x1={radarCenter}
                  y1={radarCenter - radarRadius}
                  x2={radarCenter}
                  y2={radarCenter + radarRadius}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />

                {/* Range Labels */}
                <SvgText
                  x={radarCenter + (radarRadius * 2.0) / maxSearchRangeKm - 10}
                  y={radarCenter - 4}
                  fill="#0D9488"
                  fontSize="9"
                  fontWeight="bold"
                >
                  2 km
                </SvgText>
                <SvgText
                  x={radarCenter + (radarRadius * 1.0) / maxSearchRangeKm - 10}
                  y={radarCenter - 4}
                  fill="#94A3B8"
                  fontSize="8"
                >
                  1 km
                </SvgText>

                {/* Patient GPS Center Marker */}
                <Circle
                  cx={radarCenter}
                  cy={radarCenter}
                  r={12}
                  fill="rgba(2, 132, 199, 0.25)"
                />
                <Circle
                  cx={radarCenter}
                  cy={radarCenter}
                  r={6}
                  fill="#0284C7"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />

                {/* Plot Nearby Hospitals by Distance and Bearing */}
                {displayHospitals.map((hosp) => {
                  const dist = Math.min(hosp.distanceKm, maxSearchRangeKm);
                  const normalizedDist = (radarRadius * dist) / maxSearchRangeKm;
                  const bearing = calculateBearing(
                    latitude,
                    longitude,
                    hosp.coordinates.lat,
                    hosp.coordinates.lng
                  );

                  // Convert polar to cartesian (0 deg is top / North)
                  const rad = (bearing - 90) * (Math.PI / 180);
                  const hx = radarCenter + normalizedDist * Math.cos(rad);
                  const hy = radarCenter + normalizedDist * Math.sin(rad);

                  const isSelected = selectedHospital?.id === hosp.id;
                  const isWithin = hosp.distanceKm <= 2.0;

                  return (
                    <G key={hosp.id}>
                      {isSelected && (
                        <Circle
                          cx={hx}
                          cy={hy}
                          r={12}
                          fill="rgba(245, 158, 11, 0.3)"
                          stroke="#F59E0B"
                          strokeWidth="1.5"
                        />
                      )}
                      <Circle
                        cx={hx}
                        cy={hy}
                        r={isWithin ? 7 : 5}
                        fill={
                          isSelected
                            ? '#F59E0B'
                            : isWithin
                            ? '#0D9488'
                            : '#64748B'
                        }
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    </G>
                  );
                })}
              </Svg>

              {/* Native Radar Legend */}
              <View style={styles.radarLegendRow}>
                <View style={styles.radarLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
                  <Text style={styles.legendText}>You</Text>
                </View>
                <View style={styles.radarLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0D9488' }]} />
                  <Text style={styles.legendText}>Within 2km</Text>
                </View>
                <View style={styles.radarLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#64748B' }]} />
                  <Text style={styles.legendText}>Outside 2km</Text>
                </View>
                <View style={styles.radarLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>Selected</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ======================================================= */}
      {/* 3. HOSPITALS WITHIN 2 KM LIST                           */}
      {/* ======================================================= */}
      <View style={styles.hospListSection}>
        <View style={styles.listHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.listSectionTitle}>
              Hospitals within 2.0 km ({hospitalsWithin2km.length} available)
            </Text>
          </View>
          <Text style={styles.primaryRadiusBadge}>2.0 km Zone</Text>
        </View>

        {hospitalsWithin2km.length === 0 ? (
          /* Empty State within 2 km: Alert + Automatic Extended Alternatives */
          <View style={styles.noWithin2kmBox}>
            <View style={styles.noWithinHeader}>
              <AlertTriangle size={18} color="#D97706" />
              <Text style={styles.noWithinTitle}>No Hospitals Found Within 2.0 km</Text>
            </View>
            <Text style={styles.noWithinDesc}>
              No verified hospitals with available beds were detected within a 2.0 km radius of your GPS coordinates. Showing closest verified emergency facilities in our extended network:
            </Text>
          </View>
        ) : (
          <View style={styles.hospitalCardStack}>
            {hospitalsWithin2km.map((hosp) => {
              const isSelected = selectedHospital?.id === hosp.id;
              return (
                <TouchableOpacity
                  key={hosp.id}
                  style={[
                    styles.hospCard,
                    isSelected ? styles.hospCardSelected : null,
                  ]}
                  onPress={() => onSelectHospital(hosp)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardHospName} numberOfLines={1}>
                        {hosp.name}
                      </Text>
                      <View style={styles.distanceBadge2km}>
                        <Text style={styles.distanceBadgeText}>
                          📍 {hosp.distanceKm.toFixed(2)} km
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardHospAddress} numberOfLines={1}>
                      {hosp.address}
                    </Text>

                    {/* Bed and ICU Telemetry */}
                    <View style={styles.telemetryRow}>
                      <View
                        style={[
                          styles.telemetryPill,
                          hosp.availableResources.beds > 0
                            ? styles.pillGreen
                            : styles.pillMuted,
                        ]}
                      >
                        <Text style={styles.telemetryPillText}>
                          🛏️ {hosp.availableResources.beds} General Beds
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.telemetryPill,
                          hosp.availableResources.icu > 0
                            ? styles.pillRed
                            : styles.pillMuted,
                        ]}
                      >
                        <Text style={styles.telemetryPillText}>
                          🫀 {hosp.availableResources.icu} ICU Beds
                        </Text>
                      </View>

                      <Text style={styles.etaText}>ETA: ~{hosp.etaMins}m</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.selectIndicator,
                      isSelected ? styles.selectIndicatorActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectIndicatorText,
                        isSelected ? styles.selectIndicatorTextActive : null,
                      ]}
                    >
                      {isSelected ? 'Selected ✓' : 'Select'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ======================================================= */}
        {/* 4. EXTENDED NETWORK (OUTSIDE 2 KM ALTERNATIVES)          */}
        {/* ======================================================= */}
        {hospitalsOutside2km.length > 0 && (
          <View style={styles.outside2kmSection}>
            <TouchableOpacity
              style={styles.toggleOutsideBtn}
              onPress={() => setShowExtendedList(!showExtendedList)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Layers size={14} color="#64748B" />
                <Text style={styles.toggleOutsideText}>
                  {hospitalsWithin2km.length === 0
                    ? `Closest Alternatives Outside 2.0 km (${hospitalsOutside2km.length} facilities)`
                    : `Show Extended Network Outside 2.0 km (${hospitalsOutside2km.length} more)`}
                </Text>
              </View>
              <ChevronRight
                size={16}
                color="#64748B"
                style={{
                  transform: [{ rotate: showExtendedList || hospitalsWithin2km.length === 0 ? '90deg' : '0deg' }],
                }}
              />
            </TouchableOpacity>

            {(showExtendedList || hospitalsWithin2km.length === 0) && (
              <View style={styles.hospitalCardStack}>
                {hospitalsOutside2km.slice(0, 5).map((hosp) => {
                  const isSelected = selectedHospital?.id === hosp.id;
                  return (
                    <TouchableOpacity
                      key={hosp.id}
                      style={[
                        styles.hospCard,
                        styles.hospCardOutside,
                        isSelected ? styles.hospCardSelected : null,
                      ]}
                      onPress={() => onSelectHospital(hosp)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.cardHospName} numberOfLines={1}>
                            {hosp.name}
                          </Text>
                          <View style={styles.distanceBadgeOutside}>
                            <Text style={styles.distanceBadgeOutsideText}>
                              📍 {hosp.distanceKm.toFixed(2)} km
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.cardHospAddress} numberOfLines={1}>
                          {hosp.address}
                        </Text>

                        <View style={styles.telemetryRow}>
                          <View
                            style={[
                              styles.telemetryPill,
                              hosp.availableResources.beds > 0
                                ? styles.pillGreen
                                : styles.pillMuted,
                            ]}
                          >
                            <Text style={styles.telemetryPillText}>
                              🛏️ {hosp.availableResources.beds} Beds
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.telemetryPill,
                              hosp.availableResources.icu > 0
                                ? styles.pillRed
                                : styles.pillMuted,
                            ]}
                          >
                            <Text style={styles.telemetryPillText}>
                              🫀 {hosp.availableResources.icu} ICU
                            </Text>
                          </View>

                          <Text style={styles.etaText}>ETA: ~{hosp.etaMins}m</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.selectIndicator,
                          isSelected ? styles.selectIndicatorActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectIndicatorText,
                            isSelected ? styles.selectIndicatorTextActive : null,
                          ]}
                        >
                          {isSelected ? 'Selected ✓' : 'Select'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  // ==========================================
  // SEPARATE GPS ACCURACY CARD
  // ==========================================
  accuracyCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  accuracyCardGood: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  accuracyCardCaution: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  accuracyCardPoor: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  accuracyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  accuracyTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  accuracyLabelText: {
    fontSize: 13,
    fontWeight: '800',
  },
  accuracyTextGood: {
    color: '#15803D',
  },
  accuracyTextCaution: {
    color: '#B45309',
  },
  accuracyTextPoor: {
    color: '#B91C1C',
  },
  refreshLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  refreshLocBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  accuracyDescText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  coordsFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  coordsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  coordsPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  radiusPill: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  radiusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  manualEntryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },

  // ==========================================
  // MAP CONTAINER
  // ==========================================
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mapSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  directionsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  mapViewport: {
    height: 220,
    width: '100%',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webIframe: {
    width: '100%',
    height: 220,
    borderWidth: 0,
  },
  nativeRadarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  radarLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  radarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },

  // ==========================================
  // HOSPITALS WITHIN 2 KM LIST
  // ==========================================
  hospListSection: {
    marginTop: 4,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  listSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  primaryRadiusBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  noWithin2kmBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  noWithinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  noWithinTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  noWithinDesc: {
    fontSize: 11.5,
    color: '#78350F',
    lineHeight: 16,
  },
  hospitalCardStack: {
    gap: 8,
  },
  hospCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hospCardSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  hospCardOutside: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardHospName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  distanceBadge2km: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
  },
  distanceBadgeOutside: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceBadgeOutsideText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  cardHospAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 6,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  telemetryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillGreen: {
    backgroundColor: '#DCFCE7',
  },
  pillRed: {
    backgroundColor: '#FEE2E2',
  },
  pillMuted: {
    backgroundColor: '#F1F5F9',
  },
  telemetryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  etaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  selectIndicator: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectIndicatorActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  selectIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  selectIndicatorTextActive: {
    color: '#FFFFFF',
  },

  // ==========================================
  // OUTSIDE 2 KM SECTION
  // ==========================================
  outside2kmSection: {
    marginTop: 10,
  },
  toggleOutsideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 8,
  },
  toggleOutsideText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
