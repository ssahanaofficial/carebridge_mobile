import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Colors } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'white' | 'tinted' | 'outlined';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'white' }) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'tinted' ? styles.tinted : variant === 'outlined' ? styles.outlined : styles.white,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
  },
  white: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tinted: {
    backgroundColor: Colors.cardSecondary,
    borderWidth: 1,
    borderColor: Colors.borderDark,
  },
  outlined: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
});
