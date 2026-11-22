import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../../constants/colors';

export function CareBridgeLogoIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="cbLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#0EA5E9" />
          <Stop offset="100%" stopColor="#0D9488" />
        </LinearGradient>
      </Defs>
      <Rect x="2" y="2" width="44" height="44" rx="13" fill="url(#cbLogoGrad)" />
      <Path
        d="M8.5 25.5H15L17.5 28L21.5 11L27 37L30.5 22.5L33 25.5H39.5"
        stroke="#FFFFFF"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CareBridgeBrand({
  size = 40,
  showBadge = true,
  showSubtitle = true,
  layout = 'horizontal',
}: {
  size?: number;
  showBadge?: boolean;
  showSubtitle?: boolean;
  layout?: 'horizontal' | 'vertical' | 'hero';
}) {
  if (layout === 'hero' || layout === 'vertical') {
    return (
      <View style={brandStyles.heroWrap}>
        <View style={brandStyles.iconShadow}>
          <CareBridgeLogoIcon size={size} />
        </View>
        <View style={brandStyles.heroTitleRow}>
          <Text style={brandStyles.heroTitle}>
            Care<Text style={brandStyles.brandTeal}>Bridge</Text>
          </Text>
          {showBadge && (
            <View style={brandStyles.emergencyBadge}>
              <Text style={brandStyles.emergencyBadgeText}>EMERGENCY</Text>
            </View>
          )}
        </View>
        {showSubtitle && (
          <Text style={brandStyles.heroSubtitle}>Healthcare Resource Coordination Platform</Text>
        )}
      </View>
    );
  }

  return (
    <View style={brandStyles.rowWrap}>
      <CareBridgeLogoIcon size={size} />
      <View style={brandStyles.textCol}>
        <View style={brandStyles.inlineTitleRow}>
          <Text style={brandStyles.titleText}>
            Care<Text style={brandStyles.brandTeal}>Bridge</Text>
          </Text>
          {showBadge && (
            <View style={brandStyles.emergencyBadgeSm}>
              <Text style={brandStyles.emergencyBadgeTextSm}>EMERGENCY</Text>
            </View>
          )}
        </View>
        {showSubtitle && (
          <Text style={brandStyles.subtitleText}>Healthcare Resource Coordination Platform</Text>
        )}
      </View>
    </View>
  );
}

const brandStyles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textCol: {
    justifyContent: 'center',
  },
  inlineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandTeal: {
    color: '#0D9488',
  },
  emergencyBadgeSm: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyBadgeTextSm: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShadow: {
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  emergencyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.8,
  },
});

export function HospitalBedIcon({ isSelected = false, size = 48 }: { isSelected?: boolean; size?: number }) {
  const primary = isSelected ? '#FFFFFF' : '#00707E';
  const secondary = isSelected ? '#BAE6FD' : '#38BDF8';
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 80 60" fill="none">
      <Rect x="18" y="32" width="54" height="6" rx="2" fill={primary} />
      <Rect x="16" y="24" width="4" height="24" rx="2" fill={primary} />
      <Rect x="70" y="28" width="4" height="20" rx="2" fill={primary} />
      <Rect x="20" y="27" width="50" height="6" rx="2" fill={secondary} />
      <Circle cx="30" cy="22" r="4.5" fill="#FBBF24" />
      <Path d="M26 26.5C28 26 34 26 36 27C38 28 46 29 50 29" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M35 29C35 29 44 28 58 29" fill="#10B981" />
      <Path d="M10 12V48M7 12H13M10 15V18" stroke={primary} strokeWidth="2" strokeLinecap="round" />
      <Rect x="8" y="16" width="4" height="7" rx="1.5" fill="#EF4444" />
      <Path d="M10 23C10 26 15 28 26 27" stroke={secondary} strokeWidth="1.5" strokeDasharray="2 2" />
    </Svg>
  );
}

