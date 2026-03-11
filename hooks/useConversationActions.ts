// Хук для действий с переписками
import { useMutation } from 'convex/react';
import { useCallback } from 'react';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export function useConversationActions(userId: Id<'users'>) {
  const pinConversation = useMutation(api.messenger.pinConversation);
  const archiveConversation = useMutation(api.messenger.archiveConversation);
  const deleteConversation = useMutation(api.messenger.deleteConversation);
  const toggleMute = useMutation(api.messenger.toggleMute);

  const handlePin = useCallback(async (conversationId: Id<'chatConversations'>, pin: boolean) => {
    await pinConversation({ conversationId, userId, pin });
  }, [pinConversation, userId]);

  const handleArchive = useCallback(async (conversationId: Id<'chatConversations'>, archive: boolean) => {
    await archiveConversation({ conversationId, userId, archive });
  }, [archiveConversation, userId]);

  const handleDelete = useCallback(async (conversationId: Id<'chatConversations'>) => {
    await deleteConversation({ conversationId, userId });
  }, [deleteConversation, userId]);

  const handleToggleMute = useCallback(async (conversationId: Id<'chatConversations'>) => {
    await toggleMute({ conversationId, userId });
  }, [toggleMute, userId]);

  return {
    handlePin,
    handleArchive,
    handleDelete,
    handleToggleMute,
  };
}
