import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Activity, Check, Clock, AlertTriangle, X } from 'lucide-react-native';

interface TriageBadgeProps {
  priority: string;
  showIcon?: boolean;
}

export const TriageBadge: React.FC<TriageBadgeProps> = ({ priority, showIcon = true }) => {
  const p = String(priority || '').toLowerCase();

  if (p === 'immediate' || p === 'critical' || p === 'level 1') {
    return (
      <View style={[styles.badge, styles.criticalBadge]}>
        {showIcon && <Activity size={12} color={Colors.critical} style={styles.icon} />}
        <Text style={[styles.text, styles.criticalText]}>Level 1 Immediate</Text>
      </View>
    );
  }

  if (p === 'emergency' || p === 'high' || p === 'level 2') {
    return (
      <View style={[styles.badge, styles.emergencyBadge]}>
        {showIcon && <AlertTriangle size={12} color={Colors.emergency} style={styles.icon} />}
        <Text style={[styles.text, styles.emergencyText]}>Level 2 Emergency</Text>
      </View>
    );
  }

  if (p === 'urgent' || p === 'medium' || p === 'level 3') {
    return (
      <View style={[styles.badge, styles.urgentBadge]}>
        {showIcon && <Clock size={12} color={Colors.urgent} style={styles.icon} />}
        <Text style={[styles.text, styles.urgentText]}>Level 3 Urgent</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.routineBadge]}>
      {showIcon && <Check size={12} color={Colors.semiUrgent} style={styles.icon} />}
      <Text style={[styles.text, styles.routineText]}>Level 4 Routine</Text>
    </View>
  );
};

interface CaseStatusBadgeProps {
  status: string;
  reason?: string;
}

export const CaseStatusBadge: React.FC<CaseStatusBadgeProps> = ({ status, reason }) => {
  const s = String(status || '').toUpperCase();

  if (s === 'COMPLETED' || s === 'RESOLVED') {
    return (
      <View style={[styles.badge, styles.completedBadge]}>
        <Check size={12} color={Colors.success} style={styles.icon} />
        <Text style={[styles.text, styles.completedText]}>Completed</Text>
      </View>
    );
  }

  if (s === 'DISPATCHED') {
    return (
      <View style={[styles.badge, styles.dispatchedBadge]}>
        <View style={styles.pulseDot} />
        <Text style={[styles.text, styles.dispatchedText]}>Ambulance Dispatched</Text>
      </View>
    );
  }

  if (s === 'IN_PROGRESS') {
    return (
      <View style={[styles.badge, styles.inProgressBadge]}>
        <Activity size={12} color={Colors.teal} style={styles.icon} />
        <Text style={[styles.text, styles.inProgressText]}>Response In Progress</Text>
      </View>
    );
  }

  if (s === 'ASSIGNED') {
    return (
      <View style={[styles.badge, styles.assignedBadge]}>
        <Text style={[styles.text, styles.assignedText]}>Providers Assigned</Text>
      </View>
    );
  }

  if (s === 'ACCEPTED') {
    return (
      <View style={[styles.badge, styles.acceptedBadge]}>
        <Check size={12} color={Colors.navy} style={styles.icon} />
        <Text style={[styles.text, styles.acceptedText]}>Dispatch Accepted</Text>
      </View>
    );
  }

  if (s === 'REJECTED') {
    return (
      <View style={[styles.badge, styles.rejectedBadge]}>
        <X size={12} color={Colors.critical} style={styles.icon} />
        <Text style={[styles.text, styles.rejectedText]}>
          Declined {reason ? `(${reason})` : ''}
        </Text>
      </View>
    );
  }

  if (s === 'CANCELLED') {
    return (
      <View style={[styles.badge, styles.cancelledBadge]}>
        <Text style={[styles.text, styles.cancelledText]}>Cancelled</Text>
      </View>
    );
  }

  // Default: Requested / Under Review
  return (
    <View style={[styles.badge, styles.requestedBadge]}>
      <Clock size={12} color={Colors.urgent} style={styles.icon} />
      <Text style={[styles.text, styles.requestedText]}>Awaiting Coordinator</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.emergency,
    marginRight: 4,
  },
  criticalBadge: {
    backgroundColor: Colors.criticalBg,
    borderColor: Colors.criticalBorder,
  },
  criticalText: {
    color: Colors.critical,
  },
  emergencyBadge: {
    backgroundColor: Colors.emergencyBg,
    borderColor: Colors.emergencyBorder,
  },
  emergencyText: {
    color: Colors.emergency,
  },
  urgentBadge: {
    backgroundColor: Colors.urgentBg,
    borderColor: Colors.urgentBorder,
  },
  urgentText: {
    color: Colors.urgent,
  },
  routineBadge: {
    backgroundColor: Colors.semiUrgentBg,
    borderColor: Colors.semiUrgentBorder,
  },
  routineText: {
    color: Colors.semiUrgent,
  },
  completedBadge: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
  },
  completedText: {
    color: Colors.success,
  },
  dispatchedBadge: {
    backgroundColor: Colors.emergencyBg,
    borderColor: Colors.emergencyBorder,
  },
  dispatchedText: {
    color: Colors.emergency,
  },
  inProgressBadge: {
    backgroundColor: '#CCFBF1',
    borderColor: '#99F6E4',
  },
  inProgressText: {
    color: '#0F766E',
  },
  assignedBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  assignedText: {
    color: '#1D4ED8',
  },
  acceptedBadge: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  acceptedText: {
    color: '#4338CA',
  },
  rejectedBadge: {
    backgroundColor: Colors.criticalBg,
    borderColor: Colors.criticalBorder,
  },
  rejectedText: {
    color: Colors.critical,
  },
  cancelledBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  cancelledText: {
    color: '#64748B',
  },
  requestedBadge: {
    backgroundColor: Colors.urgentBg,
    borderColor: Colors.urgentBorder,
  },
  requestedText: {
    color: Colors.urgent,
  },
});
