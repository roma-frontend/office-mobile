import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

import { Typography, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

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
    <View style={[styles.container, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.question, { color: colors.textPrimary }]} numberOfLines={2}>{poll.question}</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {poll.results.map((option, index) => {
          const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
          const isMyVote = option.voterIds.includes(userId);
          const isSelected = hasVoted && isMyVote;
          const showProgress = pct > 0;

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.option,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary + '08' : colors.background,
                  minHeight: 44,
                }
              ]}
              onPress={() => !poll.isClosed && handleVote(option.id)}
              disabled={poll.isClosed}
              activeOpacity={poll.isClosed ? 1 : 0.7}
            >
              {/* Background progress bar */}
              {showProgress && (
                <View
                  style={[
                    styles.optionFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: isSelected ? colors.primary + '25' : colors.primary + '15',
                    }
                  ]}
                />
              )}
              {/* Content */}
              <View style={styles.optionContent}>
                <View style={styles.optionLeft}>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.checkIcon} />}
                  <Text style={[styles.optionText, { color: colors.textPrimary, fontWeight: isSelected ? '600' : '400' }]} numberOfLines={2}>
                    {option.text}
                  </Text>
                </View>
                {hasVoted && (
                  <Text style={[styles.optionPct, { color: isSelected ? colors.primary : colors.textMuted }]}>
                    {pct}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border + '40' }]}>
        <View style={styles.footerLeft}>
          <Ionicons name="people-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.voteCount, { color: colors.textMuted }]}>
            {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
          </Text>
        </View>
        {!poll.isClosed && poll.createdBy === userId && (
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.error} />
            <Text style={[styles.closeBtn, { color: colors.error }]}>Close</Text>
          </TouchableOpacity>
        )}
        {poll.isClosed && (
          <View style={styles.closedBadge}>
            <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
            <Text style={[styles.closedText, { color: colors.textMuted }]}>Closed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
    minWidth: 240,
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingRight: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shrink: 0,
  },
  question: {
    ...Typography.bodySemiBold,
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  optionsContainer: {
    gap: Spacing.xs,
  },
  option: {
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  optionFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radius.sm,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
    zIndex: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  checkIcon: {
    shrink: 0,
  },
  optionText: {
    ...Typography.caption,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  optionPct: {
    ...Typography.label,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
    shrink: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteCount: {
    ...Typography.label,
    fontSize: 11,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  closeBtn: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '600',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  closedText: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '500',
  },
});
