import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import {
  createEmergencySubmission,
  dataStore,
  subscribeHospitalProfilesFromFirestore,
  INITIAL_HOSPITAL,
  type ResourceRequestDraft,
} from '../../services/dataService';
import {
  searchNearbyHospitals,
  filterHospitalsByRadius,
  getGoogleMapEmbedUrl,
  getGoogleMapsDirectionsUrl,
  POPULAR_LOCATIONS,
  type HospitalProvider,
  type RadiusSearchResult,
} from '../../services/hospitalDirectoryService';
import {
  getCurrentPatientLocation,
  DEFAULT_EMERGENCY_COORDINATES,
  type GpsLocationData,
} from '../../services/gpsLocationService';
import { PatientLocationMap } from '../../components/map/PatientLocationMap';
import type { EmergencyCase, EmergencyCategory, EmergencyPriority, UrgencyLevel, PatientLink, HospitalProfile } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  HospitalBedIcon,
  IcuFacilityIcon,
  BloodDropIcon,
  OxygenTankIcon,
  AmbulanceVehicleIcon,
  DoctorAssistanceIcon,
} from '../../components/common/Icons';
import { Colors } from '../../constants/colors';
import {
  Activity,
  Check,
  AlertCircle,
  MapPin,
  Users,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Search,
  Navigation,
  ExternalLink,
  Compass,
} from 'lucide-react-native';

