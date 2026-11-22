import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  Info,
  Check,
  Star,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { dataStore, subscribeNotificationsForUserFromFirestore } from '../../services/dataService';
import { Header } from '../../components/common/Header';
import { Colors } from '../../constants/colors';
import type { NotificationItem } from '../../types';

export default function NotificationsScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Subscribe to real-time notifications
    const unsub = subscribeNotificationsForUserFromFirestore(currentUser.uid, (items) => {
      setNotifications(items);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const handleMarkAsRead = (id: string) => {
    dataStore.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.read) dataStore.markNotificationRead(n.id);
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    dataStore.clearNotifications(currentUser?.uid || '');
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft size={18} color="#0F172A" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.actionBtnSmall}
                onPress={handleMarkAllRead}
              >
                <Check size={14} color="#00707E" />
                <Text style={styles.actionBtnText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity
                style={[styles.actionBtnSmall, { borderColor: '#FCA5A5' }]}
                onPress={handleClearNotifications}
              >
                <Trash2 size={13} color="#DC2626" />
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notifications Section Header */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Bell size={20} color="#00707E" />
            <Text style={styles.pageTitle}>Notifications Center</Text>
          </View>
          {unreadCount > 0 ? (
            <View style={styles.badgeUnread}>
              <Text style={styles.badgeUnreadText}>{unreadCount} NEW</Text>
            </View>
          ) : (
            <Text style={styles.allReadText}>All caught up</Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 30 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Bell size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>
              Real-time emergency case alerts, allocation notices, and status updates will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.notifList}>
            {notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notifCard,
                  !item.read && styles.notifUnread,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  handleMarkAsRead(item.id);
                  if (item.type === 'feedback_request' && item.caseId) {
                    router.push({
                      pathname: '/(patient)/feedback',
                      params: { caseId: item.caseId },
                    });
                  } else if (item.caseId) {
                    router.push({
                      pathname: '/(patient)/case-details',
                      params: { caseId: item.caseId },
                    });
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    {item.type === 'feedback_request' ? (
                      <Star size={16} color="#D97706" fill="#F59E0B" />
                    ) : item.type === 'emergency' ? (
                      <AlertCircle size={16} color="#DC2626" />
                    ) : item.type === 'assignment' ? (
                      <CheckCircle2 size={16} color="#059669" />
                    ) : (
                      <Info size={16} color="#00707E" />
                    )}
                    <Text style={styles.notifTitle}>{item.title}</Text>
                  </View>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.notifMessage}>{item.message}</Text>

                <View style={styles.cardFooter}>
                  {item.caseId && (
                    <Text style={styles.caseBadge}>Case: {item.caseId}</Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                    <Clock size={11} color="#94A3B8" />
                    <Text style={styles.timestampText}>
                      {new Date(item.timestamp || item.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  titleRow: {
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
    paddingHorizontal: 8,
  },
  backBtnText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  rightActions: { flexDirection: 'row', gap: 8 },
  actionBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#00707E' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  badgeUnread: {
    backgroundColor: '#00707E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeUnreadText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  allReadText: { fontSize: 12, color: '#64748B' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 18 },
  notifList: { gap: 10 },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifUnread: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00707E' },
  notifMessage: { fontSize: 12, color: '#475569', marginVertical: 6, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  caseBadge: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    backgroundColor: '#E2E8F0',
    color: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timestampText: { fontSize: 10, color: '#94A3B8' },
});
