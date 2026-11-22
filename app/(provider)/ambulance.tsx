import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Truck,
  ShieldCheck,
  MapPin,
  Phone,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Plus,
  Play,
  Navigation,
  Clock,
  User,
  AlertCircle,
  Siren,
  ExternalLink,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../configuration/firebase';
import {
  dataStore,
  respondToRequestInFirestore,
  subscribeRequestsForProviderFromFirestore,
  subscribeProviderUpdateRequests,
  subscribeAmbulanceTripsForProviderFromFirestore,
  INITIAL_AMBULANCE,
} from '../../services/dataService';
import { Header } from '../../components/common/Header';
import { Colors } from '../../constants/colors';
import type {
  AmbulanceProfile,
  ResourceRequest,
  AmbulanceTrip,
  AmbulanceTripStatus,
  AmbulanceVehicle,
  ProviderUpdateRequest,
} from '../../types';

const tripStatuses: AmbulanceTripStatus[] = [
  'dispatched',
  'en_route',
  'arrived',
  'picked_up',
  'in_transit',
  'delivered',
  'completed',
];

export default function AmbulanceScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<AmbulanceProfile | null>(null);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [trips, setTrips] = useState<AmbulanceTrip[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<ProviderUpdateRequest | null>(null);

  // Add vehicle modal
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicleId, setNewVehicleId] = useState('KA-25-EM-1084');
  const [newVehicleType, setNewVehicleType] = useState<'BLS' | 'ALS' | 'Patient Transport'>('ALS');
  const [newDriverName, setNewDriverName] = useState('Anand Hiremath');
  const [newDriverPhone, setNewDriverPhone] = useState('+91 98452 11084');
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);

  // Rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const loadData = () => {
    if (!currentUser) return;
    const prof = dataStore.getAmbulanceProfile(currentUser.uid) || {
      ...INITIAL_AMBULANCE,
      uid: currentUser.uid,
      providerName: currentUser.displayName || 'Emergency Ambulance Fleet',
      registrationNumber: 'REG-AMB-001',
      licenseNumber: 'LIC-AMB-KA-1081',
      contactNumber: currentUser.phone || '+91 836 225 1080',
      totalVehicles: 0,
      availableVehicles: 0,
      vehicles: [],
      city: currentUser.city || 'Hubballi',
      state: currentUser.state || 'Karnataka',
      address: currentUser.address || 'Station Road Ambulance Depot',
      isVerified: true,
      lastUpdated: new Date().toISOString(),
    };
    if (prof) {
      setProfile({
        ...prof,
        vehicles: Array.isArray(prof.vehicles) ? prof.vehicles : [],
      });
    }
    setTrips(dataStore.getTrips().filter((t) => t.providerUid === currentUser.uid));
  };

  useEffect(() => {
    if (!currentUser) return;
    loadData();
    const unsubStore = dataStore.subscribe(loadData);

    let unsubDoc = () => {};
    if (isFirebaseConfigured && db) {
      try {
        unsubDoc = onSnapshot(doc(db, 'ambulanceProfiles', currentUser.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as AmbulanceProfile;
            const safeVehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
            setProfile({
              ...data,
              vehicles: safeVehicles,
              totalVehicles: safeVehicles.length,
              availableVehicles: safeVehicles.filter((v) => v.isAvailable).length,
            });
            if (data.pendingUpdate && (!data.pendingUpdate.status || data.pendingUpdate.status === 'PENDING')) {
              setPendingUpdate(data.pendingUpdate);
            } else if (data.pendingUpdate === null) {
              setPendingUpdate(null);
            }
          } else {
            try {
              await setDoc(doc(db, 'ambulanceProfiles', currentUser.uid), {
                uid: currentUser.uid,
                providerName: currentUser.displayName || INITIAL_AMBULANCE.providerName,
                licenseNumber: 'LIC-AMB-' + Date.now().toString().slice(-6),
                registrationNumber: 'AMB-' + Date.now().toString().slice(-6),
                contactNumber: currentUser.phone || '+91 800 000 0000',
                totalVehicles: 0,
                availableVehicles: 0,
                vehicles: [],
                city: currentUser.city || 'Hubballi',
                state: 'Karnataka',
                address: currentUser.address || 'Ambulance Station Address',
                isVerified: Boolean(currentUser.isVerified),
                lastUpdated: new Date().toISOString()
              }, { merge: true });
            } catch (e) {}
          }
        });
      } catch (e) {}
    }

    const unsubRequests = subscribeRequestsForProviderFromFirestore(
      currentUser.uid,
      (nextRequests) => {
        setRequests(nextRequests);
        setRequestsLoading(false);
      },
      () => {
        const local = dataStore.getRequestsForProvider(currentUser.uid);
        setRequests(local);
        setRequestsLoading(false);
      }
    );

    const unsubUpdates = subscribeProviderUpdateRequests((updates) => {
      const pending = updates.find(
        (u) => u.providerUid === currentUser.uid && (!u.status || u.status === 'PENDING')
      );
      setPendingUpdate(pending || null);
    });

    const unsubTrips = subscribeAmbulanceTripsForProviderFromFirestore(
      currentUser.uid,
      (nextTrips) => setTrips(nextTrips)
    );

    return () => {
      unsubStore();
      unsubDoc();
      unsubRequests();
      unsubUpdates();
      unsubTrips();
    };
  }, [currentUser]);

  const handleAddVehicle = async () => {
    if (!currentUser) return;
    if (!newVehicleId.trim() || !newDriverName.trim()) {
      Alert.alert('Validation Error', 'Vehicle registration and driver name are required.');
      return;
    }
    setIsSubmittingVehicle(true);
    const vehicle: AmbulanceVehicle = {
      vehicleId: newVehicleId.trim(),
      vehicleType: newVehicleType,
      driverName: newDriverName.trim(),
      driverPhone: newDriverPhone.trim(),
      isAvailable: true,
      currentStatus: 'idle',
    };
    const currentVehicles = Array.isArray(profile?.vehicles) ? profile.vehicles : [];
    const updatedVehicles = [...currentVehicles, vehicle];
    try {
      await dataStore.updateAmbulanceProfile(currentUser.uid, { vehicles: updatedVehicles });
      setShowAddVehicle(false);
      setSuccessMessage(`Vehicle ${newVehicleId} addition submitted for Coordinator approval.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setShowAddVehicle(false);
      setSuccessMessage(`Vehicle ${newVehicleId} addition recorded.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const handleToggleVehicleAvailability = async (vehicleId: string) => {
    if (!currentUser) return;
    const currentVehicles = Array.isArray(profile?.vehicles) ? profile.vehicles : [];
    const updatedVehicles = currentVehicles.map((v) =>
      v.vehicleId === vehicleId
        ? {
            ...v,
            isAvailable: !v.isAvailable,
            currentStatus: (!v.isAvailable ? 'idle' : 'on_trip') as 'idle' | 'on_trip',
          }
        : v
    );
    try {
      await dataStore.updateAmbulanceProfile(currentUser.uid, { vehicles: updatedVehicles });
      setSuccessMessage(`Vehicle availability updated.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setSuccessMessage(`Vehicle availability recorded.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleAdvanceTrip = (trip: AmbulanceTrip) => {
    const currentIndex = tripStatuses.indexOf(trip.status);
    if (currentIndex < tripStatuses.length - 1) {
      const nextStatus = tripStatuses[currentIndex + 1];
      dataStore.updateTripStatus(trip.tripId, nextStatus);
      setSuccessMessage(`Trip status advanced to ${nextStatus.toUpperCase().replace('_', ' ')}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleAcceptRequest = async (reqId: string) => {
    setIsResponding(true);
    try {
      const coordinatorNotified = await respondToRequestInFirestore(reqId, 'accepted');
      setSuccessMessage(
        coordinatorNotified
          ? 'Ambulance request accepted. Coordinator notified.'
          : 'Ambulance request accepted.'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not accept request.');
    } finally {
      setIsResponding(false);
    }
  };

  const openRejectModal = (reqId: string) => {
    setSelectedReqId(reqId);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedReqId) return;
    if (rejectionReason.trim().length < 5) {
      Alert.alert('Validation Error', 'Enter a rejection reason of at least 5 characters.');
      return;
    }
    setIsResponding(true);
    try {
      await respondToRequestInFirestore(selectedReqId, 'rejected', rejectionReason.trim());
      setRejectModalVisible(false);
      setSelectedReqId(null);
      setRejectionReason('');
      setSuccessMessage('Ambulance request declined.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not decline request.');
    } finally {
      setIsResponding(false);
    }
  };

  const isAccepted = (status?: string) =>
    ['accepted', 'completed', 'resolved', 'dispatched', 'confirmed', 'en_route'].includes(
      String(status || '').trim().toLowerCase()
    );

  const isRejected = (status?: string) =>
    ['rejected', 'declined', 'cancelled'].includes(
      String(status || '').trim().toLowerCase()
    );

  const isActionRequired = (status?: string) =>
    !isAccepted(status) && !isRejected(status);

  const activeRequests = requests.filter(
    (r) => r.assignedAt || r.assignmentCoordinatorUid || String(r.status).toUpperCase() !== 'REQUESTED'
  );
  const pendingRequests = activeRequests.filter((r) => isActionRequired(r.status));
  const activeTrips = trips.filter((t) => t.status !== 'completed');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View style={styles.bannerIconBox}>
              <Truck size={26} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowWrap}>
                <Text style={styles.providerName}>{profile?.providerName || 'Ambulance Depot'}</Text>
                {profile?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={12} color="#166534" />
                    <Text style={styles.verifiedText}>Certified Fleet</Text>
                  </View>
                )}
              </View>
              <View style={styles.detailsRow}>
                <MapPin size={12} color="#64748B" />
                <Text style={styles.detailsText}>
                  {profile?.address || 'Station Road'}, {profile?.city || 'Hubballi'}
                </Text>
              </View>
              <View style={styles.detailsRow}>
                <Phone size={12} color="#64748B" />
                <Text style={styles.detailsText}>{profile?.contactNumber || '+91 836 225 1080'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addVehicleBtn}
            onPress={() => setShowAddVehicle(true)}
          >
            <Plus size={15} color="#FFFFFF" />
            <Text style={styles.addVehicleBtnText}>Add Vehicle to Fleet</Text>
          </TouchableOpacity>
        </View>

        {successMessage && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={16} color="#15803D" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* ACTIVE TRIPS 7-STEP LIFECYCLE */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Navigation size={18} color="#D97706" />
              <Text style={styles.sectionTitle}>Active Emergency Trips</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeTrips.length} Active</Text>
            </View>
          </View>

          {activeTrips.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No trips currently in transit. Dispatched emergency requests appear here.
              </Text>
            </View>
          ) : (
            activeTrips.map((trip) => {
              const currentStepIndex = tripStatuses.indexOf(trip.status);
              const isFinal = trip.status === 'completed';

              return (
                <View key={trip.tripId} style={styles.tripCard}>
                  <View style={styles.tripHeader}>
                    <View>
                      <Text style={styles.tripIdText}>{trip.tripId}</Text>
                      <Text style={styles.tripCaseText}>Case: {trip.caseId}</Text>
                    </View>
                    <View style={styles.tripStatusBadge}>
                      <Text style={styles.tripStatusText}>
                        {trip.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripMetaRow}>
                    <Text style={styles.tripMetaText}>
                      Vehicle: <Text style={{ fontWeight: '700' }}>{trip.vehicleId}</Text> ({trip.vehicleType})
                    </Text>
                    <Text style={styles.tripMetaText}>
                      Driver: <Text style={{ fontWeight: '700' }}>{trip.driverName}</Text> ({trip.driverPhone})
                    </Text>
                  </View>

                  <View style={styles.locationBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={styles.locLabel}>PICKUP LOCATION</Text>
                      {trip.pickupLocation?.coordinates && (
                        <Text style={styles.locGpsText}>
                          GPS: {trip.pickupLocation.coordinates.lat.toFixed(5)}, {trip.pickupLocation.coordinates.lng.toFixed(5)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.locVal}>{trip.pickupLocation?.address || 'Incident Scene'}</Text>

                    {/* Turn-by-Turn GPS Navigation to Patient Pickup */}
                    <TouchableOpacity
                      style={styles.navPickupBtn}
                      onPress={() => {
                        const target = trip.pickupLocation?.coordinates
                          ? `${trip.pickupLocation.coordinates.lat},${trip.pickupLocation.coordinates.lng}`
                          : encodeURIComponent(trip.pickupLocation?.address || 'Incident Scene');
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${target}`;
                        Linking.openURL(url).catch(() => {});
                      }}
                      activeOpacity={0.8}
                    >
                      <Navigation size={13} color="#FFFFFF" />
                      <Text style={styles.navPickupBtnText}>Turn-by-Turn GPS Navigation to Pickup</Text>
                    </TouchableOpacity>

                    <Text style={[styles.locLabel, { marginTop: 10 }]}>DESTINATION HOSPITAL</Text>
                    <Text style={styles.locVal}>{trip.destinationLocation?.address || 'Hospital Facility'}</Text>
                  </View>

                  {/* 7-Step Stepper Display */}
                  <View style={styles.stepperContainer}>
                    {tripStatuses.map((st, i) => {
                      const isDone = i <= currentStepIndex;
                      const isCurrent = i === currentStepIndex;
                      return (
                        <View
                          key={st}
                          style={[
                            styles.stepperStep,
                            isCurrent && styles.stepCurrent,
                            isDone && !isCurrent && styles.stepDone,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stepText,
                              isCurrent && styles.stepTextCurrent,
                              isDone && !isCurrent && styles.stepTextDone,
                            ]}
                            numberOfLines={1}
                          >
                            {i + 1}. {st.replace('_', ' ')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {!isFinal && (
                    <TouchableOpacity
                      style={styles.advanceBtn}
                      onPress={() => handleAdvanceTrip(trip)}
                    >
                      <Play size={14} color="#FFFFFF" />
                      <Text style={styles.advanceBtnText}>
                        Advance: {tripStatuses[currentStepIndex + 1]?.toUpperCase().replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Pending Coordinator Review Banner */}
        {pendingUpdate && (
          <View style={styles.pendingReviewBanner}>
            <View style={styles.pendingReviewHeader}>
              <Clock size={16} color="#B45309" />
              <Text style={styles.pendingReviewTitle}>Pending Coordinator Review</Text>
            </View>
            <Text style={styles.pendingReviewText}>
              Requested fleet update ({pendingUpdate.summary}) is awaiting Coordinator review and acceptance in the Admin Dashboard before going live.
            </Text>
          </View>
        )}

        {/* Fleet Vehicles */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Truck size={18} color="#0F4C81" />
              <Text style={styles.sectionTitle}>Registered Ambulance Fleet</Text>
            </View>
          </View>

          {(profile?.vehicles || []).length === 0 ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>No vehicles registered yet in fleet.</Text>
            </View>
          ) : (
            (profile?.vehicles || []).map((veh) => (
              <View key={veh.vehicleId} style={styles.vehicleRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.rowWrap}>
                  <Text style={styles.vehicleIdText}>{veh.vehicleId}</Text>
                  <View style={styles.vehTypeBadge}>
                    <Text style={styles.vehTypeText}>{veh.vehicleType}</Text>
                  </View>
                </View>
                <Text style={styles.driverText}>
                  Driver: {veh.driverName} • {veh.driverPhone}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.availToggleBtn,
                  veh.isAvailable ? styles.availOn : styles.availOff,
                ]}
                onPress={() => handleToggleVehicleAvailability(veh.vehicleId)}
              >
                <Text
                  style={[
                    styles.availToggleText,
                    veh.isAvailable ? { color: '#166534' } : { color: '#64748B' },
                  ]}
                >
                  {veh.isAvailable ? 'AVAILABLE' : 'ON TRIP'}
                </Text>
              </TouchableOpacity>
            </View>
          )))}
        </View>

        {/* Incoming Ambulance Requests */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={18} color="#0F4C81" />
              <Text style={styles.sectionTitle}>Incoming Dispatch Requests</Text>
            </View>
            {pendingRequests.length > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingRequests.length} PENDING</Text>
              </View>
            )}
          </View>

          {requestsLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : activeRequests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No ambulance dispatch requests assigned.</Text>
            </View>
          ) : (
            activeRequests.map((req) => {
              const reqAccepted = isAccepted(req.status);
              const actionRequired = isActionRequired(req.status);
              const isSos = !!req.details?.isSos;

              return (
                <View key={req.requestId} style={[styles.requestCard, isSos ? styles.requestSosCard : null]}>
                  {isSos && (
                    <View style={styles.reqSosBanner}>
                      <View style={styles.reqSosLeft}>
                        <Siren size={15} color="#DC2626" />
                        <Text style={styles.reqSosTitle}>
                          EMERGENCY SOS • {req.details?.emergencyType ? String(req.details.emergencyType).toUpperCase() : 'IMMEDIATE DISTRESS'}
                        </Text>
                      </View>
                      <View style={styles.reqSosBadge}>
                        <Text style={styles.reqSosBadgeText}>CRITICAL</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.requestHeader}>
                    <Text style={styles.patientName}>{req.patientName || 'Emergency Patient'}</Text>
                    <Text style={styles.caseBadge}>{req.caseId}</Text>
                  </View>

                  {/* Caller / Patient Phone */}
                  {req.details?.patientPhone && (
                    <TouchableOpacity
                      style={styles.reqPhoneRow}
                      onPress={() => Linking.openURL(`tel:${req.details!.patientPhone}`).catch(() => {})}
                      activeOpacity={0.75}
                    >
                      <Phone size={13} color="#0D9488" />
                      <Text style={styles.reqPhoneText}>Patient/Caller: {req.details.patientPhone} (Tap to Call)</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.badgeRow}>
                    <View style={styles.urgencyBadge}>
                      <Text style={styles.urgencyText}>
                        Priority: {req.details?.urgency || 'Critical'}
                      </Text>
                    </View>
                    <View style={[styles.urgencyBadge, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={[styles.urgencyText, { color: '#0369A1' }]}>
                        {req.details?.ambulanceType || 'ALS Ambulance'}
                      </Text>
                    </View>
                  </View>

                  {/* Pickup Location & Coordinates */}
                  <View style={styles.reqLocationBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} color="#475569" />
                      <Text style={styles.requestNotes}>
                        Pickup: {req.details?.pickupAddress || 'Scene Address'}
                      </Text>
                    </View>
                    {req.details?.pickupCoordinates && (
                      <View style={styles.reqGpsRow}>
                        <Text style={styles.reqGpsText}>
                          GPS: {req.details.pickupCoordinates.lat.toFixed(5)}, {req.details.pickupCoordinates.lng.toFixed(5)}
                        </Text>
                        <TouchableOpacity
                          style={styles.reqNavBtn}
                          onPress={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${req.details!.pickupCoordinates!.lat},${req.details!.pickupCoordinates!.lng}`;
                            Linking.openURL(url).catch(() => {});
                          }}
                          activeOpacity={0.8}
                        >
                          <Navigation size={12} color="#FFFFFF" />
                          <Text style={styles.reqNavBtnText}>Open GPS Navigation</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <Text style={styles.timestampText}>
                    Assigned: {new Date(req.assignedAt || req.createdAt).toLocaleString()}
                  </Text>

                  {actionRequired ? (
                    <View style={styles.actionBtnRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAcceptRequest(req.requestId)}
                        disabled={isResponding}
                      >
                        <CheckCircle2 size={14} color="#FFFFFF" />
                        <Text style={styles.btnTextWhite}>Accept Dispatch</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.declineBtn]}
                        onPress={() => openRejectModal(req.requestId)}
                        disabled={isResponding}
                      >
                        <XCircle size={14} color="#DC2626" />
                        <Text style={styles.btnTextRed}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.statusResultBox,
                        reqAccepted ? styles.statusAccepted : styles.statusRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusResultText,
                          reqAccepted ? { color: '#166534' } : { color: '#991B1B' },
                        ]}
                      >
                        {reqAccepted ? 'Dispatch Accepted' : 'Dispatch Declined'}
                      </Text>
                      {req.rejectionReason && (
                        <Text style={styles.reasonText}>Reason: {req.rejectionReason}</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Vehicle Modal */}
      <Modal visible={showAddVehicle} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Vehicle to Fleet</Text>

            <Text style={styles.fieldLabel}>Registration Number *</Text>
            <TextInput
              style={styles.fieldInput}
              value={newVehicleId}
              onChangeText={setNewVehicleId}
              placeholder="e.g. KA-25-EM-1085"
            />

            <Text style={styles.fieldLabel}>Vehicle Type *</Text>
            <View style={styles.typeSelectorRow}>
              {(['ALS', 'BLS', 'Patient Transport'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeOption,
                    newVehicleType === t && styles.typeOptionActive,
                  ]}
                  onPress={() => setNewVehicleType(t)}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      newVehicleType === t && styles.typeOptionTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Driver Full Name *</Text>
            <TextInput
              style={styles.fieldInput}
              value={newDriverName}
              onChangeText={setNewDriverName}
              placeholder="e.g. Anand Hiremath"
            />

            <Text style={styles.fieldLabel}>Driver Contact Phone</Text>
            <TextInput
              style={styles.fieldInput}
              value={newDriverPhone}
              onChangeText={setNewDriverPhone}
              placeholder="+91 98452 11084"
              keyboardType="phone-pad"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setShowAddVehicle(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleAddVehicle}
                disabled={isSubmittingVehicle}
              >
                {isSubmittingVehicle ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Save Vehicle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decline Dispatch Request</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a clear reason for the Coordinator (min 5 characters).
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="e.g. All fleet currently on active emergency calls..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={handleConfirmReject}
                disabled={isResponding}
              >
                {isResponding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  bannerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bannerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  providerName: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  detailsText: { fontSize: 12, color: '#64748B' },
  addVehicleBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  addVehicleBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: { fontSize: 12, fontWeight: '600', color: '#166534', flex: 1 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginLeft: 4 },
  countBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  pendingBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pendingBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  emptyBox: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  tripCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripIdText: { fontSize: 14, fontWeight: '800', color: '#0F172A', fontFamily: 'monospace' },
  tripCaseText: { fontSize: 11, color: '#64748B' },
  tripStatusBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tripStatusText: { fontSize: 10, fontWeight: '800', color: '#78350F' },
  tripMetaRow: { marginVertical: 6, gap: 2 },
  tripMetaText: { fontSize: 12, color: '#334155' },
  locationBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  locLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  locVal: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  locGpsText: { fontSize: 10, fontFamily: 'monospace', color: '#B45309', fontWeight: '700' },
  navPickupBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  navPickupBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  stepperContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 8,
  },
  stepperStep: {
    flex: 1,
    minWidth: 44,
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  stepDone: { backgroundColor: '#FEF3C7' },
  stepCurrent: { backgroundColor: '#D97706' },
  stepText: { fontSize: 8, fontWeight: '700', color: '#94A3B8' },
  stepTextDone: { color: '#92400E' },
  stepTextCurrent: { color: '#FFFFFF' },
  advanceBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  advanceBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  vehicleIdText: { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: 'monospace' },
  vehTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehTypeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  driverText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  availToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  availOn: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  availOff: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  availToggleText: { fontSize: 10, fontWeight: '800' },
  requestCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  requestSosCard: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFDFD',
  },
  reqSosBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reqSosLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  reqSosTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  reqSosBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  reqSosBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  reqPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    marginBottom: 4,
  },
  reqPhoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  reqLocationBox: {
    marginVertical: 4,
    gap: 4,
  },
  reqGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  reqGpsText: {
    fontSize: 10.5,
    fontFamily: 'monospace',
    color: '#475569',
    fontWeight: '600',
  },
  reqNavBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reqNavBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  caseBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#E2E8F0',
    color: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRow: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  urgencyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  requestNotes: { fontSize: 12, color: '#475569', marginBottom: 4 },
  timestampText: { fontSize: 10, color: '#94A3B8', marginBottom: 8 },
  actionBtnRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtn: { backgroundColor: '#16A34A' },
  declineBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  btnTextWhite: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  btnTextRed: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  statusResultBox: { padding: 8, borderRadius: 8, marginTop: 4 },
  statusAccepted: { backgroundColor: '#DCFCE7' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusResultText: { fontSize: 12, fontWeight: '700' },
  reasonText: { fontSize: 11, color: '#7F1D1D', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  typeSelectorRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  typeOptionActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  typeOptionText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  typeOptionTextActive: { color: '#FFFFFF', fontWeight: '700' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: { backgroundColor: '#F1F5F9' },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  modalSaveBtn: { backgroundColor: '#D97706' },
  modalConfirmBtn: { backgroundColor: '#DC2626' },
  modalConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  pendingReviewBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  pendingReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pendingReviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingReviewText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
});
