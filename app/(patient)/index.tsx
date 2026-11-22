import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Linking,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import {
  dataStore,
  subscribeCasesFromFirestore,
  subscribePatientLinksFromFirestore,
  subscribeHospitalProfilesFromFirestore,
  subscribeFeedbackFromFirestore,
} from '../../services/dataService';
import {
  searchNearbyHospitals,
  getGoogleMapEmbedUrl,
  getGoogleMapsDirectionsUrl,
  POPULAR_LOCATIONS,
  type HospitalProvider,
} from '../../services/hospitalDirectoryService';
import type { EmergencyCase, PatientLink, HospitalProfile } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { TriageBadge, CaseStatusBadge } from '../../components/common/Badge';
import { Colors } from '../../constants/colors';
import {
  Activity,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Truck,
  Users,
  ChevronRight,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Search,
  Navigation,
  ExternalLink,
  Compass,
  Star,
  Layers,
} from 'lucide-react-native';

export default function PatientDashboard() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [links, setLinks] = useState<PatientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'cases' | 'hospitals' | 'linked'>('cases');

  // Nearby Hospitals & Interactive Google Map state
  const [searchLocation, setSearchLocation] = useState('Hubballi, Karnataka');
  const [selectedHospital, setSelectedHospital] = useState<HospitalProvider | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [liveHospitals, setLiveHospitals] = useState<HospitalProfile[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    // Subscribe to patient's cases in real time
    const unsubscribeCases = subscribeCasesFromFirestore(
      currentUser.uid,
      (liveCases) => {
        setCases(liveCases);
        setLoading(false);
      },
      () => {
        setCases(dataStore.getCases().filter((c) => c.patientUid === currentUser.uid || c.attendantUid === currentUser.uid));
        setLoading(false);
      }
    );

    // Subscribe to attendant's linked patients in real time
    const unsubscribeLinks = subscribePatientLinksFromFirestore(
      currentUser.uid,
      (liveLinks) => {
        setLinks(liveLinks);
      }
    );

    // Subscribe to live hospital capacity updates from Firestore
    const unsubscribeHospitals = subscribeHospitalProfilesFromFirestore((list) => {
      setLiveHospitals(list);
    });

    // Subscribe to feedback updates to update completed cases
    const unsubscribeFeedback = subscribeFeedbackFromFirestore(() => {
      setCases((prev) =>
        prev.map((c) => {
          const fb = dataStore.getFeedbackForCase(c.caseId);
          if (fb) {
            return { ...c, hasFeedback: true, feedbackId: fb.id, feedbackRating: fb.overallRating };
          }
          return c;
        })
      );
    });

    return () => {
      unsubscribeCases();
      unsubscribeLinks();
      unsubscribeHospitals();
      unsubscribeFeedback();
    };
  }, [currentUser]);

  // Real-time calculated nearby hospitals merged with live telemetry
  const nearbyHospitals = useMemo(() => {
    return searchNearbyHospitals(
      searchLocation,
      { beds: true, icu: true, blood: true, oxygen: true, ambulance: true },
      liveHospitals
    );
  }, [searchLocation, liveHospitals]);

  useEffect(() => {
    if (nearbyHospitals.length > 0) {
      if (!selectedHospital || !nearbyHospitals.some((h) => h.id === selectedHospital.id)) {
        setSelectedHospital(nearbyHospitals[0]);
      }
    }
  }, [nearbyHospitals]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentUser) {
      const local = dataStore.getCases().filter((c) => c.patientUid === currentUser.uid || c.attendantUid === currentUser.uid);
      setCases(local);
      setLiveHospitals(dataStore.getHospitalProfiles());
    }
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleOpenDirections = (hospital?: HospitalProvider) => {
    const target = hospital || selectedHospital || nearbyHospitals[0];
    if (!target) return;
    const url = getGoogleMapsDirectionsUrl(target, searchLocation);
    Linking.openURL(url).catch((err) => {
      console.warn('Could not open map url:', err);
    });
  };

  // Metrics calculation
  const totalCount = cases.length;
  const activeCount = cases.filter((c) => {
    const s = String(c.status || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'RESOLVED' && s !== 'CANCELLED' && s !== 'REJECTED';
  }).length;
  const completedCount = cases.filter((c) => {
    const s = String(c.status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'RESOLVED';
  }).length;

  // Filter completed cases where feedback has not been submitted yet
  const pendingFeedbackCases = cases.filter((c) => {
    const s = String(c.status || '').toUpperCase();
    const isCompleted = s === 'COMPLETED' || s === 'RESOLVED';
    const hasFb = Boolean(c.hasFeedback || dataStore.getFeedbackForCase(c.caseId));
    return isCompleted && !hasFb;
  });

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Welcome Card */}
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeTextCol}>
            <Text style={styles.welcomeGreeting}>
              Hello, <Text style={styles.welcomeName}>{currentUser?.displayName || 'Sahana S.'}</Text>
            </Text>
            <Text style={styles.welcomeRole}>
              {currentUser?.role === 'patient' ? 'Patient Medical Portal' : 'Patient Attendant Emergency Portal'}
            </Text>
          </View>

          <Button
            title="Create Case"
            onPress={() => router.push('/(patient)/new-case')}
            variant="danger"
            size="sm"
            icon={<PlusCircle size={16} color="#FFFFFF" />}
          />
        </View>

        {/* Feedback Notification Banner on Patient Dashboard */}
        {pendingFeedbackCases.length > 0 && (
          <Card style={styles.feedbackAlertCard}>
            <View style={styles.feedbackAlertHeader}>
              <View style={styles.feedbackAlertIconCircle}>
                <Star size={20} color="#D97706" fill="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.feedbackAlertTitle}>Feedback Requested</Text>
                  <View style={styles.feedbackAlertBadge}>
                    <Text style={styles.feedbackAlertBadgeText}>
                      {pendingFeedbackCases.length} {pendingFeedbackCases.length === 1 ? 'Case' : 'Cases'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.feedbackAlertDesc}>
                  Emergency Case #{pendingFeedbackCases[0].caseId} is completed. Please take a moment to rate your care experience.
                </Text>
              </View>
            </View>

            <View style={styles.feedbackAlertActions}>
              <TouchableOpacity
                style={styles.feedbackAlertBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(patient)/feedback',
                    params: { caseId: pendingFeedbackCases[0].caseId },
                  })
                }
                activeOpacity={0.8}
              >
                <Star size={13} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.feedbackAlertBtnText}>Rate Experience</Text>
                <ChevronRight size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Dashboard Statistics Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#E0F2FE' }]}>
              <Activity size={18} color={Colors.cyan} />
            </View>
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total Cases</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: Colors.emergencyBg }]}>
              <AlertTriangle size={18} color={Colors.emergency} />
            </View>
            <Text style={styles.statNumber}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active Cases</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: Colors.successBg }]}>
              <CheckCircle2 size={18} color={Colors.success} />
            </View>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </Card>
        </View>

        {/* Quick Nav Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cases' ? styles.tabButtonActive : null]}
            onPress={() => setActiveTab('cases')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'cases' ? styles.tabButtonTextActive : null]}>
              Cases ({cases.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'hospitals' ? styles.tabButtonActive : null]}
            onPress={() => setActiveTab('hospitals')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'hospitals' ? styles.tabButtonTextActive : null]}>
              Nearby Hospitals ({nearbyHospitals.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'linked' ? styles.tabButtonActive : null]}
            onPress={() => setActiveTab('linked')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'linked' ? styles.tabButtonTextActive : null]}>
              Linked ({links.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: CASES LIST */}
        {activeTab === 'cases' && (
          <View style={styles.section}>
            {/* Quick Map Access Banner */}
            <TouchableOpacity
              style={styles.hospitalMapBanner}
              onPress={() => setActiveTab('hospitals')}
              activeOpacity={0.8}
            >
              <View style={styles.hospitalMapBannerLeft}>
                <View style={styles.mapIconCircle}>
                  <Compass size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapBannerTitle}>Find Nearby Hospitals & Live Map</Text>
                  <Text style={styles.mapBannerSub}>Explore verified trauma centers with real-time Bed & ICU availability</Text>
                </View>
              </View>
              <View style={styles.mapBannerPill}>
                <Text style={styles.mapBannerPillText}>Open Map 📍</Text>
              </View>
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading emergency records...</Text>
              </View>
            ) : cases.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Activity size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No Emergency Cases Found</Text>
                <Text style={styles.emptyDesc}>
                  You have not submitted any emergency healthcare cases yet.
                </Text>
                <Button
                  title="Submit New Emergency Case"
                  onPress={() => router.push('/(patient)/new-case')}
                  variant="primary"
                  size="md"
                  style={{ marginTop: 14 }}
                />
              </Card>
            ) : (
              <View style={styles.casesList}>
                {cases.map((c) => (
                  <TouchableOpacity
                    key={c.caseId}
                    activeOpacity={0.8}
                    onPress={() => {
                      router.push({
                        pathname: '/(patient)/case-details',
                        params: { caseId: c.caseId },
                      });
                    }}
                  >
                    <Card style={styles.caseCard}>
                      {/* Top Row: Case ID & Status */}
                      <View style={styles.caseCardHeader}>
                        <View>
                          <Text style={styles.caseIdText}>{c.caseId}</Text>
                          <Text style={styles.caseDateText}>
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Active'}
                          </Text>
                        </View>
                        <CaseStatusBadge status={c.status} reason={c.rejectionReason} />
                      </View>

                      {/* Patient Info Row */}
                      <View style={styles.patientInfoRow}>
                        <Text style={styles.patientNameText}>{c.patientName}</Text>
                        <Text style={styles.patientSubText}>
                          ({c.patientAge}y • {c.patientGender} • Blood: {c.patientBloodGroup || 'Unknown'})
                        </Text>
                      </View>

                      {/* Complaint & Priority */}
                      <View style={styles.complaintRow}>
                        <Text style={styles.complaintText} numberOfLines={2}>
                          {c.conditionSummary || c.patientCondition || 'Emergency intake requested'}
                        </Text>
                        <TriageBadge priority={c.urgencyLevel || c.priority || 'immediate'} />
                      </View>

                      {/* Assigned Providers Telemetry */}
                      {(c.matchedHospitalName || c.assignedHospitalName || c.assignedAmbulanceName) && (
                        <View style={styles.providerRow}>
                          <Building2 size={13} color={Colors.primary} />
                          <Text style={styles.providerText} numberOfLines={1}>
                            {c.assignedHospitalName || c.matchedHospitalName}
                          </Text>
                          {c.assignedAmbulanceName && (
                            <>
                              <Text style={{ color: Colors.borderDark }}>•</Text>
                              <Truck size={13} color={Colors.emergency} />
                              <Text style={styles.ambulanceText} numberOfLines={1}>
                                {c.assignedAmbulanceName}
                              </Text>
                            </>
                          )}
                        </View>
                      )}

                      {/* Feedback Action or Status for Completed Cases */}
                      {(String(c.status).toUpperCase() === 'COMPLETED' || String(c.status).toUpperCase() === 'RESOLVED') && (
                        <View style={styles.caseFeedbackRow}>
                          {c.hasFeedback || dataStore.getFeedbackForCase(c.caseId) ? (
                            <View style={styles.feedbackSubmittedBadge}>
                              <CheckCircle2 size={13} color="#059669" />
                              <Text style={styles.feedbackSubmittedBadgeText}>
                                Feedback Submitted ({dataStore.getFeedbackForCase(c.caseId)?.overallRating || c.feedbackRating || 5}★)
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.leaveFeedbackBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                router.push({
                                  pathname: '/(patient)/feedback',
                                  params: { caseId: c.caseId },
                                });
                              }}
                              activeOpacity={0.8}
                            >
                              <Star size={13} color="#D97706" fill="#F59E0B" />
                              <Text style={styles.leaveFeedbackBtnText}>Leave Feedback</Text>
                              <ChevronRight size={13} color="#D97706" />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      <View style={styles.viewDetailsRow}>
                        <Text style={styles.viewDetailsText}>View Live Timeline & Resources</Text>
                        <ChevronRight size={14} color={Colors.primary} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: NEARBY HOSPITALS & INTERACTIVE GOOGLE MAP */}
        {activeTab === 'hospitals' && (
          <View style={styles.section}>
            {/* Search Location Bar */}
            <Card style={styles.searchCard}>
              <View style={styles.searchBarRow}>
                <Search size={18} color={Colors.primary} />
                <TextInput
                  style={styles.searchInput}
                  value={searchLocation}
                  onChangeText={setSearchLocation}
                  placeholder="Search city, area or landmark (e.g. Hubballi, Dharwad)..."
                  placeholderTextColor={Colors.textMuted}
                />
                {searchLocation ? (
                  <TouchableOpacity onPress={() => setSearchLocation('')} style={styles.clearSearchBtn}>
                    <Text style={styles.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Popular Location Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularChipsContainer}
              >
                {POPULAR_LOCATIONS.map((loc) => {
                  const isActive = searchLocation.toLowerCase().includes(loc.label.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={loc.label}
                      onPress={() => setSearchLocation(loc.query)}
                      style={[styles.locationChip, isActive ? styles.locationChipActive : null]}
                    >
                      <MapPin size={12} color={isActive ? '#FFFFFF' : Colors.primary} />
                      <Text style={[styles.locationChipText, isActive ? styles.locationChipTextActive : null]}>
                        {loc.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Card>

            {/* Interactive Embedded Google Map / Live Route Navigation */}
            <Card style={styles.mapCard}>
              <View style={styles.mapCardHeader}>
                <View style={styles.mapHeaderLeft}>
                  <Compass size={16} color={Colors.primary} />
                  <Text style={styles.mapHeaderTitle} numberOfLines={1}>
                    Map: {selectedHospital ? selectedHospital.name : searchLocation}
                  </Text>
                </View>

                <View style={styles.mapHeaderActions}>
                  <TouchableOpacity
                    onPress={() => handleOpenDirections(selectedHospital || nearbyHospitals[0])}
                    style={styles.directionsBtn}
                  >
                    <Text style={styles.directionsBtnText}>Directions</Text>
                    <ExternalLink size={12} color={Colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowMap(!showMap)}
                    style={styles.toggleMapBtn}
                  >
                    <Text style={styles.toggleMapBtnText}>{showMap ? 'Hide Map' : 'Show Map'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showMap && (
                <View style={styles.mapViewport}>
                  {Platform.OS === 'web' ? (
                    // @ts-ignore
                    <iframe
                      title="Nearby Hospitals Google Map"
                      width="100%"
                      height="200"
                      style={{ border: 0, width: '100%', height: 200, borderRadius: 10 }}
                      src={getGoogleMapEmbedUrl(searchLocation, selectedHospital || nearbyHospitals[0])}
                      allowFullScreen
                    />
                  ) : (
                    <View style={styles.nativeMapCard}>
                      <View style={styles.nativeMapTop}>
                        <View style={styles.nativeMapPinCircle}>
                          <MapPin size={20} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.nativeMapHospitalName} numberOfLines={1}>
                            {selectedHospital ? selectedHospital.name : nearbyHospitals[0]?.name || 'CareBridge Emergency Network'}
                          </Text>
                          <Text style={styles.nativeMapAddress} numberOfLines={2}>
                            {selectedHospital ? selectedHospital.address : searchLocation}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.nativeMapBottomRow}>
                        <Text style={styles.nativeMapEta}>
                          📍 {selectedHospital?.distanceKm ?? 2.4} km away • ETA ~{selectedHospital?.etaMins ?? 8} mins
                        </Text>
                        <TouchableOpacity
                          style={styles.nativeMapGpsBtn}
                          onPress={() => handleOpenDirections(selectedHospital || nearbyHospitals[0])}
                        >
                          <Navigation size={13} color="#FFFFFF" />
                          <Text style={styles.nativeMapGpsBtnText}>GPS Directions</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Card>

            {/* List of Nearby Emergency Hospitals */}
            <View style={styles.hospitalsSectionHeader}>
              <Text style={styles.subHeading}>Emergency Facilities in Vicinity ({nearbyHospitals.length})</Text>
              <Text style={styles.liveSyncNote}>⚡ Real-time Telemetry</Text>
            </View>

            <View style={styles.hospitalsList}>
              {nearbyHospitals.map((hospital) => {
                const isSelected = selectedHospital?.id === hospital.id;
                return (
                  <Card
                    key={hospital.id}
                    style={[styles.hospitalItemCard, isSelected ? styles.hospitalItemCardSelected : null]}
                  >
                    <View style={styles.hospitalItemTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.hospitalTitleRow}>
                          <Text style={styles.hospitalItemName}>{hospital.name}</Text>
                          <View style={styles.hospitalTypePill}>
                            <Text style={styles.hospitalTypePillText}>{hospital.type}</Text>
                          </View>
                          {hospital.isEmergency24x7 && (
                            <View style={styles.erBadge}>
                              <Text style={styles.erBadgeText}>24/7 ER</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.hospitalAddressRow}>
                          <MapPin size={12} color={Colors.textMuted} />
                          <Text style={styles.hospitalAddressText} numberOfLines={1}>
                            {hospital.address}
                          </Text>
                        </View>

                        <Text style={styles.hospitalEtaText}>
                          📍 {hospital.distanceKm} km away • Est. Arrival: ~{hospital.etaMins} mins
                        </Text>
                      </View>
                    </View>

                    {/* Live Available Resources Telemetry */}
                    <View style={styles.resourcePillsRow}>
                      <View style={[styles.resourcePill, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}>
                        <Text style={[styles.resourcePillText, { color: '#0F766E' }]}>
                          🛏️ {hospital.availableResources.beds} Beds
                        </Text>
                      </View>
                      <View style={[styles.resourcePill, { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' }]}>
                        <Text style={[styles.resourcePillText, { color: '#4338CA' }]}>
                          🫀 {hospital.availableResources.icu} ICU
                        </Text>
                      </View>
                      {hospital.availableResources.bloodUnits > 0 && (
                        <View style={[styles.resourcePill, { backgroundColor: '#FFF1F2', borderColor: '#FFE4E6' }]}>
                          <Text style={[styles.resourcePillText, { color: '#BE123C' }]}>
                            🩸 {hospital.availableResources.bloodUnits} Blood
                          </Text>
                        </View>
                      )}
                      {hospital.availableResources.oxygenTanks > 0 && (
                        <View style={[styles.resourcePill, { backgroundColor: '#ECFEFF', borderColor: '#CFFAFE' }]}>
                          <Text style={[styles.resourcePillText, { color: '#0E7490' }]}>
                            💨 {hospital.availableResources.oxygenTanks} O2
                          </Text>
                        </View>
                      )}
                      {hospital.availableResources.ambulances > 0 && (
                        <View style={[styles.resourcePill, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                          <Text style={[styles.resourcePillText, { color: '#B45309' }]}>
                            🚑 {hospital.availableResources.ambulances} Amb
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Footer Info & Actions */}
                    <View style={styles.hospitalCardFooter}>
                      <View style={styles.hospitalFooterMeta}>
                        <Text style={styles.hospitalMetaText}>Rating: ★ {hospital.rating}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <TouchableOpacity onPress={() => handleOpenDirections(hospital)}>
                          <Text style={styles.hospitalDirectionsLink}>Directions ↗</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.hospitalActionBtns}>
                        <TouchableOpacity
                          onPress={() => setSelectedHospital(hospital)}
                          style={[styles.selectMapBtn, isSelected ? styles.selectMapBtnActive : null]}
                        >
                          <Text style={[styles.selectMapBtnText, isSelected ? styles.selectMapBtnTextActive : null]}>
                            {isSelected ? 'Mapped ✓' : 'View on Map'}
                          </Text>
                        </TouchableOpacity>

                        <Button
                          title="Select & Request Admission"
                          onPress={() => {
                            router.push({
                              pathname: '/(patient)/new-case',
                              params: {
                                selectedHospitalId: hospital.id,
                                selectedHospitalName: hospital.name,
                                selectedHospitalAddress: hospital.address,
                              },
                            });
                          }}
                          variant="primary"
                          size="sm"
                        />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 2: LINKED PATIENTS */}
        {activeTab === 'linked' && (
          <View style={styles.section}>
            <View style={styles.linkedHeader}>
              <Text style={styles.subHeading}>Consented Family & Wards</Text>
              <Button
                title="+ Link Patient"
                onPress={() => router.push('/(patient)/patient-links')}
                variant="outline"
                size="sm"
              />
            </View>

            {links.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Users size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No Linked Patients</Text>
                <Text style={styles.emptyDesc}>
                  Link a family member with authorized consent to quickly dispatch emergency resources on their behalf.
                </Text>
                <Button
                  title="Link Patient Now"
                  onPress={() => router.push('/(patient)/patient-links')}
                  variant="primary"
                  size="md"
                  style={{ marginTop: 14 }}
                />
              </Card>
            ) : (
              <View style={styles.linksList}>
                {links.map((link) => (
                  <Card key={link.id} style={styles.linkCard}>
                    <View style={styles.linkCardTop}>
                      <View>
                        <Text style={styles.linkPatientName}>{link.patientName}</Text>
                        <Text style={styles.linkRelation}>
                          {link.relationship} • {link.patientAge}y • {link.patientGender}
                        </Text>
                      </View>
                      <View style={styles.consentPill}>
                        <ShieldCheck size={12} color={Colors.success} />
                        <Text style={styles.consentText}>Consent Active</Text>
                      </View>
                    </View>

                    <Text style={styles.linkContact}>
                      Emergency Contact: {link.emergencyContactPhone || 'Not provided'}
                    </Text>

                    {link.medicalNotes ? (
                      <Text style={styles.linkNotes} numberOfLines={2}>
                        Notes: {link.medicalNotes}
                      </Text>
                    ) : null}

                    <Button
                      title="Create Case for this Patient"
                      onPress={() => {
                        router.push({
                          pathname: '/(patient)/new-case',
                          params: { prefillLinkId: link.id },
                        });
                      }}
                      variant="outline"
                      size="sm"
                      style={{ marginTop: 10 }}
                    />
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  welcomeBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  welcomeTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  welcomeGreeting: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F3868',
  },
  welcomeName: {
    color: Colors.primary,
  },
  welcomeRole: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginTop: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    fontWeight: '800',
    color: Colors.primary,
  },
  section: {
    marginTop: 16,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  casesList: {
    gap: 12,
  },
  caseCard: {
    padding: 16,
    marginBottom: 10,
  },
  caseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 10,
    marginBottom: 10,
  },
  caseIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F3868',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  caseDateText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  patientSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  complaintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
    gap: 8,
  },
  complaintText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  providerText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    flexShrink: 1,
  },
  ambulanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.emergency,
    flexShrink: 1,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  linkedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  linksList: {
    gap: 12,
  },
  linkCard: {
    padding: 16,
    marginBottom: 8,
  },
  linkCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  linkPatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  linkRelation: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  consentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  consentText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  linkContact: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  linkNotes: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  // Hospitals Directory & Map Styles
  searchCard: {
    padding: 12,
    marginBottom: 12,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  popularChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingBottom: 2,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  locationChipActive: {
    backgroundColor: '#00707E',
    borderColor: '#00707E',
  },
  locationChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  locationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mapCard: {
    padding: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  mapHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  mapHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  directionsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  toggleMapBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toggleMapBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  mapViewport: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  webMapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
  },
  nativeMapCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
  },
  nativeMapTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  nativeMapPinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00707E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeMapHospitalName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nativeMapAddress: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  nativeMapBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 8,
  },
  nativeMapEta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38BDF8',
    flex: 1,
  },
  nativeMapGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00707E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nativeMapGpsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hospitalsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveSyncNote: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
  },
  hospitalsList: {
    gap: 12,
  },
  hospitalItemCard: {
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hospitalItemCardSelected: {
    borderColor: '#00707E',
    backgroundColor: '#F0FDFA',
  },
  hospitalItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  hospitalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  hospitalItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  hospitalTypePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hospitalTypePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  erBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  erBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  hospitalAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  hospitalAddressText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  hospitalEtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00707E',
  },
  resourcePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  resourcePill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resourcePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hospitalCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
    gap: 8,
  },
  hospitalFooterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  hospitalMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  metaDot: {
    color: '#CBD5E1',
  },
  hospitalDirectionsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00707E',
  },
  hospitalActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectMapBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectMapBtnActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#99F6E4',
  },
  selectMapBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  selectMapBtnTextActive: {
    color: '#0F766E',
  },
  // Map Access Banner Styles
  hospitalMapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  hospitalMapBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mapIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00707E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mapBannerSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  mapBannerPill: {
    backgroundColor: '#00707E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mapBannerPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackAlertCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  feedbackAlertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  feedbackAlertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  feedbackAlertBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  feedbackAlertBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  feedbackAlertDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
    marginTop: 3,
  },
  feedbackAlertActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  feedbackAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  feedbackAlertBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  caseFeedbackRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  feedbackSubmittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feedbackSubmittedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  leaveFeedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  leaveFeedbackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
});
