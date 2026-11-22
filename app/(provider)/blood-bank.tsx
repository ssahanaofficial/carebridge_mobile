import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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
  updateBloodBankProfile,
  respondToRequestInFirestore,
  INITIAL_BLOOD_BANK,
} from '../../services/dataService';
import type { BloodBankProfile, ResourceRequest, BloodGroup, ProviderUpdateRequest } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { CaseStatusBadge } from '../../components/common/Badge';
import { Colors } from '../../constants/colors';
import {
  Droplet,
  Plus,
  Minus,
  CheckCircle2,
  ShieldCheck,
  Clock,
} from 'lucide-react-native';

const GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function BloodBankDashboard() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState<BloodBankProfile | null>(null);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<ProviderUpdateRequest | null>(null);

  const parseSafeInventory = (raw?: Record<string, any>): Record<string, number> => {
    const safe: Record<string, number> = {
      'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
    };
    if (raw) {
      GROUPS.forEach((g) => {
        const val = Number(raw[g]);
        safe[g] = !isNaN(val) && val >= 0 ? val : 0;
      });
    }
    return safe;
  };

  useEffect(() => {
    if (!currentUser) return;

    const prof = dataStore.getBloodBankProfile(currentUser.uid) || {
      ...INITIAL_BLOOD_BANK,
      uid: currentUser.uid,
      bankName: currentUser.displayName || INITIAL_BLOOD_BANK.bankName,
      inventory: { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 }
    };
    setProfile(prof);
    setInventory(parseSafeInventory(prof.inventory));

    let unsubDoc = () => {};
    if (isFirebaseConfigured && db) {
      try {
        unsubDoc = onSnapshot(doc(db, 'bloodBankProfiles', currentUser.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as BloodBankProfile;
            const safeInv = parseSafeInventory(data.inventory);
            setProfile(data);
            setInventory(safeInv);
            if (data.pendingUpdate && (!data.pendingUpdate.status || data.pendingUpdate.status === 'PENDING')) {
              setPendingUpdate(data.pendingUpdate);
            } else if (data.pendingUpdate === null) {
              setPendingUpdate(null);
            }
          } else {
            try {
              await setDoc(doc(db, 'bloodBankProfiles', currentUser.uid), {
                uid: currentUser.uid,
                bankName: currentUser.displayName || INITIAL_BLOOD_BANK.bankName,
                licenseNumber: 'LIC-BB-' + Date.now().toString().slice(-6),
                registrationNumber: 'BB-' + Date.now().toString().slice(-6),
                inventory: { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 },
                contactNumber: currentUser.phone || '+91 800 000 0000',
                operatingHours: '24/7',
                city: currentUser.city || 'Hubballi',
                state: 'Karnataka',
                address: currentUser.address || 'Blood Bank Center Address',
                isVerified: Boolean(currentUser.isVerified),
                lastUpdated: new Date().toISOString()
              }, { merge: true });
            } catch (e) {}
          }
        });
      } catch (e) {}
    }

    const unsubReqs = subscribeRequestsForProviderFromFirestore(
      currentUser.uid,
      setRequests,
      () => setRequests(dataStore.getRequests().filter((r) => r.providerUid === currentUser.uid))
    );

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
      const prof = dataStore.getBloodBankProfile(currentUser.uid);
      if (prof) {
        setProfile(prof);
        setInventory(parseSafeInventory(prof.inventory));
      }
      setRequests(dataStore.getRequests().filter((r) => r.providerUid === currentUser.uid));
      const pending = dataStore.getProviderUpdateRequests().find(
        (u) => u.providerUid === currentUser.uid && (!u.status || u.status === 'PENDING')
      );
      setPendingUpdate(pending || null);
    }
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleUnitChange = (group: BloodGroup, delta: number) => {
    setInventory((prev) => ({
      ...prev,
      [group]: Math.max(0, (prev[group] || 0) + delta),
    }));
  };

  const handleSaveInventory = async () => {
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      const cleanInv: Record<string, number> = {};
      GROUPS.forEach((g) => {
        cleanInv[g] = Math.max(0, parseInt(String(inventory[g]), 10) || 0);
      });

      await updateBloodBankProfile(currentUser.uid, { inventory: cleanInv });
      Alert.alert(
        'Update Submitted for Review',
        'Blood inventory update request submitted to Central Coordinator for approval (Pending Review).'
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update stock.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await respondToRequestInFirestore(requestId, status);
      Alert.alert('Response Recorded', `Blood unit request ${status}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to respond.');
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
        <Card style={styles.bankCard}>
          <View style={styles.bankHeader}>
            <View style={styles.iconCircle}>
              <Droplet size={24} color={Colors.critical} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.bankName}>
                {profile?.bankName || currentUser?.displayName || 'Red Cross Regional Blood Centre'}
              </Text>
              <Text style={styles.bankCity}>{profile?.city || 'Hubballi'} • Emergency Stock</Text>
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
              Requested blood stock update ({pendingUpdate.summary}) is awaiting Coordinator review and acceptance in the Admin Dashboard before going live.
            </Text>
          </View>
        )}

        {/* Blood Inventory Grid with +/- Adjusters */}
        <Card style={styles.inventoryCard}>
          <Text style={styles.sectionHeading}>Blood Group Units Inventory</Text>

          <View style={styles.groupsGrid}>
            {GROUPS.map((grp) => (
              <View key={grp} style={styles.groupItem}>
                <Text style={styles.groupName}>{grp}</Text>
                <Text style={styles.groupCount}>{inventory[grp] || 0}u</Text>

                <View style={styles.adjustRow}>
                  <TouchableOpacity
                    onPress={() => handleUnitChange(grp, -1)}
                    style={styles.adjustBtn}
                  >
                    <Minus size={14} color={Colors.critical} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleUnitChange(grp, 1)}
                    style={styles.adjustBtn}
                  >
                    <Plus size={14} color={Colors.success} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <Button
            title="Save Blood Inventory"
            onPress={handleSaveInventory}
            loading={isUpdating}
            variant="danger"
            size="md"
            style={{ marginTop: 14 }}
          />
        </Card>

        {/* Incoming Blood Requisitions */}
        <View style={styles.requestsSection}>
          <Text style={styles.sectionHeading}>Blood Requisitions ({requests.length})</Text>

          {requests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Clock size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No pending blood requisitions.</Text>
            </Card>
          ) : (
            requests.map((r) => {
              const isActionable = r.status === 'REQUESTED' || r.status === 'ASSIGNED';
              return (
                <Card key={r.requestId} style={styles.reqCard}>
                  <View style={styles.reqCardHeader}>
                    <View>
                      <Text style={styles.reqGroup}>
                        {r.details?.bloodGroup || 'Blood Units'}: {r.details?.units || 1} Unit(s)
                      </Text>
                      <Text style={styles.reqCaseId}>Emergency: {r.caseId}</Text>
                    </View>
                    <CaseStatusBadge status={r.status} reason={r.rejectionReason} />
                  </View>

                  <Text style={styles.patientTitle}>Patient: {r.patientName}</Text>

                  {isActionable && (
                    <View style={styles.actionRow}>
                      <Button
                        title="Accept & Release Units"
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
  bankCard: {
    padding: 16,
    borderRadius: 20,
    marginTop: 14,
    marginBottom: 14,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F3868',
  },
  bankCity: {
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
  inventoryCard: {
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
  groupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupItem: {
    width: '23%',
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  groupName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.critical,
  },
  groupCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginVertical: 4,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 4,
  },
  adjustBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  reqGroup: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.critical,
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
