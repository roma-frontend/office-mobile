import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';

export default function PrivacySettings() {
  const { colors } = useTheme();
  
  const [cookies, setCookies] = useState({
    essential: true,
    analytics: true,
    marketing: false,
    preferences: true,
  });

  const toggleCookie = (key: keyof typeof cookies) => {
    if (key === 'essential') return; // Essential cookies can't be disabled
    setCookies(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const cookieTypes = [
    { key: 'essential', icon: '🟢', label: 'Essential Cookies', desc: 'Required for core functionality', disabled: true },
    { key: 'analytics', icon: '🔵', label: 'Analytics Cookies', desc: 'Help us improve the app', disabled: false },
    { key: 'marketing', icon: '🟠', label: 'Marketing Cookies', desc: 'Personalized content and ads', disabled: false },
    { key: 'preferences', icon: '🎨', label: 'Preference Cookies', desc: 'Remember your settings', disabled: false },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Manage your data and cookie preferences
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Cookie Preferences</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {cookieTypes.map((cookie, index) => (
            <View key={cookie.key}>
              <View style={styles.cookieRow}>
                <View style={styles.cookieInfo}>
                  <Text style={styles.cookieIcon}>{cookie.icon}</Text>
                  <View style={styles.cookieText}>
                    <Text style={[styles.cookieLabel, { color: colors.textPrimary }]}>
                      {cookie.label}
                    </Text>
                    <Text style={[styles.cookieDesc, { color: colors.textMuted }]}>
                      {cookie.desc}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={cookies[cookie.key as keyof typeof cookies]}
                  onValueChange={() => toggleCookie(cookie.key as keyof typeof cookies)}
                  disabled={cookie.disabled}
                  trackColor={{ false: '#767577', true: colors.primary + '80' }}
                  thumbColor={cookies[cookie.key as keyof typeof cookies] ? colors.primary : '#f4f3f4'}
                />
              </View>
              {index < cookieTypes.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={[styles.infoText, { color: colors.warning }]}>
            Essential cookies are required for the app to function properly and cannot be disabled.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  cookieRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cookieInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  cookieIcon: { fontSize: 24, marginRight: 12 },
  cookieText: { flex: 1 },
  cookieLabel: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  cookieDesc: { fontSize: 13 },
  divider: { height: 1, marginLeft: 52 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
