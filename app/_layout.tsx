import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { Colors } from '../constants/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/signup" />
          <Stack.Screen name="(auth)/forgot-password" />
          <Stack.Screen name="(patient)/index" />
          <Stack.Screen name="(patient)/new-case" />
          <Stack.Screen name="(patient)/case-details" />
          <Stack.Screen name="(patient)/feedback" />
          <Stack.Screen name="(patient)/patient-links" />
          <Stack.Screen name="(admin)/index" />
          <Stack.Screen name="(provider)/hospital" />
          <Stack.Screen name="(provider)/blood-bank" />
          <Stack.Screen name="(provider)/oxygen" />
          <Stack.Screen name="(provider)/ambulance" />
          <Stack.Screen name="(provider)/doctor" />
          <Stack.Screen name="(common)/notifications" />
          <Stack.Screen name="(common)/profile" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
