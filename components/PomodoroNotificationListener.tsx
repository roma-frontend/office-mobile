import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../context/AuthContext';
import { 
  notifyPomodoroComplete, 
  notifyBreakComplete, 
  notifyLongBreakComplete,
  registerForPushNotifications 
} from '../lib/notifications';
import type { Id } from '../convex/_generated/dataModel';

/**
 * Background listener for Pomodoro timer completions
 * Sends push notifications when timer ends
 */
export function PomodoroNotificationListener() {
  const { user } = useAuth();
  const previousSessionRef = useRef<any>(null);

  // Listen to active Pomodoro session
  const activeSession = useQuery(
    api.productivity.getActivePomodoroSession,
    user?.id ? { userId: user.id as Id<'users'> } : 'skip'
  );

  // Register for push notifications on mount
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // Monitor session completion
  useEffect(() => {
    if (!activeSession) {
      // Check if previous session just completed
      if (previousSessionRef.current && !previousSessionRef.current.completed) {
        const duration = previousSessionRef.current.duration / (1000 * 60); // to minutes
        
        // Determine notification type based on duration
        if (duration === 25) {
          // Pomodoro completed
          notifyPomodoroComplete();
        } else if (duration === 5) {
          // Short break completed
          notifyBreakComplete();
        } else if (duration === 15) {
          // Long break completed
          notifyLongBreakComplete();
        }
      }
      
      previousSessionRef.current = null;
      return;
    }

    // Check if session just completed
    const now = Date.now();
    const timeRemaining = activeSession.endTime - now;

    if (timeRemaining <= 0 && previousSessionRef.current?._id !== activeSession._id) {
      // Session completed
      const duration = activeSession.duration / (1000 * 60);
      
      if (duration === 25) {
        notifyPomodoroComplete();
      } else if (duration === 5) {
        notifyBreakComplete();
      } else if (duration === 15) {
        notifyLongBreakComplete();
      }
    }

    // Update ref
    previousSessionRef.current = activeSession;
  }, [activeSession]);

  // This is a background component, no UI
  return null;
}
