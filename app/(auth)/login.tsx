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
import { useAuth } from '@/context/AuthContext';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
// import { FaceLogin } from '@/components/FaceLogin'; // Disabled for Expo Go

export default function Login() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // const [showFaceLogin, setShowFaceLogin] = useState(false); // Disabled for Expo Go

  const loginMutation = useMutation(api.auth.login);

  const handleLogin = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (!emailRegex.test(email)) { setError('Please enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const sessionToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const sessionExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      const data = await loginMutation({
        email: email.toLowerCase().trim(),
        password,
        sessionToken,
        sessionExpiry,
      });
      // Store session via AuthContext — single source of truth
      await signIn(
        sessionToken,
        {
          userId: data.userId as string,
          name: data.name ?? '',
          email: data.email ?? '',
          role: (data.role ?? 'employee') as any,
          department: data.department,
          position: data.position,
          employeeType: data.employeeType,
          avatarUrl: data.avatarUrl,
          travelAllowance: data.travelAllowance,
        },
        sessionExpiry,
      );
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('pending')) setError('Your account is pending admin approval.');
      else if (msg.includes('deactivated')) setError('Account is deactivated. Contact admin.');
      else setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const gradBg: [string, string] = isDark ? ['#0a0f1e', '#0f172a'] : [colors.bg, colors.bg];
  const gradBtn: [string, string] = isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryLight];
  const gradLogo: [string, string] = isDark ? [colors.primaryDark, colors.primary] : [colors.primary, colors.primaryLight];

  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : colors.bgCard;
  const inputBorder = isDark ? 'rgba(99,102,241,0.25)' : colors.border;
  const iconBg = isDark ? 'rgba(99,102,241,0.12)' : colors.bgCard;
  const iconColor = isDark ? colors.primaryLight : colors.textMuted;
  const labelColor = isDark ? colors.textMuted : colors.textSecondary;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={gradBg} style={StyleSheet.absoluteFill} />

      {/* Glow orb — dark only */}
      {isDark && (
        <View style={styles.glowOrb} pointerEvents="none" />
      )}


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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <LinearGradient colors={gradLogo} style={[styles.logoCircle, { shadowColor: colors.primary }]}>
            <Ionicons name="briefcase-outline" size={36} color="#fff" />
          </LinearGradient>
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>HRLeave</Text>
          <Text style={[styles.logoSub, { color: isDark ? colors.textMuted : colors.textMuted }]}>Professional HR Management</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
        }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: isDark ? colors.textMuted : colors.textMuted }]}>Sign in to your workspace</Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: labelColor }]}>Email</Text>
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
                placeholder="••••••••"
                placeholderTextColor={isDark ? colors.textSecondary : colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={isDark ? colors.textMuted : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(248,113,113,0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(248,113,113,0.25)' : '#fecaca' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
              <Text style={[styles.error, { color: '#f87171' }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={handleLogin} disabled={loading} style={[styles.btn, { shadowColor: colors.primary }]} activeOpacity={0.85}>
            <LinearGradient colors={gradBtn} style={styles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.btnText}>Sign In</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgot}>
            <Text style={[styles.forgotText, { color: isDark ? colors.primaryLight : colors.primary }]}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Face ID Login */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Disabled for Expo Go */}
          {/* <TouchableOpacity
            style={[styles.faceIdButton, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => setShowFaceLogin(true)}
          >
            <Ionicons name="scan-outline" size={24} color={colors.primary} />
            <Text style={[styles.faceIdText, { color: colors.textPrimary }]}>Login with Face ID</Text>
          </TouchableOpacity> */}

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: isDark ? colors.textMuted : colors.textMuted }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.registerLink, { color: isDark ? colors.primaryLight : colors.primary }]}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={isDark ? colors.borderLight : colors.textMuted} />
          <Text style={[styles.footer, { color: isDark ? colors.borderLight : colors.textMuted }]}>
            {' '}Enterprise-grade encryption
          </Text>
        </View>
      </ScrollView>

      {/* Face ID Login Modal - Disabled for Expo Go */}
      {/* <FaceLogin
        visible={showFaceLogin}
        onClose={() => setShowFaceLogin(false)}
        onSuccess={() => {
          setShowFaceLogin(false);
          router.replace('/(tabs)');
        }}
      /> */}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  glowOrb: {
    position: 'absolute', top: '25%', left: '50%',
    width: 300, height: 300,
    marginLeft: -150, marginTop: -150,
    borderRadius: 150,
    backgroundColor: 'rgba(99,102,241,0.08)',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },
  themeToggle: {
    position: 'absolute', top: 56, right: 24, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 10,
  },
  logoText: { ...Typography.h1, letterSpacing: 0.5 },
  logoSub: { ...Typography.caption, marginTop: 4 },
  card: {
    width: '100%', borderRadius: 24, padding: 28,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25, shadowRadius: 32, elevation: 10,
  },
  title: { ...Typography.h2, marginBottom: 4 },
  subtitle: { ...Typography.body, marginBottom: 28 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { ...Typography.caption, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 52,
  },
  inputIconWrap: {
    width: 48, height: 52,
    alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 0,
  },
  input: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    ...Typography.body, fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 16, paddingVertical: 14 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16,
  },
  error: { ...Typography.caption, flex: 1 },
  btn: {
    borderRadius: Radius.full, overflow: 'hidden', marginTop: 8,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  btnGrad: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { ...Typography.bodySemiBold, fontSize: 16, color: '#fff' },
  forgot: { alignItems: 'center', marginTop: 20 },
  forgotText: { ...Typography.body, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.caption,
  },
  faceIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  faceIdText: {
    ...Typography.body,
    fontWeight: '600',
  },
  registerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  registerText: { ...Typography.body },
  registerLink: { ...Typography.bodySemiBold },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32 },
  footer: { ...Typography.label, textAlign: 'center' },
});



