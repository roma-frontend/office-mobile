/**
 * Google Sign-In Button for Expo Go
 *
 * Flow: Google OAuth → Convex relay (extracts token from fragment) → redirect back to app
 * openAuthSessionAsync intercepts the return URL before Expo Router processes it.
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
  '';

const CONVEX_SITE_URL =
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
  (process.env.EXPO_PUBLIC_CONVEX_URL ?? '').replace('.cloud', '.site');

const REDIRECT_URI = `${CONVEX_SITE_URL}/auth/google/callback`;

interface GoogleSignInButtonProps {
  colors: {
    bgCard: string;
    border: string;
    textPrimary: string;
    textMuted: string;
    primary: string;
  };
  isDark: boolean;
}

export function GoogleSignInButton({ colors, isDark }: GoogleSignInButtonProps) {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const googleOAuthLogin = useMutation(api.auth.googleOAuthLogin);

  const handlePress = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Configuration Error', 'Google Sign-In is not configured.');
      return;
    }

    setIsLoading(true);
    try {
      // The return URL that openAuthSessionAsync will intercept
      const returnUrl = Linking.createURL('/');

      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
          client_id: GOOGLE_WEB_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          response_type: 'token',
          scope: 'openid profile email',
          include_granted_scopes: 'true',
          prompt: 'select_account',
          // Pass returnUrl in state so relay knows where to send the user back
          state: returnUrl,
        }).toString();

      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

      if (result.type !== 'success' || !result.url) {
        setIsLoading(false);
        return;
      }

      // Parse access_token from the returned URL
      const url = result.url;
      const queryString = url.includes('?') ? url.split('?').pop() || '' : '';
      const params = new URLSearchParams(queryString);
      const accessToken = params.get('access_token');

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Fetch Google user info
      const userInfoRes = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!userInfoRes.ok) throw new Error('Failed to fetch Google user info');
      const userInfo = await userInfoRes.json();

      if (!userInfo.email) throw new Error('No email from Google');

      // Create session & login via Convex
      const sessionToken = `google-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const sessionExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const data = await googleOAuthLogin({
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        avatarUrl: userInfo.picture,
        googleId: userInfo.sub,
        sessionToken,
        sessionExpiry,
      });

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
          avatar: data.avatarUrl,
          travelAllowance: data.travelAllowance,
          phone: data.phone,
          paidLeaveBalance: data.paidLeaveBalance,
          sickLeaveBalance: data.sickLeaveBalance,
          familyLeaveBalance: data.familyLeaveBalance,
          organizationId: data.organizationId,
          organizationName: data.organizationName,
          ...data,
        },
        sessionExpiry,
      );

      if (data.isNewUser) {
        Alert.alert('Welcome!', 'Your account has been created.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('[GoogleSignIn] Error:', error);
      const msg = error?.message ?? '';
      if (msg.includes('pending')) {
        Alert.alert('Pending Approval', 'Your account is pending admin approval.');
      } else if (msg.includes('deactivated')) {
        Alert.alert('Account Deactivated', 'Contact your administrator.');
      } else {
        Alert.alert('Sign-In Error', msg || 'Failed to sign in with Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!GOOGLE_WEB_CLIENT_ID) return null;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bgCard,
          borderColor: isDark ? 'rgba(99,102,241,0.25)' : colors.border,
        },
      ]}
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.googleIcon}>
          <Ionicons name="logo-google" size={20} color="#4285F4" />
        </View>
      )}
      <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  googleIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
