import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export default function ProfileSettings() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [position, setPosition] = useState(user?.position || '');
  const [saving, setSaving] = useState(false);

  const updateUser = useMutation(api.users.updateUser);

  // Sync with user data when it changes
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone((user as any).phone || '');
      setDepartment(user.department || '');
      setPosition(user.position || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      await updateUser({
        userId: user.id as Id<'users'>,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        position: position.trim() || undefined,
      });
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Profile & Account</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveButton, { color: colors.primary }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatar}
            />
          ) : (user as any)?.avatarUrl ? (
            <Image
              source={{ uri: (user as any).avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={[styles.changePhotoButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.changePhotoText, { color: colors.textMuted }]}>
            Tap to change photo
          </Text>
        </View>

        {/* Form Fields */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@company.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Department</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={department}
              onChangeText={setDepartment}
              placeholder="Engineering"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Position</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              value={position}
              onChangeText={setPosition}
              placeholder="Software Engineer"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Read-only Info */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Role</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {user?.role === 'admin' ? 'Administrator' : user?.role === 'supervisor' ? 'Supervisor' : 'Employee'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Employee Type</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {(user as any)?.employeeType === 'contractor' ? 'Contractor' : 'Staff'}
            </Text>
          </View>
        </View>

        {/* Leave Balances */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Leave Balances</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceValue, { color: '#3b82f6' }]}>
                {user?.paidLeaveBalance ?? 0}
              </Text>
              <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Paid Days</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceValue, { color: '#ef4444' }]}>
                {user?.sickLeaveBalance ?? 0}
              </Text>
              <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Sick Days</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceValue, { color: '#10b981' }]}>
                {(user as any)?.familyLeaveBalance ?? 0}
              </Text>
              <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Family Days</Text>
            </View>
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
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 24,
    right: '50%',
    marginRight: -60,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changePhotoText: {
    fontSize: 13,
    marginTop: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 13,
  },
});
