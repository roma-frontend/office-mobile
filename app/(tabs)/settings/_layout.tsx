import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Platform } from 'react-native';

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'default',
        // Enable swipe back gesture on iOS
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        // Custom transition for Android
        ...(Platform.OS === 'android' && {
          animationTypeForReplace: 'push',
        }),
      }}
    >
      <Stack.Screen 
        name="profile" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="productivity" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="security" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="appearance" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="localization" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="integrations" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
      <Stack.Screen 
        name="about" 
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }} 
      />
    </Stack>
  );
}
