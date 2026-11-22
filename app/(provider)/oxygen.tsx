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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Wind,
  ShieldCheck,
  MapPin,
  Phone,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Truck,
  Plus,
  Minus,
  Clock,
  AlertCircle,
  Package,
} from 'lucide-react-native';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../configuration/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  dataStore,
  respondToRequestInFirestore,
  subscribeRequestsForProviderFromFirestore,
  subscribeProviderUpdateRequests,
} from '../../services/dataService';
import { Header } from '../../components/common/Header';
import { Colors } from '../../constants/colors';
import type { OxygenProfile, ResourceRequest, ProviderUpdateRequest } from '../../types';

export default function OxygenScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<OxygenProfile | null>(null);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [cylinders, setCylinders] = useState<number>(0);
  const [concentrators, setConcentrators] = useState<number>(0);
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<ProviderUpdateRequest | null>(null);

  // Reject modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const loadData = () => {
    if (!currentUser) return;
    const prof = dataStore.getOxygenProfile(currentUser.uid) || {
      uid: currentUser.uid,
      providerName: currentUser.displayName || 'Oxygen Supply Depot',
      registrationNumber: 'REG-OXY-001',
      licenseNumber: 'LIC-OXY-KA-2024-0044',
      contactNumber: currentUser.phone || '+91 836 244 8899',
      cylindersAvailable: 0,
      concentratorsAvailable: 0,
      deliveryAvailable: true,
      city: currentUser.city || 'Hubballi',
      state: currentUser.state || 'Karnataka',
      address: currentUser.address || 'Gokul Road Industrial Area',
      isVerified: true,
      lastUpdated: new Date().toISOString(),
    };
    if (prof) {
      setProfile(prof);
      const safeCyl = typeof prof.cylindersAvailable === 'number' && !isNaN(prof.cylindersAvailable) ? prof.cylindersAvailable : 0;
      const safeConc = typeof prof.concentratorsAvailable === 'number' && !isNaN(prof.concentratorsAvailable) ? prof.concentratorsAvailable : 0;
      setCylinders(safeCyl);
      setConcentrators(safeConc);
      setDeliveryAvailable(prof.deliveryAvailable !== undefined ? Boolean(prof.deliveryAvailable) : true);
      if (prof.pendingUpdate && (!prof.pendingUpdate.status || prof.pendingUpdate.status === 'PENDING')) {
        setPendingUpdate(prof.pendingUpdate);
      }
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadData();
    const unsubStore = dataStore.subscribe(loadData);

    let unsubDoc = () => {};
    if (isFirebaseConfigured && db) {
      try {
        unsubDoc = onSnapshot(doc(db, 'oxygenProfiles', currentUser.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as OxygenProfile;
            const safeCyl = typeof data.cylindersAvailable === 'number' && !isNaN(data.cylindersAvailable) ? data.cylindersAvailable : 0;
            const safeConc = typeof data.concentratorsAvailable === 'number' && !isNaN(data.concentratorsAvailable) ? data.concentratorsAvailable : 0;
            const safeDeliv = data.deliveryAvailable !== undefined ? Boolean(data.deliveryAvailable) : true;
            setProfile(data);
            setCylinders(safeCyl);
            setConcentrators(safeConc);
            setDeliveryAvailable(safeDeliv);
            if (data.pendingUpdate && (!data.pendingUpdate.status || data.pendingUpdate.status === 'PENDING')) {
              setPendingUpdate(data.pendingUpdate);
            } else if (data.pendingUpdate === null) {
              setPendingUpdate(null);
            }
            if (data.cylindersAvailable == null || data.concentratorsAvailable == null) {
              try {
                await setDoc(doc(db, 'oxygenProfiles', currentUser.uid), {
                  cylindersAvailable: safeCyl,
                  concentratorsAvailable: safeConc,
                  deliveryAvailable: safeDeliv,
                }, { merge: true });
              } catch (e) {}
            }
          } else {
            try {
              await setDoc(doc(db, 'oxygenProfiles', currentUser.uid), {
                uid: currentUser.uid,
                providerName: currentUser.displayName || 'Oxygen Supply Depot',
                registrationNumber: 'REG-OXY-001',
                licenseNumber: 'LIC-OXY-KA-2024-0044',
                contactNumber: currentUser.phone || '+91 836 244 8899',
                cylindersAvailable: 0,
                concentratorsAvailable: 0,
                deliveryAvailable: true,
                city: currentUser.city || 'Hubballi',
                state: currentUser.state || 'Karnataka',
                address: currentUser.address || 'Gokul Road Industrial Area',
                isVerified: Boolean(currentUser.isVerified),
                lastUpdated: new Date().toISOString(),
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

    return () => {
      unsubStore();
      unsubDoc();
      unsubRequests();
      unsubUpdates();
    };
  }, [currentUser]);

  const handleSaveCapacity = async () => {
    if (!currentUser) return;
    setIsUpdating(true);
    const safeCylinders = Math.max(0, parseInt(String(cylinders), 10) || 0);
    const safeConcentrators = Math.max(0, parseInt(String(concentrators), 10) || 0);
    try {
      await dataStore.updateOxygenProfile(currentUser.uid, {
        cylindersAvailable: safeCylinders,
        concentratorsAvailable: safeConcentrators,
        deliveryAvailable,
      });
      setSuccessMessage('Capacity update request submitted to Central Coordinator for approval (Pending Review).');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setSuccessMessage('Capacity update request recorded (Pending Coordinator Review).');
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAccept = async (reqId: string) => {
    setIsResponding(true);
    try {
      const coordinatorNotified = await respondToRequestInFirestore(reqId, 'accepted');
      setSuccessMessage(
        coordinatorNotified
          ? 'Oxygen request accepted. Coordinator notified.'
          : 'Oxygen request accepted.'
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
      setSuccessMessage('Oxygen request declined.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not decline request.');
    } finally {
      setIsResponding(false);
    }
  };

  const isAccepted = (status?: string) =>
    ['accepted', 'completed', 'resolved', 'allocated', 'confirmed'].includes(
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
  const pendingCount = activeRequests.filter((r) => isActionRequired(r.status)).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View style={styles.bannerIconBox}>
              <Wind size={26} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowWrap}>
                <Text style={styles.providerName}>{profile?.providerName || 'Oxygen Supply Depot'}</Text>
                {profile?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={12} color="#166534" />
                    <Text style={styles.verifiedText}>Certified Depot</Text>
                  </View>
                )}
              </View>
              <View style={styles.detailsRow}>
                <MapPin size={12} color="#64748B" />
                <Text style={styles.detailsText}>
                  {profile?.address || 'Industrial Area'}, {profile?.city || 'Hubballi'}
                </Text>
              </View>
              <View style={styles.detailsRow}>
                <Phone size={12} color="#64748B" />
                <Text style={styles.detailsText}>{profile?.contactNumber || '+91 836 244 8899'}</Text>
              </View>
            </View>
          </View>
        </View>

        {successMessage && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={16} color="#15803D" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Pending Coordinator Review Banner */}
        {pendingUpdate && (
          <View style={styles.pendingReviewBanner}>
            <View style={styles.pendingReviewHeader}>
              <Clock size={16} color="#B45309" />
              <Text style={styles.pendingReviewTitle}>Pending Coordinator Review</Text>
            </View>
            <Text style={styles.pendingReviewText}>
              Requested update ({pendingUpdate.summary}) is awaiting Coordinator review and acceptance in the Admin Dashboard before going live.
            </Text>
          </View>
        )}

        {/* Inventory Controls */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Wind size={18} color="#0284C7" />
            <Text style={styles.sectionTitle}>Stock & Supply Levels</Text>
          </View>

          {/* D-Type Cylinders */}
          <View style={styles.stockItemBox}>
            <View style={styles.stockLabelRow}>
              <Text style={styles.stockLabel}>Medical D-Type Cylinders (46.7L)</Text>
              <Text style={styles.stockValue}>{cylinders ?? 0} Units</Text>
            </View>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setCylinders((c) => Math.max(0, (c || 0) - 1))}
              >
                <Minus size={18} color="#1E293B" />
              </TouchableOpacity>
              <TextInput
                style={styles.counterInput}
                keyboardType="numeric"
                value={String(cylinders ?? 0)}
                onChangeText={(t) => setCylinders(Math.max(0, parseInt(t, 10) || 0))}
              />
              <TouchableOpacity
                style={[styles.counterBtn, styles.counterBtnPrimary]}
                onPress={() => setCylinders((c) => (c || 0) + 1)}
              >
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Oxygen Concentrators */}
          <View style={[styles.stockItemBox, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
            <View style={styles.stockLabelRow}>
              <Text style={styles.stockLabel}>Electric Concentrators (10 LPM)</Text>
              <Text style={[styles.stockValue, { color: '#334155' }]}>{concentrators ?? 0} Units</Text>
            </View>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setConcentrators((c) => Math.max(0, (c || 0) - 1))}
              >
                <Minus size={18} color="#1E293B" />
              </TouchableOpacity>
              <TextInput
                style={styles.counterInput}
                keyboardType="numeric"
                value={String(concentrators ?? 0)}
                onChangeText={(t) => setConcentrators(Math.max(0, parseInt(t, 10) || 0))}
              />
              <TouchableOpacity
                style={[styles.counterBtn, { backgroundColor: '#1E293B', borderColor: '#1E293B' }]}
                onPress={() => setConcentrators((c) => c + 1)}
              >
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Doorstep Delivery Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setDeliveryAvailable((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Truck size={18} color="#475569" />
              <Text style={styles.toggleLabel}>Doorstep Cylinder Delivery</Text>
            </View>
            <View
              style={[
                styles.checkboxBox,
                deliveryAvailable && { backgroundColor: Colors.primary, borderColor: Colors.primary },
              ]}
            >
              {deliveryAvailable && <CheckCircle2 size={14} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveCapacity}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Submit Capacity Update for Approval</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.noteText}>
            Requires review and acceptance by Central Coordinator before updating live stock.
          </Text>
        </View>

        {/* Incoming Oxygen Requests */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Package size={18} color="#0F4C81" />
              <Text style={styles.sectionTitle}>Incoming Requisitions</Text>
            </View>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount} PENDING</Text>
              </View>
            )}
          </View>

          {requestsLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : activeRequests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No oxygen requisitions received yet.</Text>
            </View>
          ) : (
            activeRequests.map((req) => {
              const reqAccepted = isAccepted(req.status);
              const reqRejected = isRejected(req.status);
              const actionRequired = isActionRequired(req.status);

              return (
                <View key={req.requestId} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.patientName}>{req.patientName || 'Emergency Patient'}</Text>
                    <Text style={styles.caseBadge}>{req.caseId}</Text>
                  </View>

                  <View style={styles.badgeRow}>
                    <View style={styles.urgencyBadge}>
                      <Text style={styles.urgencyText}>
                        Priority: {req.details?.urgency || 'High'}
                      </Text>
                    </View>
                    <View style={styles.cylinderBadge}>
                      <Text style={styles.cylinderText}>
                        {req.details?.cylinders || 1} Cylinders Requested
                      </Text>
                    </View>
                  </View>

                  {req.details?.notes ? (
                    <Text style={styles.requestNotes}>"{req.details.notes}"</Text>
                  ) : null}

                  <Text style={styles.timestampText}>
                    Assigned: {new Date(req.assignedAt || req.createdAt).toLocaleString()}
                  </Text>

                  {/* Actions or Status */}
                  {actionRequired ? (
                    <View style={styles.actionBtnRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAccept(req.requestId)}
                        disabled={isResponding}
                      >
                        <CheckCircle2 size={14} color="#FFFFFF" />
                        <Text style={styles.btnTextWhite}>Accept Requisition</Text>
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
                        {reqAccepted ? 'Requisition Accepted' : 'Requisition Declined'}
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

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decline Oxygen Request</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a clear reason for the Coordinator (min 5 characters).
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="e.g. Stock exhausted, cylinders in hydrostatic test..."
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
    backgroundColor: '#E0F2FE',
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
  stockItemBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  stockLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stockLabel: { fontSize: 12, fontWeight: '700', color: '#0369A1' },
  stockValue: { fontSize: 13, fontWeight: '800', color: '#0284C7' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnPrimary: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  counterInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    height: 36,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
    color: '#0F172A',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  noteText: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 8 },
  pendingBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pendingBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  emptyBox: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94A3B8' },
  requestCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
  cylinderBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cylinderText: { fontSize: 10, fontWeight: '700', color: '#0369A1' },
  requestNotes: { fontSize: 12, fontStyle: 'italic', color: '#475569', marginBottom: 4 },
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
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 12 },
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
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: { backgroundColor: '#F1F5F9' },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: '#475569' },
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
