import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '@/context/ThemeContext';
import { Typography, Radius } from '@/constants/theme';

// Import WebRTC if available (will be available after native build)
let RTCPeerConnection: any = null;
let MediaStream: any = null;
let RTCSessionDescription: any = null;
let RTCIceCandidate: any = null;

if (Platform.OS !== 'web') {
  try {
    const webRTC = require('react-native-webrtc');
    RTCPeerConnection = webRTC.RTCPeerConnection;
    MediaStream = webRTC.MediaStream;
    RTCSessionDescription = webRTC.RTCSessionDescription;
    RTCIceCandidate = webRTC.RTCIceCandidate;
  } catch (e) {
    console.warn('react-native-webrtc not available:', e);
  }
}

interface CallModalProps {
  visible: boolean;
  callType: 'audio' | 'video';
  conversationId: Id<"chatConversations">;
  currentUserId: Id<"users">;
  remoteUserId?: Id<"users">;
  remoteUserName?: string;
  remoteUserAvatar?: string;
  onClose: () => void;
}

const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#60a5fa'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// STUN/TURN servers configuration (same as web version)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  {
    urls: 'turn:global.relay.metered.ca:80',
    username: 'ac986faa3d8fec75bb7c4aff',
    credential: 'WOCnG2giai1RFd3N',
  },
  {
    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
    username: 'ac986faa3d8fec75bb7c4aff',
    credential: 'WOCnG2giai1RFd3N',
  },
  {
    urls: 'turn:global.relay.metered.ca:443',
    username: 'ac986faa3d8fec75bb7c4aff',
    credential: 'WOCnG2giai1RFd3N',
  },
  {
    urls: 'turns:global.relay.metered.ca:443?transport=tcp',
    username: 'ac986faa3d8fec75bb7c4aff',
    credential: 'WOCnG2giai1RFd3N',
  },
];

