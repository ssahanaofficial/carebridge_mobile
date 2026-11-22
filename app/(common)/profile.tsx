import React, { useState } from 'react';
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
import { doc, updateDoc } from 'firebase/firestore';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Building2,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Save,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../configuration/firebase';
import { Header } from '../../components/common/Header';
import { Colors } from '../../constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [city, setCity] = useState(currentUser?.city || 'Hubballi');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      if (db) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          displayName: displayName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          updatedAt: new Date().toISOString(),
        });
      }
      setIsEditing(false);
      setSuccessMessage('Profile details saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not update profile in database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of CareBridge?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const getRoleTitle = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Central Emergency Coordinator';
      case 'hospital':
        return 'Hospital Provider';
      case 'bloodBank':
        return 'Blood Bank Provider';
      case 'oxygen':
        return 'Oxygen Depot Provider';
      case 'ambulance':
        return 'Ambulance Fleet Provider';
      case 'doctor':
        return 'Attending Physician';
      case 'attendant':
        return 'Patient Attendant';
      default:
        return 'Registered Patient';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft size={18} color="#0F172A" />
            <Text style={styles.backBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>

          {!isEditing ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setIsEditing(true)}
            >
              <Edit2 size={14} color="#00707E" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setIsEditing(false)}
            >
              <X size={14} color="#64748B" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {successMessage && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={16} color="#15803D" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Profile Dossier Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBox}>
              <User size={32} color="#00707E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{currentUser?.displayName || 'Sahana S.'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{getRoleTitle(currentUser?.role)}</Text>
              </View>
              <View style={styles.verifiedRow}>
                <ShieldCheck size={13} color="#166534" />
                <Text style={styles.verifiedText}>CareBridge Verified Identity</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Form Fields / Details */}
          {isEditing ? (
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Full Legal Name *</Text>
              <TextInput
                style={styles.inputField}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Full Name"
              />

              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.inputField}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 XXXXX XXXXX"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Street / Incident Address</Text>
              <TextInput
                style={styles.inputField}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
              />

              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.inputField}
                value={city}
                onChangeText={setCity}
                placeholder="Hubballi"
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={16} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <Mail size={16} color="#64748B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Email Address</Text>
                  <Text style={styles.detailVal}>{currentUser?.email || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Phone size={16} color="#64748B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Emergency Contact Phone</Text>
                  <Text style={styles.detailVal}>{currentUser?.phone || '+91 98451 98765'}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <MapPin size={16} color="#64748B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Registered Address</Text>
                  <Text style={styles.detailVal}>
                    {currentUser?.address || 'Vidyanagar'}, {currentUser?.city || 'Hubballi'}
                  </Text>
                </View>
              </View>

              {Boolean(currentUser?.hospitalAffiliation) && (
                <View style={styles.detailItem}>
                  <Building2 size={16} color="#64748B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Hospital Affiliation</Text>
                    <Text style={styles.detailVal}>{currentUser?.hospitalAffiliation}</Text>
                  </View>
                </View>
              )}

              {Boolean(currentUser?.licenseNumber) && (
                <View style={styles.detailItem}>
                  <ShieldCheck size={16} color="#64748B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>License Number</Text>
                    <Text style={styles.detailVal}>{currentUser?.licenseNumber}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailItem}>
                <ShieldCheck size={16} color="#64748B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>System User UID</Text>
                  <Text style={[styles.detailVal, styles.mono]}>{currentUser?.uid}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Sign Out Card */}
        <TouchableOpacity
          style={styles.logoutCard}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out of CareBridge</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backBtnText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#00707E' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
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
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  roleBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#166534' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  detailsList: { gap: 14 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  detailVal: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginTop: 1 },
  mono: { fontFamily: 'monospace', fontSize: 11, color: '#64748B' },
  formContainer: { gap: 10 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#475569' },
  inputField: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#00707E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  logoutCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
});
