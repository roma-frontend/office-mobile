import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';

type SettingsSection = 
  | 'profile'
  | 'productivity'
  | 'notifications'
  | 'security'
  | 'appearance'
  | 'dashboard'
  | 'localization'
  | 'integrations'
  | 'privacy'
  | 'about';

const SETTINGS_SECTIONS: Array<{
  id: SettingsSection;
  title: string;
  icon: string;
  color: string;
  description: string;
}> = [
  {
    id: 'profile',
    title: 'Profile & Account',
    icon: 'person-outline',
    color: '#3b82f6',
    description: 'Manage your personal information',
  },
  {
    id: 'productivity',
    title: 'Productivity',
    icon: 'flash-outline',
    color: '#f59e0b',
    description: 'Break reminders, focus mode & goals',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications-outline',
    color: '#ef4444',
    description: 'Email, push & alert preferences',
  },
  {
    id: 'security',
    title: 'Security',
    icon: 'shield-checkmark-outline',
    color: '#10b981',
    description: 'Face ID, Touch ID & privacy',
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: 'color-palette-outline',
    color: '#8b5cf6',
    description: 'Theme, colors & display',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'grid-outline',
    color: '#06b6d4',
    description: 'Customize widgets & layout',
  },
  {
    id: 'localization',
    title: 'Regional',
    icon: 'globe-outline',
    color: '#ec4899',
    description: 'Language, timezone & formats',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: 'link-outline',
    color: '#f97316',
    description: 'Calendar sync & connected apps',
  },
  {
    id: 'privacy',
    title: 'Privacy',
    icon: 'lock-closed-outline',
    color: '#6366f1',
    description: 'Data & cookie preferences',
  },
  {
    id: 'about',
    title: 'About',
    icon: 'information-circle-outline',
    color: '#64748b',
    description: 'App version & support',
  },
];

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();

  const handleSectionPress = (sectionId: SettingsSection) => {
    router.push(`/(tabs)/settings/${sectionId}`);
  };

  const handleClose = () => {
    // Go back to the previous screen (Profile)
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SETTINGS_SECTIONS.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.sectionCard,
              { 
                backgroundColor: colors.bgCard,
                borderColor: colors.border,
              }
            ]}
            onPress={() => handleSectionPress(section.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: section.color + '15' }]}>
              <Ionicons name={section.icon as any} size={24} color={section.color} />
            </View>
            
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
                {section.description}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            HR Office Mobile v1.0.0
          </Text>
          <Text style={[styles.appInfoText, { color: colors.textMuted }]}>
            © 2026 All rights reserved
          </Text>
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
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 24,
    gap: 4,
  },
  appInfoText: {
    fontSize: 12,
  },
});
