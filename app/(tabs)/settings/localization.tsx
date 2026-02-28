import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';

export default function LocalizationSettings() {
  const { colors } = useTheme();
  
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState('24h');

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ];

  const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
  const timeFormats = ['24h', '12h'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Regional</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Language</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {languages.map((lang, idx) => (
            <View key={lang.code}>
              <TouchableOpacity 
                style={styles.optionRow}
                onPress={() => setLanguage(lang.code)}
              >
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{lang.name}</Text>
                {language === lang.code && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {idx < languages.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Date Format</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {dateFormats.map((format, idx) => (
            <View key={format}>
              <TouchableOpacity 
                style={styles.optionRow}
                onPress={() => setDateFormat(format)}
              >
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{format}</Text>
                {dateFormat === format && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {idx < dateFormats.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Time Format</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {timeFormats.map((format, idx) => (
            <View key={format}>
              <TouchableOpacity 
                style={styles.optionRow}
                onPress={() => setTimeFormat(format)}
              >
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                  {format === '24h' ? '24-hour (14:30)' : '12-hour (2:30 PM)'}
                </Text>
                {timeFormat === format && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {idx < timeFormats.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
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
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  flag: { fontSize: 24, marginRight: 12 },
  optionLabel: { flex: 1, fontSize: 15 },
  divider: { height: 1, marginLeft: 16 },
});
