import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  // Productivity
  focusModeEnabled?: boolean;
  workHoursStart?: string;
  workHoursEnd?: string;
  breakRemindersEnabled?: boolean;
  breakInterval?: number;
  dailyTaskGoal?: number;
  
  // Notifications
  emailNotifs?: boolean;
  pushNotifs?: boolean;
  weeklyReport?: boolean;
  leaveApprovals?: boolean;
  taskUpdates?: boolean;
  teamActivity?: boolean;
  
  // Dashboard
  dashboardWidgets?: {
    quickStats: boolean;
    leaveCalendar: boolean;
    upcomingTasks: boolean;
    teamActivity: boolean;
    recentLeaves: boolean;
    analytics: boolean;
  };
  defaultView?: string;
  dataRefreshRate?: string;
  compactMode?: boolean;
  
  // Localization
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  firstDayOfWeek?: string;
  
  // Privacy
  cookies?: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  // Productivity defaults
  focusModeEnabled: false,
  workHoursStart: '09:00',
  workHoursEnd: '18:00',
  breakRemindersEnabled: false,
  breakInterval: 120,
  dailyTaskGoal: 5,
  
  // Notification defaults
  emailNotifs: true,
  pushNotifs: true,
  weeklyReport: true,
  leaveApprovals: true,
  taskUpdates: true,
  teamActivity: false,
  
  // Dashboard defaults
  dashboardWidgets: {
    quickStats: true,
    leaveCalendar: true,
    upcomingTasks: true,
    teamActivity: true,
    recentLeaves: false,
    analytics: true,
  },
  defaultView: 'dashboard',
  dataRefreshRate: 'realtime',
  compactMode: false,
  
  // Localization defaults
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  firstDayOfWeek: 'monday',
  
  // Privacy defaults
  cookies: {
    essential: true,
    analytics: true,
    marketing: false,
    preferences: true,
  },
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const updateUserMutation = useMutation(api.users.updateOwnProfile);

  // Load settings from user object and AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      
      try {
        // Try to load from AsyncStorage first (for offline support)
        const stored = await AsyncStorage.getItem('user-settings');
        if (stored) {
          const parsedSettings = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
        }
        
        // Then merge with user data from Convex
        if (user) {
          const userSettings: UserSettings = {
            focusModeEnabled: (user as any).focusModeEnabled,
            workHoursStart: (user as any).workHoursStart,
            workHoursEnd: (user as any).workHoursEnd,
            breakRemindersEnabled: (user as any).breakRemindersEnabled,
            breakInterval: (user as any).breakInterval,
            dailyTaskGoal: (user as any).dailyTaskGoal,
            emailNotifs: (user as any).emailNotifs,
            pushNotifs: (user as any).pushNotifs,
            weeklyReport: (user as any).weeklyReport,
            language: (user as any).language,
            timezone: (user as any).timezone,
            dateFormat: (user as any).dateFormat,
            timeFormat: (user as any).timeFormat,
            firstDayOfWeek: (user as any).firstDayOfWeek,
            defaultView: (user as any).defaultView,
            dataRefreshRate: (user as any).dataRefreshRate,
            compactMode: (user as any).compactMode,
          };
          
          setSettings(prev => ({ ...DEFAULT_SETTINGS, ...prev, ...userSettings }));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Save settings to Convex and AsyncStorage
  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Save to AsyncStorage for offline access
      await AsyncStorage.setItem('user-settings', JSON.stringify(updatedSettings));
      
      // Save to Convex
      await updateUserMutation({
        userId: user.id as Id<'users'>,
        ...newSettings,
      });
      
      setSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Update specific setting
  const updateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    return await saveSettings({ [key]: value });
  };

  // Batch update multiple settings
  const updateMultipleSettings = async (updates: Partial<UserSettings>) => {
    return await saveSettings(updates);
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    return await saveSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    updateMultipleSettings,
    saveSettings,
    resetToDefaults,
  };
}