export default function CallModal({
  visible,
  callType,
  conversationId,
  currentUserId,
  remoteUserId,
  remoteUserName,
  remoteUserAvatar,
  onClose,
}: CallModalProps) {
  const { colors, isDark } = useTheme();
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === 'video');
  const [speakerOn, setSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  const peerConnection = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);
  const durationTimer = useRef<any>(null);

  const startCall = useMutation(api.messenger.startCall);
  const endCall = useMutation(api.messenger.endCall);
  const updatePresenceStatus = useMutation(api.users.updatePresenceStatus);

  // Get conversation info for remote user
  const convInfo = useQuery(
    api.messenger.getConversationInfo,
    conversationId ? { conversationId, userId: currentUserId } : 'skip'
  );

  const remoteUser = convInfo?.participants?.find((p) => p.userId !== currentUserId);
  const displayName = remoteUserName || remoteUser?.userName || 'Unknown';
  const displayAvatar = remoteUserAvatar || remoteUser?.userAvatarUrl;

  // Initialize call
  useEffect(() => {
    if (visible) {
      initializeCall();
    }
    return () => {
      cleanup();
    };
  }, [visible]);

  const initializeCall = async () => {
    try {
      // Check if WebRTC is available
      if (!RTCPeerConnection || !MediaStream) {
        setCallError('WebRTC not available. Please rebuild the app with native modules.');
        return;
      }

      // Set status to in_call
      await updatePresenceStatus({ userId: currentUserId, presenceStatus: 'in_call', outOfOfficeMessage: undefined });

      // Start the call record
      await startCall({
        conversationId,
        initiatorId: currentUserId,
        callType,
      });

      // Request media permissions
      await requestMediaStream();

      // Initialize peer connection
      initializePeerConnection();

      setCallStatus('ringing');

      // Simulate call flow (in production, use signaling server via Convex)
      setTimeout(() => {
        setCallStatus('active');
        startDurationTimer();
      }, 3000);
    } catch (e: any) {
      console.error('Call initialization error:', e);
      setError(e.message || 'Failed to initialize call');
      setCallStatus('ended');
    }
  };

  const requestMediaStream = async () => {
    if (Platform.OS === 'web') {
      // Web: use standard getUserMedia
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: 640, height: 480 } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return;
    }

    // Native: use react-native-webrtc
    if (!RTCPeerConnection || !MediaStream) {
      throw new Error('WebRTC not available. Please rebuild the app with native modules.');
    }

    const constraints: any = {
      audio: true,
      video: callType === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false,
    };

    // For native, we need to use MediaDevices.getUserMedia from react-native-webrtc
    // This requires additional setup in native modules
    const stream = await MediaStream.createStream(constraints);
    setLocalStream(stream);
  };

  const initializePeerConnection = () => {
    if (!RTCPeerConnection) {
      console.warn('RTCPeerConnection not available');
      return;
    }

    try {
      peerConnection.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track: any) => {
          peerConnection.current.addTrack(track, localStream);
        });
      }

      // Handle remote stream
      peerConnection.current.ontrack = (event: any) => {
        setRemoteStream(event.streams[0]);
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event: any) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate);
          // Send to remote peer via signaling server (Convex)
        }
      };

      // Handle connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        const state = peerConnection.current.connectionState;
        console.log('Connection state:', state);
        if (state === 'connected') {
          setCallStatus('active');
          startDurationTimer();
        } else if (state === 'disconnected' || state === 'failed') {
          handleEnd();
        }
      };

      // Create offer for initiator
      if (callStatus === 'ringing') {
        createOffer();
      }
    } catch (e) {
      console.error('Peer connection error:', e);
      setError('Failed to establish connection');
    }
  };

  const createOffer = async () => {
    if (!peerConnection.current) return;

    try {
      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await peerConnection.current.setLocalDescription(offer);
      // Send offer to remote peer via signaling server
    } catch (e) {
      console.error('Create offer error:', e);
    }
  };

  const startDurationTimer = () => {
    if (durationTimer.current) return;
    durationTimer.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const cleanup = useCallback(async () => {
    // Stop duration timer
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Reset status
    await updatePresenceStatus({ userId: currentUserId, presenceStatus: 'available', outOfOfficeMessage: undefined });
  }, [localStream, currentUserId, updatePresenceStatus]);

  const handleEnd = async () => {
    setCallStatus('ended');
    await cleanup();
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamOn(videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    setSpeakerOn(!speakerOn);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const avatarColor = AVATAR_COLORS[(displayName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  const initials = getInitials(displayName);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#1a1a2e' }]}>
          {/* Video area for video calls */}
          {callType === 'video' && (
            <View style={styles.videoContainer}>
              {/* Remote video */}
              <View style={styles.remoteVideo}>
                {remoteStream ? (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoText}>Remote video (WebRTC)</Text>
                  </View>
                ) : (
                  <View style={styles.avatarContainer}>
                    {displayAvatar ? (
                      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                    )}
                    <Text style={[styles.remoteName, { color: '#fff' }]}>{displayName}</Text>
                  </View>
                )}
              </View>

              {/* Local video (PiP) */}
              <View style={styles.localVideo}>
                {localStream && camOn ? (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoText}>Local video</Text>
                  </View>
                ) : (
                  <View style={[styles.videoPlaceholder, { backgroundColor: '#333' }]}>
                    <Ionicons name="videocam-off" size={24} color="#666" />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Audio call UI */}
          {callType === 'audio' && (
            <View style={styles.audioContainer}>
              <View style={[styles.avatarLarge, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarLargeText}>{initials}</Text>
              </View>
              <Text style={[styles.remoteNameLarge, { color: '#fff' }]}>{displayName}</Text>
              <Text style={[styles.callStatus, { color: callStatus === 'active' ? '#4ade80' : '#fbbf24' }]}>
                {callStatus === 'active' ? formatDuration(duration) : callStatus}
              </Text>
            </View>
          )}

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {/* Mute */}
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: micOn ? '#333' : '#ef4444' }]} onPress={toggleMic}>
              <Ionicons name={micOn ? 'mic' : 'mic-off'} size={24} color="#fff" />
              <Text style={styles.controlText}>{micOn ? 'Mute' : 'Unmute'}</Text>
            </TouchableOpacity>

            {/* Camera toggle for video calls */}
            {callType === 'video' && (
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: camOn ? '#333' : '#ef4444' }]} onPress={toggleCam}>
                <Ionicons name={camOn ? 'videocam' : 'videocam-off'} size={24} color="#fff" />
                <Text style={styles.controlText}>{camOn ? 'Camera Off' : 'Camera On'}</Text>
              </TouchableOpacity>
            )}

            {/* Speaker */}
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: speakerOn ? '#333' : '#666' }]} onPress={toggleSpeaker}>
              <Ionicons name={speakerOn ? 'volume-high' : 'volume-mute'} size={24} color="#fff" />
              <Text style={styles.controlText}>Speaker</Text>
            </TouchableOpacity>

            {/* End call */}
            <TouchableOpacity style={[styles.endCallBtn, { backgroundColor: '#ef4444' }]} onPress={handleEnd}>
              <Ionicons name="phone-portrait" size={32} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* WebRTC notice */}
          <View style={styles.noticeContainer}>
            <Ionicons name="information-circle" size={16} color="#94a3b8" />
            <Text style={styles.noticeText}>
              {Platform.OS === 'web' 
                ? 'WebRTC enabled for web' 
                : 'Native build required for full WebRTC support'}
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Video call
  videoContainer: { flex: 1, position: 'relative' },
  remoteVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  localVideo: {
    position: 'absolute', bottom: 140, right: 16,
    width: 100, height: 140, borderRadius: 12,
    overflow: 'hidden', borderWidth: 2, borderColor: '#fff',
  },
  videoPlaceholder: {
    flex: 1, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  videoText: { color: '#94a3b8', fontSize: 12 },

  // Audio call
  audioContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  avatarLarge: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { fontSize: 40, fontWeight: '700', color: '#fff' },
  remoteNameLarge: { ...Typography.h2, color: '#fff' },
  callStatus: { ...Typography.body, marginTop: 8 },

  // Avatar
  avatarContainer: { alignItems: 'center', gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  remoteName: { ...Typography.h3, color: '#fff' },

  // Error
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: '#ef444422', borderRadius: Radius.md,
    marginHorizontal: 24, marginBottom: 16,
  },
  errorText: { color: '#ef4444', ...Typography.body },

  // Controls
  controlsContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingHorizontal: 24, paddingVertical: 24,
  },
  controlBtn: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  controlText: { color: '#fff', fontSize: 10 },
  endCallBtn: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },

  // Notice
  noticeContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center', paddingVertical: 12,
  },
  noticeText: { color: '#94a3b8', fontSize: 11 },
});
