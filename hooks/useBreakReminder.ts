import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface BreakReminderConfig {
  enabled: boolean;
  intervalMinutes: number;
  workHoursStart: string;
  workHoursEnd: string;
}

export function useBreakReminder() {
  const [config, setConfig] = useState<BreakReminderConfig>({
    enabled: false,
    intervalMinutes: 120,
    workHoursStart: '09:00',
    workHoursEnd: '18:00',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize on mount
  useEffect(() => {
    // Only run on native platforms
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      // Dynamically import on native only
      const { breakReminderService, setupNotificationListeners } = require('@/services/breakReminderService');
      
      // Setup listeners
      setupNotificationListeners();
      
      // Load config
      await breakReminderService.loadConfig();
      const loadedConfig = breakReminderService.getConfig();
      setConfig(loadedConfig);
      
      // Start if enabled
      if (loadedConfig.enabled) {
        await breakReminderService.start();
      }
      
      setIsLoading(false);
    };

    init();
  }, []);

  // Start break reminders
  const start = async (newConfig?: Partial<BreakReminderConfig>) => {
    if (Platform.OS === 'web') return;
    
    const { breakReminderService } = require('@/services/breakReminderService');
    const updatedConfig = { ...config, ...newConfig, enabled: true };
    setConfig(updatedConfig);
    await breakReminderService.start(updatedConfig);
  };

  // Stop break reminders
  const stop = async () => {
    if (Platform.OS === 'web') return;
    
    const { breakReminderService } = require('@/services/breakReminderService');
    setConfig({ ...config, enabled: false });
    await breakReminderService.stop();
  };

  // Update configuration
  const updateConfig = async (newConfig: Partial<BreakReminderConfig>) => {
    if (Platform.OS === 'web') return;
    
    const { breakReminderService } = require('@/services/breakReminderService');
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    await breakReminderService.updateConfig(updatedConfig);
  };

  // Request permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'web') return false;
    
    const { breakReminderService } = require('@/services/breakReminderService');
    return await breakReminderService.requestPermissions();
  };

  return {
    config,
    isLoading,
    start,
    stop,
    updateConfig,
    requestPermissions,
  };
}
