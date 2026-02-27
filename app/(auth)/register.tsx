import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ── Password strength helper ────────────────────────────────────────────────
function getPasswordStrength(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}
const STRENGTH_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

export default function Register() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const registerMutation = useMutation(api.auth.register);

  const isAdminEmail = email.toLowerCase() === 'romangulanyan@gmail.com';
  const isContractor = email.toLowerCase().includes('contractor');
  const allowance = isContractor ? '12,000 AMD' : '20,000 AMD';
  const roleHint = isAdminEmail
    ? '👑 You will be registered as Admin'
    : isContractor
    ? `Contractor · Travel allowance: ${allowance}`
    : email
    ? `Staff · Travel allowance: ${allowance}`
    : '';

  const strength = getPasswordStrength(password);
  const strengthColor = password ? STRENGTH_COLORS[strength - 1] ?? '#ef4444' : 'transparent';
  const strengthLabel = password ? STRENGTH_LABELS[strength - 1] ?? '' : '';

  const handleRegister = async () => {
    if (!name.trim()) { setError('Please enter your full name'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) { setError('Please enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const result = await registerMutation({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        phone: phone.trim() || undefined,
      });
      if ((result as any)?.needsApproval) {
        setSuccess('Account created! Waiting for admin approval.');
        setTimeout(() => router.replace('/(auth)/login'), 2500);
      } else {
        await AsyncStorage.multiSet([
          ['auth_token', (result as any)?.sessionToken ?? ''],
          ['user_id', (result as any)?.userId ?? ''],
          ['user_name', (result as any)?.name ?? name],
          ['user_role', (result as any)?.role ?? 'employee'],
          ['user_email', email.toLowerCase().trim()],
        ]);
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('already registered')) setError('This email is already registered.');
      else if (msg.includes('not authorized')) setError('You are not authorized to register as admin.');
      else setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Colors ────────────────────────────────────────────────────────────────
  const gradBg: [string, string] = isDark ? ['#0a0f1e', '#0f172a'] : [colors.bg, colors.bg];
  const gradBtn: [string, string] = isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryLight];
  const gradLogo: [string, string] = isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryLight];
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : colors.bgCard;
  const inputBorder = isDark ? 'rgba(99,102,241,0.25)' : colors.border;
  const iconBg = isDark ? 'rgba(99,102,241,0.12)' : colors.bgCard;
  const iconColor = isDark ? colors.primaryLight : colors.textMuted;
  const labelColor = isDark ? colors.textMuted : colors.textSecondary;
  const cardBg = colors.bgCard;
  const cardBorder = colors.border;
  const subtitleColor = isDark ? colors.textMuted : colors.textMuted;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={gradBg} style={StyleSheet.absoluteFill} />

      {/* Glow orb — dark only */}
      {isDark && <View style={styles.glowOrb} pointerEvents="none" />}


      {/* Theme toggle */}
      <TouchableOpacity
        style={[styles.themeToggle, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.borderLight,
          borderColor: isDark ? 'rgba(99,102,241,0.3)' : colors.border,
        }]}
        onPress={toggleTheme}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isDark ? 'sunny-outline' : 'moon-outline'}
          size={18}
          color={iconColor}
        />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <LinearGradient colors={gradLogo} style={[styles.logoCircle, { shadowColor: colors.primary }]}>
            <Ionicons name="person-add-outline" size={32} color="#fff" />
          </LinearGradient>
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>HRLeave</Text>
          <Text style={[styles.logoSub, { color: subtitleColor }]}>Create your account</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Get started</Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            Join your team on HR Office
          </Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: labelColor }]}>Full Name</Text>
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <View style={[styles.inputIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name="person-outline" size={18} color={iconColor} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="John Doe"
                placeholderTextColor={isDark ? colors.textSecondary : colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: labelColor }]}>Email address</Text>
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <View style={[styles.inputIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name="mail-outline" size={18} color={iconColor} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="your@company.com"
                placeholderTextColor={isDark ? colors.textSecondary : colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {/* Role hint */}
            {!!roleHint && (
              <View style={styles.roleHintRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={13}
                  color={isAdminEmail ? colors.primary : colors.success}
                />
                <Text style={[styles.roleHintText, { color: isDark ? colors.textMuted : colors.textMuted }]}>
                  {roleHint}
                </Text>
              </View>
            )}
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: labelColor }]}>Phone</Text>
              <Text style={[styles.optionalBadge, {
                backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : colors.border,
                color: isDark ? colors.primaryLight : colors.textMuted,
              }]}>optional</Text>
            </View>
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <View style={[styles.inputIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name="call-outline" size={18} color={iconColor} />
              </View>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="+374 XX XXX XXX"
                placeholderTextColor={isDark ? colors.textSecondary : colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: labelColor }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <View style={[styles.inputIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name="lock-closed-outline" size={18} color={iconColor} />
              </View>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.textPrimary }]}
                placeholder="Min. 8 characters"
                placeholderTextColor={isDark ? colors.textSecondary : colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={isDark ? colors.textMuted : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Password strength */}
            {!!password && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[0, 1, 2, 3].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor: i < strength
                            ? STRENGTH_COLORS[strength - 1]
                            : isDark ? '#1e293b' : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                  {strengthLabel}
                </Text>
              </View>
            )}
          </View>

          {/* Error */}
          {!!error && (
            <View style={[styles.errorBox, {
              backgroundColor: isDark ? 'rgba(248,113,113,0.1)' : '#fef2f2',
              borderColor: isDark ? 'rgba(248,113,113,0.25)' : '#fecaca',
            }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
              <Text style={[styles.errorText, { color: '#f87171' }]}>{error}</Text>
            </View>
          )}

          {/* Success */}
          {!!success && (
            <View style={[styles.successBox, {
              backgroundColor: isDark ? 'rgba(52,211,153,0.1)' : '#f0fdf4',
              borderColor: isDark ? 'rgba(52,211,153,0.25)' : '#bbf7d0',
            }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#34d399" />
              <Text style={[styles.successText, { color: '#34d399' }]}>{success}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={[styles.btn, { shadowColor: colors.primary, opacity: loading ? 0.8 : 1 }]}
            activeOpacity={0.85}
          >
            <LinearGradient colors={gradBtn} style={styles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Create Account</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign in link */}
          <View style={styles.signinRow}>
            <Text style={[styles.signinText, { color: subtitleColor }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.signinLink, { color: isDark ? colors.primaryLight : colors.primary }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={isDark ? colors.borderLight : colors.textMuted} />
          <Text style={[styles.footer, { color: isDark ? colors.borderLight : colors.textMuted }]}>
            {' '}Enterprise-grade encryption
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },

  // Background decorations
  glowOrb: {
    position: 'absolute', top: '20%', left: '50%',
    width: 320, height: 320, marginLeft: -160, marginTop: -160,
    borderRadius: 160,
    backgroundColor: 'rgba(99,102,241,0.07)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 90,
  },

  // Theme toggle
  themeToggle: {
    position: 'absolute', top: 56, right: 24, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  // Logo
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 76, height: 76, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 10,
  },
  logoText: { ...Typography.h1, letterSpacing: 0.5 },
  logoSub: { ...Typography.caption, marginTop: 4 },

  // Card
  card: {
    width: '100%', borderRadius: 24, padding: 28, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 32, elevation: 10,
  },
  title: { ...Typography.h2, marginBottom: 4 },
  subtitle: { ...Typography.body, marginBottom: 24 },

  // Inputs
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  inputLabel: { ...Typography.caption, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  optionalBadge: {
    fontSize: 10, fontWeight: '600', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 20, overflow: 'hidden', marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', minHeight: 52,
  },
  inputIconWrap: {
    width: 48, height: 52, alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    ...Typography.body, fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 16, paddingVertical: 14 },

  // Role hint
  roleHintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginLeft: 2 },
  roleHintText: { ...Typography.label, fontSize: 12 },

  // Password strength
  strengthWrap: { marginTop: 8, gap: 4 },
  strengthBars: { flexDirection: 'row', gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { ...Typography.label, fontSize: 11, fontWeight: '600' },

  // Error / success
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 14,
  },
  errorText: { ...Typography.caption, flex: 1 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 14,
  },
  successText: { ...Typography.caption, flex: 1 },

  // Button
  btn: {
    borderRadius: Radius.full, overflow: 'hidden', marginTop: 8,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  btnGrad: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { ...Typography.bodySemiBold, fontSize: 16, color: '#fff' },

  // Sign in
  signinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  signinText: { ...Typography.body },
  signinLink: { ...Typography.bodySemiBold },

  // Footer
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  footer: { ...Typography.label, textAlign: 'center' },
});




