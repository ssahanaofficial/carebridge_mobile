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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Stethoscope,
  Activity,
  Heart,
  FileText,
  User,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Building2,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import {
  dataStore,
  getAssignedCaseForProviderFromFirestore,
  subscribeRequestsForProviderFromFirestore,
} from '../../services/dataService';
import { Header } from '../../components/common/Header';
import { Colors } from '../../constants/colors';
import type { EmergencyCase, ClinicalNote, ResourceRequest } from '../../types';

export default function DoctorScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [providerRequests, setProviderRequests] = useState<ResourceRequest[]>([]);
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState('');
  const [bp, setBp] = useState('140/90');
  const [pulse, setPulse] = useState('98 bpm');
  const [spO2, setSpO2] = useState('94%');
  const [temp, setTemp] = useState('98.6 °F');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const unsubRequests = subscribeRequestsForProviderFromFirestore(
      currentUser.uid,
      (nextRequests) => {
        setProviderRequests(nextRequests);
        loadCasesForRequests(nextRequests);
      },
      () => {
        const local = dataStore.getRequestsForProvider(currentUser.uid);
        setProviderRequests(local);
        loadCasesForRequests(local);
      }
    );

    return () => unsubRequests();
  }, [currentUser]);

  const loadCasesForRequests = async (reqs: ResourceRequest[]) => {
    if (reqs.length === 0) {
      setCases([]);
      setSelectedCase(null);
      setClinicalNotes([]);
      setLoading(false);
      return;
    }
    const caseIds = Array.from(new Set(reqs.map((r) => r.caseId)));
    try {
      const records = await Promise.all(
        caseIds.map((id) => getAssignedCaseForProviderFromFirestore(id))
      );
      const available = records.filter((r: EmergencyCase | null): r is EmergencyCase => r !== null);
      setCases(available);
      if (available.length > 0 && !selectedCase) {
        setSelectedCase(available[0]);
      }
    } catch {
      // Fallback to local
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedCase) {
      setClinicalNotes([]);
      return;
    }
    const updateNotes = () => {
      setClinicalNotes(dataStore.getClinicalNotes(selectedCase.caseId));
    };
    updateNotes();
    return dataStore.subscribe(updateNotes);
  }, [selectedCase?.caseId]);

  const handleAddNote = () => {
    if (!selectedCase || !currentUser || !newNoteText.trim()) {
      Alert.alert('Required Field', 'Please enter clinical evaluation remarks.');
      return;
    }

    setIsSavingNote(true);
    const note: ClinicalNote = {
      id: 'note-' + Date.now(),
      caseId: selectedCase.caseId,
      doctorUid: currentUser.uid,
      doctorName: currentUser.displayName || 'Emergency Physician',
      hospitalName: currentUser.hospitalAffiliation || 'KIMS Super Specialty Hospital',
      noteText: newNoteText.trim(),
      vitals: { bp, pulse, spO2, temp },
      createdAt: new Date().toISOString(),
    };

    dataStore.addClinicalNote(note);
    setNewNoteText('');
    setIsSavingNote(false);
    setSuccessMessage('Clinical evaluation note attached to emergency case record.');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View style={styles.bannerIconBox}>
              <Stethoscope size={26} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowWrap}>
                <Text style={styles.doctorName}>{currentUser?.displayName || 'Emergency Physician'}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Attending Physician</Text>
                </View>
              </View>
              <View style={styles.detailsRow}>
                <Building2 size={12} color="#64748B" />
                <Text style={styles.detailsText}>
                  Affiliation: {currentUser?.hospitalAffiliation || 'KIMS Super Specialty Hospital'}
                </Text>
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

        {/* Active Emergency Patients Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Activity size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Active Emergency Patients ({cases.length})</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : cases.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No emergency cases assigned. Assigned patient details appear here.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.casesScroll}>
              {cases.map((c) => {
                const isSelected = selectedCase?.caseId === c.caseId;
                return (
                  <TouchableOpacity
                    key={c.caseId}
                    style={[
                      styles.patientChip,
                      isSelected && styles.patientChipActive,
                    ]}
                    onPress={() => setSelectedCase(c)}
                  >
                    <Text
                      style={[
                        styles.chipPatientName,
                        isSelected && { color: '#065F46' },
                      ]}
                    >
                      {c.patientName}
                    </Text>
                    <Text style={styles.chipCaseId}>{c.caseId}</Text>
                    <View
                      style={[
                        styles.urgencyDot,
                        c.urgencyLevel === 'immediate'
                          ? { backgroundColor: '#DC2626' }
                          : { backgroundColor: '#D97706' },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Selected Patient Clinical Workspace */}
        {selectedCase ? (
          <View style={styles.sectionCard}>
            {/* Dossier Header */}
            <View style={styles.patientInfoBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.selectedName}>{selectedCase.patientName}</Text>
                <Text style={styles.caseBadge}>{selectedCase.caseId}</Text>
              </View>
              <Text style={styles.patientSub}>
                Age: {selectedCase.patientAge} • Gender: {selectedCase.patientGender} • Blood: {selectedCase.patientBloodGroup || 'Unknown'}
              </Text>
              <Text style={styles.patientCondition}>
                Condition: {selectedCase.conditionSummary || selectedCase.patientCondition || 'Emergency Medical Request'}
              </Text>
            </View>

            {/* Record Clinical Examination */}
            <View style={styles.examCard}>
              <View style={styles.examHeader}>
                <Activity size={16} color="#059669" />
                <Text style={styles.examTitle}>Record Attending Clinical Vitals & Notes</Text>
              </View>

              {/* Vitals Grid */}
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalCol}>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={bp}
                    onChangeText={setBp}
                    placeholder="120/80"
                  />
                </View>
                <View style={styles.vitalCol}>
                  <Text style={styles.vitalLabel}>Heart Rate</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={pulse}
                    onChangeText={setPulse}
                    placeholder="98 bpm"
                  />
                </View>
                <View style={styles.vitalCol}>
                  <Text style={styles.vitalLabel}>SpO2 Oxygen</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={spO2}
                    onChangeText={setSpO2}
                    placeholder="94%"
                  />
                </View>
                <View style={styles.vitalCol}>
                  <Text style={styles.vitalLabel}>Body Temp</Text>
                  <TextInput
                    style={styles.vitalInput}
                    value={temp}
                    onChangeText={setTemp}
                    placeholder="98.6 °F"
                  />
                </View>
              </View>

              {/* Notes Input */}
              <Text style={[styles.vitalLabel, { marginTop: 10 }]}>Clinical Impression & Orders</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. Patient evaluated in emergency wing. IV fluids initiated, continuous ECG telemetry..."
                value={newNoteText}
                onChangeText={setNewNoteText}
              />

              <TouchableOpacity
                style={styles.saveNoteBtn}
                onPress={handleAddNote}
                disabled={isSavingNote}
              >
                <Send size={14} color="#FFFFFF" />
                <Text style={styles.saveNoteBtnText}>Save to Electronic Health Record</Text>
              </TouchableOpacity>
            </View>

            {/* Case Medical Timeline */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.timelineTitle}>
                Case Medical Timeline ({clinicalNotes.length})
              </Text>

              {clinicalNotes.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No clinical physician notes recorded yet.</Text>
                </View>
              ) : (
                clinicalNotes.map((n) => (
                  <View key={n.id} style={styles.noteItemCard}>
                    <View style={styles.noteHeader}>
                      <Text style={styles.noteAuthor}>{n.doctorName} ({n.hospitalName})</Text>
                      <Text style={styles.noteTime}>{new Date(n.createdAt).toLocaleTimeString()}</Text>
                    </View>
                    <Text style={styles.noteBody}>{n.noteText}</Text>
                    {n.vitals && (
                      <View style={styles.vitalsPillRow}>
                        <Text style={styles.vitalPill}>BP: {n.vitals.bp}</Text>
                        <Text style={styles.vitalPill}>HR: {n.vitals.pulse}</Text>
                        <Text style={styles.vitalPill}>SpO2: {n.vitals.spO2}</Text>
                        <Text style={styles.vitalPill}>Temp: {n.vitals.temp}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  doctorName: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  roleBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptyBox: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  casesScroll: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  patientChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    minWidth: 120,
    position: 'relative',
  },
  patientChipActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  chipPatientName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  chipCaseId: { fontSize: 10, color: '#64748B', fontFamily: 'monospace', marginTop: 2 },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 10,
    right: 10,
  },
  patientInfoBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  selectedName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  caseBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#E2E8F0',
    color: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  patientSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  patientCondition: { fontSize: 12, fontWeight: '600', color: '#334155', marginTop: 4, fontStyle: 'italic' },
  examCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
  },
  examHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  examTitle: { fontSize: 12, fontWeight: '700', color: '#065F46', textTransform: 'uppercase' },
  vitalsGrid: { flexDirection: 'row', gap: 6 },
  vitalCol: { flex: 1 },
  vitalLabel: { fontSize: 10, fontWeight: '700', color: '#475569', marginBottom: 2 },
  vitalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: 4,
    marginBottom: 10,
  },
  saveNoteBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveNoteBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  noteItemCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  noteAuthor: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  noteTime: { fontSize: 10, color: '#94A3B8' },
  noteBody: { fontSize: 12, color: '#334155', lineHeight: 18 },
  vitalsPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  vitalPill: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#065F46',
  },
});
