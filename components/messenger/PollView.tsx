import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface PollViewProps {
  pollId: Id<"polls">;
  userId: Id<"users">;
}

export default function PollView({ pollId, userId }: PollViewProps) {
  const { colors } = useTheme();
  const poll = useQuery(api.polls.getPollResults, { pollId });
  const votePoll = useMutation(api.polls.votePoll);
  const closePoll = useMutation(api.polls.closePoll);

  if (!poll) return <ActivityIndicator size="small" color={colors.primary} />;

  const myVote = poll.results.find((r) => r.voterIds.includes(userId));
  const hasVoted = !!myVote;

  const handleVote = async (optionId: string) => {
    try {
      await votePoll({ pollId, userId, optionId });
    } catch {}
  };

  const handleClose = async () => {
    try {
      await closePoll({ pollId, userId });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart-outline" size={14} color={colors.primary} />
        <Text style={[styles.question, { color: colors.textPrimary }]}>{poll.question}</Text>
      </View>

      {poll.results.map((option) => {
        const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
        const isMyVote = option.voterIds.includes(userId);

        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.option, { borderColor: isMyVote ? colors.primary : colors.border }]}
            onPress={() => !poll.isClosed && handleVote(option.id)}
            disabled={poll.isClosed}
          >
            {/* Background fill */}
            <View
              style={[styles.optionFill, { width: `${pct}%`, backgroundColor: isMyVote ? colors.primary + '33' : colors.primary + '11' }]}
            />
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>{option.text}</Text>
            {hasVoted && (
              <Text style={[styles.optionPct, { color: colors.textMuted }]}>{pct}%</Text>
            )}
            {isMyVote && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
          </TouchableOpacity>
        );
      })}

      <View style={styles.footer}>
        <Text style={[styles.voteCount, { color: colors.textMuted }]}>
          {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
          {poll.isClosed ? ' · Closed' : ''}
        </Text>
        {!poll.isClosed && poll.createdBy === userId && (
          <TouchableOpacity onPress={handleClose}>
            <Text style={[styles.closeBtn, { color: colors.error }]}>Close Poll</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, minWidth: 200 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  question: { ...Typography.bodySemiBold, flex: 1 },
  option: {
    borderRadius: Radius.sm, borderWidth: 1, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 6,
  },
  optionFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radius.sm },
  optionText: { ...Typography.caption, flex: 1, zIndex: 1 },
  optionPct: { ...Typography.label, zIndex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  voteCount: { ...Typography.label },
  closeBtn: { ...Typography.label },
});
