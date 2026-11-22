/**
 * Emergency SOS Modal Component
 * 1-Tap fast emergency request without registration or login.
 * Captures patient name, age, blood group, emergency type, contact number,
 * and automatic device GPS coordinates with separate accuracy indicators.
 * Submits directly to Firestore and provides live real-time dispatch tracking.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import {
  Siren,
  X,
  MapPin,
  Crosshair,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Car,
  HeartPulse,
  AlertCircle,
  Truck,
  RefreshCw,
  Edit3,
  Copy,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react-native';
import {
  getCurrentPatientLocation,
  DEFAULT_EMERGENCY_COORDINATES,
  GpsLocationData,
} from '../../services/gpsLocationService';
import {
  submitEmergencySosRequest,
  subscribeSingleCaseFromFirestore,
  EmergencySosResult,
} from '../../services/dataService';
import { EmergencyCase } from '../../types';

interface EmergencySosModalProps {
  visible: boolean;
  onClose: () => void;
  initialPatientName?: string;
  initialPhone?: string;
}

const BLOOD_GROUPS = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export function EmergencySosModal({
  visible,
  onClose,
  initialPatientName = '',
  initialPhone = '',
}: EmergencySosModalProps) {
  // Form State
  const [emergencyType, setEmergencyType] = useState<'Accident' | 'Medical Emergency' | 'Other'>('Accident');
  const [patientName, setPatientName] = useState(initialPatientName);
  const [patientAge, setPatientAge] = useState('');
  const [patientBloodGroup, setPatientBloodGroup] = useState('Unknown');
  const [contactNumber, setContactNumber] = useState(initialPhone);

  // Location State
  const [location, setLocation] = useState<GpsLocationData>(DEFAULT_EMERGENCY_COORDINATES);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [showManualAddress, setShowManualAddress] = useState(false);

  // Submission & Tracking State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [sosResult, setSosResult] = useState<EmergencySosResult | null>(null);
  const [liveCase, setLiveCase] = useState<EmergencyCase | null>(null);
  const [copiedCaseId, setCopiedCaseId] = useState(false);

  // Auto-request GPS upon modal opening
  useEffect(() => {
    if (visible && !sosResult) {
      detectLocation();
    }
  }, [visible]);

  // Subscribe to real-time status updates once SOS is created
  useEffect(() => {
    if (sosResult?.caseId) {
      const unsub = subscribeSingleCaseFromFirestore(sosResult.caseId, (c) => {
        if (c) {
          setLiveCase(c);
        }
      });
      return () => unsub();
    }
  }, [sosResult?.caseId]);

  const detectLocation = async () => {
    setIsLoadingLocation(true);
    const res = await getCurrentPatientLocation();
    setIsLoadingLocation(false);
    if (res.success && res.data) {
      setLocation(res.data);
      if (res.data.address) {
        setManualAddress(res.data.address);
      }
      if (res.data.accuracyTier === 'poor') {
        setShowManualAddress(true);
      }
    } else {
      setShowManualAddress(true);
    }
  };

  const handleManualLocationChange = (text: string) => {
    setManualAddress(text);
    setLocation((prev) => ({
      ...prev,
      address: text,
      isManual: true,
    }));
  };

  const handleSubmitSos = async () => {
    setSubmissionError(null);

    const name = patientName.trim();
    if (!name) {
      setSubmissionError('Please enter a patient or bystander name.');
      return;
    }

    const ageNum = Number(patientAge.trim());
    if (!patientAge.trim() || isNaN(ageNum) || ageNum <= 0 || ageNum > 125) {
      setSubmissionError('Please enter a valid age (1-125).');
      return;
    }

    const finalAddress = manualAddress.trim() || location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;

    setIsSubmitting(true);
    try {
      const result = await submitEmergencySosRequest({
        patientName: name,
        patientAge: ageNum,
        patientBloodGroup,
        contactNumber: contactNumber.trim() || undefined,
        emergencyType,
        latitude: location.latitude,
        longitude: location.longitude,
        incidentAddress: finalAddress,
        accuracyMeters: location.accuracy,
      });

      setSosResult(result);
      setLiveCase(result.emergencyCase);
    } catch (err: any) {
      setSubmissionError(err?.message || 'Failed to trigger emergency SOS. Please dial 108 immediately.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSosResult(null);
      setLiveCase(null);
      setSubmissionError(null);
      onClose();
    }
  };

  const handleCopyCaseId = () => {
    if (sosResult?.caseId) {
      setCopiedCaseId(true);
      setTimeout(() => setCopiedCaseId(false), 2500);
    }
  };

  const handleCallEmergency108 = () => {
    Linking.openURL('tel:108').catch(() => {});
  };

  const handleCallProvider = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {});
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.sirenIconWrap}>
                <Siren size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.headerBadgeRow}>
                  <Text style={styles.headerTitle}>EMERGENCY SOS</Text>
                  <View style={styles.instantBadge}>
                    <Text style={styles.instantBadgeText}>1-TAP DISPATCH</Text>
                  </View>
                </View>
                <Text style={styles.headerSub}>Immediate Ambulance & Response • No Login Required</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ======================================================= */}
          {/* MODE 1: FORM INPUT                                      */}
          {/* ======================================================= */}
          {!sosResult ? (
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {submissionError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color="#B91C1C" />
                  <Text style={styles.errorBannerText}>{submissionError}</Text>
                </View>
              )}

              {/* 1. Emergency Type Selector */}
              <Text style={styles.fieldLabel}>1. Emergency Situation *</Text>
              <View style={styles.typeCardsRow}>
                <TouchableOpacity
                  style={[styles.typeCard, emergencyType === 'Accident' ? styles.typeCardActive : null]}
                  onPress={() => setEmergencyType('Accident')}
                  activeOpacity={0.8}
                >
                  <Car size={22} color={emergencyType === 'Accident' ? '#DC2626' : '#64748B'} />
                  <Text style={[styles.typeCardTitle, emergencyType === 'Accident' ? styles.typeCardTitleActive : null]}>
                    Road Accident
                  </Text>
                  <Text style={styles.typeCardSub}>Crash / Trauma</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeCard, emergencyType === 'Medical Emergency' ? styles.typeCardActive : null]}
                  onPress={() => setEmergencyType('Medical Emergency')}
                  activeOpacity={0.8}
                >
                  <HeartPulse size={22} color={emergencyType === 'Medical Emergency' ? '#DC2626' : '#64748B'} />
                  <Text style={[styles.typeCardTitle, emergencyType === 'Medical Emergency' ? styles.typeCardTitleActive : null]}>
                    Medical Emergency
                  </Text>
                  <Text style={styles.typeCardSub}>Cardiac / Vitals</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeCard, emergencyType === 'Other' ? styles.typeCardActive : null]}
                  onPress={() => setEmergencyType('Other')}
                  activeOpacity={0.8}
                >
                  <AlertTriangle size={22} color={emergencyType === 'Other' ? '#DC2626' : '#64748B'} />
                  <Text style={[styles.typeCardTitle, emergencyType === 'Other' ? styles.typeCardTitleActive : null]}>
                    Other Incident
                  </Text>
                  <Text style={styles.typeCardSub}>Urgent SOS</Text>
                </TouchableOpacity>
              </View>

              {/* 2. Patient Basic Information */}
              <View style={styles.formRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>Patient Full Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={patientName}
                    onChangeText={setPatientName}
                    placeholder="e.g. Rahul Patil or Unknown Bystander"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Age *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={patientAge}
                    onChangeText={setPatientAge}
                    keyboardType="numeric"
                    placeholder="e.g. 30"
                    placeholderTextColor="#94A3B8"
                    maxLength={3}
                  />
                </View>
              </View>

              {/* 3. Blood Group (Optional) */}
              <Text style={styles.fieldLabel}>Blood Group (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bloodScroll}>
                {BLOOD_GROUPS.map((bg) => {
                  const isSel = patientBloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      style={[styles.bloodPill, isSel ? styles.bloodPillActive : null]}
                      onPress={() => setPatientBloodGroup(bg)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.bloodPillText, isSel ? styles.bloodPillTextActive : null]}>{bg}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 4. Contact Phone (Optional) */}
              <Text style={styles.fieldLabel}>Contact Number (Optional for Responders)</Text>
              <TextInput
                style={styles.textInput}
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
                placeholder="+91 98452 11084"
                placeholderTextColor="#94A3B8"
              />

              {/* 5. Detected GPS Location & Accuracy */}
              <View style={styles.gpsContainer}>
                <View style={styles.gpsHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Crosshair size={15} color="#0D9488" />
                    <Text style={styles.gpsSectionTitle}>Current GPS Coordinates</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.recalibrateBtn}
                    onPress={detectLocation}
                    disabled={isLoadingLocation}
                    activeOpacity={0.7}
                  >
                    {isLoadingLocation ? (
                      <ActivityIndicator size="small" color="#0D9488" />
                    ) : (
                      <>
                        <RefreshCw size={12} color="#0D9488" />
                        <Text style={styles.recalibrateBtnText}>Refresh</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* GPS Accuracy Status Pill */}
                <View
                  style={[
                    styles.accuracyPill,
                    location.accuracyTier === 'good'
                      ? styles.accuracyPillGood
                      : location.accuracyTier === 'caution'
                      ? styles.accuracyPillCaution
                      : styles.accuracyPillPoor,
                  ]}
                >
                  <Text
                    style={[
                      styles.accuracyPillText,
                      location.accuracyTier === 'good'
                        ? { color: '#15803D' }
                        : location.accuracyTier === 'caution'
                        ? { color: '#B45309' }
                        : { color: '#B91C1C' },
                    ]}
                  >
                    📡 {location.accuracyLabel}
                  </Text>
                  <Text style={styles.coordsMiniText}>
                    {location.latitude.toFixed(5)}°, {location.longitude.toFixed(5)}°
                  </Text>
                </View>

                {/* Detected Address Display */}
                <Text style={styles.detectedAddressText} numberOfLines={2}>
                  📍 {manualAddress || location.address || 'Detecting satellite position...'}
                </Text>

                {/* Manual Address Toggle */}
                <TouchableOpacity
                  style={styles.manualAddressToggle}
                  onPress={() => setShowManualAddress(!showManualAddress)}
                  activeOpacity={0.7}
                >
                  <Edit3 size={13} color="#0D9488" />
                  <Text style={styles.manualAddressToggleText}>
                    {showManualAddress ? 'Hide Manual Edit' : 'Edit or Enter Address Manually'}
                  </Text>
                </TouchableOpacity>

                {showManualAddress && (
                  <TextInput
                    style={styles.manualAddressInput}
                    value={manualAddress}
                    onChangeText={handleManualLocationChange}
                    placeholder="Enter street, landmark, accident scene location..."
                    placeholderTextColor="#94A3B8"
                    multiline
                  />
                )}
              </View>

              {/* Prominent Send Emergency SOS Button */}
              <TouchableOpacity
                style={[styles.sosSubmitBtn, isSubmitting ? styles.sosSubmitBtnDisabled : null]}
                onPress={handleSubmitSos}
                disabled={isSubmitting}
                activeOpacity={0.9}
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.sosSubmitBtnText}>Alerting Dispatch & Ambulance...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Siren size={22} color="#FFFFFF" />
                    <Text style={styles.sosSubmitBtnText}>SEND EMERGENCY SOS NOW</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimerNote}>
                Direct 1-tap emergency dispatch. False requests are strictly prohibited and subject to legal prosecution.
              </Text>
            </ScrollView>
          ) : (
            /* ======================================================= */
            /* MODE 2: LIVE EMERGENCY SOS STATUS TRACKER               */
            /* ======================================================= */
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {/* Success Alert Banner */}
              <View style={styles.successTrackerHeader}>
                <View style={styles.successPulseCircle}>
                  <CheckCircle2 size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.successTrackerTitle}>Emergency SOS Dispatched!</Text>
                <Text style={styles.successTrackerSub}>
                  Central Coordination and emergency teams have received your high-priority alert.
                </Text>
              </View>

              {/* Case ID Card */}
              <View style={styles.caseIdCard}>
                <View>
                  <Text style={styles.caseIdLabel}>EMERGENCY CASE ID</Text>
                  <Text style={styles.caseIdValue}>{sosResult.caseId}</Text>
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCaseId} activeOpacity={0.7}>
                  <Copy size={14} color="#0D9488" />
                  <Text style={styles.copyBtnText}>{copiedCaseId ? 'Copied ✓' : 'Copy ID'}</Text>
                </TouchableOpacity>
              </View>

              {/* Live Request Status Indicator */}
              <View style={styles.statusBox}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusBoxLabel}>CURRENT DISPATCH STATUS</Text>
                  <View style={styles.statusBadgeLive}>
                    <View style={styles.liveGreenDot} />
                    <Text style={styles.statusBadgeLiveText}>
                      {(liveCase?.status || 'REQUESTED').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.statusMessageText}>
                  {liveCase?.assignedAmbulanceName && liveCase.assignedAmbulanceName !== 'Pending Coordinator Dispatch'
                    ? `Assigned to ${liveCase.assignedAmbulanceName}. Provider alerted for immediate response.`
                    : sosResult.statusMessage}
                </Text>
              </View>

              {/* Ambulance Assignment Details */}
              <View style={styles.assignmentCard}>
                <View style={styles.assignmentHeaderRow}>
                  <Truck size={18} color="#D97706" />
                  <Text style={styles.assignmentCardTitle}>Ambulance Dispatch Telemetry</Text>
                </View>

                {sosResult.ambulanceAssigned && sosResult.assignedProviderName ? (
                  <View style={styles.providerDetailsStack}>
                    <Text style={styles.providerNameText}>{sosResult.assignedProviderName}</Text>
                    <Text style={styles.providerMetaText}>
                      Vehicle: <Text style={{ fontWeight: '700' }}>ALS Advanced Life Support</Text> • 24/7 Verified Fleet
                    </Text>

                    {sosResult.assignedProviderPhone && (
                      <TouchableOpacity
                        style={styles.callProviderBtn}
                        onPress={() => handleCallProvider(sosResult.assignedProviderPhone)}
                        activeOpacity={0.8}
                      >
                        <Phone size={14} color="#FFFFFF" />
                        <Text style={styles.callProviderBtnText}>Call Driver: {sosResult.assignedProviderPhone}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.noAmbulanceBox}>
                    <AlertTriangle size={18} color="#B45309" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noAmbulanceTitle}>Assistance Not Yet Confirmed</Text>
                      <Text style={styles.noAmbulanceDesc}>
                        No verified ambulance was immediately available nearby. Central Command Dispatch is actively routing external regional units.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Incident Scene Pickup Coordinates */}
              <View style={styles.pickupCard}>
                <Text style={styles.pickupCardLabel}>PICKUP LOCATION BROADCASTED</Text>
                <Text style={styles.pickupCardAddress}>
                  📍 {liveCase?.location?.address || location.address || 'GPS Scene'}
                </Text>
                <Text style={styles.pickupCoords}>
                  Coordinates: {location.latitude.toFixed(5)}°, {location.longitude.toFixed(5)}° (±{location.accuracy || 25}m)
                </Text>
              </View>

              {/* Direct 108 Emergency Call Button */}
              <TouchableOpacity
                style={styles.call108Btn}
                onPress={handleCallEmergency108}
                activeOpacity={0.85}
              >
                <Phone size={18} color="#FFFFFF" />
                <Text style={styles.call108BtnText}>Call 108 National Emergency Hotline Directly</Text>
              </TouchableOpacity>

              {/* Done / Close Tracker */}
              <TouchableOpacity style={styles.closeTrackerBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.closeTrackerBtnText}>Return to Home Screen</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sirenIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.2,
  },
  instantBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  instantBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 1,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '700',
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  typeCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  typeCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  typeCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#334155',
    marginTop: 6,
    textAlign: 'center',
  },
  typeCardTitleActive: {
    color: '#DC2626',
  },
  typeCardSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  bloodScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  bloodPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  bloodPillActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  bloodPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  bloodPillTextActive: {
    color: '#FFFFFF',
  },
  gpsContainer: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    marginTop: 14,
    marginBottom: 16,
  },
  gpsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gpsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
    textTransform: 'uppercase',
  },
  recalibrateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  recalibrateBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0D9488',
  },
  accuracyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  accuracyPillGood: {
    backgroundColor: '#DCFCE7',
  },
  accuracyPillCaution: {
    backgroundColor: '#FEF3C7',
  },
  accuracyPillPoor: {
    backgroundColor: '#FEE2E2',
  },
  accuracyPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  coordsMiniText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  detectedAddressText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 6,
  },
  manualAddressToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
  },
  manualAddressToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  manualAddressInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    color: '#0F172A',
    marginTop: 6,
    minHeight: 44,
  },
  sosSubmitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    marginBottom: 8,
  },
  sosSubmitBtnDisabled: {
    backgroundColor: '#F87171',
  },
  sosSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  disclaimerNote: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 14,
    paddingBottom: 10,
  },

  // ==========================================
  // TRACKER VIEW STYLES
  // ==========================================
  successTrackerHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successPulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#16A34A',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  successTrackerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  successTrackerSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    paddingHorizontal: 16,
  },
  caseIdCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  caseIdLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  caseIdValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0D9488',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  statusBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusBoxLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  statusBadgeLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusBadgeLiveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
  },
  statusMessageText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
    fontWeight: '500',
  },
  assignmentCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  assignmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  assignmentCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  providerDetailsStack: {
    gap: 4,
  },
  providerNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  providerMetaText: {
    fontSize: 11,
    color: '#78350F',
  },
  callProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  callProviderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  noAmbulanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
  },
  noAmbulanceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  noAmbulanceDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  pickupCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  pickupCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  pickupCardAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  pickupCoords: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 3,
  },
  call108Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  call108BtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  closeTrackerBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  closeTrackerBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});
