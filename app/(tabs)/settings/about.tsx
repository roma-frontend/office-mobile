import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';
import Constants from 'expo-constants';

export default function AboutSettings() {
  const { colors } = useTheme();

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || '1';

  const sections = [
    {
      title: 'App Information',
      items: [
        { label: 'Version', value: appVersion },
        { label: 'Build Number', value: buildNumber },
        { label: 'Platform', value: Constants.platform?.ios ? 'iOS' : 'Android' },
      ],
    },
    {
      title: 'Support',
      items: [
        { 
          label: 'Help Center',
          icon: 'help-circle-outline',
          action: () => Linking.openURL('https://help.example.com'),
        },
        { 
          label: 'Contact Support',
          icon: 'mail-outline',
          action: () => Linking.openURL('mailto:support@example.com'),
        },
        { 
          label: 'Report a Bug',
          icon: 'bug-outline',
          action: () => Linking.openURL('https://github.com/example/issues'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        { 
          label: 'Terms of Service',
          icon: 'document-text-outline',
          action: () => Linking.openURL('https://example.com/terms'),
        },
        { 
          label: 'Privacy Policy',
          icon: 'shield-checkmark-outline',
          action: () => Linking.openURL('https://example.com/privacy'),
        },
        { 
          label: 'Open Source Licenses',
          icon: 'code-slash-outline',
          action: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Icon */}
        <View style={styles.appIconContainer}>
          <View style={[styles.appIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="briefcase" size={48} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>HR Office</Text>
          <Text style={[styles.appTagline, { color: colors.textMuted }]}>
            Employee Management System
          </Text>
        </View>

        {/* Sections */}
        {sections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {section.title}
            </Text>
            <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {section.items.map((item, itemIndex) => (
                <View key={item.label}>
                  {item.action ? (
                    <TouchableOpacity
                      style={styles.row}
                      onPress={item.action}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowLeft}>
                        {item.icon && (
                          <Ionicons name={item.icon as any} size={20} color={colors.primary} style={styles.rowIcon} />
                        )}
                        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                          {item.label}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.rowValue, { color: colors.textMuted }]}>
                        {item.value}
                      </Text>
                    </View>
                  )}
                  {itemIndex < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Made with ❤️ by Your Company
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
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
    paddingBottom: 100,
  },
  appIconContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    flex: 1,
  },
  rowValue: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
});
