import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import {
  dataStore,
  subscribeAllCasesFromFirestore,
  subscribeAllRequestsFromFirestore,
  subscribeUsersFromFirestore,
  subscribeHospitalProfilesFromFirestore,
  subscribeBloodBankProfilesFromFirestore,
  subscribeOxygenProfilesFromFirestore,
  subscribeAmbulanceProfilesFromFirestore,
  subscribeProviderUpdateRequests,
  approveProviderUpdateRequest,
  rejectProviderUpdateRequest,
  assignCaseProviders,
  transitionEmergencyCaseStatus,
  verifyProvider,
  toggleUserActive,
  INITIAL_HOSPITAL,
  INITIAL_BLOOD_BANK,
  INITIAL_OXYGEN,
  INITIAL_AMBULANCE,
  subscribeFeedbackFromFirestore,
} from '../../services/dataService';
import type {
  EmergencyCase,
  ResourceRequest,
  UserProfile,
  HospitalProfile,
  BloodBankProfile,
  OxygenProfile,
  AmbulanceProfile,
  ProviderUpdateRequest,
  EmergencyLifecycleStatus,
  EmergencyFeedback,
} from '../../types';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { TriageBadge, CaseStatusBadge } from '../../components/common/Badge';
import { Colors } from '../../constants/colors';
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Droplet,
  Wind,
  Truck,
  Users,
  Search,
  Check,
  X,
  Sliders,
  ChevronRight,
  ChevronDown,
  UserCheck,
  UserX,
  RefreshCw,
  SlidersHorizontal,
  Edit2,
  XCircle,
  Star,
  MessageSquare,
  Calendar,
  Filter,
  Siren,
  Navigation,
  MapPin,
  Phone,
} from 'lucide-react-native';

interface DropdownOption {
  label: string;
  value: string;
}

