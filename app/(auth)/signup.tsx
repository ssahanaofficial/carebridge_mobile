import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { CareBridgeLogoIcon } from '../../components/common/Icons';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import type { UserRole } from '../../types';
import {
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Droplet,
  Wind,
  Truck,
  Stethoscope,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react-native';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Exclude<UserRole, 'admin'>>('patientAttendant');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const publicRoles: Array<{
    role: Exclude<UserRole, 'admin'>;
    title: string;
    description: string;
    icon: (color: string) => React.ReactNode;
  }> = [
    {
      role: 'patientAttendant',
      title: 'Patient Attendant',
      description: 'Assist family members with bed, blood, oxygen, and ambulance dispatch',
      icon: (c) => <User size={18} color={c} />,
    },
    {
      role: 'patient',
      title: 'Patient (Self)',
      description: 'Request beds, blood, oxygen, or ambulance in an emergency',
      icon: (c) => <User size={18} color={c} />,
    },
    {
      role: 'hospital',
      title: 'Hospital Facility',
      description: 'Manage bed & ICU capacity, review patient admission requests',
      icon: (c) => <Building2 size={18} color={c} />,
    },
    {
      role: 'bloodBank',
      title: 'Blood Bank',
      description: 'Manage blood group stock and fulfill emergency unit requisitions',
      icon: (c) => <Droplet size={18} color={c} />,
    },
    {
      role: 'oxygenProvider',
      title: 'Oxygen Depot',
      description: 'Manage cylinder & concentrator stock and emergency delivery',
      icon: (c) => <Wind size={18} color={c} />,
    },
    {
      role: 'ambulanceProvider',
      title: 'Ambulance Service',
      description: 'Manage emergency fleet and drivers with live telemetry dispatch',
      icon: (c) => <Truck size={18} color={c} />,
    },
    {
      role: 'doctor',
      title: 'Physician / Staff',
      description: 'Hospital doctor viewing assigned cases & clinical notes',
      icon: (c) => <Stethoscope size={18} color={c} />,
    },
  ];

  const handleSignup = async () => {
    setFormError(null);
    setSuccessNotice(null);

    if (!fullName.trim()) {
      setFormError('Please enter your full name or facility title.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify.');
      return;
    }
    if (!agreeTerms) {
      setFormError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);
    const result = await signup({
      email: email.trim(),
      pass: password,
      displayName: fullName.trim(),
      role: selectedRole,
      phone: phone.trim(),
      hospitalAffiliation: hospitalAffiliation.trim(),
    });
    setLoading(false);

    if (result.success) {
      setSuccessNotice('Account registered successfully! Redirecting...');
    } else if (result.error) {
      setFormError(result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header Bar */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={18} color={Colors.textSecondary} />
              <Text style={styles.backButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.formCard}>
            <View style={styles.logoRow}>
              <CareBridgeLogoIcon size={44} />
              <Text style={styles.title}>Register Account</Text>
              <Text style={styles.subtitle}>
                Join the verified CareBridge healthcare emergency response network
              </Text>
            </View>

            {formError && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.critical} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            {successNotice && (
              <View style={styles.successBox}>
                <CheckCircle2 size={16} color={Colors.success} />
                <Text style={styles.successText}>{successNotice}</Text>
              </View>
            )}

            <Input
              label="Full Name / Facility Title"
              placeholder="Dr. Priya Deshmukh or KIMS Hospital"
              value={fullName}
              onChangeText={setFullName}
              leftIcon={<User size={16} color={Colors.textMuted} />}
              required
            />

            <Input
              label="Email Address"
              placeholder="contact@organization.org"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={16} color={Colors.textMuted} />}
              required
            />

            <Input
              label="Contact Phone"
              placeholder="+91 98450 12345"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={<Phone size={16} color={Colors.textMuted} />}
            />

            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleSectionLabel}>
                Account Type (Select Role) <Text style={{ color: Colors.critical }}>*</Text>
              </Text>
              <View style={styles.roleGrid}>
                {publicRoles.map((r) => {
                  const isSelected = selectedRole === r.role;
                  return (
                    <TouchableOpacity
                      key={r.role}
                      onPress={() => setSelectedRole(r.role)}
                      activeOpacity={0.7}
                      style={[
                        styles.roleCard,
                        isSelected ? styles.roleCardActive : styles.roleCardInactive,
                      ]}
                    >
                      <View style={styles.roleCardHeader}>
                        {r.icon(isSelected ? Colors.primary : Colors.textMuted)}
                        <Text style={[styles.roleTitle, isSelected ? styles.roleTitleActive : null]}>
                          {r.title}
                        </Text>
                      </View>
                      <Text style={styles.roleDesc} numberOfLines={2}>
                        {r.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedRole === 'doctor' && (
              <Input
                label="Hospital Affiliation"
                placeholder="e.g. KIMS Super Specialty Hospital"
                value={hospitalAffiliation}
                onChangeText={setHospitalAffiliation}
                leftIcon={<Building2 size={16} color={Colors.textMuted} />}
              />
            )}

            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon={<Lock size={16} color={Colors.textMuted} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.textMuted} />
                  ) : (
                    <Eye size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              }
              required
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon={<Lock size={16} color={Colors.textMuted} />}
              required
            />

            {/* Terms checkbox */}
            <TouchableOpacity
              onPress={() => setAgreeTerms(!agreeTerms)}
              style={styles.termsRow}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreeTerms ? styles.checkboxChecked : null]}>
                {agreeTerms && <View style={styles.checkboxInner} />}
              </View>
              <Text style={styles.termsText}>
                I acknowledge that CareBridge coordinates verified healthcare emergency resources and agree to the Terms of Service & Privacy Policy.
              </Text>
            </TouchableOpacity>

            <Button
              title="Complete Registration"
              onPress={handleSignup}
              loading={loading}
              variant="primary"
              size="lg"
              style={{ marginTop: 16 }}
            />

            <View style={styles.loginPrompt}>
              <Text style={styles.promptText}>Already registered? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.loginLink}>Sign in here</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 32,
  },
  navBar: {
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  formCard: {
    padding: 20,
    borderRadius: 24,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F3868',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.criticalBg,
    borderColor: Colors.criticalBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: Colors.critical,
    fontSize: 12,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    color: Colors.success,
    fontSize: 12,
    flex: 1,
  },
  roleSection: {
    marginBottom: 14,
  },
  roleSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleCard: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleCardActive: {
    backgroundColor: '#F0FDFA',
    borderColor: Colors.primary,
  },
  roleCardInactive: {
    backgroundColor: Colors.inputBg,
    borderColor: Colors.border,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  roleTitleActive: {
    color: Colors.primary,
  },
  roleDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
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
    borderColor: Colors.primary,
    backgroundColor: '#F0FDFA',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  promptText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  loginLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
