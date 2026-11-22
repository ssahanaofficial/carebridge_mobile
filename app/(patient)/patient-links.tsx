import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import {
  dataStore,
  savePatientLinkToFirestore,
  deletePatientLinkFromFirestore,
  subscribePatientLinksFromFirestore,
} from '../../services/dataService';
import type { PatientLink } from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import {
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  AlertCircle,
  Phone,
} from 'lucide-react-native';

export default function PatientLinksScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [links, setLinks] = useState<PatientLink[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Link form state
  const [patientName, setPatientName] = useState('');
  const [relation, setRelation] = useState('Parent');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [consentGranted, setConsentGranted] = useState(true);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setLinks(dataStore.getPatientLinks(currentUser.uid));
    const unsub = subscribePatientLinksFromFirestore(currentUser.uid, setLinks);
    return () => unsub();
  }, [currentUser]);

  const handleAddLink = async () => {
    const errs: Record<string, string> = {};
    if (!patientName.trim()) errs.name = 'Patient full name is required.';
    const ageNum = Number(age.trim());
    if (!age.trim() || isNaN(ageNum) || ageNum <= 0 || ageNum > 125) {
      errs.age = 'Enter a valid age (1-125).';
    }
    if (!consentGranted) {
      errs.consent = 'Patient consent must be confirmed.';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const pUid = 'pat-' + Date.now().toString().slice(-6);
      const linkId = `${currentUser?.uid || 'att'}_${pUid}`;
      const newLink: PatientLink = {
        id: linkId,
        attendantUid: currentUser?.uid || 'patient-demo-01',
        attendantName: currentUser?.displayName || 'Sahana S.',
        attendantEmail: currentUser?.email || 'sahana2006@gmail.com',
        patientUid: pUid,
        patientName: patientName.trim(),
        relationship: relation.trim(),
        patientAge: Number(age.trim()),
        patientGender: gender,
        patientBloodGroup: bloodGroup,
        emergencyContactPhone: phone.trim() || currentUser?.phone || '',
        medicalNotes: notes.trim(),
        consentGranted: true,
        consentStatus: 'granted',
        consentDate: new Date().toISOString(),
        consentType: 'explicit_patient_consent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePatientLinkToFirestore(newLink);
      setPatientName('');
      setAge('');
      setPhone('');
      setNotes('');
      setShowAddForm(false);
      setFormErrors({});
      Alert.alert('Success', `Patient ${newLink.patientName} linked successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to link patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLink = (linkId: string, name: string) => {
    Alert.alert(
      'Remove Patient Link',
      `Are you sure you want to unlink patient ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            await deletePatientLinkFromFirestore(linkId);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={18} color={Colors.textSecondary} />
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Linked Patient Records</Text>
            <Text style={styles.subtitle}>
              Family & ward profiles with active legal consent for emergency triage
            </Text>
          </View>

          <Button
            title={showAddForm ? 'Cancel' : '+ Link Patient'}
            onPress={() => setShowAddForm(!showAddForm)}
            variant={showAddForm ? 'outline' : 'primary'}
            size="sm"
          />
        </View>

        {/* Add Link Form Card */}
        {showAddForm && (
          <Card style={styles.formCard}>
            <Text style={styles.formCardTitle}>Link a New Patient</Text>

            <Input
              label="Patient Full Name"
              placeholder="e.g. Ramesh Kumar"
              value={patientName}
              onChangeText={setPatientName}
              error={formErrors.name}
              required
            />

            <View style={styles.rowTwo}>
              <Input
                label="Relationship"
                placeholder="Parent / Spouse / Child"
                value={relation}
                onChangeText={setRelation}
                containerStyle={{ flex: 1 }}
                required
              />

              <Input
                label="Age (Years)"
                placeholder="42"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                containerStyle={{ flex: 1 }}
                error={formErrors.age}
                required
              />
            </View>

            <View style={styles.rowTwo}>
              <View style={{ flex: 1, marginBottom: 12 }}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.pickerRow}>
                  {['Male', 'Female', 'Other'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(g)}
                      style={[styles.pill, gender === g ? styles.pillActive : null]}
                    >
                      <Text style={[styles.pillText, gender === g ? styles.pillTextActive : null]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Blood Group"
                placeholder="B+ / O+ / A+"
                value={bloodGroup}
                onChangeText={setBloodGroup}
                containerStyle={{ flex: 1 }}
              />
            </View>

            <Input
              label="Emergency Contact Phone"
              placeholder="+91 98450 12345"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Input
              label="Chronic Medical Conditions / Notes"
              placeholder="e.g. Diabetic, hypertensive, allergies"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity
              onPress={() => setConsentGranted(!consentGranted)}
              style={styles.consentRow}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, consentGranted ? styles.checkboxChecked : null]}>
                {consentGranted && <Check size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.consentText}>
                I confirm that explicit consent has been authorized by this patient or legal guardian to act as an emergency attendant.
              </Text>
            </TouchableOpacity>
            {formErrors.consent && (
              <Text style={styles.validationError}>{formErrors.consent}</Text>
            )}

            <Button
              title="Save Patient Link"
              onPress={handleAddLink}
              loading={isSubmitting}
              variant="primary"
              size="md"
              style={{ marginTop: 14 }}
            />
          </Card>
        )}

        {/* Existing Links List */}
        <View style={styles.linksContainer}>
          {links.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Users size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Linked Patients Found</Text>
              <Text style={styles.emptyDesc}>
                Link family members or dependants to quickly request hospital beds, blood, oxygen, and ambulance dispatch on their behalf.
              </Text>
            </Card>
          ) : (
            links.map((link) => (
              <Card key={link.id} style={styles.linkItemCard}>
                <View style={styles.linkItemTop}>
                  <View>
                    <Text style={styles.linkItemName}>{link.patientName}</Text>
                    <Text style={styles.linkItemRel}>
                      {link.relationship} • {link.patientAge}y • {link.patientGender} • Blood: {link.patientBloodGroup || 'Unknown'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteLink(link.id, link.patientName)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color={Colors.critical} />
                  </TouchableOpacity>
                </View>

                {link.emergencyContactPhone ? (
                  <View style={styles.contactRow}>
                    <Phone size={12} color={Colors.textMuted} />
                    <Text style={styles.contactText}>Phone: {link.emergencyContactPhone}</Text>
                  </View>
                ) : null}

                {link.medicalNotes ? (
                  <Text style={styles.notesText} numberOfLines={2}>
                    Medical Notes: {link.medicalNotes}
                  </Text>
                ) : null}

                <View style={styles.linkFooter}>
                  <View style={styles.consentBadge}>
                    <ShieldCheck size={12} color={Colors.success} />
                    <Text style={styles.consentBadgeText}>Active Consent Verified</Text>
                  </View>

                  <Button
                    title="Dispatch Emergency"
                    onPress={() => {
                      router.push({
                        pathname: '/(patient)/new-case',
                        params: { prefillLinkId: link.id },
                      });
                    }}
                    variant="danger"
                    size="sm"
                  />
                </View>
              </Card>
            ))
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F3868',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 240,
  },
  formCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: Colors.cyan,
  },
  pillText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.navy,
    fontWeight: '800',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
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
  validationError: {
    color: Colors.critical,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  linksContainer: {
    gap: 12,
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
  linkItemCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 8,
  },
  linkItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  linkItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  linkItemRel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.criticalBg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  contactText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  notesText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  linkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  consentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  consentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
});
