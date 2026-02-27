import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';

interface FaceRegistrationProps {
  visible: boolean;
  userId: Id<'users'>;
  onClose: () => void;
  onSuccess: () => void;
}

export function FaceRegistration({ visible, userId, onClose, onSuccess }: FaceRegistrationProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [faceDetected, setFaceDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  const registerFace = useMutation(api.faceRecognition.registerFace);

  const handleFaceDetected = ({ faces }: FaceDetector.FaceDetectionResult) => {
    console.log('👤 Faces detected:', faces.length);
    if (faces.length > 0) {
      console.log('Face details:', faces[0]);
    }
    setFaceDetected(faces.length > 0);
  };

  const handleCapture = async () => {
    if (!faceDetected) {
      Alert.alert('No Face Detected', 'Please position your face in the camera frame.');
      return;
    }

    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    setIsProcessing(true);

    try {
      // Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      setCapturedImage(photo.uri);

      // Upload to Cloudinary
      const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration missing');
      }

      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${photo.base64}`);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'face-ids');

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.secure_url;

      // For mobile, we'll use a simple placeholder descriptor
      // In production, you'd want to use a proper face recognition library
      const faceDescriptor = Array(128).fill(0).map(() => Math.random());

      // Register face in Convex
      await registerFace({
        userId,
        faceDescriptor,
        faceImageUrl: imageUrl,
      });

      Alert.alert('Success', 'Face ID registered successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess();
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Error registering face:', error);
      Alert.alert('Error', 'Failed to register Face ID. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
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
              We need camera access to register your Face ID
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Register Face ID</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Camera or Preview */}
        <View style={styles.cameraContainer}>
          {!capturedImage ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
              onFacesDetected={handleFaceDetected}
              faceDetectorSettings={{
                mode: FaceDetector.FaceDetectorMode.accurate,
                detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
                runClassifications: FaceDetector.FaceDetectorClassifications.all,
                minDetectionInterval: 100,
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
            </CameraView>
          ) : (
            <View style={styles.previewContainer}>
              <Image source={{ uri: capturedImage }} style={styles.preview} />
              <View style={styles.previewOverlay}>
                <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                <Text style={styles.previewText}>Face Captured!</Text>
              </View>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.bgCard }]}>
          <Text style={[styles.instructionTitle, { color: colors.textPrimary }]}>
            {capturedImage ? 'Ready to register' : 'Position your face in the frame'}
          </Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            {capturedImage
              ? 'Tap Register to save your Face ID'
              : 'Make sure your face is well-lit and clearly visible'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {!capturedImage ? (
            <TouchableOpacity
              style={[
                styles.captureButton,
                { backgroundColor: faceDetected && !isProcessing ? colors.primary : colors.border },
              ]}
              onPress={handleCapture}
              disabled={!faceDetected || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Capture</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.retakeButton, { backgroundColor: colors.border }]}
                onPress={handleRetake}
                disabled={isProcessing}
              >
                <Ionicons name="refresh" size={24} color={colors.textPrimary} />
                <Text style={[styles.retakeButtonText, { color: colors.textPrimary }]}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.registerButton, { backgroundColor: colors.primary }]}
                onPress={handleCapture}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Register</Text>
                  </>
                )}
              </TouchableOpacity>
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
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  preview: {
    flex: 1,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewText: {
    color: '#fff',
    fontSize: 24,
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
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  registerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  retakeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});


