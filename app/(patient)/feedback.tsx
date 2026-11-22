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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  Building2,
  Truck,
  Clock,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import {
  dataStore,
  submitCaseFeedback,
  getFeedbackForCaseFromFirestore,
  getAssignedCaseForProviderFromFirestore,
} from '../../services/dataService';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { CaseStatusBadge } from '../../components/common/Badge';
import { Colors } from '../../constants/colors';
import type { EmergencyCase, EmergencyFeedback } from '../../types';

const RESPONSE_TIME_OPTIONS = [
  { id: 'Very Satisfied', label: 'Very Satisfied', desc: 'Rapid & immediate response' },
  { id: 'Satisfied', label: 'Satisfied', desc: 'Prompt & reasonable response' },
  { id: 'Neutral', label: 'Neutral', desc: 'Acceptable response time' },
  { id: 'Dissatisfied', label: 'Dissatisfied', desc: 'Noticeable delay experienced' },
  { id: 'Very Dissatisfied', label: 'Very Dissatisfied', desc: 'Significant delay in emergency response' },
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Poor — Significant improvements needed',
  2: 'Fair — Below expectations',
  3: 'Good — Met standard expectations',
  4: 'Very Good — Quick and professional care',
  5: 'Excellent — Outstanding life-saving coordination',
};

