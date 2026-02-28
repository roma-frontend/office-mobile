import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

export default function SecuritySettings() {
  const { colors } = useTheme();
  
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Check if device supports biometrics
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Not Supported', 'Your device does not support biometric authentication');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Not Enrolled', 'Please set up Touch ID or Face ID in your device settings first');
        return;
      }

      // Authenticate
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        setBiometricEnabled(true);
        Alert.alert('Success', 'Biometric authentication enabled!');
      }
    } else {
      setBiometricEnabled(false);
    }
  };

  const securityOptions = [
    {
      id: 'biometric',
      icon: 'finger-print',
      color: '#3b82f6',
      title: 'Touch ID / Face ID',
      description: 'Use biometric authentication for quick login',
      value: biometricEnabled,
      onChange: handleBiometricToggle,
    },
    {
      id: 'password',
      icon: 'key',
      color: '#10b981',
      title: 'Change Password',
      description: 'Update your account password',
      action: () => Alert.alert('Coming Soon', 'Password change feature coming soon'),
    },
  ];

  const sessions = [
    {
      device: 'iPhone 14',
      location: 'Moscow, Russia',
      time: 'Active now',
      current: true,
    },
    {
      device: 'Chrome on Windows',
      location: 'Moscow, Russia',
      time: '2 hours ago',
      current: false,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Manage your account security and authentication
        </Text>

        {/* Authentication Methods */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Authentication</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {securityOptions.map((option, index) => (
            <View key={option.id}>
              <View style={styles.optionRow}>
                <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                  <Ionicons name={option.icon as any} size={24} color={option.color} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    {option.description}
                  </Text>
                </View>
                {option.onChange ? (
                  <Switch
                    value={option.value}
                    onValueChange={option.onChange}
                    trackColor={{ false: '#767577', true: option.color + '80' }}
                    thumbColor={option.value ? option.color : '#f4f3f4'}
                  />
                ) : (
                  <TouchableOpacity onPress={option.action}>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              {index < securityOptions.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Active Sessions */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Active Sessions</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {sessions.map((session, index) => (
            <View key={index}>
              <View style={styles.sessionRow}>
                <View style={[styles.deviceIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons 
                    name={session.device.includes('iPhone') ? 'phone-portrait' : 'desktop'} 
                    size={20} 
                    color={colors.primary} 
                  />
                </View>
                <View style={styles.sessionContent}>
                  <View style={styles.sessionHeader}>
                    <Text style={[styles.sessionDevice, { color: colors.textPrimary }]}>
                      {session.device}
                    </Text>
                    {session.current && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.success + '20' }]}>
                        <Text style={[styles.currentBadgeText, { color: colors.success }]}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.sessionLocation, { color: colors.textMuted }]}>
                    {session.location}
                  </Text>
                  <Text style={[styles.sessionTime, { color: colors.textMuted }]}>
                    {session.time}
                  </Text>
                </View>
                {!session.current && (
                  <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Sign out from this device?')}>
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              {index < sessions.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Security Tips */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>Security Tips</Text>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              • Enable biometric authentication for quick access{'\n'}
              • Review active sessions regularly{'\n'}
              • Use a strong, unique password{'\n'}
              • Sign out from unused devices
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 76,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionDevice: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sessionLocation: {
    fontSize: 13,
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 12,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
