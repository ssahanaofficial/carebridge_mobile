import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  CareBridgeLogoIcon,
  HospitalBedIcon,
  BloodDropIcon,
  OxygenTankIcon,
  AmbulanceVehicleIcon,
} from '../components/common/Icons';
import { Colors } from '../constants/colors';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ShieldCheck, PhoneCall, Activity, Heart, ChevronRight, Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Splash animation values
  const splashFade = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.88)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Landing page animation values
  const landingFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // 1. Splash Screen Intro Animation
    Animated.parallel([
      Animated.timing(splashFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(splashScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Rhythmic heartbeat pulse animation on the logo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 160,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 320,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ])
    );
    pulseLoop.start();

    // Transition from Splash to Landing Page after 1.8 seconds
    const timer = setTimeout(() => {
      dismissSplash();
    }, 1800);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, []);

  const dismissSplash = () => {
    Animated.timing(splashFade, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setShowSplash(false);
      // Fade in the landing page
      Animated.parallel([
        Animated.timing(landingFade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(heroSlide, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  useEffect(() => {
    if (!showSplash && !loading && currentUser) {
      redirectToRole(currentUser.role);
    }
  }, [currentUser, loading, showSplash]);

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

  const handleCallEmergency = () => {
    Linking.openURL('tel:108').catch(() => {});
  };

  // ==========================================
  // SPLASH INTRO SCREEN
  // ==========================================
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.splashTouchArea}
          onPress={dismissSplash}
        >
          <Animated.View
            style={[
              styles.splashContent,
              {
                opacity: splashFade,
                transform: [{ scale: splashScale }],
              },
            ]}
          >
            {/* Glowing Heartbeat Logo Icon */}
            <Animated.View
              style={[
                styles.splashLogoBox,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <CareBridgeLogoIcon size={96} />
            </Animated.View>

            {/* Brand Title Row */}
            <View style={styles.splashBrandRow}>
              <Text style={styles.splashBrandText}>
                Care<Text style={styles.splashBrandTeal}>Bridge</Text>
              </Text>
              <View style={styles.emergencyPill}>
                <Text style={styles.emergencyPillText}>EMERGENCY</Text>
              </View>
            </View>

            {/* Subtitle */}
            <Text style={styles.splashSubtitle}>
              Healthcare Resource Coordination Platform
            </Text>

            {/* Subtle animated loader bar */}
            <View style={styles.splashLoaderWrap}>
              <View style={styles.splashLoaderPill}>
                <ActivityIndicator size="small" color="#0D9488" />
                <Text style={styles.splashLoaderText}>Initializing Telemetry...</Text>
              </View>
            </View>
          </Animated.View>

          {/* Footer note */}
          <View style={styles.splashFooter}>
            <Text style={styles.splashFooterText}>
              Unified Emergency Healthcare Resource Coordination Network
            </Text>
            <Text style={styles.splashSkipNote}>Tap anywhere to continue</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // MAIN LANDING PAGE
  // ==========================================
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View
        style={[
          styles.mainAnimWrap,
          {
            opacity: landingFade,
            transform: [{ translateY: heroSlide }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Emergency Hotline Banner */}
          <TouchableOpacity
            style={styles.emergencyBanner}
            onPress={handleCallEmergency}
            activeOpacity={0.85}
            accessibilityLabel="Call Medical Emergency Hotline"
          >
            <View style={styles.emergencyPulseDot} />
            <PhoneCall size={16} color="#FFFFFF" />
            <Text style={styles.emergencyBannerText}>
              National Medical Emergency: Dial 108 / 112
            </Text>
          </TouchableOpacity>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            {/* Logo Icon with Ambient Glow */}
            <View style={styles.heroLogoWrap}>
              <CareBridgeLogoIcon size={80} />
            </View>

            {/* Brand Title & EMERGENCY Badge */}
            <View style={styles.brandTitleRow}>
              <Text style={styles.heroTitle}>
                Care<Text style={styles.brandTeal}>Bridge</Text>
              </Text>
              <View style={styles.emergencyPillLarge}>
                <Text style={styles.emergencyPillLargeText}>EMERGENCY</Text>
              </View>
            </View>

            {/* Tagline */}
            <Text style={styles.heroSubtitle}>
              Unified Emergency Healthcare Resource Coordination Network
            </Text>

            {/* Description */}
            <Text style={styles.heroDescription}>
              Instant real-time allocation of verified hospital beds, ICU facilities, blood units, oxygen supply, and ambulance dispatch.
            </Text>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {/* Primary Call to Action: Start Emergency Case */}
              <TouchableOpacity
                style={styles.emergencyCtaBtn}
                activeOpacity={0.9}
                onPress={() => {
                  if (currentUser) {
                    router.push('/(patient)/new-case');
                  } else {
                    router.push('/(auth)/login');
                  }
                }}
              >
                <View style={styles.ctaIconCircle}>
                  <Activity size={20} color="#DC2626" />
                </View>
                <Text style={styles.emergencyCtaText}>Start Emergency Case</Text>
              </TouchableOpacity>

              {/* Secondary Actions: Sign In & Register */}
              <View style={styles.authRow}>
                <TouchableOpacity
                  style={styles.signInBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Text style={styles.signInBtnText}>Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(auth)/signup')}
                >
                  <Text style={styles.registerBtnText}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Emergency Services Coordinated Grid */}
          <View style={styles.resourcesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Emergency Services Coordinated</Text>
              <View style={styles.liveIndicatorPill}>
                <View style={styles.liveGreenDot} />
                <Text style={styles.liveIndicatorText}>Live Network</Text>
              </View>
            </View>

            <View style={styles.resourceGrid}>
              {/* 1. Hospital Beds & ICU */}
              <View style={styles.resourceCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#F0F9FF' }]}>
                  <HospitalBedIcon size={46} />
                </View>
                <Text style={styles.resourceCardTitle}>Hospital Beds & ICU</Text>
                <Text style={styles.resourceCardDesc}>
                  Live bed & ventilator capacity tracking
                </Text>
                <View style={[styles.cardTag, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.cardTagText, { color: '#0369A1' }]}>Capacity Tracking</Text>
                </View>
              </View>

              {/* 2. Blood Units */}
              <View style={styles.resourceCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
                  <BloodDropIcon size={42} />
                </View>
                <Text style={styles.resourceCardTitle}>Blood Units</Text>
                <Text style={styles.resourceCardDesc}>
                  Instant cross-match bank requisition
                </Text>
                <View style={[styles.cardTag, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.cardTagText, { color: '#B91C1C' }]}>8 Blood Groups</Text>
                </View>
              </View>

              {/* 3. Oxygen Depots */}
              <View style={styles.resourceCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
                  <OxygenTankIcon size={42} />
                </View>
                <Text style={styles.resourceCardTitle}>Oxygen Depots</Text>
                <Text style={styles.resourceCardDesc}>
                  Medical cylinders & concentrator supply
                </Text>
                <View style={[styles.cardTag, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.cardTagText, { color: '#047857' }]}>D-Type & Conc.</Text>
                </View>
              </View>

              {/* 4. Ambulance Fleet */}
              <View style={styles.resourceCard}>
                <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
                  <AmbulanceVehicleIcon size={46} />
                </View>
                <Text style={styles.resourceCardTitle}>Ambulance Fleet</Text>
                <Text style={styles.resourceCardDesc}>
                  ALS & BLS live dispatch telemetry
                </Text>
                <View style={[styles.cardTag, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.cardTagText, { color: '#1D4ED8' }]}>GPS Telemetry</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Security / Verification Badge Card */}
          <View style={styles.securityCard}>
            <View style={styles.securityRow}>
              <View style={styles.shieldCircle}>
                <ShieldCheck size={26} color="#0D9488" />
              </View>
              <View style={styles.securityTextCol}>
                <Text style={styles.securityTitle}>Verified Healthcare Network</Text>
                <Text style={styles.securityDesc}>
                  All participating hospitals, blood banks, oxygen depots, and ambulance fleets are verified by the Central Coordinator.
                </Text>
              </View>
            </View>
          </View>

          {/* Footer Branding & Telemetry */}
          <View style={styles.footerWrap}>
            <Text style={styles.footerNote}>
              CareBridge Telemetry Engine • 24/7 Central Command Dispatch • Secure Healthcare Encryption
            </Text>
            <Text style={styles.footerSubNote}>
              Rapid Medical Emergency Allocation Platform
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainAnimWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ==========================================
  // SPLASH SCREEN STYLES
  // ==========================================
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  splashTouchArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoBox: {
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  splashBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  splashBrandText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  splashBrandTeal: {
    color: '#0D9488',
  },
  splashSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 6,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  splashLoaderWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
  splashLoaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  splashLoaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  splashFooter: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  splashFooterText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  splashSkipNote: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ==========================================
  // EMERGENCY TOP BANNER
  // ==========================================
  emergencyBanner: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emergencyPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  emergencyBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // ==========================================
  // HERO SECTION
  // ==========================================
  heroSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 28,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  heroLogoWrap: {
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  brandTeal: {
    color: '#0D9488',
  },
  emergencyPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.6,
  },
  emergencyPillLarge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyPillLargeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.8,
  },
  heroSubtitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  heroDescription: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 12,
    maxWidth: 420,
  },

  // ==========================================
  // ACTION BUTTONS
  // ==========================================
  actionButtons: {
    width: '100%',
    marginTop: 22,
    gap: 12,
  },
  emergencyCtaBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  ctaIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  authRow: {
    flexDirection: 'row',
    gap: 12,
  },
  signInBtn: {
    flex: 1,
    backgroundColor: '#00707E',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#00707E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  registerBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00707E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: {
    color: '#00707E',
    fontSize: 15,
    fontWeight: '800',
  },

  // ==========================================
  // EMERGENCY SERVICES GRID
  // ==========================================
  resourcesSection: {
    paddingHorizontal: 16,
    marginTop: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resourceCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  iconContainer: {
    width: 62,
    height: 62,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resourceCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  resourceCardDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  cardTag: {
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  cardTagText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  // ==========================================
  // TRUST / VERIFICATION CARD
  // ==========================================
  securityCard: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    elevation: 1,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shieldCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextCol: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#14532D',
  },
  securityDesc: {
    fontSize: 11.5,
    color: '#166534',
    marginTop: 2,
    lineHeight: 16,
  },

  // ==========================================
  // FOOTER NOTE
  // ==========================================
  footerWrap: {
    marginTop: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 15,
  },
  footerSubNote: {
    fontSize: 10,
    color: '#CBD5E1',
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