export function IcuFacilityIcon({ isSelected = false, size = 48 }: { isSelected?: boolean; size?: number }) {
  const primary = isSelected ? '#FFFFFF' : '#00707E';
  const secondary = isSelected ? '#BAE6FD' : '#38BDF8';
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 80 60" fill="none">
      <Rect x="18" y="34" width="54" height="5" rx="2" fill={primary} />
      <Rect x="16" y="28" width="4" height="18" rx="2" fill={primary} />
      <Rect x="70" y="30" width="4" height="16" rx="2" fill={primary} />
      <Rect x="20" y="30" width="49" height="5" rx="2" fill={secondary} />
      <Path d="M20 30L32 23H40" stroke={primary} strokeWidth="3" strokeLinecap="round" />
      <Rect x="18" y="6" width="22" height="15" rx="2" fill={primary} />
      <Rect x="20" y="8" width="18" height="11" rx="1" fill="#042F2E" />
      <Path d="M22 13.5H25L26.5 10L28.5 16.5L30.5 12L32 13.5H36" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M29 21V28" stroke={primary} strokeWidth="2" />
      <Path d="M60 8V34" stroke={primary} strokeWidth="2" />
      <Rect x="56" y="11" width="8" height="6" rx="1" fill={secondary} />
      <Rect x="56" y="19" width="8" height="6" rx="1" fill={secondary} />
    </Svg>
  );
}

export function BloodDropIcon({ isSelected = false, size = 44 }: { isSelected?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <Path
        d="M30 6C30 6 12 24 12 36C12 45.9411 20.0589 54 30 54C39.9411 54 48 45.9411 48 36C48 24 30 6 30 6Z"
        fill="#DC2626"
      />
      <Path
        d="M26 24C26 24 17 33 17 39C17 41.5 18 44 20 46"
        stroke="#FCA5A5"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Rect x="27.5" y="30" width="5" height="15" rx="1.5" fill="#FFFFFF" />
      <Rect x="22.5" y="35" width="15" height="5" rx="1.5" fill="#FFFFFF" />
    </Svg>
  );
}

export function OxygenTankIcon({ isSelected = false, size = 44 }: { isSelected?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <Rect x="22" y="18" width="18" height="34" rx="9" fill="#10B981" />
      <Rect x="24" y="20" width="14" height="30" rx="7" fill="#059669" />
      <Rect x="27" y="11" width="8" height="8" rx="2" fill="#64748B" />
      <Rect x="29" y="8" width="4" height="4" fill="#475569" />
      <Circle cx="38" cy="13" r="4.5" fill="#F8FAFC" stroke="#475569" strokeWidth="1.5" />
      <Path d="M38 13L39.5 11.5" stroke="#DC2626" strokeWidth="1.2" strokeLinecap="round" />
      <Rect x="29" y="29" width="4" height="12" rx="1" fill="#FFFFFF" />
      <Rect x="25" y="33" width="12" height="4" rx="1" fill="#FFFFFF" />
    </Svg>
  );
}

export function AmbulanceVehicleIcon({ isSelected = false, size = 48 }: { isSelected?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size * 0.65} viewBox="0 0 80 50" fill="none">
      <Path d="M12 34V16C12 14.8954 12.8954 14 14 14H52V34H12Z" fill="#FFFFFF" stroke="#334155" strokeWidth="2" />
      <Path d="M52 18H62C63.5 18 67 21 69 24L71 30C71.5 31.5 71 34 69 34H52V18Z" fill="#FFFFFF" stroke="#334155" strokeWidth="2" />
      <Path d="M54 20H61C62.5 20 64.5 22 66 25L67 28H54V20Z" fill="#38BDF8" />
      <Rect x="12" y="27" width="40" height="4" fill="#DC2626" />
      <Rect x="28" y="17" width="4" height="10" fill="#DC2626" />
      <Rect x="25" y="20" width="10" height="4" fill="#DC2626" />
      <Rect x="36" y="11" width="8" height="3" rx="1.5" fill="#EF4444" />
      <Circle cx="24" cy="35" r="6" fill="#1E293B" />
      <Circle cx="24" cy="35" r="2.5" fill="#94A3B8" />
      <Circle cx="58" cy="35" r="6" fill="#1E293B" />
      <Circle cx="58" cy="35" r="2.5" fill="#94A3B8" />
    </Svg>
  );
}

export function DoctorAssistanceIcon({ isSelected = false, size = 44 }: { isSelected?: boolean; size?: number }) {
  const primary = isSelected ? '#FFFFFF' : '#00707E';
  const secondary = isSelected ? '#BAE6FD' : '#38BDF8';
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <Circle cx="30" cy="18" r="8" fill={primary} />
      <Path d="M16 48C16 38 22 34 30 34C38 34 44 38 44 48" fill={secondary} />
      <Path d="M24 28V36C24 39.3 26.7 42 30 42C33.3 42 36 39.3 36 36V28" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="30" cy="44" r="3" fill="#DC2626" />
    </Svg>
  );
}
