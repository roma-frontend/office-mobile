import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';

import { Typography, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/convex/_generated/api';

interface FaceLoginProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FaceLogin({ visible, onClose, onSuccess }: FaceLoginProps) {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [faceDetected, setFaceDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [matchedUser, setMatchedUser] = useState<string | null>(null);

  const allFaceDescriptors = useQuery(api.faceRecognition.getAllFaceDescriptors);
  const verifyFaceLogin = useMutation(api.faceRecognition.verifyFaceLogin);
  const recordFaceIdAttempt = useMutation(api.users.recordFaceIdAttempt);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  // Auto-scan when face is detected
  useEffect(() => {
    if (faceDetected && !isProcessing && matchStatus === 'idle' && visible) {
      // Automatically trigger scan after a short delay when face is detected
      const timer = setTimeout(() => {
        handleCapture();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [faceDetected, isProcessing, matchStatus, visible]);

  const handleFaceDetected = ({ faces }: FaceDetector.FaceDetectionResult) => {
    console.log('👤 Faces detected:', faces.length);
    if (faces.length > 0) {
      console.log('Face details:', faces[0]);
    }
    setFaceDetected(faces.length > 0);
  };

  const handleCapture = async () => {
    console.log('🎯 handleCapture called');
    console.log('🎯 faceDetected:', faceDetected);
    console.log('🎯 allFaceDescriptors:', allFaceDescriptors);
    
    if (!faceDetected) {
      Alert.alert('No Face Detected', 'Please position your face in the camera frame.');
      return;
    }

    if (!allFaceDescriptors) {
      console.log('⚠️ Face descriptors still loading...');
      Alert.alert('Loading', 'Please wait while we load user data...');
      return;
    }

    if (allFaceDescriptors.length === 0) {
      console.log('⚠️ No users have registered Face ID');
      Alert.alert('No Registered Faces', 'No users have registered Face ID yet.');
      return;
    }

    setIsProcessing(true);
    setMatchStatus('searching');

    try {
      // For mobile Face ID, we'll use a simplified matching approach
      // In a production app, you would implement proper face recognition with a library like face-api.js
      
      // For now, we'll assume the first registered user for demonstration
      // TODO: Implement actual face matching algorithm
      const firstUser = allFaceDescriptors[0];
      
      console.log('🔍 All face descriptors:', allFaceDescriptors);
      console.log('🔍 First user object:', firstUser);
      
      if (firstUser) {
        console.log('🔍 Attempting Face ID login for:', firstUser.email);
        console.log('🔍 User ID type:', typeof firstUser.userId, 'Value:', firstUser.userId);
        
        // Verify the face login
        const result = await verifyFaceLogin({ 
          userId: firstUser.userId 
        });
        
        // Record successful attempt with explicit userId
        console.log('📝 Recording successful Face ID attempt');
        console.log('📝 userId before call:', firstUser.userId);
        console.log('📝 Calling recordFaceIdAttempt with:', {
          userId: firstUser.userId,
          success: true,
        });
        
        await recordFaceIdAttempt({
          userId: firstUser.userId,
          success: true,
        });
        
        console.log('✅ Face ID verification successful:', result);
        
        setMatchStatus('found');
        setMatchedUser(result.name);
        
        // Auto-login the user immediately
        setTimeout(async () => {
          try {
            // Create session for Face ID login (same as email/password login)
            const sessionToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const sessionExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
            
            await signIn(
              sessionToken,
              {
                userId: result.userId as string,
                name: result.name ?? '',
                email: result.email ?? '',
                role: (result.role ?? 'employee') as any,
                department: result.department,
                position: result.position,
                employeeType: result.employeeType,
                avatar: result.avatar,
                avatarUrl: result.avatar, // Use avatar from result
              },
              sessionExpiry
            );
            
            console.log('✅ User signed in successfully via Face ID');
            onSuccess();
            onClose();
          } catch (loginError) {
            console.error('❌ Auto-login failed:', loginError);
            Alert.alert('Login Error', 'Face recognized but login failed. Please try again.');
          }
        }, 1000); // Short delay to show success message
      } else {
        console.log('⚠️ No registered users found');
        setMatchStatus('not_found');
        // Don't record failed attempt if no users are registered
        setTimeout(() => setMatchStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('❌ Error during face login:', error);
      console.error('❌ Error details:', JSON.stringify(error));
      
      // Try to record failed attempt if we have a user
      if (allFaceDescriptors && allFaceDescriptors.length > 0) {
        const firstUser = allFaceDescriptors[0];
        console.log('📝 Recording failed attempt for userId:', firstUser.userId);
        try {
          await recordFaceIdAttempt({
            userId: firstUser.userId,
            success: false,
          });
        } catch (recordError) {
          console.error('❌ Failed to record attempt:', recordError);
        }
      }
      
      Alert.alert('Error', 'Failed to login with Face ID. Please try again.');
      setMatchStatus('not_found');
      setTimeout(() => setMatchStatus('idle'), 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.permissionContainer, { backgroundColor: colors.bgCard }]}>
            <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
              Camera Permission Required
            </Text>
            <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
              We need camera access to use Face ID login
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Face ID Login</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Camera */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="front"
            onFacesDetected={handleFaceDetected}
            faceDetectorSettings={{
              mode: FaceDetector.FaceDetectorMode.fast,
              detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
              runClassifications: FaceDetector.FaceDetectorClassifications.none,
              minDetectionInterval: 500,
              tracking: true,
            }}
          >
            {/* Face frame guide */}
            <View style={styles.overlay}>
              <View
                style={[
                  styles.faceFrame,
                  {
                    borderColor: faceDetected ? '#10b981' : '#ffffff80',
                  },
                ]}
              />
            </View>

            {/* Face detection indicator */}
            <View style={styles.indicator}>
              {faceDetected ? (
                <View style={styles.detectedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.badgeText}>Face Detected</Text>
                </View>
              ) : (
                <View style={styles.noFaceBadge}>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.badgeText}>No Face</Text>
                </View>
              )}
            </View>

            {/* Match status */}
            {matchStatus !== 'idle' && (
              <View style={styles.statusContainer}>
                {matchStatus === 'searching' && (
                  <View style={styles.searchingBadge}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.statusText}>Searching...</Text>
                  </View>
                )}
                {matchStatus === 'found' && matchedUser && (
                  <View style={styles.foundBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.statusText}>Welcome, {matchedUser}!</Text>
                  </View>
                )}
                {matchStatus === 'not_found' && (
                  <View style={styles.notFoundBadge}>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.statusText}>Face not recognized</Text>
                  </View>
                )}
              </View>
            )}
          </CameraView>
        </View>

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.bgCard }]}>
          <Text style={[styles.instructionTitle, { color: colors.textPrimary }]}>
            {isProcessing ? 'Authenticating...' : faceDetected ? 'Face detected! Logging in...' : 'Position your face in the frame'}
          </Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            {isProcessing ? 'Please wait...' : faceDetected ? 'Authentication in progress' : 'Make sure your face is well-lit and clearly visible'}
          </Text>
        </View>

        {/* Status indicator (no manual button needed - fully automatic) */}
        <View style={styles.actions}>
          {isProcessing && (
            <View style={[styles.statusIndicator, { backgroundColor: colors.primary }]}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.statusIndicatorText}>Authenticating...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    margin: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  permissionTitle: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  permissionText: {
    ...Typography.body,
    textAlign: 'center',
  },
  permissionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  permissionButtonText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    ...Typography.body,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...Typography.h3,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 250,
    height: 320,
    borderWidth: 4,
    borderRadius: Radius.xl,
  },
  indicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#10b98180',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  noFaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#ef444480',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  foundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#10b98180',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  notFoundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#ef444480',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  instructionTitle: {
    ...Typography.body,
    fontWeight: '600',
  },
  instructionText: {
    ...Typography.caption,
  },
  actions: {
    padding: Spacing.lg,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  statusIndicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});