export default function NewCaseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefillLinkId?: string;
    selectedHospitalId?: string;
    selectedHospitalName?: string;
    selectedHospitalAddress?: string;
  }>();
  const { currentUser } = useAuth();

  // Resource Selection State
  const [selectedResources, setSelectedResources] = useState<{
    beds: boolean;
    icu: boolean;
    blood: boolean;
    oxygen: boolean;
    ambulance: boolean;
    doctor: boolean;
  }>({
    beds: true,
    icu: true,
    blood: true,
    oxygen: true,
    ambulance: true,
    doctor: false,
  });

  // Patient & Case Form State
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientBloodGroup, setPatientBloodGroup] = useState('Unknown');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientCondition, setPatientCondition] = useState('');

  // Emergency Information
  const [emergencyCategory, setEmergencyCategory] = useState<EmergencyCategory>('Cardiac emergency');
  const [emergencyPriority, setEmergencyPriority] = useState<EmergencyPriority>('Critical');
  const [bloodUnits, setBloodUnits] = useState('2');
  const [oxygenType, setOxygenType] = useState<'cylinder' | 'concentrator'>('cylinder');
  const [oxygenQuantity, setOxygenQuantity] = useState('2');
  const [ambulanceType, setAmbulanceType] = useState<'ALS' | 'BLS' | 'Patient Transport'>('ALS');
  const [incidentAddress, setIncidentAddress] = useState('Vidyanagar, PB Road, Hubballi, Karnataka');

  // Attendant & Consent Info
  const [attendantName, setAttendantName] = useState('');
  const [attendantRelation, setAttendantRelation] = useState('Attendant');
  const [attendantPhone, setAttendantPhone] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(true);

  // Linked patients list
  const [linkedPatients, setLinkedPatients] = useState<PatientLink[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');

  // GPS Location & 2 km Precision Map state
  const [patientLocation, setPatientLocation] = useState<GpsLocationData>(DEFAULT_EMERGENCY_COORDINATES);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchLocation, setSearchLocation] = useState(
    params.selectedHospitalAddress || 'Vidyanagar, Hubballi, Karnataka'
  );
  const [selectedHospital, setSelectedHospital] = useState<HospitalProvider | null>(null);
  const [liveHospitals, setLiveHospitals] = useState<HospitalProfile[]>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubHosp = subscribeHospitalProfilesFromFirestore((list) => {
      setLiveHospitals(list);
    });
    return () => unsubHosp();
  }, []);

  // GPS auto-detection on mount
  const handleDetectLocation = async () => {
    setIsLoadingLocation(true);
    const res = await getCurrentPatientLocation();
    setIsLoadingLocation(false);
    if (res.success && res.data) {
      setPatientLocation(res.data);
      setLocationPermissionDenied(false);
      if (res.data.address) {
        setIncidentAddress(res.data.address);
        setSearchLocation(res.data.address);
      }
      if (res.data.accuracyTier === 'poor') {
        setShowManualSearch(true);
      }
    } else {
      if (res.permissionDenied) {
        setLocationPermissionDenied(true);
        setShowManualSearch(true);
      }
    }
  };

  useEffect(() => {
    handleDetectLocation();
  }, []);

  const handleSelectPopularLocation = (loc: (typeof POPULAR_LOCATIONS)[0]) => {
    setSearchLocation(loc.query);
    setIncidentAddress(loc.query);
    let lat = 15.3585;
    let lng = 75.1305;
    if (loc.label === 'Dharwad') {
      lat = 15.4589;
      lng = 75.0078;
    } else if (loc.label === 'Belagavi') {
      lat = 15.8670;
      lng = 74.5120;
    } else if (loc.label === 'Bengaluru') {
      lat = 12.9716;
      lng = 77.5946;
    } else if (loc.label === 'Mysuru') {
      lat = 12.2958;
      lng = 76.6394;
    } else if (loc.label === 'Mumbai') {
      lat = 19.0760;
      lng = 72.8777;
    } else if (loc.label === 'Pune') {
      lat = 18.5204;
      lng = 73.8567;
    } else if (loc.label === 'Delhi NCR') {
      lat = 28.6139;
      lng = 77.2090;
    }
    setPatientLocation({
      latitude: lat,
      longitude: lng,
      accuracy: null,
      accuracyTier: 'unknown',
      accuracyLabel: `Manual: ${loc.label}`,
      accuracyDescription: `Coordinates centered at ${loc.label} regional center. For precision dispatch, verify street and landmark.`,
      timestamp: Date.now(),
      address: loc.query,
      isManual: true,
    });
  };

  // Compute 2 km Radius Search based on actual coordinates & Firestore data
  const radiusResult: RadiusSearchResult = useMemo(() => {
    return filterHospitalsByRadius(
      patientLocation.latitude,
      patientLocation.longitude,
      selectedResources,
      liveHospitals,
      2.0
    );
  }, [patientLocation.latitude, patientLocation.longitude, selectedResources, liveHospitals]);

  useEffect(() => {
    if (params.selectedHospitalId && radiusResult.allRanked.length > 0) {
      const found = radiusResult.allRanked.find((h) => h.id === params.selectedHospitalId);
      if (found) {
        setSelectedHospital(found);
        return;
      }
    }
    if (params.selectedHospitalName && radiusResult.allRanked.length > 0) {
      const found = radiusResult.allRanked.find((h) =>
        h.name.toLowerCase().includes((params.selectedHospitalName || '').toLowerCase())
      );
      if (found) {
        setSelectedHospital(found);
        return;
      }
    }
    if (!selectedHospital && radiusResult.allRanked.length > 0) {
      if (radiusResult.within2km.length > 0) {
        setSelectedHospital(radiusResult.within2km[0]);
      } else {
        setSelectedHospital(radiusResult.outside2km[0]);
      }
    }
  }, [radiusResult, params.selectedHospitalId, params.selectedHospitalName]);

  useEffect(() => {
    if (!currentUser) return;

    setAttendantName(currentUser.displayName || '');
    setAttendantPhone(currentUser.phone || '');

    if (currentUser.role === 'patient') {
      setPatientName(currentUser.displayName || '');
      setPatientPhone(currentUser.phone || '');
      setAttendantRelation('Self');
      if (currentUser.address) {
        setIncidentAddress(`${currentUser.address}, ${currentUser.city || 'Hubballi'}`);
      }
    } else {
      const links = dataStore.getPatientLinks(currentUser.uid);
      setLinkedPatients(links);

      if (params.prefillLinkId) {
        const found = links.find((l) => l.id === params.prefillLinkId);
        if (found) {
          applyPatientLink(found);
        }
      } else if (links.length > 0) {
        applyPatientLink(links[0]);
      }
    }
  }, [currentUser, params.prefillLinkId]);

  const applyPatientLink = (link: PatientLink) => {
    setSelectedLinkId(link.id);
    setPatientName(link.patientName);
    setPatientAge(String(link.patientAge || ''));
    setPatientGender(link.patientGender || 'Male');
    setPatientBloodGroup(link.patientBloodGroup || 'Unknown');
    setAttendantRelation(link.relationship || 'Attendant');
    if (link.emergencyContactPhone) {
      setPatientPhone(link.emergencyContactPhone);
    }
    if (link.medicalNotes) {
      setPatientCondition(link.medicalNotes);
    }
  };

  const toggleResource = (key: keyof typeof selectedResources) => {
    setSelectedResources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!patientName.trim()) {
      errs.patientName = 'Patient full name is required.';
    }

    const ageNum = Number(patientAge.trim());
    if (!patientAge.trim() || isNaN(ageNum) || ageNum <= 0 || ageNum > 125) {
      errs.patientAge = 'Please enter a valid age (1-125).';
    }

    if (!patientCondition.trim()) {
      errs.patientCondition = 'Primary medical condition is required.';
    }

    if (!incidentAddress.trim()) {
      errs.incidentAddress = 'Incident address is required.';
    }

    if (!consentConfirmed) {
      errs.consent = 'Patient or legal guardian consent must be confirmed.';
    }

    const anySelected = Object.values(selectedResources).some(Boolean);
    if (!anySelected) {
      errs.resources = 'Please select at least one emergency resource.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setSubmissionError(null);
    if (!validate()) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate Case ID matching web app format (e.g. CB-YYYYMMDD-XXXX)
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const caseId = `CB-${datePart}-${randomPart}`;

      const isAttendantRole = currentUser?.role !== 'patient';
      const assignedPatientUid = isAttendantRole
        ? (selectedLinkId ? linkedPatients.find((l) => l.id === selectedLinkId)?.patientUid || ('patient-' + Date.now().toString().slice(-6)) : ('patient-' + Date.now().toString().slice(-6)))
        : (currentUser?.uid || 'patient-user');

      const urgency: UrgencyLevel =
        emergencyPriority === 'Critical'
          ? 'immediate'
          : emergencyPriority === 'High'
          ? 'emergency'
          : emergencyPriority === 'Medium'
          ? 'urgent'
          : 'semi-urgent';

      const requestDrafts: ResourceRequestDraft[] = [];

      if (selectedResources.beds) {
        requestDrafts.push({
          resourceType: 'bed',
          providerRole: 'hospital',
          details: { bedType: 'General Emergency Bed', notes: patientCondition.trim() },
        });
      }
      if (selectedResources.icu) {
        requestDrafts.push({
          resourceType: 'icu',
          providerRole: 'hospital',
          details: { bedType: 'ICU Bed', notes: patientCondition.trim() },
        });
      }
      if (selectedResources.blood) {
        requestDrafts.push({
          resourceType: 'blood',
          providerRole: 'bloodBank',
          details: { bloodGroup: patientBloodGroup, units: Number(bloodUnits), notes: 'Emergency transfusion requirement' },
        });
      }
      if (selectedResources.oxygen) {
        requestDrafts.push({
          resourceType: 'oxygen',
          providerRole: 'oxygenProvider',
          details: {
            cylinders: oxygenType === 'concentrator' ? 0 : Number(oxygenQuantity),
            concentrators: oxygenType === 'cylinder' ? 0 : Number(oxygenQuantity),
            oxygenType,
            notes: 'Emergency oxygen support',
          },
        });
      }
      if (selectedResources.ambulance) {
        requestDrafts.push({
          resourceType: 'ambulance',
          providerRole: 'ambulanceProvider',
          details: {
            vehicleType: ambulanceType,
            pickupAddress: incidentAddress.trim(),
          },
        });
      }
      if (selectedResources.doctor) {
        requestDrafts.push({
          resourceType: 'doctor',
          providerRole: 'doctor',
          details: { doctorType: 'Emergency Physician', notes: patientCondition.trim() },
        });
      }

      const activeServices = [
        selectedResources.beds && 'Hospital Beds',
        selectedResources.icu && 'ICU Facilities',
        selectedResources.blood && 'Blood Supply',
        selectedResources.oxygen && 'Oxygen Supply',
        selectedResources.ambulance && 'Ambulance',
        selectedResources.doctor && 'Doctor Consultation',
      ].filter(Boolean) as string[];

      const emergencyCase: EmergencyCase = {
        caseId,
        patientUid: assignedPatientUid,
        requesterUid: currentUser?.uid || assignedPatientUid,
        requesterRole: currentUser?.role || 'patient',
        ...(isAttendantRole ? { attendantUid: currentUser?.uid } : {}),
        createdBy: isAttendantRole ? 'attendant' : 'patient',
        patientName: patientName.trim(),
        patientAge: Number(patientAge.trim()),
        patientGender,
        patientBloodGroup,
        category: emergencyCategory,
        emergencyCategory,
        priority: emergencyPriority,
        emergencyPriority,
        conditionSummary: patientCondition.trim(),
        patientCondition: patientCondition.trim(),
        urgencyLevel: urgency,
        triagePriority: urgency,
        resourcesNeeded: requestDrafts.map((r) => r.resourceType),
        requiredServices: activeServices,
        location: {
          city: currentUser?.city || 'Hubballi',
          address: incidentAddress.trim(),
          state: currentUser?.state || 'Karnataka',
          coordinates: {
            lat: patientLocation.latitude,
            lng: patientLocation.longitude,
          },
        },
        incidentAddress: incidentAddress.trim(),
        matchedHospitalName: selectedHospital?.name || 'KIMS Super Specialty Hospital',
        assignedHospitalName: selectedHospital?.name || 'KIMS Super Specialty Hospital',
        assignedHospitalUid: selectedHospital?.id || INITIAL_HOSPITAL.uid,
        attendant: {
          ...(isAttendantRole ? { uid: currentUser?.uid } : {}),
          name: attendantName.trim() || currentUser?.displayName || '',
          relation: attendantRelation.trim() || 'Attendant',
          phone: attendantPhone.trim() || currentUser?.phone || '',
        },
        status: 'REQUESTED',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      const result = await createEmergencySubmission(
        emergencyCase,
        requestDrafts,
        'Hubballi'
      );

      // Navigate to Case Details screen
      router.replace({
        pathname: '/(patient)/case-details',
        params: { caseId },
      });
    } catch (err: any) {
      console.error('[CareBridge New Case] Submission failed:', err);
      setSubmissionError(err?.message || 'Emergency case could not be submitted. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Top Bar Navigation */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={18} color={Colors.textSecondary} />
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <View style={styles.titleBanner}>
            <Text style={styles.screenTitle}>Create Emergency Case</Text>
            <Text style={styles.screenSubtitle}>
              Select required medical resources and provide patient triage details
            </Text>
          </View>

          {submissionError && (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color={Colors.critical} />
              <Text style={styles.errorText}>{submissionError}</Text>
            </View>
          )}

          {/* ======================================================= */}
          {/* SECTION 1: SELECT RESOURCES                             */}
          {/* ======================================================= */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>1. Select Emergency Resources</Text>
            {formErrors.resources && (
              <Text style={styles.validationErrorText}>{formErrors.resources}</Text>
            )}

            <View style={styles.resourceGrid}>
              {/* Hospital Beds */}
              <TouchableOpacity
                onPress={() => toggleResource('beds')}
                style={[
                  styles.resourceBox,
                  selectedResources.beds ? styles.resourceBoxSelected : null,
                ]}
              >
                {selectedResources.beds && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color="#FFFFFF" />
                  </View>
                )}
                <HospitalBedIcon isSelected={selectedResources.beds} size={40} />
                <Text style={[styles.resourceBoxText, selectedResources.beds ? styles.resourceBoxTextSelected : null]}>
                  Hospital Beds
                </Text>
              </TouchableOpacity>

              {/* ICU Facilities */}
              <TouchableOpacity
                onPress={() => toggleResource('icu')}
                style={[
                  styles.resourceBox,
                  selectedResources.icu ? styles.resourceBoxSelected : null,
                ]}
              >
                {selectedResources.icu && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color="#FFFFFF" />
                  </View>
                )}
                <IcuFacilityIcon isSelected={selectedResources.icu} size={40} />
                <Text style={[styles.resourceBoxText, selectedResources.icu ? styles.resourceBoxTextSelected : null]}>
                  ICU Facilities
                </Text>
              </TouchableOpacity>

              {/* Blood */}
              <TouchableOpacity
                onPress={() => toggleResource('blood')}
                style={[
                  styles.resourceBox,
                  selectedResources.blood ? styles.resourceBoxSelected : null,
                ]}
              >
                {selectedResources.blood && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color="#FFFFFF" />
                  </View>
                )}
                <BloodDropIcon isSelected={selectedResources.blood} size={36} />
                <Text style={[styles.resourceBoxText, selectedResources.blood ? styles.resourceBoxTextSelected : null]}>
                  Blood Units
                </Text>
              </TouchableOpacity>

              {/* Oxygen */}
              <TouchableOpacity
                onPress={() => toggleResource('oxygen')}
                style={[
                  styles.resourceBox,
                  selectedResources.oxygen ? styles.resourceBoxSelected : null,
                ]}
              >
                {selectedResources.oxygen && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color="#FFFFFF" />
                  </View>
                )}
                <OxygenTankIcon isSelected={selectedResources.oxygen} size={36} />
                <Text style={[styles.resourceBoxText, selectedResources.oxygen ? styles.resourceBoxTextSelected : null]}>
                  Oxygen Supply
                </Text>
              </TouchableOpacity>

              {/* Ambulance */}
              <TouchableOpacity
                onPress={() => toggleResource('ambulance')}
                style={[
                  styles.resourceBox,
                  selectedResources.ambulance ? styles.resourceBoxSelected : null,
                ]}
              >
                {selectedResources.ambulance && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color="#FFFFFF" />
                  </View>
                )}
                <AmbulanceVehicleIcon isSelected={selectedResources.ambulance} size={40} />
                <Text style={[styles.resourceBoxText, selectedResources.ambulance ? styles.resourceBoxTextSelected : null]}>
                  Ambulance
                </Text>
              </TouchableOpacity>

              {/* Doctor Consultation */}
              <TouchableOpacity
                onPress={() => toggleResource('doctor')}
                style={[
                  styles.resourceBox,
                  selectedResources.doctor ? styles.resourceBoxSelected : null,
                ]}
              >
                {selectedResources.doctor && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color="#FFFFFF" />
                  </View>
                )}
                <DoctorAssistanceIcon isSelected={selectedResources.doctor} size={36} />
                <Text style={[styles.resourceBoxText, selectedResources.doctor ? styles.resourceBoxTextSelected : null]}>
                  Doctor Support
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* ======================================================= */}
          {/* SECTION: NEARBY HOSPITALS & 2 KM PRECISION MAP SELECTION */}
          {/* ======================================================= */}
          <Card style={styles.sectionCard}>
            <View style={styles.hospSectionTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeading}>2. Designated Hospital & 2 km Map</Text>
                <Text style={styles.sectionSubHeading}>
                  GPS coordinates calculate eligible hospitals within 2.0 km with live beds & ICU telemetry.
                </Text>
              </View>
              {selectedHospital && (
                <View style={styles.selectedHospBadge}>
                  <Check size={12} color="#0D9488" />
                  <Text style={styles.selectedHospBadgeText} numberOfLines={1}>
                    {selectedHospital.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Interactive Location & Precision Map Component */}
            <PatientLocationMap
              patientLocation={patientLocation}
              hospitalsWithin2km={radiusResult.within2km}
              hospitalsOutside2km={radiusResult.outside2km}
              selectedHospital={selectedHospital}
              onSelectHospital={(hosp) => setSelectedHospital(hosp)}
              onRefreshLocation={handleDetectLocation}
              onManualAddressClick={() => setShowManualSearch(!showManualSearch)}
              isLoadingLocation={isLoadingLocation}
            />

            {/* Optional Manual Search & Regional Override Toggle */}
            <View style={styles.manualOverrideSection}>
              <TouchableOpacity
                onPress={() => setShowManualSearch(!showManualSearch)}
                style={styles.toggleManualBtn}
                activeOpacity={0.7}
              >
                <Search size={14} color="#64748B" />
                <Text style={styles.toggleManualText}>
                  {showManualSearch
                    ? 'Hide Manual Area Override'
                    : 'Search Different Area or Landmark'}
                </Text>
              </TouchableOpacity>

              {showManualSearch && (
                <View style={styles.manualSearchBox}>
                  <View style={styles.searchBarRow}>
                    <Search size={16} color={Colors.primary} />
                    <TextInput
                      style={styles.searchInput}
                      value={searchLocation}
                      onChangeText={(text) => {
                        setSearchLocation(text);
                        setIncidentAddress(text);
                      }}
                      placeholder="Enter street, landmark, area (e.g. Vidyanagar, Sattur)..."
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>

                  {/* Popular Location Chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.popularChipsContainer}
                  >
                    {POPULAR_LOCATIONS.map((loc) => {
                      const isActive = searchLocation
                        .toLowerCase()
                        .includes(loc.label.toLowerCase());
                      return (
                        <TouchableOpacity
                          key={loc.label}
                          onPress={() => handleSelectPopularLocation(loc)}
                          style={[
                            styles.locationChip,
                            isActive ? styles.locationChipActive : null,
                          ]}
                        >
                          <MapPin
                            size={11}
                            color={isActive ? '#FFFFFF' : Colors.primary}
                          />
                          <Text
                            style={[
                              styles.locationChipText,
                              isActive ? styles.locationChipTextActive : null,
                            ]}
                          >
                            {loc.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </Card>

          {/* ======================================================= */}
          {/* SECTION 3: PATIENT INFORMATION                          */}
          {/* ======================================================= */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>3. Patient Information</Text>

            {/* If Attendant with linked patients: Quick selector */}
            {currentUser?.role !== 'patient' && linkedPatients.length > 0 && (
              <View style={styles.linkedPatientPrompt}>
                <Text style={styles.linkedPromptTitle}>Prefill from Linked Patient:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {linkedPatients.map((lp) => (
                    <TouchableOpacity
                      key={lp.id}
                      onPress={() => applyPatientLink(lp)}
                      style={[
                        styles.linkedPill,
                        selectedLinkId === lp.id ? styles.linkedPillActive : null,
                      ]}
                    >
                      <Text style={[styles.linkedPillText, selectedLinkId === lp.id ? styles.linkedPillTextActive : null]}>
                        {lp.patientName} ({lp.relationship})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Input
              label="Patient Full Name"
              placeholder="e.g. Rahul Deshpande"
              value={patientName}
              onChangeText={(t) => {
                setPatientName(t);
                if (formErrors.patientName) setFormErrors((p) => ({ ...p, patientName: '' }));
              }}
              error={formErrors.patientName}
              required
            />

            <View style={styles.rowTwo}>
              <Input
                label="Age (Years)"
                placeholder="42"
                value={patientAge}
                onChangeText={(t) => {
                  setPatientAge(t);
                  if (formErrors.patientAge) setFormErrors((p) => ({ ...p, patientAge: '' }));
                }}
                keyboardType="numeric"
                containerStyle={{ flex: 1 }}
                error={formErrors.patientAge}
                required
              />

              <View style={{ flex: 1, marginBottom: 12 }}>
                <Text style={styles.selectLabel}>Gender</Text>
                <View style={styles.pickerRow}>
                  {['Male', 'Female', 'Other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setPatientGender(g)}
                      style={[
                        styles.pillOption,
                        patientGender === g ? styles.pillOptionActive : null,
                      ]}
                    >
                      <Text style={[styles.pillOptionText, patientGender === g ? styles.pillOptionTextActive : null]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.selectLabel}>Blood Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    onPress={() => setPatientBloodGroup(bg)}
                    style={[
                      styles.bloodPill,
                      patientBloodGroup === bg ? styles.bloodPillActive : null,
                    ]}
                  >
                    <Text style={[styles.bloodPillText, patientBloodGroup === bg ? styles.bloodPillTextActive : null]}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Input
              label="Primary Medical Complaint / Chief Condition"
              placeholder="e.g. Acute chest pain, dyspnea, trauma"
              value={patientCondition}
              onChangeText={(t) => {
                setPatientCondition(t);
                if (formErrors.patientCondition) setFormErrors((p) => ({ ...p, patientCondition: '' }));
              }}
              error={formErrors.patientCondition}
              multiline
              numberOfLines={2}
              required
            />
          </Card>

          {/* ======================================================= */}
          {/* SECTION 3: TRIAGE & PRIORITY                            */}
          {/* ======================================================= */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>3. Triage & Urgency Level</Text>

            <View style={styles.priorityGrid}>
              <TouchableOpacity
                onPress={() => setEmergencyPriority('Critical')}
                style={[
                  styles.priorityBox,
                  emergencyPriority === 'Critical' ? styles.criticalBoxActive : null,
                ]}
              >
                <Text style={[styles.priorityBadge, { backgroundColor: Colors.critical, color: '#fff' }]}>CRITICAL</Text>
                <Text style={styles.priorityBoxTitle}>Level 1 Immediate</Text>
                <Text style={styles.priorityBoxDesc}>Immediate resuscitation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEmergencyPriority('High')}
                style={[
                  styles.priorityBox,
                  emergencyPriority === 'High' ? styles.emergencyBoxActive : null,
                ]}
              >
                <Text style={[styles.priorityBadge, { backgroundColor: Colors.emergency, color: '#fff' }]}>HIGH</Text>
                <Text style={styles.priorityBoxTitle}>Level 2 Emergency</Text>
                <Text style={styles.priorityBoxDesc}>Urgent care within 15 mins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEmergencyPriority('Medium')}
                style={[
                  styles.priorityBox,
                  emergencyPriority === 'Medium' ? styles.urgentBoxActive : null,
                ]}
              >
                <Text style={[styles.priorityBadge, { backgroundColor: Colors.urgent, color: '#fff' }]}>MEDIUM</Text>
                <Text style={styles.priorityBoxTitle}>Level 3 Urgent</Text>
                <Text style={styles.priorityBoxDesc}>Stabilization within 30 mins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setEmergencyPriority('Low')}
                style={[
                  styles.priorityBox,
                  emergencyPriority === 'Low' ? styles.routineBoxActive : null,
                ]}
              >
                <Text style={[styles.priorityBadge, { backgroundColor: Colors.semiUrgent, color: '#fff' }]}>LOW</Text>
                <Text style={styles.priorityBoxTitle}>Level 4 Routine</Text>
                <Text style={styles.priorityBoxDesc}>Standard emergency intake</Text>
              </TouchableOpacity>
            </View>

            {/* Resource Specific Fields */}
            {selectedResources.blood && (
              <View style={styles.subConfigRow}>
                <Input
                  label="Blood Units Required"
                  placeholder="2"
                  value={bloodUnits}
                  onChangeText={setBloodUnits}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
              </View>
            )}

            {selectedResources.oxygen && (
              <View style={styles.subConfigRow}>
                <Input
                  label="Oxygen Quantity (Units)"
                  placeholder="2"
                  value={oxygenQuantity}
                  onChangeText={setOxygenQuantity}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
              </View>
            )}

            <Input
              label="Incident Location / Pickup Address"
              placeholder="e.g. Vidyanagar, PB Road, Hubballi"
              value={incidentAddress}
              onChangeText={(t) => {
                setIncidentAddress(t);
                if (formErrors.incidentAddress) setFormErrors((p) => ({ ...p, incidentAddress: '' }));
              }}
              error={formErrors.incidentAddress}
              leftIcon={<MapPin size={16} color={Colors.critical} />}
              required
            />
          </Card>

          {/* ======================================================= */}
          {/* SECTION 4: ATTENDANT & LEGAL CONSENT                    */}
          {/* ======================================================= */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>4. Attendant & Patient Consent</Text>

            <Input
              label="Attendant / Contact Person"
              placeholder="e.g. Suresh Deshpande"
              value={attendantName}
              onChangeText={setAttendantName}
            />

            <View style={styles.rowTwo}>
              <Input
                label="Relationship to Patient"
                placeholder="Parent / Spouse / Self"
                value={attendantRelation}
                onChangeText={setAttendantRelation}
                containerStyle={{ flex: 1 }}
              />

              <Input
                label="Emergency Phone"
                placeholder="+91 98451 98765"
                value={attendantPhone}
                onChangeText={setAttendantPhone}
                keyboardType="phone-pad"
                containerStyle={{ flex: 1 }}
              />
            </View>

            {/* Consent Checkbox */}
            <TouchableOpacity
              onPress={() => setConsentConfirmed(!consentConfirmed)}
              style={styles.consentRow}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, consentConfirmed ? styles.checkboxChecked : null]}>
                {consentConfirmed && <Check size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.consentText}>
                I confirm that explicit consent has been authorized by the patient or legal guardian to initiate emergency triage and transmit medical requisitions to the verified CareBridge healthcare network.
              </Text>
            </TouchableOpacity>
            {formErrors.consent && (
              <Text style={styles.validationErrorText}>{formErrors.consent}</Text>
            )}
          </Card>

          {/* Submit Action Button */}
          <Button
            title="Submit Emergency Case to Network"
            onPress={handleSubmit}
            loading={isSubmitting}
            variant="danger"
            size="lg"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 10,
  },
  backButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  titleBanner: {
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F3868',
  },
  screenSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.criticalBg,
    borderColor: Colors.criticalBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: Colors.critical,
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  sectionCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F3868',
    marginBottom: 12,
  },
  validationErrorText: {
    color: Colors.critical,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resourceBox: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  resourceBoxSelected: {
    backgroundColor: '#00707E',
    borderColor: '#00707E',
    elevation: 3,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceBoxText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  resourceBoxTextSelected: {
    color: '#FFFFFF',
  },
  linkedPatientPrompt: {
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  linkedPromptTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
  },
  linkedPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkedPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  linkedPillText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
  },
  linkedPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  pillOptionActive: {
    backgroundColor: '#E0F2FE',
    borderColor: Colors.cyan,
  },
  pillOptionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pillOptionTextActive: {
    color: Colors.navy,
    fontWeight: '800',
  },
  bloodPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  bloodPillActive: {
    backgroundColor: '#FEE2E2',
    borderColor: Colors.critical,
  },
  bloodPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  bloodPillTextActive: {
    color: Colors.critical,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  priorityBox: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  criticalBoxActive: {
    backgroundColor: Colors.criticalBg,
    borderColor: Colors.critical,
  },
  emergencyBoxActive: {
    backgroundColor: Colors.emergencyBg,
    borderColor: Colors.emergency,
  },
  urgentBoxActive: {
    backgroundColor: Colors.urgentBg,
    borderColor: Colors.urgent,
  },
  routineBoxActive: {
    backgroundColor: Colors.semiUrgentBg,
    borderColor: Colors.semiUrgent,
  },
  priorityBadge: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  priorityBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  priorityBoxDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  subConfigRow: {
    flexDirection: 'row',
    gap: 10,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 20,
  },
  // Designated Hospital & Map Selection Styles
  hospSectionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionSubHeading: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  selectedHospBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    maxWidth: '55%',
  },
  selectedHospBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  manualOverrideSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  toggleManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  toggleManualText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  manualSearchBox: {
    marginTop: 8,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    padding: 0,
  },
  popularChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 2,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  locationChipActive: {
    backgroundColor: '#00707E',
    borderColor: '#00707E',
  },
  locationChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  locationChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mapCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
    marginBottom: 8,
  },
  mapTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  directionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  directionsLinkText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  toggleMapBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  toggleMapBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  mapBox: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  nativeMapPreview: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
  },
  nativeMapTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nativeMapSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 8,
  },
  nativeGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#00707E',
    paddingVertical: 6,
    borderRadius: 8,
  },
  nativeGpsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nearbyListLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  hospitalSelectionList: {
    gap: 8,
  },
  hospSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  hospSelectCardActive: {
    borderColor: '#00707E',
    backgroundColor: '#F0FDFA',
  },
  hospSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  hospTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hospTypeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  hospErBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hospErBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  hospSelectAddress: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 3,
  },
  hospBedsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
  },
  bedTelemetryPill: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  icuTelemetryPill: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  oxyTelemetryPill: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0E7490',
    backgroundColor: '#CFFAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectRadioBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  selectRadioBtnActive: {
    backgroundColor: '#00707E',
    borderColor: '#00707E',
  },
  selectRadioBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  selectRadioBtnTextActive: {
    color: '#FFFFFF',
  },
});
