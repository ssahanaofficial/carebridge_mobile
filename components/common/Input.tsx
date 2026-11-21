import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle
} from 'react-native';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required = false,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, leftIcon ? styles.inputWithLeftIcon : null, style]}
          {...rest}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  required: {
    color: Colors.critical,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
  },
  inputError: {
    borderColor: Colors.critical,
    backgroundColor: Colors.criticalBg,
  },
  leftIcon: {
    paddingLeft: 12,
  },
  rightIcon: {
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  errorText: {
    color: Colors.critical,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