function DropdownMenu({
  label,
  value,
  onSelect,
  options,
  placeholder = 'Select option...',
  badge,
  icon,
}: {
  label: string;
  value: string;
  onSelect: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  badge?: string;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.dropdownFieldContainer}>
        <View style={styles.dropdownHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            {icon}
            <Text style={styles.dropdownLabelText}>{label}</Text>
          </View>
          {badge && (
            <View style={styles.dropdownBadge}>
              <Text style={styles.dropdownBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {/* @ts-ignore */}
        <select
          value={value}
          onChange={(e: any) => onSelect(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '10px',
            color: '#0F172A',
            outline: 'none',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '4px',
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </View>
    );
  }

  return (
    <View style={styles.dropdownFieldContainer}>
      <View style={styles.dropdownHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          {icon}
          <Text style={styles.dropdownLabelText}>{label}</Text>
        </View>
        {badge && (
          <View style={styles.dropdownBadge}>
            <Text style={styles.dropdownBadgeText}>{badge}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.dropdownTriggerBtn}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownTriggerText, !selectedOption ? { color: Colors.textMuted } : null]} numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={16} color={Colors.textSecondary} />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownMenuList}>
          <TouchableOpacity
            style={[styles.dropdownMenuItem, !value ? styles.dropdownMenuItemSelected : null]}
            onPress={() => {
              onSelect('');
              setOpen(false);
            }}
          >
            <Text style={[styles.dropdownMenuItemText, !value ? { color: Colors.primary, fontWeight: '700' } : null]}>
              {placeholder}
            </Text>
          </TouchableOpacity>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dropdownMenuItem, isSelected ? styles.dropdownMenuItemSelected : null]}
                onPress={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
              >
                <Text style={[styles.dropdownMenuItemText, isSelected ? { color: Colors.primary, fontWeight: '700' } : null]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'emergencies' | 'coordinator' | 'providers' | 'users' | 'feedback' | 'analytics'>('emergencies');

  // Core Data
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [hospitals, setHospitals] = useState<HospitalProfile[]>([]);
  const [bloodBanks, setBloodBanks] = useState<BloodBankProfile[]>([]);
  const [oxygenDepots, setOxygenDepots] = useState<OxygenProfile[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceProfile[]>([]);
  const [providerUpdates, setProviderUpdates] = useState<ProviderUpdateRequest[]>([]);
  const [feedbackList, setFeedbackList] = useState<EmergencyFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState<'all' | 'hospital' | 'blood' | 'oxygen' | 'ambulance'>('all');

  // Feedback Search & Filters
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState('');
  const [feedbackHospitalFilter, setFeedbackHospitalFilter] = useState('all');
  const [feedbackProviderFilter, setFeedbackProviderFilter] = useState<'all' | 'hospital' | 'ambulance'>('all');
  const [feedbackDateFilter, setFeedbackDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Case Status Transition Modal State
  const [selectedCaseForStatus, setSelectedCaseForStatus] = useState<EmergencyCase | null>(null);
  const [nextStatus, setNextStatus] = useState<EmergencyLifecycleStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Provider Assignment Modal State
  const [selectedCaseForAssign, setSelectedCaseForAssign] = useState<EmergencyCase | null>(null);
  const [assignHospId, setAssignHospId] = useState('');
  const [assignAmbId, setAssignAmbId] = useState('');
  const [assignBloodId, setAssignBloodId] = useState('');
  const [assignOxyId, setAssignOxyId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Provider Stock & Capacity Change Requests State
  const [processingUpdateId, setProcessingUpdateId] = useState<string | null>(null);
  const [selectedUpdateForAdjust, setSelectedUpdateForAdjust] = useState<ProviderUpdateRequest | null>(null);
  const [adjustedDetails, setAdjustedDetails] = useState<Record<string, any>>({});
  const [adminReviewNote, setAdminReviewNote] = useState('');
  const [selectedUpdateForDecline, setSelectedUpdateForDecline] = useState<ProviderUpdateRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('Capacity verification unconfirmed');

  const pendingUpdates = useMemo(() => {
    return providerUpdates.filter((u) => !u.status || u.status === 'PENDING');
  }, [providerUpdates]);
  const pendingUpdatesCount = pendingUpdates.length;

  useEffect(() => {
    // Subscribe to all real-time collections
    const unsubCases = subscribeAllCasesFromFirestore((c) => {
      setCases(c);
      setLoading(false);
    });
    const unsubStore = dataStore.subscribe(() => {
      setCases([...dataStore.getCases()]);
      setRequests([...dataStore.getRequests()]);
    });
    const unsubReqs = subscribeAllRequestsFromFirestore(setRequests);
    const unsubUsers = subscribeUsersFromFirestore(setUsers);
    const unsubHosp = subscribeHospitalProfilesFromFirestore(setHospitals);
    const unsubBlood = subscribeBloodBankProfilesFromFirestore(setBloodBanks);
    const unsubOxy = subscribeOxygenProfilesFromFirestore(setOxygenDepots);
    const unsubAmb = subscribeAmbulanceProfilesFromFirestore(setAmbulances);
    const unsubUpdates = subscribeProviderUpdateRequests(setProviderUpdates);
    const unsubFeedback = subscribeFeedbackFromFirestore(setFeedbackList);

    return () => {
      unsubCases();
      unsubStore();
      unsubReqs();
      unsubUsers();
      unsubHosp();
      unsubBlood();
      unsubOxy();
      unsubAmb();
      unsubUpdates();
      unsubFeedback();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setCases([...dataStore.getCases()]);
    setRequests([...dataStore.getRequests()]);
    setUsers([...dataStore.getUsers()]);
    setFeedbackList([...dataStore.getFeedback()]);
    setTimeout(() => setRefreshing(false), 600);
  };

  // Real-time Statistics derived strictly from live database records
  const totalCases = cases.length;
  const pendingCases = cases.filter((c) => {
    const s = String(c.status || '').toUpperCase();
    return s === 'REQUESTED' || s === 'SUBMITTED' || s === 'UNDER_REVIEW';
  }).length;
  const activeCases = cases.filter((c) => {
    const s = String(c.status || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'RESOLVED' && s !== 'CANCELLED' && s !== 'REJECTED';
  }).length;
  const completedCases = cases.filter((c) => {
    const s = String(c.status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'RESOLVED';
  }).length;

  const totalAvailBeds = hospitals.reduce((acc, h) => acc + (h.availableBeds || 0), 0);
  const totalAvailICU = hospitals.reduce((acc, h) => acc + (h.availableICU || 0), 0);
  const totalBloodUnits = bloodBanks.reduce((acc, b) => {
    return acc + Object.values(b.inventory || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, 0);
  const totalOxyCylinders = oxygenDepots.reduce((acc, o) => acc + (o.cylindersAvailable || 0), 0);
  const activeAmbulancesCount = ambulances.reduce((acc, a) => acc + (a.vehicles?.filter((v) => v.isAvailable).length || 0), 0);

  // Filtered Cases
  const filteredCases = useMemo(() => {
    const list = cases.filter((c) => {
      const matchesSearch =
        (c.caseId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.conditionSummary || c.patientCondition || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.incidentAddress || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.emergencyType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.patientPhone || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'sos' && !!c.isSos) ||
        (statusFilter === 'active' &&
          c.status !== 'COMPLETED' &&
          c.status !== 'Completed' &&
          (c.status as string) !== 'RESOLVED' &&
          c.status !== 'CANCELLED' &&
          c.status !== 'Cancelled') ||
        c.status === statusFilter ||
        (statusFilter === 'REQUESTED' && (c.status === 'Submitted' || c.status === 'REQUESTED'));

      const matchesPriority =
        priorityFilter === 'all' ||
        c.priority === priorityFilter ||
        (priorityFilter === 'Critical' && (c.urgencyLevel === 'immediate' || !!c.isSos));

      return matchesSearch && matchesStatus && matchesPriority;
    });

    list.sort((a, b) => {
      const aIsActiveSos = !!a.isSos && a.status !== 'COMPLETED' && a.status !== 'CANCELLED';
      const bIsActiveSos = !!b.isSos && b.status !== 'COMPLETED' && b.status !== 'CANCELLED';
      if (aIsActiveSos && !bIsActiveSos) return -1;
      if (!aIsActiveSos && bIsActiveSos) return 1;
      return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
    });

    return list;
  }, [cases, searchQuery, statusFilter, priorityFilter]);

  // Filtered Requests
  const filteredRequests = requests.filter((r) => {
    if (resourceFilter === 'all') return true;
    if (resourceFilter === 'hospital') return ['bed', 'icu', 'hospital_admission'].includes(r.resourceType);
    if (resourceFilter === 'blood') return r.resourceType === 'blood';
    if (resourceFilter === 'oxygen') return r.resourceType === 'oxygen';
    if (resourceFilter === 'ambulance') return r.resourceType === 'ambulance';
    return true;
  });

  // Consolidated registered & verified providers for assignment dropdowns
  const allHospitals = useMemo(() => {
    const map = new Map<string, HospitalProfile>();
    if (INITIAL_HOSPITAL) {
      map.set(INITIAL_HOSPITAL.uid, INITIAL_HOSPITAL);
    }
    hospitals.forEach((h) => {
      if (h && h.uid) map.set(h.uid, h);
    });
    users
      .filter((u) => u.role === 'hospital')
      .forEach((u) => {
        const existing = map.get(u.uid);
        if (existing) {
          if (u.displayName && (existing.hospitalName === INITIAL_HOSPITAL.hospitalName || !existing.hospitalName)) {
            existing.hospitalName = u.displayName;
          }
        } else {
          const prof = dataStore.getHospitalProfile(u.uid);
          if (prof) {
            if (u.displayName) prof.hospitalName = u.displayName;
            map.set(prof.uid, prof);
          } else {
            map.set(u.uid, {
              ...INITIAL_HOSPITAL,
              uid: u.uid,
              hospitalName: u.displayName || 'Hospital Facility',
              city: u.city || 'Hubballi',
              availableBeds: 0,
              availableICU: 0,
              availableVentilators: 0,
            });
          }
        }
      });
    return Array.from(map.values()).filter((h) => h.hospitalName && h.hospitalName.trim().length > 0);
  }, [hospitals, users]);

  const allBloodBanks = useMemo(() => {
    const map = new Map<string, BloodBankProfile>();
    if (INITIAL_BLOOD_BANK) {
      map.set(INITIAL_BLOOD_BANK.uid, INITIAL_BLOOD_BANK);
    }
    bloodBanks.forEach((b) => {
      if (b && b.uid) map.set(b.uid, b);
    });
    users
      .filter((u) => u.role === 'bloodBank')
      .forEach((u) => {
        const existing = map.get(u.uid);
        if (existing) {
          if (u.displayName && (existing.bankName === INITIAL_BLOOD_BANK.bankName || !existing.bankName)) {
            existing.bankName = u.displayName;
          }
        } else {
          const prof = dataStore.getBloodBankProfile(u.uid);
          if (prof) {
            if (u.displayName) prof.bankName = u.displayName;
            map.set(prof.uid, prof);
          } else {
            map.set(u.uid, {
              ...INITIAL_BLOOD_BANK,
              uid: u.uid,
              bankName: u.displayName || 'Regional Blood Centre',
              city: u.city || 'Hubballi',
              inventory: { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 },
            });
          }
        }
      });
    return Array.from(map.values()).filter((b) => b.bankName && b.bankName.trim().length > 0);
  }, [bloodBanks, users]);

  const allOxygenDepots = useMemo(() => {
    const map = new Map<string, OxygenProfile>();
    if (INITIAL_OXYGEN) {
      map.set(INITIAL_OXYGEN.uid, INITIAL_OXYGEN);
    }
    oxygenDepots.forEach((o) => {
      if (o && o.uid) map.set(o.uid, o);
    });
    users
      .filter((u) => u.role === 'oxygenProvider' || (u.role as any) === 'oxygenDepot')
      .forEach((u) => {
        const existing = map.get(u.uid);
        if (existing) {
          if (u.displayName && (existing.providerName === INITIAL_OXYGEN.providerName || !existing.providerName)) {
            existing.providerName = u.displayName;
          }
        } else {
          const prof = dataStore.getOxygenProfile(u.uid);
          if (prof) {
            if (u.displayName) prof.providerName = u.displayName;
            map.set(prof.uid, prof);
          } else {
            map.set(u.uid, {
              ...INITIAL_OXYGEN,
              uid: u.uid,
              providerName: u.displayName || 'Oxygen Supply Depot',
              city: u.city || 'Hubballi',
              cylindersAvailable: 0,
              concentratorsAvailable: 0,
            });
          }
        }
      });
    return Array.from(map.values()).filter((o) => o.providerName && o.providerName.trim().length > 0);
  }, [oxygenDepots, users]);

  const allAmbulances = useMemo(() => {
    const map = new Map<string, AmbulanceProfile>();
    if (INITIAL_AMBULANCE) {
      map.set(INITIAL_AMBULANCE.uid, INITIAL_AMBULANCE);
    }
    ambulances.forEach((a) => {
      if (a && a.uid) map.set(a.uid, a);
    });
    users
      .filter((u) => u.role === 'ambulanceProvider')
      .forEach((u) => {
        const existing = map.get(u.uid);
        if (existing) {
          if (u.displayName && (existing.providerName === INITIAL_AMBULANCE.providerName || !existing.providerName)) {
            existing.providerName = u.displayName;
          }
        } else {
          const prof = dataStore.getAmbulanceProfile(u.uid);
          if (prof) {
            if (u.displayName) prof.providerName = u.displayName;
            map.set(prof.uid, prof);
          } else {
            map.set(u.uid, {
              ...INITIAL_AMBULANCE,
              uid: u.uid,
              providerName: u.displayName || 'Emergency Ambulance Fleet',
              city: u.city || 'Hubballi',
              totalVehicles: 0,
              availableVehicles: 0,
              vehicles: [],
            });
          }
        }
      });
    return Array.from(map.values()).filter((a) => a.providerName && a.providerName.trim().length > 0);
  }, [ambulances, users]);

  // Feedback Filtering and Metrics
  const uniqueHospitalsInFeedback = useMemo(() => {
    const set = new Set<string>();
    allHospitals.forEach((h) => {
      if (h.hospitalName) set.add(h.hospitalName);
    });
    feedbackList.forEach((f) => {
      if (f.hospitalName) set.add(f.hospitalName);
    });
    return Array.from(set);
  }, [allHospitals, feedbackList]);

  const filteredFeedback = useMemo(() => {
    const nowTime = Date.now();
    return feedbackList.filter((fb) => {
      // 1. Search Query
      if (feedbackSearchQuery.trim()) {
        const q = feedbackSearchQuery.toLowerCase();
        const matchesId = fb.caseId.toLowerCase().includes(q);
        const matchesPatient = fb.patientName.toLowerCase().includes(q);
        const matchesComments = (fb.comments || '').toLowerCase().includes(q);
        const matchesHosp = (fb.hospitalName || '').toLowerCase().includes(q);
        const matchesAmb = (fb.ambulanceName || '').toLowerCase().includes(q);
        if (!matchesId && !matchesPatient && !matchesComments && !matchesHosp && !matchesAmb) {
          return false;
        }
      }

      // 2. Hospital Filter
      if (feedbackHospitalFilter !== 'all') {
        if (fb.hospitalName !== feedbackHospitalFilter) {
          return false;
        }
      }

      // 3. Provider Filter
      if (feedbackProviderFilter === 'hospital') {
        if (!fb.hospitalRating && !fb.hospitalName) return false;
      } else if (feedbackProviderFilter === 'ambulance') {
        if (!fb.ambulanceRating && !fb.ambulanceName) return false;
      }

      // 4. Date Filter
      if (feedbackDateFilter !== 'all') {
        const fbTime = Date.parse(fb.submittedAt || fb.createdAt);
        if (!isNaN(fbTime)) {
          const diffMs = nowTime - fbTime;
          const diffHours = diffMs / (1000 * 60 * 60);
          if (feedbackDateFilter === 'today' && diffHours > 24) return false;
          if (feedbackDateFilter === '7days' && diffHours > 24 * 7) return false;
          if (feedbackDateFilter === '30days' && diffHours > 24 * 30) return false;
        }
      }

      return true;
    });
  }, [feedbackList, feedbackSearchQuery, feedbackHospitalFilter, feedbackProviderFilter, feedbackDateFilter]);

  const avgOverallRating = useMemo(() => {
    const list = filteredFeedback.map((f) => f.overallRating).filter(Boolean);
    if (list.length === 0) return '5.0';
    return (list.reduce((a, b) => a + b, 0) / list.length).toFixed(1);
  }, [filteredFeedback]);

  const avgHospitalRating = useMemo(() => {
    const list = filteredFeedback
      .map((f) => f.hospitalRating)
      .filter((v): v is number => typeof v === 'number');
    if (list.length === 0) return '—';
    return (list.reduce((a, b) => a + b, 0) / list.length).toFixed(1);
  }, [filteredFeedback]);

  const avgAmbulanceRating = useMemo(() => {
    const list = filteredFeedback
      .map((f) => f.ambulanceRating)
      .filter((v): v is number => typeof v === 'number');
    if (list.length === 0) return '—';
    return (list.reduce((a, b) => a + b, 0) / list.length).toFixed(1);
  }, [filteredFeedback]);

  const responseSatisfactionPct = useMemo(() => {
    if (filteredFeedback.length === 0) return 100;
    const satisfied = filteredFeedback.filter((f) =>
      ['Very Satisfied', 'Satisfied'].includes(f.responseTimeSatisfaction)
    ).length;
    return Math.round((satisfied / filteredFeedback.length) * 100);
  }, [filteredFeedback]);

  // Handlers
  const handleOpenAssign = (c: EmergencyCase) => {
    setSelectedCaseForAssign(c);
    const caseReqs = requests.filter((r) => r.caseId === c.caseId);
    const hospReq = caseReqs.find((r) => ['bed', 'icu', 'hospital_admission'].includes(r.resourceType));
    const ambReq = caseReqs.find((r) => r.resourceType === 'ambulance');
    const bloodReq = caseReqs.find((r) => r.resourceType === 'blood');
    const oxyReq = caseReqs.find((r) => r.resourceType === 'oxygen');

    setAssignHospId(c.assignedHospitalUid || (hospReq?.providerUid && hospReq.providerUid !== 'pending_coordinator_assignment' ? hospReq.providerUid : ''));
    setAssignAmbId(c.assignedAmbulanceUid || (ambReq?.providerUid && ambReq.providerUid !== 'pending_coordinator_assignment' ? ambReq.providerUid : ''));
    setAssignBloodId(c.assignedBloodBankUid || (bloodReq?.providerUid && bloodReq.providerUid !== 'pending_coordinator_assignment' ? bloodReq.providerUid : ''));
    setAssignOxyId(c.assignedOxygenUid || (oxyReq?.providerUid && oxyReq.providerUid !== 'pending_coordinator_assignment' ? oxyReq.providerUid : ''));
    setAssignNote(c.notes || '');
  };

  const handleConfirmAssignment = async () => {
    if (!selectedCaseForAssign) return;
    setIsSubmittingAssign(true);
    try {
      await assignCaseProviders(selectedCaseForAssign.caseId, {
        hospitalUid: assignHospId || undefined,
        ambulanceUid: assignAmbId || undefined,
        bloodBankUid: assignBloodId || undefined,
        oxygenUid: assignOxyId || undefined,
        note: assignNote,
      });
      setSelectedCaseForAssign(null);
      Alert.alert('Success', `Providers allocated to emergency ${selectedCaseForAssign.caseId}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Assignment failed.');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleOpenStatusModal = (c: EmergencyCase) => {
    setSelectedCaseForStatus(c);
    setNextStatus('');
    setStatusReason('');
  };

  const handleConfirmStatusTransition = async () => {
    if (!selectedCaseForStatus || !nextStatus) return;
    if ((nextStatus === 'REJECTED' || nextStatus === 'CANCELLED') && statusReason.trim().length < 5) {
      Alert.alert('Required', 'A reason of at least 5 characters is required for rejection/cancellation.');
      return;
    }

    setIsSavingStatus(true);
    try {
      await transitionEmergencyCaseStatus(selectedCaseForStatus.caseId, nextStatus, statusReason.trim());
      setSelectedCaseForStatus(null);
      Alert.alert('Status Updated', `Case status updated to ${nextStatus}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update status.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleVerify = async (uid: string, verify: boolean) => {
    try {
      await verifyProvider(uid, verify);
      Alert.alert('Verified', verify ? 'Provider organization verified.' : 'Verification revoked.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Verification update failed.');
    }
  };

  const handleToggleUserActive = async (uid: string, currentActive: boolean) => {
    try {
      await toggleUserActive(uid, !currentActive);
      Alert.alert('Status Updated', !currentActive ? 'Account activated.' : 'Account suspended.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update account.');
    }
  };

  // Provider Stock & Capacity Update Handlers
  const handleApproveDirect = async (update: ProviderUpdateRequest) => {
    setProcessingUpdateId(update.id);
    try {
      await approveProviderUpdateRequest(update.id, update.details);
      Alert.alert(
        'Approved & Broadcast Live',
        `Capacity update for ${update.providerName} APPROVED & applied live to network.`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to approve update request.');
    } finally {
      setProcessingUpdateId(null);
    }
  };

  const handleStartAdjusting = (update: ProviderUpdateRequest) => {
    setSelectedUpdateForAdjust(update);
    setAdjustedDetails({ ...(update.details || {}) });
    setAdminReviewNote(update.adminNote || '');
  };

  const handleConfirmAdjustedApprove = async () => {
    if (!selectedUpdateForAdjust) return;
    setProcessingUpdateId(selectedUpdateForAdjust.id);
    try {
      await approveProviderUpdateRequest(
        selectedUpdateForAdjust.id,
        adjustedDetails,
        adminReviewNote.trim() || undefined
      );
      setSelectedUpdateForAdjust(null);
      Alert.alert(
        'Approved with Adjustments',
        `Capacity update for ${selectedUpdateForAdjust.providerName} APPROVED with adjustments & broadcast live.`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to approve update request.');
    } finally {
      setProcessingUpdateId(null);
    }
  };

  const handleOpenDeclineModal = (update: ProviderUpdateRequest) => {
    setSelectedUpdateForDecline(update);
    setDeclineReason('Capacity verification unconfirmed');
  };

  const handleConfirmDecline = async () => {
    if (!selectedUpdateForDecline) return;
    setProcessingUpdateId(selectedUpdateForDecline.id);
    try {
      await rejectProviderUpdateRequest(
        selectedUpdateForDecline.id,
        declineReason.trim() || 'Declined by coordinator'
      );
      setSelectedUpdateForDecline(null);
      Alert.alert('Request Declined', `Update request from ${selectedUpdateForDecline.providerName} DECLINED.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to decline update request.');
    } finally {
      setProcessingUpdateId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      {/* Admin Central Oversight Ribbon */}
      <View style={styles.adminRibbon}>
        <Shield size={14} color="#FFFFFF" />
        <Text style={styles.adminRibbonText}>CENTRAL COMMAND COORDINATOR • REAL-TIME DISPATCH</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Bar */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <Card style={styles.statMetricCard}>
              <Text style={styles.metricVal}>{totalCases}</Text>
              <Text style={styles.metricLbl}>Total Cases</Text>
            </Card>

            <Card style={[styles.statMetricCard, { borderColor: Colors.criticalBorder }]}>
              <Text style={[styles.metricVal, { color: Colors.critical }]}>{pendingCases}</Text>
              <Text style={styles.metricLbl}>Pending Review</Text>
            </Card>

            <Card style={[styles.statMetricCard, { borderColor: Colors.emergencyBorder }]}>
              <Text style={[styles.metricVal, { color: Colors.emergency }]}>{activeCases}</Text>
              <Text style={styles.metricLbl}>Active Triage</Text>
            </Card>

            <Card style={[styles.statMetricCard, { borderColor: Colors.successBorder }]}>
              <Text style={[styles.metricVal, { color: Colors.success }]}>{completedCases}</Text>
              <Text style={styles.metricLbl}>Completed</Text>
            </Card>

            <Card style={styles.statMetricCard}>
              <Text style={[styles.metricVal, { color: Colors.primary }]}>{totalAvailBeds} / {totalAvailICU}</Text>
              <Text style={styles.metricLbl}>Beds / ICU Avail</Text>
            </Card>

            <Card style={styles.statMetricCard}>
              <Text style={[styles.metricVal, { color: Colors.critical }]}>{totalBloodUnits}</Text>
              <Text style={styles.metricLbl}>Blood Units</Text>
            </Card>

            <Card style={styles.statMetricCard}>
              <Text style={[styles.metricVal, { color: Colors.teal }]}>{totalOxyCylinders}</Text>
              <Text style={styles.metricLbl}>O2 Cylinders</Text>
            </Card>

            <Card style={styles.statMetricCard}>
              <Text style={[styles.metricVal, { color: Colors.navy }]}>{activeAmbulancesCount}</Text>
              <Text style={styles.metricLbl}>Active Fleet</Text>
            </Card>
          </ScrollView>
        </View>

        {/* Pending Provider Updates Notification Banner */}
        {pendingUpdatesCount > 0 && activeTab !== 'providers' && (
          <TouchableOpacity
            style={styles.pendingAlertBanner}
            onPress={() => setActiveTab('providers')}
            activeOpacity={0.8}
          >
            <View style={styles.pendingAlertLeft}>
              <Clock size={16} color="#B45309" />
              <Text style={styles.pendingAlertText}>
                {pendingUpdatesCount} provider stock/capacity {pendingUpdatesCount === 1 ? 'update requires' : 'updates require'} verification
              </Text>
            </View>
            <ChevronRight size={16} color="#B45309" />
          </TouchableOpacity>
        )}

        {/* Tab Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBarScrollWrapper}
          contentContainerStyle={styles.tabBar}
        >
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'emergencies' ? styles.tabItemActive : null]}
            onPress={() => setActiveTab('emergencies')}
          >
            <Text style={[styles.tabItemText, activeTab === 'emergencies' ? styles.tabItemTextActive : null]}>
              Cases ({cases.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'coordinator' ? styles.tabItemActive : null]}
            onPress={() => setActiveTab('coordinator')}
          >
            <Text style={[styles.tabItemText, activeTab === 'coordinator' ? styles.tabItemTextActive : null]}>
              Requests ({requests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'providers' ? styles.tabItemActive : null]}
            onPress={() => setActiveTab('providers')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.tabItemText, activeTab === 'providers' ? styles.tabItemTextActive : null]}>
                Providers
              </Text>
              {pendingUpdatesCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingUpdatesCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'users' ? styles.tabItemActive : null]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabItemText, activeTab === 'users' ? styles.tabItemTextActive : null]}>
              Users
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'feedback' ? styles.tabItemActive : null]}
            onPress={() => setActiveTab('feedback')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star
                size={12}
                color={activeTab === 'feedback' ? '#D97706' : '#64748B'}
                fill={activeTab === 'feedback' ? '#F59E0B' : 'none'}
              />
              <Text style={[styles.tabItemText, activeTab === 'feedback' ? styles.tabItemTextActive : null]}>
                Feedback ({feedbackList.length})
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* ======================================================= */}
        {/* TAB 1: EMERGENCIES (CASES)                              */}
        {/* ======================================================= */}
        {activeTab === 'emergencies' && (
          <View style={styles.tabContent}>
            {/* Search & Filters */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={16} color={Colors.textMuted} />
                <TextInput
                  placeholder="Search case, patient, address..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                />
              </View>
            </View>

            <View style={styles.filterPillsRow}>
              {[
                { id: 'all', label: 'All Status' },
                { id: 'sos', label: `🚨 SOS (${cases.filter((x) => x.isSos).length})` },
                { id: 'active', label: 'Active' },
                { id: 'REQUESTED', label: 'REQUESTED' },
                { id: 'ASSIGNED', label: 'ASSIGNED' },
                { id: 'DISPATCHED', label: 'DISPATCHED' },
                { id: 'COMPLETED', label: 'COMPLETED' },
              ].map((st) => (
                <TouchableOpacity
                  key={st.id}
                  onPress={() => setStatusFilter(st.id)}
                  style={[
                    styles.filterPill,
                    statusFilter === st.id
                      ? st.id === 'sos'
                        ? styles.filterPillSosActive
                        : styles.filterPillActive
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      statusFilter === st.id
                        ? st.id === 'sos'
                          ? styles.filterPillSosTextActive
                          : styles.filterPillTextActive
                        : null,
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : filteredCases.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>No emergency cases matching criteria.</Text>
              </Card>
            ) : (
              filteredCases.map((c) => (
                <Card key={c.caseId} style={[styles.adminCaseCard, c.isSos ? styles.adminSosCaseCard : null]}>
                  {c.isSos && (
                    <View style={styles.adminSosCardBanner}>
                      <View style={styles.adminSosBadgeLeft}>
                        <Siren size={15} color="#DC2626" />
                        <Text style={styles.adminSosBadgeTitle}>
                          EMERGENCY SOS • {c.emergencyType ? c.emergencyType.toUpperCase() : 'IMMEDIATE DISTRESS'}
                        </Text>
                      </View>
                      <View style={styles.adminSosPill}>
                        <Text style={styles.adminSosPillText}>CRITICAL SOS</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.adminCaseCardHeader}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.adminCaseId}>{c.caseId}</Text>
                        {c.isSos && (
                          <View style={styles.sosTag}>
                            <Text style={styles.sosTagText}>SOS</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.adminCaseDate}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Just now'}
                      </Text>
                    </View>
                    <CaseStatusBadge status={c.status} reason={c.rejectionReason} />
                  </View>

                  <View style={styles.adminPatientRow}>
                    <Text style={styles.adminPatientName}>{c.patientName}</Text>
                    <Text style={styles.adminPatientDetails}>
                      ({c.patientAge ? `${c.patientAge}y` : 'Age Unspecified'} • Blood: {c.patientBloodGroup || 'Unknown'})
                    </Text>
                  </View>

                  {c.patientPhone ? (
                    <TouchableOpacity
                      style={styles.adminCallerRow}
                      onPress={() => Linking.openURL(`tel:${c.patientPhone}`).catch(() => {})}
                      activeOpacity={0.75}
                    >
                      <Phone size={13} color="#0D9488" />
                      <Text style={styles.adminCallerText}>Caller: {c.patientPhone} (Tap to Call)</Text>
                    </TouchableOpacity>
                  ) : null}

                  <View style={styles.adminComplaintRow}>
                    <Text style={styles.adminComplaintText} numberOfLines={2}>
                      {c.conditionSummary || c.patientCondition || (c.isSos ? `SOS Emergency: ${c.emergencyType || 'Immediate Attention Needed'}` : 'Emergency Medical Request')}
                    </Text>
                    <TriageBadge priority={c.urgencyLevel || c.priority || 'immediate'} />
                  </View>

                  <View style={styles.adminLocationBox}>
                    <View style={styles.adminAddressRow}>
                      <MapPin size={14} color="#64748B" />
                      <Text style={styles.adminAddressText}>
                        {c.location?.address || c.incidentAddress || 'Hubballi'}
                      </Text>
                    </View>
                    {c.location?.coordinates && (
                      <View style={styles.adminGpsRow}>
                        <Text style={styles.adminGpsCoordText}>
                          GPS: {c.location.coordinates.lat.toFixed(5)}, {c.location.coordinates.lng.toFixed(5)}
                        </Text>
                        <TouchableOpacity
                          style={styles.adminNavBtn}
                          onPress={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${c.location!.coordinates!.lat},${c.location!.coordinates!.lng}`;
                            Linking.openURL(url).catch(() => {});
                          }}
                          activeOpacity={0.8}
                        >
                          <Navigation size={12} color="#FFFFFF" />
                          <Text style={styles.adminNavBtnText}>View Map / Route</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Specifically Display What the Patient Asked For & Live Telemetry */}
                  {(() => {
                    const caseReqs = requests.filter((r) => r.caseId === c.caseId);
                    const hospReq = caseReqs.find((r) => ['bed', 'icu', 'hospital_admission'].includes(r.resourceType));
                    const ambReq = caseReqs.find((r) => r.resourceType === 'ambulance');
                    const bloodReq = caseReqs.find((r) => r.resourceType === 'blood');
                    const oxyReq = caseReqs.find((r) => r.resourceType === 'oxygen');

                    const bedDetail = hospReq?.details?.bedType || (c.resourcesNeeded?.includes('icu') ? 'ICU Bed' : c.resourcesNeeded?.includes('bed') ? 'General Emergency Bed' : 'Emergency Bed');
                    const ambDetail = ambReq?.details?.vehicleType ? `${ambReq.details.vehicleType} Ambulance` : (c.resourcesNeeded?.includes('ambulance') ? 'Emergency Ambulance' : null);
                    const bloodDetail = bloodReq ? `${bloodReq.details?.units || 2} Units (${c.patientBloodGroup || bloodReq.details?.bloodGroup || 'A+'})` : (c.resourcesNeeded?.includes('blood') ? `Blood Transfusion (${c.patientBloodGroup || 'Needed'})` : null);
                    const oxyDetail = oxyReq ? `${oxyReq.details?.cylinders || 2} Cylinders O2` : (c.resourcesNeeded?.includes('oxygen') ? 'Oxygen Support' : null);

                    const hospName = c.assignedHospitalName || c.matchedHospitalName || hospReq?.providerName;
                    const ambName = c.assignedAmbulanceName || ambReq?.providerName;
                    const bloodName = c.assignedBloodBankName || bloodReq?.providerName;
                    const oxyName = c.assignedOxygenName || oxyReq?.providerName;

                    return (
                      <View style={styles.caseDetailsExpandedBox}>
                        {/* What the patient asked for */}
                        <View style={styles.requestedSection}>
                          <Text style={styles.requestedSectionTitle}>PATIENT REQUESTED RESOURCES:</Text>
                          <View style={styles.requestedPillsWrap}>
                            <View style={[styles.reqPill, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}>
                              <Building2 size={12} color="#0D9488" />
                              <Text style={[styles.reqPillText, { color: '#0F766E' }]}>🛏️ {bedDetail}</Text>
                            </View>

                            {ambDetail && (
                              <View style={[styles.reqPill, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                                <Truck size={12} color="#D97706" />
                                <Text style={[styles.reqPillText, { color: '#B45309' }]}>🚑 {ambDetail}</Text>
                              </View>
                            )}

                            {bloodDetail && (
                              <View style={[styles.reqPill, { backgroundColor: '#FFF1F2', borderColor: '#FFE4E6' }]}>
                                <Droplet size={12} color="#E11D48" />
                                <Text style={[styles.reqPillText, { color: '#BE123C' }]}>🩸 {bloodDetail}</Text>
                              </View>
                            )}

                            {oxyDetail && (
                              <View style={[styles.reqPill, { backgroundColor: '#F0F9FF', borderColor: '#E0F2FE' }]}>
                                <Wind size={12} color="#0284C7" />
                                <Text style={[styles.reqPillText, { color: '#0369A1' }]}>💨 {oxyDetail}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Assigned Providers Telemetry */}
                        <View style={styles.providerStatusSection}>
                          <Text style={styles.providerStatusTitle}>DISPATCH STATUS & ALLOCATIONS:</Text>
                          <View style={styles.providerStatusList}>
                            <View style={styles.providerStatusItem}>
                              <Text style={styles.providerRoleTag}>Hospital:</Text>
                              <Text style={[styles.providerNameTag, hospName ? styles.providerNameTagAssigned : styles.providerNameTagPending]}>
                                {hospName ? `${hospName} ${hospReq?.status === 'accepted' ? '(Accepted ✓)' : hospReq?.status === 'rejected' ? '(Declined ✕)' : '(Assigned)'}` : 'Pending'}
                              </Text>
                            </View>

                            <View style={styles.providerStatusItem}>
                              <Text style={styles.providerRoleTag}>Ambulance:</Text>
                              <Text style={[styles.providerNameTag, ambName ? styles.providerNameTagAssigned : styles.providerNameTagPending]}>
                                {ambName ? `${ambName} ${ambReq?.status === 'accepted' ? '(Accepted ✓)' : ambReq?.status === 'rejected' ? '(Declined ✕)' : '(Dispatched)'}` : (c.isSos ? '⚠️ Unassigned (Needs Provider)' : 'Pending')}
                              </Text>
                            </View>

                            {(bloodDetail || bloodName) && (
                              <View style={styles.providerStatusItem}>
                                <Text style={styles.providerRoleTag}>Blood:</Text>
                                <Text style={[styles.providerNameTag, bloodName ? styles.providerNameTagAssigned : styles.providerNameTagPending]}>
                                  {bloodName ? `${bloodName} ${bloodReq?.status === 'accepted' ? '(Accepted ✓)' : bloodReq?.status === 'rejected' ? '(Declined ✕)' : '(Assigned)'}` : 'Pending'}
                                </Text>
                              </View>
                            )}

                            {(oxyDetail || oxyName) && (
                              <View style={styles.providerStatusItem}>
                                <Text style={styles.providerRoleTag}>Oxygen:</Text>
                                <Text style={[styles.providerNameTag, oxyName ? styles.providerNameTagAssigned : styles.providerNameTagPending]}>
                                  {oxyName ? `${oxyName} ${oxyReq?.status === 'accepted' ? '(Accepted ✓)' : oxyReq?.status === 'rejected' ? '(Declined ✕)' : '(Assigned)'}` : 'Pending'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Action Buttons: Allocate Providers & Change Status */}
                  <View style={styles.adminActionRow}>
                    <Button
                      title="Allocate Providers"
                      onPress={() => handleOpenAssign(c)}
                      variant="primary"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Update Lifecycle"
                      onPress={() => handleOpenStatusModal(c)}
                      variant="outline"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        

        {/* ======================================================= */}
        {/* TAB 2: COORDINATOR (REQUESTS)                           */}
        {/* ======================================================= */}
        {activeTab === 'coordinator' && (
          <View style={styles.tabContent}>
            <View style={styles.filterPillsRow}>
              {[
                { id: 'all', label: 'All Resources' },
                { id: 'hospital', label: 'Hospital Beds/ICU' },
                { id: 'blood', label: 'Blood Units' },
                { id: 'oxygen', label: 'Oxygen' },
                { id: 'ambulance', label: 'Ambulance' },
              ].map((rf) => (
                <TouchableOpacity
                  key={rf.id}
                  onPress={() => setResourceFilter(rf.id as any)}
                  style={[styles.filterPill, resourceFilter === rf.id ? styles.filterPillActive : null]}
                >
                  <Text style={[styles.filterPillText, resourceFilter === rf.id ? styles.filterPillTextActive : null]}>
                    {rf.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredRequests.map((r) => (
              <Card key={r.requestId} style={styles.requestCard}>
                <View style={styles.requestCardHeader}>
                  <View>
                    <Text style={styles.requestType}>{r.resourceType.toUpperCase()}</Text>
                    <Text style={styles.requestCaseId}>For Case: {r.caseId}</Text>
                  </View>
                  <CaseStatusBadge status={r.status} reason={r.rejectionReason} />
                </View>

                <Text style={styles.requestPatient}>Patient: {r.patientName}</Text>
                <Text style={styles.requestProvider}>Provider: {r.providerName || 'Pending Assignment'}</Text>

                {r.details?.notes ? (
                  <Text style={styles.requestNotes}>Details: {r.details.notes}</Text>
                ) : null}
              </Card>
            ))}
          </View>
        )}

        

        {/* ======================================================= */}
        {/* TAB 3: PROVIDERS DIRECTORY & CAPACITY APPROVALS          */}
        {/* ======================================================= */}
        {activeTab === 'providers' && (
          <View style={styles.tabContent}>
            {/* Section 1: Pending Stock & Capacity Change Requests */}
            <Card style={styles.stockReviewContainer}>
              <View style={styles.stockReviewHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Clock size={18} color="#D97706" />
                  <Text style={styles.stockReviewTitle}>Pending Stock & Capacity Requests</Text>
                </View>
                {pendingUpdatesCount > 0 && (
                  <View style={styles.pendingBadgeWrap}>
                    <Text style={styles.pendingBadgeWrapText}>{pendingUpdatesCount} Pending Approval</Text>
                  </View>
                )}
              </View>
              <Text style={styles.stockReviewSub}>
                Hospitals, blood banks, oxygen depots, and ambulance fleets submit real-time updates here. Coordinators verify and approve changes before broadcasting live to the network.
              </Text>

              {providerUpdates.length === 0 ? (
                <View style={styles.emptyStockBox}>
                  <Clock size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyStockText}>
                    No provider capacity update requests received recently. Live updates will display here automatically.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {providerUpdates.map((update) => {
                    const isPending = !update.status || update.status === 'PENDING';
                    const isApproved = update.status === 'APPROVED';
                    const isRejected = update.status === 'REJECTED';
                    const isBusy = processingUpdateId === update.id;

                    return (
                      <View
                        key={update.id}
                        style={[
                          styles.updateCard,
                          isPending
                            ? styles.updateCardPending
                            : isApproved
                            ? styles.updateCardApproved
                            : styles.updateCardRejected,
                        ]}
                      >
                        <View style={styles.updateCardTop}>
                          <View style={{ flex: 1, gap: 3 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.updateProviderName}>{update.providerName}</Text>
                              <View style={styles.roleTag}>
                                <Text style={styles.roleTagText}>{update.providerRole}</Text>
                              </View>
                              <Text style={styles.updateTimeText}>
                                {new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>

                            <View style={{ marginTop: 2 }}>
                              <Text style={styles.updateRequestedLabel}>
                                Requested Inventory / Capacity:{' '}
                                <Text style={styles.updateRequestedVal}>{update.summary}</Text>
                              </Text>
                            </View>

                            {update.adminNote ? (
                              <Text style={styles.updateCoordinatorNote}>
                                Coordinator Note: "{update.adminNote}"
                              </Text>
                            ) : null}
                          </View>

                          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                            {isPending && (
                              <View style={styles.badgePending}>
                                <Clock size={12} color="#92400E" />
                                <Text style={styles.badgePendingText}>Awaiting Review</Text>
                              </View>
                            )}
                            {isApproved && (
                              <View style={styles.badgeApproved}>
                                <CheckCircle2 size={12} color="#065F46" />
                                <Text style={styles.badgeApprovedText}>Approved & Synced</Text>
                              </View>
                            )}
                            {isRejected && (
                              <View style={styles.badgeRejected}>
                                <XCircle size={12} color="#991B1B" />
                                <Text style={styles.badgeRejectedText}>Declined</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Action buttons for pending requests */}
                        {isPending && (
                          <View style={styles.updateActionRow}>
                            <TouchableOpacity
                              style={styles.adjustBtn}
                              onPress={() => handleStartAdjusting(update)}
                              disabled={isBusy}
                            >
                              <Edit2 size={13} color="#475569" />
                              <Text style={styles.adjustBtnText}>Adjust Numbers</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.declineBtn}
                              onPress={() => handleOpenDeclineModal(update)}
                              disabled={isBusy}
                            >
                              <X size={13} color="#B91C1C" />
                              <Text style={styles.declineBtnText}>Decline</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.approveBtn}
                              onPress={() => handleApproveDirect(update)}
                              disabled={isBusy}
                            >
                              <Check size={14} color="#FFFFFF" />
                              <Text style={styles.approveBtnText}>
                                {isBusy ? 'Processing...' : '✓ Approve & Broadcast Live'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            <Text style={styles.subHeading}>Registered Healthcare Facilities</Text>

            {/* Hospitals */}
            <Text style={styles.providerCategoryTitle}>🏥 Hospitals & Medical Centers</Text>
            {allHospitals.map((h) => (
              <Card key={`hosp-${h.uid}`} style={styles.providerCard}>
                <View style={styles.providerCardHeader}>
                  <View>
                    <Text style={styles.providerTitle}>{h.hospitalName}</Text>
                    <Text style={styles.providerSub}>{h.city} • Contact: {h.contactNumber}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleVerify(h.uid, !h.isVerified)}
                    style={[styles.verifyBtn, h.isVerified ? styles.verifiedBtn : styles.unverifiedBtn]}
                  >
                    <Text style={[styles.verifyBtnText, h.isVerified ? styles.verifiedBtnText : null]}>
                      {h.isVerified ? 'Verified' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.capacityRow}>
                  <Text style={styles.capacityText}>General Beds: <Text style={styles.bold}>{h.availableBeds}</Text> / {h.totalBeds}</Text>
                  <Text style={styles.capacityText}>ICU: <Text style={styles.bold}>{h.availableICU}</Text> / {h.totalICU}</Text>
                  <Text style={styles.capacityText}>Ventilators: <Text style={styles.bold}>{h.availableVentilators}</Text></Text>
                </View>
              </Card>
            ))}

            {/* Blood Banks */}
            <Text style={styles.providerCategoryTitle}>🩸 Regional Blood Banks</Text>
            {allBloodBanks.map((b) => (
              <Card key={`bb-${b.uid}`} style={styles.providerCard}>
                <View style={styles.providerCardHeader}>
                  <View>
                    <Text style={styles.providerTitle}>{b.bankName}</Text>
                    <Text style={styles.providerSub}>{b.city} • Contact: {b.contactNumber}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleVerify(b.uid, !b.isVerified)}
                    style={[styles.verifyBtn, b.isVerified ? styles.verifiedBtn : styles.unverifiedBtn]}
                  >
                    <Text style={[styles.verifyBtnText, b.isVerified ? styles.verifiedBtnText : null]}>
                      {b.isVerified ? 'Verified' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inventoryChips}>
                  {Object.entries(b.inventory || {}).map(([grp, units]) => (
                    <View key={`grp-${b.uid}-${grp}`} style={styles.invChip}>
                      <Text style={styles.invChipText}>{grp}: {units}u</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}

            {/* Oxygen Depots */}
            <Text style={styles.providerCategoryTitle}>💨 Medical Oxygen Depots</Text>
            {allOxygenDepots.map((o) => (
              <Card key={`oxy-${o.uid}`} style={styles.providerCard}>
                <View style={styles.providerCardHeader}>
                  <View>
                    <Text style={styles.providerTitle}>{o.providerName}</Text>
                    <Text style={styles.providerSub}>{o.city} • Contact: {o.contactNumber}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleVerify(o.uid, !o.isVerified)}
                    style={[styles.verifyBtn, o.isVerified ? styles.verifiedBtn : styles.unverifiedBtn]}
                  >
                    <Text style={[styles.verifyBtnText, o.isVerified ? styles.verifiedBtnText : null]}>
                      {o.isVerified ? 'Verified' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.capacityText}>
                  Cylinders Available: <Text style={styles.bold}>{o.cylindersAvailable ?? 0}</Text> • Concentrators: <Text style={styles.bold}>{o.concentratorsAvailable ?? 0}</Text>
                </Text>
              </Card>
            ))}

            {/* Ambulance Fleets */}
            <Text style={styles.providerCategoryTitle}>🚑 Emergency Ambulance Fleets</Text>
            {allAmbulances.map((a) => {
              const safeVehicles = Array.isArray(a.vehicles) ? a.vehicles : [];
              const totalV = safeVehicles.length || a.totalVehicles || 0;
              const availV = safeVehicles.filter((v) => v.isAvailable).length ?? a.availableVehicles ?? 0;
              return (
                <Card key={`amb-${a.uid}`} style={styles.providerCard}>
                  <View style={styles.providerCardHeader}>
                    <View>
                      <Text style={styles.providerTitle}>{a.providerName}</Text>
                      <Text style={styles.providerSub}>{a.city} • Hotline: {a.contactNumber}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleVerify(a.uid, !a.isVerified)}
                      style={[styles.verifyBtn, a.isVerified ? styles.verifiedBtn : styles.unverifiedBtn]}
                    >
                      <Text style={[styles.verifyBtnText, a.isVerified ? styles.verifiedBtnText : null]}>
                        {a.isVerified ? 'Verified' : 'Verify'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.capacityText}>
                    Total Vehicles: {totalV} • Available: {availV}
                  </Text>
                </Card>
              );
            })}
          </View>
        )}

        

        {/* ======================================================= */}
        {/* TAB 4: USERS MANAGEMENT                                 */}
        {/* ======================================================= */}
        {activeTab === 'users' && (
          <View style={styles.tabContent}>
            <View style={styles.filterPillsRow}>
              {['all', 'patient', 'hospital', 'bloodBank', 'oxygenProvider', 'ambulanceProvider', 'doctor'].map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => setUserRoleFilter(role)}
                  style={[styles.filterPill, userRoleFilter === role ? styles.filterPillActive : null]}
                >
                  <Text style={[styles.filterPillText, userRoleFilter === role ? styles.filterPillTextActive : null]}>
                    {role === 'all' ? 'All Roles' : role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {users
              .filter((u) => userRoleFilter === 'all' || u.role === userRoleFilter)
              .map((u) => (
                <Card key={u.uid} style={styles.userCard}>
                  <View style={styles.userCardHeader}>
                    <View>
                      <Text style={styles.userName}>{u.displayName || u.email}</Text>
                      <Text style={styles.userEmail}>{u.email} • Role: {u.role}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggleUserActive(u.uid, u.isActive)}
                      style={[styles.statusToggle, u.isActive ? styles.statusActive : styles.statusSuspended]}
                    >
                      <Text style={[styles.statusToggleText, u.isActive ? styles.statusActiveText : null]}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
          </View>
        )}

        {/* ======================================================= */}
        {/* TAB 5: PATIENT FEEDBACK & QUALITY ASSURANCE             */}
        {/* ======================================================= */}
        {activeTab === 'feedback' && (
          <View style={styles.tabContent}>
            {/* KPI Cards: Average Ratings & Satisfaction */}
            <View style={styles.feedbackKpiGrid}>
              <Card style={styles.feedbackKpiCard}>
                <View style={[styles.kpiIconBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Star size={18} color="#D97706" fill="#F59E0B" />
                </View>
                <Text style={styles.feedbackKpiVal}>
                  {avgOverallRating} <Text style={styles.kpiScale}>/ 5</Text>
                </Text>
                <Text style={styles.feedbackKpiLabel}>Overall Experience</Text>
                <Text style={styles.feedbackKpiSub}>{filteredFeedback.length} Reviews</Text>
              </Card>

              <Card style={styles.feedbackKpiCard}>
                <View style={[styles.kpiIconBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Building2 size={18} color={Colors.primary} />
                </View>
                <Text style={styles.feedbackKpiVal}>
                  {avgHospitalRating} <Text style={styles.kpiScale}>{avgHospitalRating !== '—' ? '/ 5' : ''}</Text>
                </Text>
                <Text style={styles.feedbackKpiLabel}>Hospital Care</Text>
                <Text style={styles.feedbackKpiSub}>Bed & ICU triage</Text>
              </Card>

              <Card style={styles.feedbackKpiCard}>
                <View style={[styles.kpiIconBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Truck size={18} color={Colors.emergency} />
                </View>
                <Text style={styles.feedbackKpiVal}>
                  {avgAmbulanceRating} <Text style={styles.kpiScale}>{avgAmbulanceRating !== '—' ? '/ 5' : ''}</Text>
                </Text>
                <Text style={styles.feedbackKpiLabel}>Ambulance Dispatch</Text>
                <Text style={styles.feedbackKpiSub}>Transit & Paramedic</Text>
              </Card>

              <Card style={styles.feedbackKpiCard}>
                <View style={[styles.kpiIconBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Clock size={18} color="#059669" />
                </View>
                <Text style={styles.feedbackKpiVal}>{responseSatisfactionPct}%</Text>
                <Text style={styles.feedbackKpiLabel}>Prompt Response</Text>
                <Text style={styles.feedbackKpiSub}>Satisfied / Very Satisfied</Text>
              </Card>
            </View>

            {/* Search Input */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={16} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search feedback by Case ID, patient, comments..."
                  placeholderTextColor={Colors.textMuted}
                  value={feedbackSearchQuery}
                  onChangeText={setFeedbackSearchQuery}
                />
                {feedbackSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setFeedbackSearchQuery('')}>
                    <X size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter 1: Date Filter */}
            <View style={styles.feedbackFilterSection}>
              <View style={styles.feedbackFilterLabelRow}>
                <Calendar size={13} color="#64748B" />
                <Text style={styles.feedbackFilterLabel}>FILTER BY DATE</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Past 24 Hours' },
                  { id: '7days', label: 'Past 7 Days' },
                  { id: '30days', label: 'Past 30 Days' },
                ].map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.filterPill, feedbackDateFilter === d.id ? styles.filterPillActive : null]}
                    onPress={() => setFeedbackDateFilter(d.id as any)}
                  >
                    <Text style={[styles.filterPillText, feedbackDateFilter === d.id ? styles.filterPillTextActive : null]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filter 2: Service / Provider Filter */}
            <View style={styles.feedbackFilterSection}>
              <View style={styles.feedbackFilterLabelRow}>
                <Sliders size={13} color="#64748B" />
                <Text style={styles.feedbackFilterLabel}>FILTER BY SERVICE PROVIDER</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
                {[
                  { id: 'all', label: 'All Services' },
                  { id: 'hospital', label: 'Hospital Care Only' },
                  { id: 'ambulance', label: 'Ambulance Fleet Only' },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.filterPill, feedbackProviderFilter === p.id ? styles.filterPillActive : null]}
                    onPress={() => setFeedbackProviderFilter(p.id as any)}
                  >
                    <Text style={[styles.filterPillText, feedbackProviderFilter === p.id ? styles.filterPillTextActive : null]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filter 3: Hospital Filter */}
            {uniqueHospitalsInFeedback.length > 0 && (
              <View style={styles.feedbackFilterSection}>
                <View style={styles.feedbackFilterLabelRow}>
                  <Building2 size={13} color="#64748B" />
                  <Text style={styles.feedbackFilterLabel}>FILTER BY HOSPITAL</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
                  <TouchableOpacity
                    style={[styles.filterPill, feedbackHospitalFilter === 'all' ? styles.filterPillActive : null]}
                    onPress={() => setFeedbackHospitalFilter('all')}
                  >
                    <Text style={[styles.filterPillText, feedbackHospitalFilter === 'all' ? styles.filterPillTextActive : null]}>
                      All Hospitals
                    </Text>
                  </TouchableOpacity>
                  {uniqueHospitalsInFeedback.map((hName) => (
                    <TouchableOpacity
                      key={hName}
                      style={[styles.filterPill, feedbackHospitalFilter === hName ? styles.filterPillActive : null]}
                      onPress={() => setFeedbackHospitalFilter(hName)}
                    >
                      <Text style={[styles.filterPillText, feedbackHospitalFilter === hName ? styles.filterPillTextActive : null]}>
                        {hName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* List of Feedback Entries */}
            <View style={styles.feedbackListContainer}>
              {filteredFeedback.length === 0 ? (
                <Card style={styles.emptyFeedbackCard}>
                  <Star size={36} color="#CBD5E1" />
                  <Text style={styles.emptyFeedbackTitle}>No Feedback Matches Filters</Text>
                  <Text style={styles.emptyFeedbackSub}>
                    {feedbackList.length === 0
                      ? 'No emergency case feedback has been submitted by patients yet.'
                      : 'Try resetting the hospital, provider, date, or search filters above.'}
                  </Text>
                </Card>
              ) : (
                filteredFeedback.map((fb) => (
                  <Card key={fb.id} style={styles.feedbackAdminCard}>
                    {/* Top Row: Case ID & Date */}
                    <View style={styles.feedbackCardHeader}>
                      <View>
                        <Text style={styles.feedbackCasePill}>Case: {fb.caseId}</Text>
                        <Text style={styles.feedbackPatientText}>
                          Patient: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{fb.patientName}</Text>
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.feedbackDateText}>
                          {new Date(fb.submittedAt || fb.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                        <View style={styles.responseTimeBadge}>
                          <Clock size={11} color="#0369A1" />
                          <Text style={styles.responseTimeBadgeText}>{fb.responseTimeSatisfaction}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Ratings Grid */}
                    <View style={styles.feedbackRatingsBox}>
                      <View style={styles.feedbackRatingCol}>
                        <Text style={styles.feedbackRatingLabel}>Overall Experience</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              color={s <= fb.overallRating ? '#F59E0B' : '#CBD5E1'}
                              fill={s <= fb.overallRating ? '#F59E0B' : 'none'}
                            />
                          ))}
                          <Text style={styles.ratingNumberBold}>{fb.overallRating} / 5</Text>
                        </View>
                      </View>

                      {fb.hospitalRating && (
                        <View style={styles.feedbackRatingCol}>
                          <Text style={styles.feedbackRatingLabel}>Hospital: {fb.hospitalName || 'Care Facility'}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                color={s <= fb.hospitalRating! ? '#0284C7' : '#CBD5E1'}
                                fill={s <= fb.hospitalRating! ? '#0284C7' : 'none'}
                              />
                            ))}
                            <Text style={styles.ratingNumberBold}>{fb.hospitalRating} / 5</Text>
                          </View>
                        </View>
                      )}

                      {fb.ambulanceRating && (
                        <View style={styles.feedbackRatingCol}>
                          <Text style={styles.feedbackRatingLabel}>Ambulance: {fb.ambulanceName || 'Fleet Unit'}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                color={s <= fb.ambulanceRating! ? '#DC2626' : '#CBD5E1'}
                                fill={s <= fb.ambulanceRating! ? '#DC2626' : 'none'}
                              />
                            ))}
                            <Text style={styles.ratingNumberBold}>{fb.ambulanceRating} / 5</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Patient Comments */}
                    <View style={styles.commentContainer}>
                      <View style={styles.commentHeaderRow}>
                        <MessageSquare size={13} color="#059669" />
                        <Text style={styles.commentHeaderTitle}>Patient Comments & Suggestions:</Text>
                      </View>
                      <Text style={styles.commentBodyText}>
                        {fb.comments && fb.comments.trim().length > 0
                          ? `"${fb.comments.trim()}"`
                          : 'No additional written comments provided.'}
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </View>
          </View>
        )}

        {/* ======================================================= */}
        {/* MODAL 1: PROVIDER ASSIGNMENT                            */}
        {/* ======================================================= */}
        <Modal
          visible={Boolean(selectedCaseForAssign)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedCaseForAssign(null)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Allocate Healthcare Providers</Text>
                <TouchableOpacity onPress={() => setSelectedCaseForAssign(null)}>
                  <X size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalCaseId}>Emergency: {selectedCaseForAssign?.caseId}</Text>
              <Text style={styles.modalPatient}>Patient: {selectedCaseForAssign?.patientName} ({selectedCaseForAssign?.patientAge}y)</Text>

              {(() => {
                const assignCaseReqs = selectedCaseForAssign ? requests.filter((r) => r.caseId === selectedCaseForAssign.caseId) : [];
                const assignHospReq = assignCaseReqs.find((r) => ['bed', 'icu', 'hospital_admission'].includes(r.resourceType));
                const assignAmbReq = assignCaseReqs.find((r) => r.resourceType === 'ambulance');
                const assignBloodReq = assignCaseReqs.find((r) => r.resourceType === 'blood');
                const assignOxyReq = assignCaseReqs.find((r) => r.resourceType === 'oxygen');

                const patientBedType = assignHospReq?.details?.bedType || (selectedCaseForAssign?.resourcesNeeded?.includes('icu') ? 'ICU Bed' : 'General Emergency Bed');
                const patientAmbType = assignAmbReq?.details?.vehicleType || selectedCaseForAssign?.quotas?.ambulanceType || 'ALS/BLS Emergency Unit';
                const patientBloodGroup = selectedCaseForAssign?.patientBloodGroup || assignBloodReq?.details?.bloodGroup || 'A+';
                const patientBloodUnits = assignBloodReq?.details?.units || 2;
                const patientOxyCylinders = assignOxyReq?.details?.cylinders || (selectedCaseForAssign?.resourcesNeeded?.includes('oxygen') ? 2 : 0);

                return (
                  <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                    {/* 1. Designated Hospital Dropdown */}
                    <DropdownMenu
                      label="Designated Receiving Hospital"
                      badge={`Patient Needs: ${patientBedType}`}
                      placeholder="Do Not Assign Hospital"
                      options={allHospitals.map((h) => ({
                        label: `${h.hospitalName} — ${h.availableBeds} beds (${h.availableICU} ICU) • Patient needs ${patientBedType}`,
                        value: h.uid,
                      }))}
                      value={assignHospId}
                      onSelect={setAssignHospId}
                      icon={<Building2 size={15} color="#0D9488" />}
                    />

                    {/* 2. Ambulance Fleet Dropdown */}
                    <DropdownMenu
                      label="Ambulance Dispatch Service"
                      badge={`Patient Needs: ${patientAmbType}`}
                      placeholder="Do Not Assign Ambulance"
                      options={allAmbulances.map((a) => {
                        const idle = a.vehicles?.filter((v) => v.isAvailable).length ?? a.availableVehicles ?? 0;
                        return {
                          label: `${a.providerName} — ${idle} idle (${a.vehicles?.length ?? a.totalVehicles ?? 0} fleet)`,
                          value: a.uid,
                        };
                      })}
                      value={assignAmbId}
                      onSelect={setAssignAmbId}
                      icon={<Truck size={15} color="#D97706" />}
                    />

                    {/* 3. Blood Bank Requisition Dropdown */}
                    <DropdownMenu
                      label="Blood Bank Requisition"
                      badge={`Patient Needs: Group ${patientBloodGroup} (${patientBloodUnits}u)`}
                      placeholder="Do Not Assign Blood Bank"
                      options={allBloodBanks.map((b) => {
                        const avail = (b.inventory as any)?.[patientBloodGroup] ?? 0;
                        return {
                          label: `${b.bankName} — Group ${patientBloodGroup}: ${avail} units in stock • Patient needs ${patientBloodUnits}u`,
                          value: b.uid,
                        };
                      })}
                      value={assignBloodId}
                      onSelect={setAssignBloodId}
                      icon={<Droplet size={15} color="#E11D48" />}
                    />

                    {/* 4. Oxygen Supplier Allocation Dropdown */}
                    <DropdownMenu
                      label="Oxygen Supplier Allocation"
                      badge={`Patient Needs: ${patientOxyCylinders > 0 ? `${patientOxyCylinders} Cylinders` : 'Oxygen Support'}`}
                      placeholder="Do Not Assign Oxygen Supplier"
                      options={allOxygenDepots.map((o) => ({
                        label: `${o.providerName} — ${o.cylindersAvailable ?? 0} cylinders in stock • Patient needs ${patientOxyCylinders || 1}`,
                        value: o.uid,
                      }))}
                      value={assignOxyId}
                      onSelect={setAssignOxyId}
                      icon={<Wind size={15} color="#0284C7" />}
                    />

                    <Input
                      label="Coordinator Dispatch Note"
                      placeholder="Special medical instructions..."
                      value={assignNote}
                      onChangeText={setAssignNote}
                    />
                  </ScrollView>
                );
              })()}

              <Button
                title="Confirm & Dispatch Providers"
                onPress={handleConfirmAssignment}
                loading={isSubmittingAssign}
                variant="primary"
                size="md"
                style={{ marginTop: 10 }}
              />
            </Card>
          </View>
        </Modal>

        {/* ======================================================= */}
        {/* MODAL 2: CASE LIFECYCLE STATUS TRANSITION               */}
        {/* ======================================================= */}
        <Modal
          visible={Boolean(selectedCaseForStatus)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedCaseForStatus(null)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Emergency Lifecycle</Text>
                <TouchableOpacity onPress={() => setSelectedCaseForStatus(null)}>
                  <X size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalCaseId}>Emergency: {selectedCaseForStatus?.caseId}</Text>
              <Text style={styles.modalPatient}>Current Status: {selectedCaseForStatus?.status}</Text>

              <Text style={styles.selectLabel}>Select Next Stage:</Text>
              <View style={styles.statusOptionsGrid}>
                {[
                  'UNDER_REVIEW',
                  'ASSIGNED',
                  'RESOURCE_CONFIRMED',
                  'DISPATCHED',
                  'IN_PROGRESS',
                  'COMPLETED',
                  'REJECTED',
                  'CANCELLED',
                ].map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setNextStatus(st as EmergencyLifecycleStatus)}
                    style={[
                      styles.statusPill,
                      nextStatus === st ? styles.statusPillActive : null,
                    ]}
                  >
                    <Text style={[styles.statusPillText, nextStatus === st ? styles.statusPillTextActive : null]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(nextStatus === 'REJECTED' || nextStatus === 'CANCELLED') && (
                <Input
                  label="Rejection / Cancellation Reason (Min 5 chars)"
                  placeholder="Specify clinical or logistical reason..."
                  value={statusReason}
                  onChangeText={setStatusReason}
                  required
                />
              )}

              <Button
                title="Save Status Change"
                onPress={handleConfirmStatusTransition}
                loading={isSavingStatus}
                variant="danger"
                size="md"
                style={{ marginTop: 10 }}
              />
            </Card>
          </View>
        </Modal>

        {/* ======================================================= */}
        {/* MODAL 3: ADJUST CAPACITY & INVENTORY VALUES             */}
        {/* ======================================================= */}
        <Modal
          visible={Boolean(selectedUpdateForAdjust)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedUpdateForAdjust(null)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Edit2 size={18} color={Colors.primary} />
                  <Text style={styles.modalTitle}>Adjust Numbers Before Approving</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedUpdateForAdjust(null)}>
                  <X size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalCaseId}>{selectedUpdateForAdjust?.providerName} ({selectedUpdateForAdjust?.providerRole})</Text>
              <Text style={styles.modalPatient}>Original: {selectedUpdateForAdjust?.summary}</Text>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {/* Hospital adjustments */}
                {selectedUpdateForAdjust?.providerRole === 'hospital' && (
                  <View style={{ gap: 10, marginBottom: 12 }}>
                    <Input
                      label="Available General Beds"
                      value={String(adjustedDetails.availableBeds ?? selectedUpdateForAdjust.details?.availableBeds ?? 0)}
                      onChangeText={(t) => setAdjustedDetails((prev) => ({ ...prev, availableBeds: Number(t) || 0 }))}
                      keyboardType="numeric"
                    />
                    <Input
                      label="Available ICU Beds"
                      value={String(adjustedDetails.availableICU ?? selectedUpdateForAdjust.details?.availableICU ?? 0)}
                      onChangeText={(t) => setAdjustedDetails((prev) => ({ ...prev, availableICU: Number(t) || 0 }))}
                      keyboardType="numeric"
                    />
                    <Input
                      label="Available Ventilators"
                      value={String(adjustedDetails.availableVentilators ?? selectedUpdateForAdjust.details?.availableVentilators ?? 0)}
                      onChangeText={(t) => setAdjustedDetails((prev) => ({ ...prev, availableVentilators: Number(t) || 0 }))}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* Oxygen Provider adjustments */}
                {selectedUpdateForAdjust?.providerRole === 'oxygenProvider' && (
                  <View style={{ gap: 10, marginBottom: 12 }}>
                    <Input
                      label="Cylinders Available (46.7L D-Type)"
                      value={String(adjustedDetails.cylindersAvailable ?? selectedUpdateForAdjust.details?.cylindersAvailable ?? 0)}
                      onChangeText={(t) => setAdjustedDetails((prev) => ({ ...prev, cylindersAvailable: Number(t) || 0 }))}
                      keyboardType="numeric"
                    />
                    <Input
                      label="Concentrators Available (10 LPM)"
                      value={String(adjustedDetails.concentratorsAvailable ?? selectedUpdateForAdjust.details?.concentratorsAvailable ?? 0)}
                      onChangeText={(t) => setAdjustedDetails((prev) => ({ ...prev, concentratorsAvailable: Number(t) || 0 }))}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {/* Blood Bank adjustments */}
                {selectedUpdateForAdjust?.providerRole === 'bloodBank' && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.selectLabel}>Blood Group Units Inventory:</Text>
                    <View style={styles.bloodAdjustGrid}>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => {
                        const currentInv = adjustedDetails.inventory || selectedUpdateForAdjust.details?.inventory || {};
                        const val = currentInv[grp] ?? 0;
                        return (
                          <View key={grp} style={styles.bloodAdjustItem}>
                            <Text style={styles.bloodAdjustLabel}>{grp}</Text>
                            <TextInput
                              style={styles.bloodAdjustInput}
                              keyboardType="numeric"
                              value={String(val)}
                              onChangeText={(t) => {
                                const newInv = { ...currentInv, [grp]: Math.max(0, parseInt(t) || 0) };
                                setAdjustedDetails((prev) => ({ ...prev, inventory: newInv }));
                              }}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                <Input
                  label="Coordinator Note (e.g. Verified via depot phone check)"
                  placeholder="Verification note..."
                  value={adminReviewNote}
                  onChangeText={setAdminReviewNote}
                />
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  onPress={() => setSelectedUpdateForAdjust(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="✓ Approve & Apply"
                  variant="primary"
                  size="md"
                  loading={Boolean(processingUpdateId)}
                  onPress={handleConfirmAdjustedApprove}
                  style={{ flex: 1.5 }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* ======================================================= */}
        {/* MODAL 4: DECLINE UPDATE REQUEST                         */}
        {/* ======================================================= */}
        <Modal
          visible={Boolean(selectedUpdateForDecline)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedUpdateForDecline(null)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <XCircle size={18} color={Colors.critical} />
                  <Text style={styles.modalTitle}>Decline Capacity Request</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedUpdateForDecline(null)}>
                  <X size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalCaseId}>{selectedUpdateForDecline?.providerName}</Text>
              <Text style={styles.modalPatient}>Proposed: {selectedUpdateForDecline?.summary}</Text>

              <Input
                label="Rejection Reason"
                placeholder="e.g. Discrepancy in depot physical count..."
                value={declineReason}
                onChangeText={setDeclineReason}
                required
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  onPress={() => setSelectedUpdateForDecline(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Confirm Decline"
                  variant="danger"
                  size="md"
                  loading={Boolean(processingUpdateId)}
                  onPress={handleConfirmDecline}
                  style={{ flex: 1.5 }}
                />
              </View>
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
  adminRibbon: {
    backgroundColor: '#0F3868',
    paddingVertical: 5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminRibbonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  statsContainer: {
    marginVertical: 14,
  },
  statMetricCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 100,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text,
  },
  metricLbl: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabItemTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  tabContent: {
    gap: 10,
  },
  searchRow: {
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillSosActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterPillText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterPillSosTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  adminCaseCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  adminSosCaseCard: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFDFD',
  },
  adminSosCardBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminSosBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  adminSosBadgeTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  adminSosPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminSosPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  sosTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sosTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  adminCaseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 8,
    marginBottom: 8,
  },
  adminCaseId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F3868',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  adminCaseDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  adminPatientRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  adminPatientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  adminPatientDetails: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  adminCallerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    marginBottom: 2,
  },
  adminCallerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  adminLocationBox: {
    marginVertical: 4,
    gap: 4,
  },
  adminAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 2,
  },
  adminGpsCoordText: {
    fontSize: 10.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#475569',
    fontWeight: '600',
  },
  adminNavBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminNavBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  adminComplaintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  adminComplaintText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  adminAddressText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginVertical: 4,
  },
  assignedProvidersWrap: {
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 6,
    marginVertical: 4,
  },
  assignedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  assignedVal: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  adminActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  requestCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestType: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  requestCaseId: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  requestPatient: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  requestProvider: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  requestNotes: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F3868',
    marginBottom: 8,
  },
  providerCategoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  providerCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  providerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  providerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  providerSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  verifyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  verifiedBtn: {
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  unverifiedBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  verifyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  verifiedBtnText: {
    color: Colors.success,
  },
  capacityRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  capacityText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  bold: {
    fontWeight: '800',
    color: Colors.primary,
  },
  inventoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  invChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.critical,
  },
  userCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  statusToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: Colors.successBg,
  },
  statusSuspended: {
    backgroundColor: Colors.criticalBg,
  },
  statusToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.critical,
  },
  statusActiveText: {
    color: Colors.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    padding: 20,
    borderRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F3868',
  },
  modalCaseId: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalPatient: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  assignPill: {
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  assignPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  assignPillText: {
    fontSize: 11,
    color: Colors.text,
  },
  assignPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  statusPillTextActive: {
    color: '#FFFFFF',
  },
  // Pending Provider Updates Notification Banner
  pendingAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  pendingAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pendingAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  // Stock Review Container
  stockReviewContainer: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  stockReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stockReviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingBadgeWrap: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pendingBadgeWrapText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  stockReviewSub: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    marginBottom: 8,
  },
  emptyStockBox: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyStockText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  // Update Cards
  updateCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  updateCardPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  updateCardApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  updateCardRejected: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  updateCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  updateProviderName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  roleTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
  },
  updateTimeText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  updateRequestedLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  updateRequestedVal: {
    fontWeight: '800',
    color: Colors.text,
  },
  updateCoordinatorNote: {
    fontSize: 10,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginTop: 2,
  },
  badgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  badgeApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeApprovedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  badgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeRejectedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  updateActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  adjustBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  declineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bloodAdjustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  bloodAdjustItem: {
    width: '22%',
    alignItems: 'center',
  },
  bloodAdjustLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  bloodAdjustInput: {
    width: '100%',
    textAlign: 'center',
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  // Dropdown Menu Styles
  dropdownFieldContainer: {
    marginBottom: 12,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  dropdownLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dropdownBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  dropdownTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  dropdownMenuList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemSelected: {
    backgroundColor: '#F0FDFA',
  },
  dropdownMenuItemText: {
    fontSize: 12,
    color: '#334155',
  },
  // Case Card Expanded Details Styles
  caseDetailsExpandedBox: {
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  requestedSection: {
    gap: 4,
  },
  requestedSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  requestedPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  reqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reqPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  providerStatusSection: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    gap: 4,
  },
  providerStatusTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  providerStatusList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  providerStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  providerRoleTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  providerNameTag: {
    fontSize: 10,
    fontWeight: '700',
  },
  providerNameTagAssigned: {
    color: '#0F766E',
  },
  providerNameTagPending: {
    color: '#D97706',
  },
  tabBarScrollWrapper: {
    marginBottom: 14,
  },
  feedbackKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  feedbackKpiCard: {
    width: '48%',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  feedbackKpiVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiScale: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  feedbackKpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  feedbackKpiSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  feedbackFilterSection: {
    marginBottom: 12,
  },
  feedbackFilterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  feedbackFilterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  feedbackListContainer: {
    gap: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  emptyFeedbackCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyFeedbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
  },
  emptyFeedbackSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  feedbackAdminCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  feedbackCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  feedbackCasePill: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00707E',
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  feedbackPatientText: {
    fontSize: 13,
    color: '#475569',
  },
  feedbackDateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  responseTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 4,
  },
  responseTimeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  feedbackRatingsBox: {
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  feedbackRatingCol: {
    flexDirection: 'column',
  },
  feedbackRatingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  ratingNumberBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 6,
  },
  commentContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 8,
    padding: 10,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  commentHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  commentBodyText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
