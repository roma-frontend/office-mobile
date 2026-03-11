import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import type { Id } from '../../convex/_generated/dataModel';

const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#60a5fa'];

interface MentionDropdownProps {
  query: string;
  participants: {
    userId: Id<"users">;
    userName: string;
    userAvatarUrl?: string;
    userDepartment?: string;
  }[];
  onSelect: (userId: Id<"users">, userName: string) => void;
}

export default function MentionDropdown({ query, participants, onSelect }: MentionDropdownProps) {
  const { colors } = useTheme();

  const filtered = participants.filter((p) =>
    p.userName.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {filtered.slice(0, 5).map((p) => {
        const avatarColor = AVATAR_COLORS[(p.userName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
        const initials = p.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        return (
          <TouchableOpacity
            key={p.userId}
            style={styles.item}
            onPress={() => onSelect(p.userId, p.userName)}
          >
            {p.userAvatarUrl ? (
              <Image source={{ uri: p.userAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{p.userName}</Text>
              {p.userDepartment && (
                <Text style={[styles.dept, { color: colors.textMuted }]}>{p.userDepartment}</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden',
    marginHorizontal: 12, marginBottom: 4,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  avatar: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  name: { ...Typography.captionMedium },
  dept: { ...Typography.label },
});
