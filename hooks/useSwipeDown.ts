// Хук для свайп-жестов
import { useRef, useCallback } from 'react';
import { PanResponder } from 'react-native';

interface UseSwipeDownProps {
  onSwipeDown?: () => void;
  threshold?: number;
  velocityThreshold?: number;
}

export function useSwipeDown({ 
  onSwipeDown, 
  threshold = 100, 
  velocityThreshold = 0.5 
}: UseSwipeDownProps = {}) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => 
        Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 10,
      onPanResponderMove: (_, gestureState) => {
        // Swipe down logic can be added here for animations
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > threshold && gestureState.vy > velocityThreshold) {
          onSwipeDown?.();
        }
      },
    })
  ).current;

  return panResponder.panHandlers;
}
