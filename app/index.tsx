import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { CareBridgeLogoIcon, HospitalBedIcon, BloodDropIcon, OxygenTankIcon, AmbulanceVehicleIcon } from '../components/common/Icons';
import { Colors } from '../constants/colors';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ShieldCheck, PhoneCall, ArrowRight, Activity, Users, Lock } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && currentUser) {
      redirectToRole(currentUser.role);
    }
  }, [currentUser, loading]);

  const redirectToRole = (role: string) => {
    switch (role) {
      case 'admin':
        router.replace('/(admin)');
        break;
      case 'hospital':
        router.replace('/(provider)/hospital');
        break;
      case 'bloodBank':
        router.replace('/(provider)/blood-bank');
        break;
      case 'oxygenProvider':
        router.replace('/(provider)/oxygen');
        break;
      case 'ambulanceProvider':
        router.replace('/(provider)/ambulance');
        break;
      case 'doctor':
        router.replace('/(provider)/doctor');
        break;
      case 'patient':
      case 'patientAttendant':
      case 'attendant':
      default:
        router.replace('/(patient)');
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <CareBridgeLogoIcon size={64} />
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Connecting to CareBridge Network...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Emergency Hotline Banner */}
        <View style={styles.emergencyBanner}>
          <PhoneCall size={16} color="#FFFFFF" />
          <Text style={styles.emergencyBannerText}>National Medical Emergency: Dial 108 / 112</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <CareBridgeLogoIcon size={72} />
          <Text style={styles.heroTitle}>
            Care<Text style={{ color: Colors.primary }}>Bridge</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Unified Emergency Healthcare Resource Coordination Network
          </Text>
          <Text style={styles.heroDescription}>
            Instant real-time allocation of verified hospital beds, ICU facilities, blood units, oxygen supply, and ambulance dispatch.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Start Emergency Case"
              onPress={() => {
                if (currentUser) {
                  router.push('/(patient)/new-case');
                } else {
                  router.push('/(auth)/login');
                }
              }}
              variant="danger"
              size="lg"
              icon={<Activity size={18} color="#FFFFFF" />}
              style={styles.heroButton}
            />

            <View style={styles.authRow}>
              <Button
                title="Sign In"
                onPress={() => router.push('/(auth)/login')}
                variant="primary"
                size="md"
                style={{ flex: 1 }}
              />
              <Button
                title="Register"
                onPress={() => router.push('/(auth)/signup')}
                variant="outline"
                size="md"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>

        {/* Resources Available Grid */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Emergency Services Coordinated</Text>
          <View style={styles.resourceGrid}>
            <Card style={styles.resourceCard}>
              <HospitalBedIcon size={44} />
              <Text style={styles.resourceCardTitle}>Hospital Beds & ICU</Text>
              <Text style={styles.resourceCardDesc}>Live bed & ventilator capacity tracking</Text>
            </Card>

            <Card style={styles.resourceCard}>
              <BloodDropIcon size={40} />
              <Text style={styles.resourceCardTitle}>Blood Units</Text>
              <Text style={styles.resourceCardDesc}>Instant cross-match bank requisition</Text>
            </Card>

            <Card style={styles.resourceCard}>
              <OxygenTankIcon size={40} />
              <Text style={styles.resourceCardTitle}>Oxygen Depots</Text>
              <Text style={styles.resourceCardDesc}>Medical cylinders & concentrator supply</Text>
            </Card>

            <Card style={styles.resourceCard}>
              <AmbulanceVehicleIcon size={44} />
              <Text style={styles.resourceCardTitle}>Ambulance Fleet</Text>
              <Text style={styles.resourceCardDesc}>ALS & BLS live dispatch telemetry</Text>
            </Card>
          </View>
        </View>

        {/* Security / Verification Badge Card */}
        <Card style={styles.securityCard} variant="tinted">
          <View style={styles.securityRow}>
            <ShieldCheck size={28} color={Colors.primary} />
            <View style={styles.securityTextCol}>
              <Text style={styles.securityTitle}>Verified Healthcare Network</Text>
              <Text style={styles.securityDesc}>
                All participating hospitals, blood banks, oxygen depots, and ambulance fleets are verified by the Central Coordinator.
              </Text>
            </View>
          </View>
        </Card>
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
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emergencyBanner: {
    backgroundColor: Colors.critical,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emergencyBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F3868',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  heroDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  actionButtons: {
    width: '100%',
    marginTop: 24,
  },
  heroButton: {
    width: '100%',
    marginBottom: 12,
  },
  authRow: {
    flexDirection: 'row',
    gap: 12,
  },
  resourcesSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resourceCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  resourceCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
    textAlign: 'center',
  },
  resourceCardDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  securityCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityTextCol: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  securityDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
