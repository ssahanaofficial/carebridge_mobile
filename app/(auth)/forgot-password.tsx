import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    setSuccess(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email.trim());
    setLoading(false);

    if (result.success) {
      setSuccess('Password reset link has been dispatched to your email address.');
    } else {
      setError(result.error || 'Failed to send password reset email.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={18} color={Colors.textSecondary} />
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>

          <Card style={styles.card}>
            <View style={styles.logoRow}>
              <CareBridgeLogoIcon size={48} />
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your registered email address to receive password recovery instructions.
              </Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.critical} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.successBox}>
                <CheckCircle2 size={16} color={Colors.success} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            <Input
              label="Registered Email Address"
              placeholder="name@organization.org"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={16} color={Colors.textMuted} />}
              required
            />

            <Button
              title="Send Reset Email"
              onPress={handleReset}
              loading={loading}
              variant="primary"
              size="lg"
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              style={styles.returnButton}
            >
              <Text style={styles.returnText}>Return to Sign In</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  card: {
    padding: 24,
    borderRadius: 24,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F3868',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
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
  returnButton: {
    alignItems: 'center',
    marginTop: 18,
  },
  returnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
});