export default function PatientFeedbackScreen() {
  const router = useRouter();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { currentUser } = useAuth();

  const [emergencyCase, setEmergencyCase] = useState<EmergencyCase | null>(null);
  const [existingFeedback, setExistingFeedback] = useState<EmergencyFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [overallRating, setOverallRating] = useState<number>(5);
  const [hospitalRating, setHospitalRating] = useState<number>(5);
  const [ambulanceRating, setAmbulanceRating] = useState<number>(5);
  const [includeAmbulance, setIncludeAmbulance] = useState<boolean>(true);
  const [responseTimeSatisfaction, setResponseTimeSatisfaction] = useState<string>('Very Satisfied');
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!caseId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Fetch case
      let c = dataStore.getCase(caseId);
      if (!c) {
        c = (await getAssignedCaseForProviderFromFirestore(caseId)) || undefined;
      }

      // 2. Fetch existing feedback if already submitted
      let fb = dataStore.getFeedbackForCase(caseId);
      if (!fb) {
        fb = (await getFeedbackForCaseFromFirestore(caseId)) || undefined;
      }

      if (isMounted) {
        if (c) {
          setEmergencyCase(c);
          // Auto determine if ambulance was used
          const hadAmbulance = Boolean(
            c.assignedAmbulanceName ||
            c.quotas?.ambulanceRequired ||
            c.requiredServices?.includes('ambulance') ||
            c.individualStatuses?.some((s) => s.resource?.toLowerCase().includes('ambulance'))
          );
          setIncludeAmbulance(hadAmbulance);
        }
        if (fb) {
          setExistingFeedback(fb);
          setOverallRating(fb.overallRating);
          if (fb.hospitalRating) setHospitalRating(fb.hospitalRating);
          if (fb.ambulanceRating) {
            setAmbulanceRating(fb.ambulanceRating);
            setIncludeAmbulance(true);
          } else {
            setIncludeAmbulance(false);
          }
          if (fb.responseTimeSatisfaction) setResponseTimeSatisfaction(fb.responseTimeSatisfaction);
          if (fb.comments) setComments(fb.comments);
        }
        setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  const handleSubmit = async () => {
    if (!caseId) {
      Alert.alert('Error', 'Missing Case ID.');
      return;
    }

    if (existingFeedback) {
      Alert.alert('Notice', 'Feedback has already been submitted for this case.');
      return;
    }

    if (overallRating < 1 || overallRating > 5) {
      Alert.alert('Validation', 'Please select an overall experience rating (1 to 5 stars).');
      return;
    }

    setSubmitting(true);

    const hospitalName =
      emergencyCase?.assignedHospitalName ||
      emergencyCase?.matchedHospitalName ||
      undefined;

    const ambulanceName =
      emergencyCase?.assignedAmbulanceName ||
      undefined;

    const result = await submitCaseFeedback({
      caseId,
      patientUid: emergencyCase?.patientUid || currentUser?.uid || '',
      patientName: emergencyCase?.patientName || currentUser?.displayName || 'Patient',
      overallRating,
      hospitalRating: hospitalRating || undefined,
      hospitalName,
      ambulanceRating: includeAmbulance ? ambulanceRating : undefined,
      ambulanceName: includeAmbulance ? ambulanceName : undefined,
      responseTimeSatisfaction,
      comments: comments.trim(),
    });

    setSubmitting(false);

    if (result.success) {
      setSubmittedSuccess(true);
      const savedFb = dataStore.getFeedbackForCase(caseId);
      if (savedFb) setExistingFeedback(savedFb);
    } else {
      Alert.alert('Submission Error', result.error || 'Failed to submit feedback.');
    }
  };

  const renderStarSelector = (
    value: number,
    onChange: (val: number) => void,
    readOnly = false
  ) => {
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            disabled={readOnly}
            onPress={() => onChange(star)}
            activeOpacity={0.7}
            style={styles.starButton}
          >
            <Star
              size={32}
              color={star <= value ? '#F59E0B' : '#CBD5E1'}
              fill={star <= value ? '#F59E0B' : 'none'}
            />
          </TouchableOpacity>
        ))}
        <Text style={styles.ratingNumberText}>{value} / 5</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading case feedback details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // View: Success / Thank You screen
  if (submittedSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Card style={styles.thankYouCard}>
            <View style={styles.thankYouIconCircle}>
              <CheckCircle2 size={54} color={Colors.success} />
            </View>
            <Text style={styles.thankYouTitle}>Thank You for Your Feedback!</Text>
            <Text style={styles.thankYouSubtitle}>
              Your rating and suggestions have been securely recorded.
            </Text>

            <View style={styles.thankYouDetailsBox}>
              <View style={styles.thankYouRow}>
                <Text style={styles.thankYouLabel}>Emergency Case ID:</Text>
                <Text style={styles.thankYouValue}>{caseId}</Text>
              </View>
              <View style={styles.thankYouRow}>
                <Text style={styles.thankYouLabel}>Overall Experience:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.thankYouValue}>{overallRating} / 5 Stars</Text>
                </View>
              </View>
              <View style={styles.thankYouRow}>
                <Text style={styles.thankYouLabel}>Response Time:</Text>
                <Text style={styles.thankYouValue}>{responseTimeSatisfaction}</Text>
              </View>
              {comments.trim().length > 0 && (
                <View style={[styles.thankYouRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                  <Text style={styles.thankYouLabel}>Your Comments:</Text>
                  <Text style={styles.thankYouCommentText}>"{comments.trim()}"</Text>
                </View>
              )}
            </View>

            <Text style={styles.thankYouFootnote}>
              Your response helps central coordinators, hospital staff, and ambulance providers continuously optimize emergency care.
            </Text>

            <View style={{ gap: 10, marginTop: 10 }}>
              <Button
                title="Return to Patient Dashboard"
                onPress={() => router.replace('/(patient)')}
                variant="primary"
                size="lg"
              />
              <Button
                title="View Case Summary"
                onPress={() =>
                  router.replace({
                    pathname: '/(patient)/case-details',
                    params: { caseId: caseId || '' },
                  })
                }
                variant="outline"
                size="md"
              />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hospitalName =
    emergencyCase?.assignedHospitalName ||
    emergencyCase?.matchedHospitalName ||
    'Assigned Hospital';

  const ambulanceName =
    emergencyCase?.assignedAmbulanceName ||
    'Assigned Ambulance Service';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Back Row */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#0F172A" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Emergency Care Feedback</Text>
        </View>

        {/* Case Reference Banner */}
        <Card style={styles.caseRefCard}>
          <View style={styles.caseRefHeader}>
            <View>
              <Text style={styles.caseRefSubtitle}>REFERENCED EMERGENCY CASE</Text>
              <Text style={styles.caseRefId}>{caseId || 'Unknown Case'}</Text>
            </View>
            <CaseStatusBadge status={emergencyCase?.status || 'COMPLETED'} />
          </View>

          <View style={styles.caseRefDivider} />

          <View style={styles.caseRefMetaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemLabel}>Patient</Text>
              <Text style={styles.metaItemVal} numberOfLines={1}>
                {emergencyCase?.patientName || currentUser?.displayName || 'Sahana S.'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemLabel}>Urgency</Text>
              <Text style={styles.metaItemVal} numberOfLines={1}>
                {emergencyCase?.urgencyLevel || emergencyCase?.priority || 'Level 1 Immediate'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemLabel}>Hospital</Text>
              <Text style={styles.metaItemVal} numberOfLines={1}>
                {hospitalName}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemLabel}>Ambulance</Text>
              <Text style={styles.metaItemVal} numberOfLines={1}>
                {includeAmbulance ? ambulanceName : 'Not Requested'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Already Submitted Warning / Read-Only View */}
        {existingFeedback && (
          <Card style={styles.alreadySubmittedCard}>
            <View style={styles.alreadySubmittedHeader}>
              <ShieldCheck size={20} color={Colors.success} />
              <Text style={styles.alreadySubmittedTitle}>Feedback Already Submitted</Text>
            </View>
            <Text style={styles.alreadySubmittedText}>
              You have already submitted feedback for this completed emergency case on{' '}
              {new Date(existingFeedback.submittedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              . Per network policy, only one feedback submission is allowed per completed case.
            </Text>
          </Card>
        )}

        {/* SECTION 1: OVERALL EXPERIENCE */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Star size={20} color="#D97706" fill="#F59E0B" />
            <Text style={styles.sectionTitle}>1. Overall Experience Rating</Text>
          </View>
          <Text style={styles.sectionDescription}>
            How would you rate the overall medical coordination and response for this emergency?
          </Text>

          {renderStarSelector(overallRating, setOverallRating, Boolean(existingFeedback))}

          <View style={styles.ratingDescBox}>
            <Text style={styles.ratingDescText}>
              {RATING_DESCRIPTIONS[overallRating] || 'Select your rating'}
            </Text>
          </View>
        </Card>

        {/* SECTION 2: HOSPITAL / FACILITY SERVICE */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Building2 size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>2. Hospital & Provider Care</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Rate the quality of admission triage, physician support, and facility service at{' '}
            <Text style={{ fontWeight: '700', color: '#0F172A' }}>{hospitalName}</Text>.
          </Text>

          {renderStarSelector(hospitalRating, setHospitalRating, Boolean(existingFeedback))}

          <View style={styles.ratingDescBox}>
            <Text style={styles.ratingDescText}>
              {RATING_DESCRIPTIONS[hospitalRating] || 'Select hospital rating'}
            </Text>
          </View>
        </Card>

        {/* SECTION 3: AMBULANCE SERVICE (CONDITIONAL / TOGGLEABLE) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Truck size={20} color={Colors.emergency} />
            <Text style={styles.sectionTitle}>3. Ambulance & Transport Service</Text>
          </View>

          {!existingFeedback && (
            <View style={styles.ambulanceToggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, includeAmbulance ? styles.toggleBtnActive : null]}
                onPress={() => setIncludeAmbulance(true)}
              >
                <Text style={[styles.toggleBtnText, includeAmbulance ? styles.toggleBtnTextActive : null]}>
                  Ambulance Used
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !includeAmbulance ? styles.toggleBtnActive : null]}
                onPress={() => setIncludeAmbulance(false)}
              >
                <Text style={[styles.toggleBtnText, !includeAmbulance ? styles.toggleBtnTextActive : null]}>
                  Not Applicable
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {includeAmbulance ? (
            <>
              <Text style={styles.sectionDescription}>
                Rate the promptness, paramedic assistance, and onboard comfort during transit with{' '}
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>{ambulanceName}</Text>.
              </Text>

              {renderStarSelector(ambulanceRating, setAmbulanceRating, Boolean(existingFeedback))}

              <View style={styles.ratingDescBox}>
                <Text style={styles.ratingDescText}>
                  {RATING_DESCRIPTIONS[ambulanceRating] || 'Select ambulance rating'}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.naBox}>
              <Text style={styles.naBoxText}>Ambulance rating marked as Not Applicable.</Text>
            </View>
          )}
        </Card>

        {/* SECTION 4: RESPONSE TIME SATISFACTION */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Clock size={20} color="#0284C7" />
            <Text style={styles.sectionTitle}>4. Response Time Satisfaction</Text>
          </View>
          <Text style={styles.sectionDescription}>
            How satisfied were you with the speed of coordination and provider arrival?
          </Text>

          <View style={styles.optionsList}>
            {RESPONSE_TIME_OPTIONS.map((opt) => {
              const isSelected = responseTimeSatisfaction === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  disabled={Boolean(existingFeedback)}
                  style={[
                    styles.optionPill,
                    isSelected ? styles.optionPillSelected : null,
                  ]}
                  onPress={() => setResponseTimeSatisfaction(opt.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, isSelected ? styles.radioCircleSelected : null]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isSelected ? styles.optionLabelSelected : null]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* SECTION 5: COMMENTS & SUGGESTIONS */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MessageSquare size={20} color="#059669" />
            <Text style={styles.sectionTitle}>5. Comments & Suggestions</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Share any additional thoughts about doctor communication, nursing care, or coordinator assistance.
          </Text>

          <TextInput
            style={[styles.commentsInput, existingFeedback ? styles.commentsInputReadOnly : null]}
            placeholder="Write your feedback here (e.g. prompt response, helpful doctor, smooth admission)..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={comments}
            onChangeText={setComments}
            editable={!existingFeedback}
            textAlignVertical="top"
          />
        </Card>

        {/* Bottom Submission Action */}
        <View style={styles.bottomActions}>
          {existingFeedback ? (
            <Button
              title="Return to Dashboard"
              onPress={() => router.replace('/(patient)')}
              variant="primary"
              size="lg"
            />
          ) : (
            <Button
              title="Submit Feedback"
              onPress={handleSubmit}
              loading={submitting}
              variant="primary"
              size="lg"
              icon={<CheckCircle2 size={18} color="#FFFFFF" />}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  caseRefCard: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  caseRefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  caseRefSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00707E',
    letterSpacing: 0.8,
  },
  caseRefId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  caseRefDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  caseRefMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  metaItem: {
    width: '50%',
    paddingRight: 8,
  },
  metaItemLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metaItemVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  alreadySubmittedCard: {
    marginBottom: 14,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    padding: 14,
  },
  alreadySubmittedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alreadySubmittedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  alreadySubmittedText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  sectionCard: {
    marginBottom: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 14,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  starButton: {
    padding: 4,
  },
  ratingNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  ratingDescBox: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  ratingDescText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  ambulanceToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  naBox: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  naBoxText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  optionsList: {
    gap: 8,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  optionPillSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionLabelSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  commentsInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
  },
  commentsInputReadOnly: {
    backgroundColor: '#F8FAFC',
    color: '#475569',
  },
  bottomActions: {
    marginTop: 8,
    marginBottom: 20,
  },
  thankYouCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thankYouIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  thankYouTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  thankYouSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  thankYouDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginVertical: 18,
    gap: 10,
  },
  thankYouRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thankYouLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  thankYouValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  thankYouCommentText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#334155',
    lineHeight: 18,
  },
  thankYouFootnote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
});
