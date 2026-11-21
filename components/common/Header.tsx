import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { CareBridgeLogoIcon } from './Icons';
import { Colors } from '../../constants/colors';
import { Bell, LogOut, User } from 'lucide-react-native';
import { subscribeNotificationsForUserFromFirestore } from '../../services/dataService';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) {
      setUnreadCount(0);
      return;
    }
    const unsub = subscribeNotificationsForUserFromFirestore(currentUser.uid, (items) => {
      const unread = items.filter((n) => !n.isRead && !n.read).length;
      setUnreadCount(unread);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Coordinator';
      case 'patient':
        return 'Patient';
      case 'patientAttendant':
      case 'attendant':
        return 'Attendant';
      case 'hospital':
        return 'Hospital';
      case 'bloodBank':
        return 'Blood Bank';
      case 'oxygenProvider':
        return 'Oxygen Depot';
      case 'ambulanceProvider':
        return 'Ambulance';
      case 'doctor':
        return 'Doctor';
      default:
        return 'CareBridge';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <CareBridgeLogoIcon size={34} />
        <View style={styles.titleCol}>
          <Text style={styles.brandTitle}>
            Care<Text style={styles.brandAccent}>Bridge</Text>
          </Text>
          {title ? (
            <Text style={styles.pageTitle}>{title}</Text>
          ) : (
            <Text style={styles.roleSubtext}>{roleLabel(currentUser?.role)}</Text>
          )}
        </View>
      </View>

      <View style={styles.rightRow}>
        {currentUser && (
          <>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(common)/notifications')}
              accessibilityLabel="Notifications"
            >
              <Bell size={20} color={Colors.textSecondary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/(common)/profile')}
              accessibilityLabel="User Profile"
            >
              <User size={20} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, styles.logoutButton]}
              onPress={handleLogout}
              accessibilityLabel="Sign Out"
            >
              <LogOut size={18} color={Colors.critical} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleCol: {
    marginLeft: 10,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F3868',
    letterSpacing: -0.3,
  },
  brandAccent: {
    color: Colors.primary,
  },
  pageTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  roleSubtext: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: Colors.critical,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  logoutButton: {
    backgroundColor: Colors.criticalBg,
    borderColor: Colors.criticalBorder,
  },
});
