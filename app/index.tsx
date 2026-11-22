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
  Modal,
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
import {
  ShieldCheck,
  PhoneCall,
  Activity,
  Heart,
  ChevronRight,
  Check,
  PlayCircle,
  HelpCircle,
  Phone,
  Mail,
  Clock,
  X,
  ExternalLink,
  Siren,
  AlertTriangle,
} from 'lucide-react-native';
import { GuideVideoModal } from '../components/guide/GuideVideoModal';
import { EmergencySosModal } from '../components/sos/EmergencySosModal';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showGuideVideo, setShowGuideVideo] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);

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

          {/* Top Navigation Bar: Brand + How to Use beside Contact Us */}
          <View style={styles.navBar}>
            <View style={styles.navBrandCol}>
              <View style={styles.navLogoRow}>
                <CareBridgeLogoIcon size={26} />
                <Text style={styles.navBrandText}>
                  Care<Text style={styles.brandTeal}>Bridge</Text>
                </Text>
              </View>
            </View>

            <View style={styles.navItemsRow}>
              {/* How to Use navigation item beside Contact Us */}
              <TouchableOpacity
                style={styles.navHowToUseBtn}
                onPress={() => setShowGuideVideo(true)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="How to Use Guide Video"
              >
                <PlayCircle size={15} color="#0D9488" />
                <Text style={styles.navHowToUseText}>How to Use</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navContactBtn}
                onPress={() => setShowContactModal(true)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Contact Us"
              >
                <PhoneCall size={13} color="#475569" />
                <Text style={styles.navContactText}>Contact Us</Text>
              </TouchableOpacity>
            </View>
          </View>

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
              {/* Prominent Instant Emergency SOS (Zero Login / Form Bypass) */}
              <TouchableOpacity
                style={styles.heroSosBanner}
                activeOpacity={0.88}
                onPress={() => setShowSosModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Immediate Emergency SOS Request"
              >
                <View style={styles.heroSosIconPulse}>
                  <Siren size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.heroSosBadgeRow}>
                    <Text style={styles.heroSosBadgeText}>INSTANT AMBULANCE & DISPATCH</Text>
                    <View style={styles.sosLiveDot} />
                  </View>
                  <Text style={styles.heroSosTitle}>EMERGENCY SOS</Text>
                  <Text style={styles.heroSosSub}>
                    Road accident or critical emergency? Tap for immediate assistance • No login needed
                  </Text>
                </View>
                <ChevronRight size={22} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Primary Call to Action: Start Regular Emergency Case */}
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
                <Text style={styles.emergencyCtaText}>Start Standard Emergency Intake</Text>
              </TouchableOpacity>

              {/* Secondary Actions: Emergency SOS button beside Sign In & Register */}
              <View style={styles.authRow}>
                <TouchableOpacity
                  style={styles.sosBtnRow}
                  activeOpacity={0.85}
                  onPress={() => setShowSosModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Emergency SOS Button"
                >
                  <Siren size={16} color="#FFFFFF" />
                  <Text style={styles.sosBtnRowText}>SOS</Text>
                </TouchableOpacity>

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

              {/* Quick Guide Video Banner in Hero Section */}
              <TouchableOpacity
                style={styles.heroGuideBanner}
                onPress={() => setShowGuideVideo(true)}
                activeOpacity={0.85}
                accessibilityLabel="Watch How to Use Video Guide"
              >
                <View style={styles.heroGuideIconWrap}>
                  <PlayCircle size={22} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.heroGuideHeaderRow}>
                    <Text style={styles.heroGuideBadge}>VIDEO WALKTHROUGH</Text>
                    <Text style={styles.heroGuideDuration}>2 min</Text>
                  </View>
                  <Text style={styles.heroGuideTitle}>How to Use CareBridge</Text>
                  <Text style={styles.heroGuideSub}>
                    7 stages: registration, request, hospital & ambulance dispatch
                  </Text>
                </View>
                <ChevronRight size={18} color="#0D9488" />
              </TouchableOpacity>
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

          {/* Footer Branding & Links */}
          <View style={styles.footerWrap}>
            <View style={styles.footerLinksRow}>
              <TouchableOpacity
                style={styles.footerNavLink}
                onPress={() => setShowGuideVideo(true)}
                activeOpacity={0.7}
              >
                <PlayCircle size={14} color="#0D9488" />
                <Text style={styles.footerNavLinkHighlight}>How to Use</Text>
              </TouchableOpacity>
              <Text style={styles.footerNavSeparator}>•</Text>
              <TouchableOpacity
                style={styles.footerNavLink}
                onPress={() => setShowContactModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.footerNavLinkText}>Contact Us</Text>
              </TouchableOpacity>
              <Text style={styles.footerNavSeparator}>•</Text>
              <TouchableOpacity
                style={styles.footerNavLink}
                onPress={handleCallEmergency}
                activeOpacity={0.7}
              >
                <Text style={styles.footerNavLinkDanger}>Emergency: 108</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerNote}>
              CareBridge Telemetry Engine • 24/7 Central Command Dispatch • Secure Healthcare Encryption
            </Text>
            <Text style={styles.footerSubNote}>
              Rapid Medical Emergency Allocation Platform
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* How to Use Guide Video Modal */}
      <GuideVideoModal
        visible={showGuideVideo}
        onClose={() => setShowGuideVideo(false)}
      />

      {/* Quick Emergency SOS Modal */}
      <EmergencySosModal
        visible={showSosModal}
        onClose={() => setShowSosModal(false)}
      />

      {/* Contact Us Modal */}
      <Modal
        visible={showContactModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.contactModalOverlay}>
          <View style={styles.contactModalContent}>
            <View style={styles.contactModalHeader}>
              <View style={styles.contactHeaderTitleRow}>
                <View style={styles.contactIconCircle}>
                  <PhoneCall size={20} color="#0D9488" />
                </View>
                <View>
                  <Text style={styles.contactModalTitle}>Contact CareBridge</Text>
                  <Text style={styles.contactModalSub}>24/7 Central Emergency Coordination</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowContactModal(false)}
                style={styles.contactCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.contactModalBody} showsVerticalScrollIndicator={false}>
              {/* National Emergency Hotline Banner */}
              <TouchableOpacity
                style={styles.contactEmergencyBox}
                onPress={handleCallEmergency}
                activeOpacity={0.85}
              >
                <View style={styles.contactEmergencyIconWrap}>
                  <PhoneCall size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactEmergencyLabel}>NATIONAL MEDICAL EMERGENCY</Text>
                  <Text style={styles.contactEmergencyNumber}>Dial 108 / 112</Text>
                  <Text style={styles.contactEmergencyHint}>
                    Toll-free 24/7 immediate medical & ambulance response
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Central Operations Desk */}
              <View style={styles.contactCard}>
                <Text style={styles.contactSectionTitle}>Central Coordination Desk</Text>

                <TouchableOpacity
                  style={styles.contactItemRow}
                  onPress={() => Linking.openURL('tel:+918362225555')}
                  activeOpacity={0.7}
                >
                  <View style={styles.contactItemIcon}>
                    <Phone size={16} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactItemLabel}>Helpline & Operations Desk</Text>
                    <Text style={styles.contactItemVal}>+91 836 222 5555</Text>
                  </View>
                  <ChevronRight size={16} color="#94A3B8" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.contactItemRow}
                  onPress={() => Linking.openURL('mailto:dispatch@carebridge.org')}
                  activeOpacity={0.7}
                >
                  <View style={styles.contactItemIcon}>
                    <Mail size={16} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactItemLabel}>Dispatch Support</Text>
                    <Text style={styles.contactItemVal}>dispatch@carebridge.org</Text>
                  </View>
                  <ChevronRight size={16} color="#94A3B8" />
                </TouchableOpacity>

                <View style={styles.contactItemRow}>
                  <View style={styles.contactItemIcon}>
                    <Clock size={16} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactItemLabel}>Operating Hours</Text>
                    <Text style={styles.contactItemVal}>24 Hours / 7 Days a Week / 365 Days</Text>
                  </View>
                </View>
              </View>

              {/* Guide Video Promo Inside Contact Modal */}
              <TouchableOpacity
                style={styles.contactGuideLinkBox}
                onPress={() => {
                  setShowContactModal(false);
                  setShowGuideVideo(true);
                }}
                activeOpacity={0.8}
              >
                <PlayCircle size={18} color="#0D9488" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactGuideLinkTitle}>Looking for instructions?</Text>
                  <Text style={styles.contactGuideLinkSub}>
                    Watch the 7-stage How to Use video guide
                  </Text>
                </View>
                <ChevronRight size={16} color="#0D9488" />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.contactModalFooter}>
              <TouchableOpacity
                style={styles.contactDoneBtn}
                onPress={() => setShowContactModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.contactDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  heroSosBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  heroSosIconPulse: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSosBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroSosBadgeText: {
    color: '#FEE2E2',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sosLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FDE047',
  },
  heroSosTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  heroSosSub: {
    color: '#FEE2E2',
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 15,
  },
  emergencyCtaBtn: {
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ctaIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyCtaText: {
    color: '#334155',
    fontSize: 14.5,
    fontWeight: '700',
  },
  authRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sosBtnRow: {
    backgroundColor: '#DC2626',
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 3,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sosBtnRowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    fontSize: 14.5,
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
    fontSize: 14.5,
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

  // ==========================================
  // TOP NAVIGATION BAR (HOW TO USE BESIDE CONTACT US)
  // ==========================================
  navBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navBrandCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBrandText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  navItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navHowToUseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  navHowToUseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  navContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  navContactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // ==========================================
  // HERO GUIDE VIDEO BANNER
  // ==========================================
  heroGuideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 12,
    elevation: 1,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  heroGuideIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGuideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  heroGuideBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  heroGuideDuration: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  heroGuideTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroGuideSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
    lineHeight: 15,
  },

  // ==========================================
  // FOOTER LINKS
  // ==========================================
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  footerNavLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  footerNavLinkHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  footerNavLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  footerNavLinkDanger: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  footerNavSeparator: {
    color: '#CBD5E1',
    fontSize: 12,
  },

  // ==========================================
  // CONTACT US MODAL
  // ==========================================
  contactModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  contactModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  contactModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  contactModalSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  contactCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactModalBody: {
    padding: 16,
  },
  contactEmergencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  contactEmergencyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactEmergencyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEE2E2',
    letterSpacing: 0.6,
  },
  contactEmergencyNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  contactEmergencyHint: {
    fontSize: 10.5,
    color: '#FEE2E2',
    marginTop: 2,
  },
  contactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  contactSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  contactItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactItemLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  contactItemVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  contactGuideLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
  },
  contactGuideLinkTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D9488',
  },
  contactGuideLinkSub: {
    fontSize: 11,
    color: '#115E59',
    marginTop: 1,
  },
  contactModalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  contactDoneBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
