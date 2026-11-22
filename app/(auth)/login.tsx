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
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleLogin = async () => {
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Please enter both email address and password.');
      return;
    }

    setLoading(true);
    const success = await login(email.trim(), password);
    setLoading(false);

    if (success) {
      // Handled by AuthContext and redirection in root
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
            <TouchableOpacity
              onPress={() => router.replace('/')}
              style={styles.backButton}
            >
              <ArrowLeft size={18} color={Colors.textSecondary} />
              <Text style={styles.backButtonText}>Home</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.centerBox}>
            <Card style={styles.formCard}>
              <View style={styles.logoRow}>
                <CareBridgeLogoIcon size={52} />
                <Text style={styles.title}>Sign In to CareBridge</Text>
                <Text style={styles.subtitle}>
                  Access emergency dispatch, capacity coordination, and real-time medical requests
                </Text>
              </View>

              {(formError || authError) && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color={Colors.critical} style={{ marginTop: 2 }} />
                  <Text style={styles.errorText}>{formError || authError}</Text>
                </View>
              )}

              <View style={styles.formFields}>
                <Input
                  label="Email Address"
                  placeholder="name@organization.org"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setFormError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Mail size={16} color={Colors.textMuted} />}
                  required
                />

                <Input
                  label="Password"
                  placeholder="••••••••••••"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setFormError(null);
                  }}
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

                <View style={styles.forgotRow}>
                  <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <Button
                  title="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  style={styles.submitButton}
                />

                <View style={styles.registerPrompt}>
                  <Text style={styles.promptText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                    <Text style={styles.registerLink}>Register here</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                CareBridge Healthcare Network • 24/7 Cloud Coordination
              </Text>
            </View>
          </View>
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
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  formCard: {
    padding: 24,
    borderRadius: 24,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F3868',
    marginTop: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.criticalBg,
    borderColor: Colors.criticalBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: Colors.critical,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  formFields: {
    width: '100%',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: 2,
  },
  forgotText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    width: '100%',
    marginBottom: 16,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  registerLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
