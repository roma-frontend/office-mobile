import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  Alert, Modal, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export default function SecuritySettings() {
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();

  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const changePasswordMutation = useMutation(api.auth.changePassword);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
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

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePasswordMutation({
        userId: user?.userId as Id<"users">,
        currentPassword,
        newPassword,
      });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password Changed',
        'Your password has been updated. Please sign in again with your new password.',
        [{ text: 'OK', onPress: () => signOut() }]
      );
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('incorrect')) {
        Alert.alert('Error', 'Current password is incorrect');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setPasswordLoading(false);
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
      action: () => setShowPasswordModal(true),
    },
  ];

  const sessions = [
    {
      device: 'This Device',
      location: 'Current Session',
      time: 'Active now',
      current: true,
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

        {/* Two-Factor Authentication */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Two-Factor Authentication</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.optionRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#8b5cf6' + '15' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#8b5cf6" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                TOTP Authenticator
              </Text>
              <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                Use an authenticator app for extra security
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.textMuted + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: colors.textMuted }]}>Desktop Only</Text>
            </View>
          </View>
          <View style={[styles.tfaInfoBox, { backgroundColor: isDark ? '#8b5cf620' : '#8b5cf610', borderTopColor: colors.border }]}>
            <Ionicons name="information-circle" size={18} color="#8b5cf6" />
            <Text style={[styles.tfaInfoText, { color: colors.textSecondary }]}>
              To set up or manage two-factor authentication, please use the desktop app. TOTP setup requires scanning a QR code displayed on your desktop screen.
            </Text>
          </View>
        </View>

        {/* Active Sessions */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Active Sessions</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {sessions.map((session, index) => (
            <View key={index}>
              <View style={styles.sessionRow}>
                <View style={[styles.deviceIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="phone-portrait" size={20} color={colors.primary} />
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
              </View>
            </View>
          ))}
        </View>

        {/* Security Tips */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>Security Tips</Text>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              {'\u2022'} Enable biometric authentication for quick access{'\n'}
              {'\u2022'} Change your password regularly{'\n'}
              {'\u2022'} Set up 2FA on desktop for extra protection{'\n'}
              {'\u2022'} Use a strong, unique password
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Change Password</Text>
              <TouchableOpacity onPress={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Current Password */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textMuted}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrentPw(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>New Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Enter new password (min 6 chars)"
                  placeholderTextColor={colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNewPw(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 16 }]}>Confirm New Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Re-enter new password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {/* Password strength indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={[styles.strengthBar, { backgroundColor: colors.border }]}>
                    <View style={[
                      styles.strengthFill,
                      {
                        width: newPassword.length < 6 ? '25%' : newPassword.length < 10 ? '50%' : newPassword.length < 14 ? '75%' : '100%',
                        backgroundColor: newPassword.length < 6 ? '#ef4444' : newPassword.length < 10 ? '#f59e0b' : '#10b981',
                      },
                    ]} />
                  </View>
                  <Text style={{ fontSize: 12, color: newPassword.length < 6 ? '#ef4444' : newPassword.length < 10 ? '#f59e0b' : '#10b981' }}>
                    {newPassword.length < 6 ? 'Too short' : newPassword.length < 10 ? 'Fair' : 'Strong'}
                  </Text>
                </View>
              )}

              {/* Mismatch warning */}
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>Passwords do not match</Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: passwordLoading ? 0.7 : 1 }]}
                onPress={handlePasswordChange}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 24, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  optionDescription: { fontSize: 13 },
  divider: { height: 1, marginLeft: 76 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  tfaInfoBox: {
    flexDirection: 'row', padding: 14, gap: 10, borderTopWidth: 1, alignItems: 'flex-start',
  },
  tfaInfoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  deviceIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sessionContent: { flex: 1 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sessionDevice: { fontSize: 15, fontWeight: '600', marginRight: 8 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  currentBadgeText: { fontSize: 11, fontWeight: '600' },
  sessionLocation: { fontSize: 13, marginBottom: 2 },
  sessionTime: { fontSize: 12 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  infoText: { fontSize: 13, lineHeight: 20 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20, paddingVertical: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '600' },
});
