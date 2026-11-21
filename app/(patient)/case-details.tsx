import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Clipboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../configuration/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  dataStore,
  normalizeEmergencyCase,
} from '../../services/dataService';
import type { EmergencyCase, ResourceRequest, ResourceType } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { TriageBadge, CaseStatusBadge } from '../../components/common/Badge';
import { Colors } from '../../constants/colors';
import {
  Copy,
  Clock,
  MapPin,
  Building2,
  Truck,
  Droplet,
  Wind,
  Stethoscope,
  Plus,
  CheckCircle2,
  ArrowLeft,
  X,
  Phone,
  ShieldCheck,
  Check,
} from 'lucide-react-native';

export default function CaseDetailsScreen() {
  const router = useRouter();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { currentUser } = useAuth();

  const [emergencyCase, setEmergencyCase] = useState<EmergencyCase | null>(null);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Additional Resource Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [additionalResourceType, setAdditionalResourceType] = useState<ResourceType>('blood');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmittingResource, setIsSubmittingResource] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;

    // Load initial from local store
    const local = dataStore.getCase(caseId);
    if (local) {
      setEmergencyCase(local);
      setRequests(dataStore.getRequests().filter((r) => r.caseId === caseId));
      setLoading(false);
    }

    // Subscribe to real-time Firestore updates for this case
    let unsubscribeCase = () => {};
    if (isFirebaseConfigured && db) {
      try {
        unsubscribeCase = onSnapshot(doc(db, 'cases', caseId), (snap) => {
          if (snap.exists()) {
            const data = normalizeEmergencyCase(snap.data(), snap.id);
            setEmergencyCase(data);
            setLoading(false);
          }
        });
      } catch (e) {
        console.warn('[CaseDetails] Snapshot note:', e);
      }
    }

    // Subscribe to requests for this case
    const updateLocalRequests = () => {
      setRequests(dataStore.getRequests().filter((r) => r.caseId === caseId));
    };
    const unsubStore = dataStore.subscribe(updateLocalRequests);

    return () => {
      unsubscribeCase();
      unsubStore();
    };
  }, [caseId]);

  const copyCaseId = () => {
    if (!caseId) return;
    Clipboard.setString(caseId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestAdditional = async () => {
    if (!caseId) return;
    setIsSubmittingResource(true);

    try {
      const now = new Date().toISOString();
      const requestId = `REQ-${caseId}-${additionalResourceType}-${Date.now().toString(36)}`;
      const newReq: ResourceRequest = {
        requestId,
        caseId,
        patientUid: emergencyCase?.patientUid || currentUser?.uid || '',
        requesterUid: currentUser?.uid || emergencyCase?.patientUid || '',
        patientName: emergencyCase?.patientName || 'Emergency Patient',
        providerUid: '',
        providerName: 'Pending Coordinator Assignment',
        resourceType: additionalResourceType,
        details: { notes: additionalNotes.trim() },
        status: 'REQUESTED',
        createdAt: now,
        updatedAt: now,
      };

      if (isFirebaseConfigured && db) {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'requests', requestId), newReq);
      }

      dataStore.requests.unshift(newReq);
      dataStore.notify();

      setRequestSuccess(`Requisition for ${additionalResourceType} transmitted to coordinator.`);
      setTimeout(() => {
        setIsModalOpen(false);
        setRequestSuccess(null);
        setAdditionalNotes('');
      }, 1500);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to request additional resource.');
    } finally {
      setIsSubmittingResource(false);
    }
  };

  if (loading && !emergencyCase) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching real-time case data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const c: EmergencyCase = emergencyCase || {
    caseId: caseId || 'CB-20261121-0042',
    patientUid: currentUser?.uid || '',
    patientName: 'Emergency Patient',
    patientAge: 42,
    patientGender: 'Male',
    patientBloodGroup: 'B+',
    patientCondition: 'Acute cardiac distress',
    conditionSummary: 'Acute cardiac distress',
    incidentAddress: 'Vidyanagar, PB Road, Hubballi, Karnataka',
    location: { address: 'Vidyanagar, PB Road, Hubballi, Karnataka' },
    status: 'REQUESTED',
    urgencyLevel: 'immediate',
    createdAt: new Date().toISOString(),
    matchedHospitalName: 'KIMS Super Specialty Hospital',
    assignedHospitalName: 'KIMS Super Specialty Hospital',
    attendant: { name: 'Suresh Deshpande', relation: 'Brother', phone: '+91 98451 98765' },
    attendantName: 'Suresh Deshpande',
    attendantRelation: 'Brother',
    attendantPhone: '+91 98451 98765',
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Bar */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={18} color={Colors.textSecondary} />
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>

        {/* Top Unique Case ID Card */}
        <Card style={styles.caseIdCard}>
          <View style={styles.caseIdHeader}>
            <View>
              <Text style={styles.caseIdLabel}>CareBridge Case ID</Text>
              <Text style={styles.caseIdValue}>{c.caseId}</Text>
            </View>
            <TouchableOpacity onPress={copyCaseId} style={styles.copyBtn}>
              <Copy size={14} color={Colors.primary} />
              <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.caseStatusRow}>
            <CaseStatusBadge status={c.status} reason={c.rejectionReason} />
            <TriageBadge priority={c.urgencyLevel || c.priority || 'immediate'} />
          </View>

          <View style={styles.timestampRow}>
            <Clock size={12} color={Colors.textMuted} />
            <Text style={styles.timestampText}>
              Logged on {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Just now'}
            </Text>
          </View>
        </Card>

        {/* Patient & Incident Dossier */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Patient & Incident Details</Text>

          <View style={styles.dossierRow}>
            <Text style={styles.dossierLabel}>Patient:</Text>
            <Text style={styles.dossierValue}>
              {c.patientName} ({c.patientAge}y • {c.patientGender})
            </Text>
          </View>

          <View style={styles.dossierRow}>
            <Text style={styles.dossierLabel}>Blood Group:</Text>
            <Text style={[styles.dossierValue, { color: Colors.critical, fontWeight: '800' }]}>
              {c.patientBloodGroup || 'Unknown'}
            </Text>
          </View>

          <View style={styles.dossierRow}>
            <Text style={styles.dossierLabel}>Condition:</Text>
            <Text style={styles.dossierValue}>{c.conditionSummary || c.patientCondition}</Text>
          </View>

          <View style={styles.dossierRow}>
            <Text style={styles.dossierLabel}>Attendant:</Text>
            <Text style={styles.dossierValue}>
              {c.attendant?.name || c.attendantName || 'Suresh Deshpande'} ({c.attendant?.relation || c.attendantRelation || 'Attendant'}) • {c.attendant?.phone || c.attendantPhone || '+91 98451 98765'}
            </Text>
          </View>

          <View style={[styles.dossierRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.dossierLabel}>Location:</Text>
            <Text style={styles.dossierValue}>
              {c.location?.address || c.incidentAddress || 'Hubballi, Karnataka'}
            </Text>
          </View>
        </Card>

        {/* Assigned Providers Telemetry */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Assigned Emergency Providers</Text>

          <View style={styles.providerItem}>
            <Building2 size={20} color={Colors.primary} />
            <View style={styles.providerItemInfo}>
              <Text style={styles.providerItemTitle}>
                {c.assignedHospitalName || c.matchedHospitalName || 'KIMS Super Specialty Hospital'}
              </Text>
              <Text style={styles.providerItemSub}>Emergency Inpatient Facility • PB Road</Text>
            </View>
            <View style={styles.providerStatusBadge}>
              <Text style={styles.providerStatusText}>Assigned</Text>
            </View>
          </View>

          {c.assignedAmbulanceName && (
            <View style={styles.providerItem}>
              <Truck size={20} color={Colors.emergency} />
              <View style={styles.providerItemInfo}>
                <Text style={styles.providerItemTitle}>{c.assignedAmbulanceName}</Text>
                <Text style={styles.providerItemSub}>ALS Paramedic Vehicle • Live Tracking</Text>
              </View>
              <View style={[styles.providerStatusBadge, { backgroundColor: Colors.emergencyBg }]}>
                <Text style={[styles.providerStatusText, { color: Colors.emergency }]}>Dispatched</Text>
              </View>
            </View>
          )}

          {c.assignedBloodBankName && (
            <View style={styles.providerItem}>
              <Droplet size={20} color={Colors.critical} />
              <View style={styles.providerItemInfo}>
                <Text style={styles.providerItemTitle}>{c.assignedBloodBankName}</Text>
                <Text style={styles.providerItemSub}>Blood Supply Centre • Deshpande Nagar</Text>
              </View>
              <View style={[styles.providerStatusBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.providerStatusText, { color: Colors.critical }]}>Reserved</Text>
              </View>
            </View>
          )}

          {c.assignedOxygenName && (
            <View style={styles.providerItem}>
              <Wind size={20} color={Colors.teal} />
              <View style={styles.providerItemInfo}>
                <Text style={styles.providerItemTitle}>{c.assignedOxygenName}</Text>
                <Text style={styles.providerItemSub}>Medical Gas Depot • Gokul Road</Text>
              </View>
              <View style={[styles.providerStatusBadge, { backgroundColor: '#CCFBF1' }]}>
                <Text style={[styles.providerStatusText, { color: Colors.teal }]}>Allocated</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Individual Resource Requests Status */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Resource Requisitions</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(true)} style={styles.addReqBtn}>
              <Plus size={14} color={Colors.primary} />
              <Text style={styles.addReqBtnText}>Add Resource</Text>
            </TouchableOpacity>
          </View>

          {requests.length === 0 ? (
            <Text style={styles.emptyReqText}>
              All emergency resource requests are currently routed to verified providers.
            </Text>
          ) : (
            <View style={styles.reqList}>
              {requests.map((r) => (
                <View key={r.requestId} style={styles.reqRow}>
                  <View style={styles.reqInfo}>
                    <Text style={styles.reqType}>
                      {r.resourceType.toUpperCase()}
                    </Text>
                    <Text style={styles.reqProvider}>
                      {r.providerName || 'Pending Assignment'}
                    </Text>
                    {r.details?.notes ? (
                      <Text style={styles.reqNotes}>{r.details.notes}</Text>
                    ) : null}
                  </View>
                  <CaseStatusBadge status={r.status} reason={r.rejectionReason} />
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Action Button: Return to Dashboard */}
        <Button
          title="Return to Patient Dashboard"
          onPress={() => router.replace('/(patient)')}
          variant="outline"
          size="lg"
          style={{ marginTop: 8 }}
        />

        {/* ======================================================= */}
        {/* MODAL: REQUEST ADDITIONAL RESOURCE                      */}
        {/* ======================================================= */}
        <Modal
          visible={isModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Request Additional Resource</Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <X size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {requestSuccess && (
                <View style={styles.modalSuccessBox}>
                  <CheckCircle2 size={16} color={Colors.success} />
                  <Text style={styles.modalSuccessText}>{requestSuccess}</Text>
                </View>
              )}

              <Text style={styles.modalLabel}>Select Resource Needed:</Text>
              <View style={styles.modalPillsRow}>
                {(['bed', 'icu', 'blood', 'oxygen', 'ambulance', 'doctor'] as ResourceType[]).map((res) => (
                  <TouchableOpacity
                    key={res}
                    onPress={() => setAdditionalResourceType(res)}
                    style={[
                      styles.modalPill,
                      additionalResourceType === res ? styles.modalPillActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        additionalResourceType === res ? styles.modalPillTextActive : null,
                      ]}
                    >
                      {res.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Clinical Notes / Details"
                placeholder="e.g. Additional blood units required for transfusion"
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                multiline
                numberOfLines={2}
              />

              <Button
                title="Transmit Requisition"
                onPress={handleRequestAdditional}
                loading={isSubmittingResource}
                variant="primary"
                size="md"
                style={{ marginTop: 10 }}
              />
            </Card>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textMuted,
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
  caseIdCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    marginBottom: 14,
  },
  caseIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  caseIdLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caseIdValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F3868',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  caseStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F3868',
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dossierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dossierLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dossierValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  providerItemInfo: {
    flex: 1,
  },
  providerItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  providerItemSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  providerStatusBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  providerStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.navy,
  },
  addReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addReqBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyReqText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  reqList: {
    gap: 8,
  },
  reqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
  },
  reqInfo: {
    flex: 1,
  },
  reqType: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  reqProvider: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  reqNotes: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    padding: 20,
    borderRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F3868',
  },
  modalSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successBg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  modalSuccessText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  modalPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  modalPill: {
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalPillTextActive: {
    color: '#FFFFFF',
  },
});
