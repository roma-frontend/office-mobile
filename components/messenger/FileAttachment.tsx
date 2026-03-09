import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface FileAttachmentProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  isOwn: boolean;
}

function getFileIcon(fileType?: string): string {
  if (!fileType) return 'document-outline';
  if (fileType.startsWith('image/')) return 'image-outline';
  if (fileType.startsWith('video/')) return 'videocam-outline';
  if (fileType.startsWith('audio/')) return 'musical-notes-outline';
  if (fileType.includes('pdf')) return 'document-text-outline';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'grid-outline';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'easel-outline';
  return 'document-outline';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileAttachment({ fileUrl, fileName, fileType, fileSize, isOwn }: FileAttachmentProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    Linking.openURL(fileUrl);
  };

  const iconColor = isOwn ? 'rgba(255,255,255,0.8)' : colors.primary;
  const textColor = isOwn ? '#fff' : colors.textPrimary;
  const mutedColor = isOwn ? 'rgba(255,255,255,0.6)' : colors.textMuted;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: isOwn ? 'rgba(255,255,255,0.15)' : colors.primary + '22' }]}>
        <Ionicons name={getFileIcon(fileType) as any} size={22} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{fileName}</Text>
        {fileSize ? (
          <Text style={[styles.fileSize, { color: mutedColor }]}>{formatFileSize(fileSize)}</Text>
        ) : null}
      </View>
      <Ionicons name="download-outline" size={18} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  iconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  fileName: { ...Typography.captionMedium },
  fileSize: { ...Typography.label, marginTop: 1 },
});
