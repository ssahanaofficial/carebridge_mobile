import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../configuration/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  dataStore,
  subscribeRequestsForProviderFromFirestore,
  subscribeProviderUpdateRequests,
  updateHospitalProfile,
  respondToRequestInFirestore,
  INITIAL_HOSPITAL,
} from '../../services/dataService';
import type { HospitalProfile, ResourceRequest, ProviderUpdateRequest } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { CaseStatusBadge } from '../../components/common/Badge';
import { Colors } from '../../constants/colors';
import {
  Building2,
  Bed,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react-native';

export default function HospitalDashboard() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [availBeds, setAvailBeds] = useState('0');
  const [availICU, setAvailICU] = useState('0');
  const [availVentilators, setAvailVentilators] = useState('0');
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<ProviderUpdateRequest | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Load initial profile - default to 0 if not updated
    const prof = dataStore.getHospitalProfile(currentUser.uid) || {
      ...INITIAL_HOSPITAL,
      uid: currentUser.uid,
      hospitalName: currentUser.displayName || INITIAL_HOSPITAL.hospitalName,
      availableBeds: 0,
      availableICU: 0,
      availableVentilators: 0,
    };
    setProfile(prof);
    setAvailBeds(String(Number(prof.availableBeds) || 0));
    setAvailICU(String(Number(prof.availableICU) || 0));
    setAvailVentilators(String(Number(prof.availableVentilators) || 0));

    // Listen to real-time profile in Firestore
    let unsubDoc = () => {};
    if (isFirebaseConfigured && db) {
      try {
        unsubDoc = onSnapshot(doc(db, 'hospitalProfiles', currentUser.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as HospitalProfile;
            const safeBeds = typeof data.availableBeds === 'number' && !isNaN(data.availableBeds) ? data.availableBeds : 0;
            const safeICU = typeof data.availableICU === 'number' && !isNaN(data.availableICU) ? data.availableICU : 0;
            const safeVents = typeof data.availableVentilators === 'number' && !isNaN(data.availableVentilators) ? data.availableVentilators : 0;
            setProfile(data);
            setAvailBeds(String(safeBeds));
            setAvailICU(String(safeICU));
            setAvailVentilators(String(safeVents));
            if (data.pendingUpdate && (!data.pendingUpdate.status || data.pendingUpdate.status === 'PENDING')) {
              setPendingUpdate(data.pendingUpdate);
            } else if (data.pendingUpdate === null) {
              setPendingUpdate(null);
            }
            if (data.availableBeds == null || data.availableICU == null || data.availableVentilators == null) {
              try {
                await setDoc(doc(db, 'hospitalProfiles', currentUser.uid), {
                  availableBeds: safeBeds,
                  availableICU: safeICU,
                  availableVentilators: safeVents,
                }, { merge: true });
              } catch (e) {}
            }
          } else {
            try {
              await setDoc(doc(db, 'hospitalProfiles', currentUser.uid), {
                uid: currentUser.uid,
                hospitalName: currentUser.displayName || INITIAL_HOSPITAL.hospitalName,
                registrationNumber: 'REG-' + Date.now().toString().slice(-6),
                departments: ['Emergency Trauma', 'General Medicine'],
                totalBeds: 50,
                availableBeds: 0,
                totalICU: 10,
                availableICU: 0,
                totalVentilators: 5,
                availableVentilators: 0,
                contactNumber: currentUser.phone || '+91 800 000 0000',
                operatingHours: '24/7',
                city: currentUser.city || 'Hubballi',
                state: 'Karnataka',
                address: currentUser.address || 'Medical Facility Address',
                isVerified: Boolean(currentUser.isVerified),
                lastUpdated: new Date().toISOString()
              }, { merge: true });
            } catch (e) {}
          }
        });
      } catch (e) {}
    }

    // Listen to incoming requests in Firestore
    const unsubReqs = subscribeRequestsForProviderFromFirestore(
      currentUser.uid,
      setRequests,
      () => setRequests(dataStore.getRequests().filter((r) => r.providerUid === currentUser.uid))
    );

    // Listen to pending coordinator review update requests
    const unsubUpdates = subscribeProviderUpdateRequests((updates) => {
      const pending = updates.find(
        (u) => u.providerUid === currentUser.uid && (!u.status || u.status === 'PENDING')
      );
      setPendingUpdate(pending || null);
    });

    return () => {
      unsubDoc();
      unsubReqs();
      unsubUpdates();
    };
  }, [currentUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentUser) {
      const prof = dataStore.getHospitalProfile(currentUser.uid);
      if (prof) {
        setProfile(prof);
        setAvailBeds(String(Number(prof.availableBeds) || 0));
        setAvailICU(String(Number(prof.availableICU) || 0));
        setAvailVentilators(String(Number(prof.availableVentilators) || 0));
      }
      setRequests(dataStore.getRequests().filter((r) => r.providerUid === currentUser.uid));
      const pending = dataStore.getProviderUpdateRequests().find(
        (u) => u.providerUid === currentUser.uid && (!u.status || u.status === 'PENDING')
      );
      setPendingUpdate(pending || null);
    }
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleSaveAvailability = async () => {
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      const beds = Math.max(0, parseInt(availBeds, 10) || 0);
      const icu = Math.max(0, parseInt(availICU, 10) || 0);
      const vents = Math.max(0, parseInt(availVentilators, 10) || 0);

      await updateHospitalProfile(currentUser.uid, {
        availableBeds: beds,
        availableICU: icu,
        availableVentilators: vents,
      });
      Alert.alert(
        'Update Submitted for Review',
        'Capacity update request submitted to Central Coordinator for approval (Pending Review).'
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update capacity.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondToRequestInFirestore(requestId, status);
      Alert.alert('Response Recorded', `Admission request has been ${status}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record response.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hospital Header Banner */}
        <Card style={styles.hospitalCard}>
          <View style={styles.hospitalHeader}>
            <View style={styles.iconCircle}>
              <Building2 size={24} color={Colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.hospitalName}>
                {profile?.hospitalName || currentUser?.displayName || 'KIMS Super Specialty Hospital'}
              </Text>
              <Text style={styles.hospitalCity}>{profile?.city || 'Hubballi'} • 24/7 Trauma Care</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color={Colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
        </Card>

        {/* Pending Coordinator Review Banner */}
        {pendingUpdate && (
          <View style={styles.pendingReviewBanner}>
            <View style={styles.pendingReviewHeader}>
              <Clock size={16} color="#B45309" />
              <Text style={styles.pendingReviewTitle}>Pending Coordinator Review</Text>
            </View>
            <Text style={styles.pendingReviewText}>
              Requested capacity update ({pendingUpdate.summary}) is awaiting Coordinator review and acceptance in the Admin Dashboard before going live.
            </Text>
          </View>
        )}

        {/* Capacity Management Card */}
        <Card style={styles.capacityCard}>
          <Text style={styles.sectionHeading}>Live Inpatient Capacity Management</Text>

          <View style={styles.capacityInputsRow}>
            <View style={styles.capacityInputBox}>
              <Text style={styles.capacityLabel}>Available Beds</Text>
              <TextInput
                value={availBeds}
                onChangeText={setAvailBeds}
                keyboardType="numeric"
                style={styles.capacityInput}
              />
            </View>

            <View style={styles.capacityInputBox}>
              <Text style={styles.capacityLabel}>Available ICU</Text>
              <TextInput
                value={availICU}
                onChangeText={setAvailICU}
                keyboardType="numeric"
                style={styles.capacityInput}
              />
            </View>

            <View style={styles.capacityInputBox}>
              <Text style={styles.capacityLabel}>Ventilators</Text>
              <TextInput
                value={availVentilators}
                onChangeText={setAvailVentilators}
                keyboardType="numeric"
                style={styles.capacityInput}
              />
            </View>
          </View>

          <Button
            title="Update Live Capacity"
            onPress={handleSaveAvailability}
            loading={isUpdating}
            variant="primary"
            size="md"
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Incoming Admission Requests */}
        <View style={styles.requestsSection}>
          <Text style={styles.sectionHeading}>Incoming Admission Requests ({requests.length})</Text>

          {requests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Clock size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No pending admission requests at this time.</Text>
            </Card>
          ) : (
            requests.map((r) => {
              const isActionable = r.status === 'REQUESTED' || r.status === 'ASSIGNED';
              return (
                <Card key={r.requestId} style={styles.reqCard}>
                  <View style={styles.reqCardHeader}>
                    <View>
                      <Text style={styles.reqType}>{r.resourceType.toUpperCase()}</Text>
                      <Text style={styles.reqCaseId}>Emergency: {r.caseId}</Text>
                    </View>
                    <CaseStatusBadge status={r.status} reason={r.rejectionReason} />
                  </View>

                  <Text style={styles.patientTitle}>Patient: {r.patientName}</Text>
                  {r.details?.notes ? (
                    <Text style={styles.patientNotes}>Details: {r.details.notes}</Text>
                  ) : null}

                  {isActionable && (
                    <View style={styles.actionRow}>
                      <Button
                        title="Accept Admission"
                        onPress={() => handleRespond(r.requestId, 'accepted')}
                        variant="success"
                        size="sm"
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Decline"
                        onPress={() => handleRespond(r.requestId, 'rejected')}
                        variant="danger"
                        size="sm"
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>
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
    paddingBottom: 40,
  },
  hospitalCard: {
    padding: 16,
    borderRadius: 20,
    marginTop: 14,
    marginBottom: 14,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F3868',
  },
  hospitalCity: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  capacityCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F3868',
    marginBottom: 12,
  },
  capacityInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  capacityInputBox: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  capacityInput: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    padding: 0,
  },
  requestsSection: {
    gap: 10,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  reqCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  reqCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 8,
    marginBottom: 8,
  },
  reqType: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  reqCaseId: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  patientTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  patientNotes: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
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
