import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';

export default function IntegrationsSettings() {
  const { colors } = useTheme();

  const integrations = [
    { name: 'Google Calendar', icon: '📅', color: '#4285F4', connected: false, desc: 'Sync leave requests with Google Calendar' },
    { name: 'Outlook Calendar', icon: '📆', color: '#0078D4', connected: false, desc: 'Integrate with Microsoft Outlook' },
    { name: 'Slack', icon: '💬', color: '#4A154B', connected: false, desc: 'Receive notifications in Slack' },
    { name: 'Microsoft Teams', icon: '🎯', color: '#505AC9', connected: false, desc: 'Get alerts in Teams' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Integrations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Connect with your favorite apps and services
        </Text>

        {integrations.map((integration, index) => (
          <View 
            key={integration.name}
            style={[styles.integrationCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: integration.color + '15' }]}>
              <Text style={styles.integrationIcon}>{integration.icon}</Text>
            </View>
            <View style={styles.integrationContent}>
              <Text style={[styles.integrationName, { color: colors.textPrimary }]}>
                {integration.name}
              </Text>
              <Text style={[styles.integrationDesc, { color: colors.textMuted }]}>
                {integration.desc}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.connectButton,
                integration.connected 
                  ? { backgroundColor: colors.error + '15', borderColor: colors.error }
                  : { backgroundColor: colors.primary + '15', borderColor: colors.primary }
              ]}
              onPress={() => Alert.alert('Coming Soon', 'Integration features coming soon!')}
            >
              <Text style={[
                styles.connectButtonText,
                { color: integration.connected ? colors.error : colors.primary }
              ]}>
                {integration.connected ? 'Disconnect' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
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
  subtitle: { fontSize: 14, marginBottom: 16 },
  integrationCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  integrationIcon: { fontSize: 24 },
  integrationContent: { flex: 1 },
  integrationName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  integrationDesc: { fontSize: 13 },
  connectButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  connectButtonText: { fontSize: 14, fontWeight: '600' },
});
