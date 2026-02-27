import { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FileAttachment = { name: string; uri: string; size: number; mimeType: string };

type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#10b981', medium: '#f59e0b', high: '#ef4444', urgent: '#3b82f6',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#3b82f6', in_progress: '#f59e0b', review: '#06b6d4', completed: '#10b981',
};

const STATUS_ICONS: Record<TaskStatus, string> = {
  pending: 'time', in_progress: 'play-circle', review: 'checkmark-circle', completed: 'checkmark-done-circle',
};

const FILTERS = ['All', 'Pending', 'In Progress', 'Review', 'Completed'];

export default function Tasks() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('employee');

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => setUserId(id));
    AsyncStorage.getItem('user_name').then(name => setUserName(name ?? ''));
    AsyncStorage.getItem('user_role').then(role => setUserRole(role ?? 'employee'));
  }, []);

  const isAdmin = userRole === 'admin' || userRole === 'supervisor';

  // State for attachments
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [detailUploadingFiles, setDetailUploadingFiles] = useState<Set<string>>(new Set());

  // Data queries
  const allUsers = useQuery(api.users.getAllUsers, userId ? { requesterId: userId as any } : 'skip');
  const myTasks = useQuery(
    api.tasks.getTasksForEmployee,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  );
  const teamTasks = useQuery(
    api.tasks.getTeamTasks,
    isAdmin && userId ? { supervisorId: userId as Id<'users'> } : 'skip'
  );

  // Mutations
  const createTask = useMutation(api.tasks.createTask);
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);
  const addComment = useMutation(api.tasks.addComment);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const addAttachment = useMutation(api.tasks.addAttachment);
  const removeAttachment = useMutation(api.tasks.removeAttachment);

  // List state
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentingTaskId, setCommentingTaskId] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Create task modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskTags, setTaskTags] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState<string | null>(null);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const usersForAssignment = useQuery(api.tasks.getUsersForAssignment);

  const tasksSource = isAdmin ? (teamTasks ?? []) : (myTasks ?? []);

  // Sync selectedTask with live Convex query data so attachments/comments update in real-time
  useEffect(() => {
    if (!selectedTask) return;
    const updated = tasksSource.find((t: any) => t._id === selectedTask._id);
    if (updated) setSelectedTask(updated);
  }, [tasksSource]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: tasksSource.length,
      pending: tasksSource.filter(t => t.status === 'pending').length,
      in_progress: tasksSource.filter(t => t.status === 'in_progress').length,
      review: tasksSource.filter(t => t.status === 'review').length,
      completed: tasksSource.filter(t => t.status === 'completed').length,
      overdue: tasksSource.filter(t => t.deadline && t.deadline < now && t.status !== 'completed').length,
    };
  }, [tasksSource]);

  // Filter tasks
  const filtered = useMemo(() => {
    return tasksSource.filter(t => {
      const statusMap: Record<string, TaskStatus> = {
        'All': t.status as TaskStatus,
        'Pending': 'pending',
        'In Progress': 'in_progress',
        'Review': 'review',
        'Completed': 'completed',
      };
      const targetStatus = statusMap[filter];
      return filter === 'All' || t.status === targetStatus;
    });
  }, [tasksSource, filter]);

  const handleAddFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: FileAttachment[] = result.assets.map(asset => ({
          name: asset.name,
          uri: asset.uri,
          size: asset.size ?? 0,
          mimeType: asset.mimeType ?? 'application/octet-stream',
        }));
        setAttachments(prev => [...prev, ...newFiles]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to pick file');
    }
  };

  const uploadFileToCloudinary = async (file: FileAttachment): Promise<{ url: string; size: number } | null> => {
    try {
      const cloudName = 'dsfbt0q1y';
      const uploadPreset = 'ml_default';
      
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        type: file.mimeType || 'application/octet-stream',
        name: file.name,
      } as any);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'hr-office/task-attachments');
      
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || 'Upload failed');
      }
      const data = await res.json();
      return { url: data.secure_url, size: data.bytes || file.size };
    } catch (e: any) {
      console.error('Upload error:', e);
      Alert.alert('Upload Error', e?.message || 'Failed to upload file');
      return null;
    }
  };

 const handleRemoveAttachment = (index: number) => {
   setAttachments(prev => prev.filter((_, i) => i !== index));
 };

 const handleCreateTask = async () => {
    if (!taskTitle.trim()) { Alert.alert('Error', 'Please enter a task title'); return; }
    if (!userId) { Alert.alert('Error', 'Session expired'); return; }
    if (!taskAssignedTo) { Alert.alert('Error', 'Please select who to assign the task to'); return; }
    setCreateSubmitting(true);
    try {
      const taskId = await createTask({
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        assignedTo: taskAssignedTo as Id<'users'>,
        assignedBy: userId as Id<'users'>,
        priority: taskPriority,
        deadline: taskDeadline ? new Date(taskDeadline).getTime() : undefined,
        tags: taskTags.trim() ? taskTags.split(',').map(t => t.trim()) : undefined,
      });

      // Upload attachments to Cloudinary and add them to the task
      if (attachments.length > 0) {
        for (const file of attachments) {
          setUploadingFiles(prev => new Set([...prev, file.name]));
          try {
            const uploadedFile = await uploadFileToCloudinary(file);
            if (uploadedFile) {
              await addAttachment({
                taskId,
                url: uploadedFile.url,
                name: file.name,
                type: file.mimeType,
                size: uploadedFile.size,
                uploadedBy: userId as Id<'users'>,
              });
            }
          } catch (err: any) {
            console.error(`Failed to upload ${file.name}:`, err);
          } finally {
            setUploadingFiles(prev => {
              const next = new Set(prev);
              next.delete(file.name);
              return next;
            });
          }
        }
      }

      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setTaskDeadline('');
      setTaskTags('');
      setTaskAssignedTo(null);
      setAttachments([]);
      setShowCreateModal(false);
      Alert.alert('Success', 'Task created successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create task');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleStatusChange = async (task: any, newStatus: TaskStatus) => {
    if (!userId) return;
    try {
      await updateTaskStatus({
        taskId: task._id,
        status: newStatus,
        userId: userId as Id<'users'>,
      });
      Alert.alert('Success', `Task status updated to ${newStatus}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update status');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask || !userId) return;
    try {
      await addComment({
        taskId: selectedTask._id,
        authorId: userId as Id<'users'>,
        content: newComment.trim(),
      });
      setNewComment('');
      setSelectedTask({ ...selectedTask, comments: [...(selectedTask.comments ?? []), { content: newComment.trim(), author: { name: userName } }] });
      Alert.alert('Success', 'Comment added');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add comment');
    }
  };

  const handleDeleteTask = async (taskId: Id<'tasks'>) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteTask({ taskId });
          Alert.alert('Success', 'Task deleted');
        } catch (e: any) {
          Alert.alert('Error', e?.message ?? 'Failed to delete');
        }
      }},
    ]);
  };

  // Create user lookup map for assignee names and avatars
 const userMap = useMemo(() => {
   if (!allUsers) return {};
   return allUsers.reduce((map: Record<string, any>, user: any) => {
     map[user._id] = user;
     return map;
   }, {});
 }, [allUsers]);

 const isLoading = isAdmin ? teamTasks === undefined : myTasks === undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{isAdmin ? 'Team Tasks' : 'My Tasks'}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{stats.total} tasks · {stats.overdue} overdue</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={styles.addBtn} onPress={() => { setShowCreateModal(true); setShowAssignPicker(false); }}>
              <LinearGradient colors={isDark ? ['#3b82f6'Dark, '#3b82f6'] : ['#3b82f6'Dark, '#3b82f6']} style={styles.addBtnGrad}>
                <Ionicons name="add" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: '#3b82f6' },
          { label: 'Pending', value: stats.pending, color: '#3b82f6' },
          { label: 'In Progress', value: stats.in_progress, color: '#f59e0b' },
          { label: 'Review', value: stats.review, color: '#06b6d4' },
          { label: 'Completed', value: stats.completed, color: '#10b981' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { borderColor: s.color + '44', backgroundColor: colors.bgCard }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
        contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingRight: 8, paddingVertical: 4 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.bgCard }, filter === f && [styles.filterChipActive, { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive, filter !== f && { color: colors.textMuted }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tasks list */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={'#3b82f6'} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={[styles.centered, { paddingBottom: bottomOffset }]}>
          <Ionicons name="checkmark-done-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks found</Text>
          <Text style={[styles.emptySubText, { color: colors.textMuted }]}>{filter === 'All' ? 'All tasks completed!' : 'No tasks in this status'}</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomOffset + 16, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={'#3b82f6'}
              colors={['#3b82f6']}
            />
          }
        >
          {filtered.map(task => {
            const pc = PRIORITY_COLORS[task.priority as TaskPriority] ?? '#3b82f6';
            const sc = STATUS_COLORS[task.status as TaskStatus] ?? colors.textMuted;
            const si = STATUS_ICONS[task.status as TaskStatus] ?? 'help-circle';
            const isOverdue = task.deadline && task.deadline < Date.now() && task.status !== 'completed';
            return (
              <TouchableOpacity key={task._id} activeOpacity={0.85}
                onPress={() => { setSelectedTask(task); setShowDetailModal(true); }}
                style={[styles.taskCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={[styles.taskColorBar, { backgroundColor: pc }]} />
                <View style={styles.taskCardInner}>
                  {/* Top row */}
                  <View style={styles.taskTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={1}>{task.title}</Text>
                      {task.description && <Text style={[styles.taskDesc, { color: colors.textMuted }]} numberOfLines={1}>{task.description}</Text>}
                      
                      {/* Assignee info */}
                      {(() => {
                        const assignee = userMap[task.assignedTo as string] ?? (task as any).assignedByUser;
                        if (!assignee) return null;
                        const initials = assignee.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U';
                        return (
                          <View style={styles.assigneeRow}>
                            <View style={styles.avatarInitials}>
                              <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                            <Text style={[styles.assigneeName, { color: colors.textMuted }]} numberOfLines={1}>{assignee.name || 'Unknown'}</Text>
                          </View>
                        );
                      })()}
                      
                      {task.tags && task.tags.length > 0 && (
                        <View style={styles.tagsRow}>
                          {task.tags.slice(0, 2).map((tag: string, i: number) => (
                            <View key={i} style={[styles.tag, { backgroundColor: colors.bgCard }]}>
                              <Text style={[styles.tagText, { color: colors.textMuted }]}>{tag}</Text>
                            </View>
                          ))}
                          {task.tags.length > 2 && <Text style={[styles.tagText, { color: colors.textMuted }]}>+{task.tags.length - 2}</Text>}
                        </View>
                      )}
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: pc + '22' }]}>
                      <Text style={[styles.priorityText, { color: pc }]}>{task.priority.charAt(0).toUpperCase()}</Text>
                    </View>
                  </View>

                  {/* Bottom row */}
                  <View style={styles.taskBottom}>
                    <View style={[styles.statusBadge, { backgroundColor: sc + '22' }]}>
                      <Ionicons name={si as any} size={12} color={sc} />
                      <Text style={[styles.statusText, { color: sc }]}>
                        {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                      </Text>
                    </View>
                    {task.deadline && (
                      <Text style={[styles.deadline, { color: isOverdue ? '#ef4444' : colors.textMuted }]}>
                        {new Date(task.deadline).toLocaleDateString()}
                      </Text>
                    )}
                    {(task as any).commentCount > 0 && (
                      <View style={styles.commentCount}>
                        <Ionicons name="chatbox-outline" size={12} color={colors.textMuted} />
                        <Text style={[styles.commentCountText, { color: colors.textMuted }]}>{(task as any).commentCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Create Task Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom + 16, 36), backgroundColor: colors.bgCard, maxHeight: '92%' }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Create Task</Text>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Title *</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} placeholder="Task title..."
                  placeholderTextColor={colors.textMuted} value={taskTitle} onChangeText={setTaskTitle} />

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Description</Text>
                <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 10, backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Task description..." placeholderTextColor={colors.textMuted}
                  value={taskDescription} onChangeText={setTaskDescription} multiline />

                {/* Assign To */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Assign To *</Text>
                <TouchableOpacity
                  style={[styles.fieldInput, { backgroundColor: colors.bg, borderColor: taskAssignedTo ? '#3b82f6' : colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => setShowAssignPicker(v => !v)}
                  activeOpacity={0.8}
                >
                  {taskAssignedTo ? (() => {
                    const user = usersForAssignment?.find((u: any) => u._id === taskAssignedTo);
                    const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?';
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.avatarInitials, { backgroundColor: '#3b82f6' }]}>
                          <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.assigneeName, { color: colors.textPrimary, fontSize: 14 }]}>{user?.name || 'Unknown'}</Text>
                          {user?.position && <Text style={[styles.assigneeName, { color: colors.textMuted, fontSize: 11 }]}>{user.position}</Text>}
                        </View>
                      </View>
                    );
                  })() : (
                    <Text style={[styles.assigneeName, { color: colors.textMuted, fontSize: 14 }]}>Select employee...</Text>
                  )}
                  <Ionicons name={showAssignPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {showAssignPicker && (
                  <View style={[styles.assignPickerList, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    {!usersForAssignment ? (
                      <ActivityIndicator color={'#3b82f6'} style={{ padding: 16 }} />
                    ) : usersForAssignment.length === 0 ? (
                      <Text style={[styles.noComments, { color: colors.textMuted }]}>No employees found</Text>
                    ) : (
                      usersForAssignment.map((user: any) => {
                        const initials = user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?';
                        const isSelected = taskAssignedTo === user._id;
                        return (
                          <TouchableOpacity
                            key={user._id}
                            style={[styles.assignPickerItem, { borderBottomColor: colors.border }, isSelected && { backgroundColor: '#3b82f6' + '15' }]}
                            onPress={() => { setTaskAssignedTo(user._id); setShowAssignPicker(false); }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.avatarInitials, { backgroundColor: isSelected ? '#3b82f6' : '#3b82f6' }]}>
                              <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.assigneeName, { color: colors.textPrimary, fontSize: 14, fontWeight: isSelected ? '700' : '400' }]}>{user.name}</Text>
                              {(user.position || user.department) && (
                                <Text style={[styles.assigneeName, { color: colors.textMuted, fontSize: 11 }]}>{[user.position, user.department].filter(Boolean).join(' · ')}</Text>
                              )}
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={18} color={'#3b82f6'} />}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}

                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 4 }]}>Priority</Text>
                <View style={styles.priorityGrid}>
                  {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(p => (
                    <TouchableOpacity key={p} onPress={() => setTaskPriority(p)}
                      style={[styles.priorityChip, { backgroundColor: colors.bg, borderColor: colors.border }, taskPriority === p && { borderColor: PRIORITY_COLORS[p], backgroundColor: PRIORITY_COLORS[p] + '22' }]}>
                      <Text style={[styles.priorityChipText, { color: colors.textMuted }, taskPriority === p && { color: PRIORITY_COLORS[p] }]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Deadline</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted} value={taskDeadline}
                  onChangeText={v => setTaskDeadline(v.replace(/[^0-9-]/g, ''))}
                  keyboardType="numbers-and-punctuation" maxLength={10} />

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Tags (comma separated)</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]} placeholder="e.g. urgent, design, review"
                  placeholderTextColor={colors.textMuted} value={taskTags} onChangeText={setTaskTags} />

                {/* Attachments Section */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Attachments</Text>
                <TouchableOpacity style={[styles.attachmentButton, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={handleAddFile} disabled={createSubmitting}>
                  <Ionicons name="cloud-upload-outline" size={20} color={'#3b82f6'} />
                  <Text style={[styles.attachmentButtonText, { color: '#3b82f6' }]}>Add File</Text>
                </TouchableOpacity>
                {attachments.length > 0 && (
                  <View style={styles.attachmentsContainer}>
                    {attachments.map((file, idx) => {
                      const isUploading = uploadingFiles.has(file.name);
                      const getFileIcon = (mimeType: string) => {
                        if (mimeType.includes('image')) return 'image-outline';
                        if (mimeType.includes('pdf')) return 'document-text-outline';
                        return 'attach-outline';
                      };
                      return (
                        <View key={idx} style={[styles.attachmentChip, { backgroundColor: colors.bg, borderColor: colors.border }, isUploading && { opacity: 0.6 }]}>
                          <Ionicons name={getFileIcon(file.mimeType) as any} size={14} color={colors.textSecondary} />
                          <Text style={[styles.attachmentFileName, { color: colors.textMuted }]} numberOfLines={1}>{file.name}</Text>
                          {isUploading ? (
                            <ActivityIndicator size="small" color={'#3b82f6'} />
                          ) : (
                            <TouchableOpacity onPress={() => handleRemoveAttachment(idx)} style={styles.attachmentRemove}>
                              <Ionicons name="close" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

              </ScrollView>

              <View style={[styles.modalActions, { marginTop: 12 }]}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => { setShowCreateModal(false); setShowAssignPicker(false); }}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTask} disabled={createSubmitting}>
                  <LinearGradient colors={['#3b82f6'Dark, '#3b82f6']} style={styles.submitGrad}>
                    {createSubmitting
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.submitText}>Create Task</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Task Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: '90%' }}
            >
              {selectedTask && (
                <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom + 16, 36), backgroundColor: colors.bgCard }]}>
                  <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedTask.title}</Text>

                  {selectedTask.description && (
                    <>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Description</Text>
                      <Text style={[styles.taskDetailDesc, { color: colors.textSecondary }]}>{selectedTask.description}</Text>
                    </>
                  )}

                  <View style={styles.detailRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Priority</Text>
                      <Text style={[styles.detailValue, { color: PRIORITY_COLORS[selectedTask.priority as TaskPriority] }]}>
                        {selectedTask.priority.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Status</Text>
                      <Text style={[styles.detailValue, { color: STATUS_COLORS[selectedTask.status as TaskStatus] }]}>
                        {selectedTask.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {selectedTask.deadline && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Deadline</Text>
                      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{new Date(selectedTask.deadline).toLocaleDateString()}</Text>
                    </View>
                  )}

                  {/* Attachments */}
                  {(selectedTask as any).attachments && (selectedTask as any).attachments.length > 0 && (
                    <>
                      <Text style={[styles.fieldLabel, { marginTop: 16, color: colors.textMuted }]}>Attachments ({(selectedTask as any).attachments.length})</Text>
                      <View style={styles.attachmentsContainer}>
                        {(selectedTask as any).attachments.map((file: any, idx: number) => {
                          const getFileIcon = (mimeType: string) => {
                            if (mimeType.includes('image')) return 'image-outline';
                            if (mimeType.includes('pdf')) return 'document-text-outline';
                            return 'attach-outline';
                          };
                          return (
                            <View key={idx} style={[styles.attachmentChip, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                              <Ionicons name={getFileIcon(file.type) as any} size={14} color={colors.textSecondary} />
                              <Text style={[styles.attachmentFileName, { color: colors.textMuted }]} numberOfLines={1}>{file.name}</Text>
                              <Text style={[styles.attachmentFileSize, { color: colors.textMuted }]}>{file.size ? `${(file.size / 1024).toFixed(1)}KB` : ''}</Text>
                              <TouchableOpacity
                                onPress={async () => {
                                  try {
                                    await removeAttachment({ taskId: selectedTask._id, url: file.url });
                                    setSelectedTask((prev: any) => ({
                                      ...prev,
                                      attachments: prev.attachments.filter((a: any) => a.url !== file.url)
                                    }));
                                    Alert.alert('Success', 'Attachment removed');
                                  } catch (e: any) {
                                    Alert.alert('Error', e?.message ?? 'Failed to remove attachment');
                                  }
                                }}
                                style={styles.attachmentRemove}>
                                <Ionicons name="close" size={16} color={'#ef4444'} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* Status buttons */}
                  {['pending', 'in_progress', 'review', 'completed'].map(status => (
                    <TouchableOpacity key={status} style={[styles.statusBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                      onPress={() => handleStatusChange(selectedTask, status as TaskStatus)}>
                      <Ionicons name={STATUS_ICONS[status as TaskStatus] as any} size={14} color={STATUS_COLORS[status as TaskStatus]} />
                      <Text style={[styles.statusBtnText, { color: STATUS_COLORS[status as TaskStatus] }]}>
                        Mark as {status.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Add Attachment in Detail */}
                  <Text style={[styles.fieldLabel, { marginTop: 16, color: colors.textMuted }]}>Add More Attachments</Text>
                  <TouchableOpacity style={[styles.attachmentButton, { backgroundColor: colors.bg, borderColor: colors.border }]} 
                    disabled={detailUploadingFiles.size > 0}
                    onPress={async () => {
                      try {
                        const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
                        if (!result.canceled && result.assets?.length > 0) {
                          const files = result.assets.map(a => ({ name: a.name, uri: a.uri, size: a.size ?? 0, mimeType: a.mimeType ?? 'application/octet-stream' }));
                          
                          // Upload each file to Cloudinary
                          for (const file of files) {
                            setDetailUploadingFiles(prev => new Set([...prev, file.name]));
                            try {
                              const uploadedFile = await uploadFileToCloudinary(file);
                              if (uploadedFile) {
                                await addAttachment({
                                  taskId: selectedTask._id,
                                  url: uploadedFile.url,
                                  name: file.name,
                                  type: file.mimeType,
                                  size: uploadedFile.size,
                                  uploadedBy: userId as Id<'users'>,
                                });
                                setSelectedTask((prev: any) => ({
                                  ...prev,
                                  attachments: [...(prev.attachments ?? []), {
                                    url: uploadedFile.url,
                                    name: file.name,
                                    type: file.mimeType,
                                    size: uploadedFile.size,
                                    uploadedBy: userId,
                                    uploadedAt: Date.now(),
                                  }]
                                }));
                              }
                            } catch (err: any) {
                              console.error(`Failed to upload ${file.name}:`, err);
                              Alert.alert('Upload Error', `Failed to upload ${file.name}`);
                            } finally {
                              setDetailUploadingFiles(prev => {
                                const next = new Set(prev);
                                next.delete(file.name);
                                return next;
                              });
                            }
                          }
                        }
                      } catch (e: any) { 
                        Alert.alert('Error', e?.message ?? 'Failed to pick file'); 
                      }
                    }}>
                    <Ionicons name={detailUploadingFiles.size > 0 ? "hourglass" : "cloud-upload-outline"} size={18} color={'#3b82f6'} />
                    <Text style={[styles.attachmentButtonText, { color: '#3b82f6' }]}>
                      {detailUploadingFiles.size > 0 ? `Uploading (${detailUploadingFiles.size})...` : 'Add File'}
                    </Text>
                  </TouchableOpacity>

                  {/* Comments */}
                  <Text style={[styles.fieldLabel, { marginTop: 20, color: colors.textMuted }]}>Comments ({selectedTask.comments?.length ?? 0})</Text>
                  <View style={[styles.commentsContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    {selectedTask.comments && selectedTask.comments.length > 0 ? (
                      selectedTask.comments.map((c: any, i: number) => (
                        <View key={i} style={[styles.comment, { borderBottomColor: colors.border }]}>
                          <View>
                            <Text style={[styles.commentAuthor, { color: colors.textPrimary }]}>{c.author?.name ?? 'Unknown'}</Text>
                            <Text style={[styles.commentContent, { color: colors.textSecondary }]}>{c.content}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={[styles.noComments, { color: colors.textMuted }]}>No comments yet</Text>
                    )}
                  </View>

                  {/* Add comment */}
                  <TextInput style={[styles.fieldInput, { height: 60, textAlignVertical: 'top', paddingTop: 10, backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Add a comment..." placeholderTextColor={colors.textMuted}
                    value={newComment} onChangeText={setNewComment} multiline />

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.bg, borderColor: colors.border }]} onPress={() => setShowDetailModal(false)}>
                      <Text style={[styles.cancelText, { color: colors.textMuted }]}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleAddComment} disabled={!newComment.trim()}>
                      <LinearGradient colors={isDark ? ['#3b82f6'Dark, '#3b82f6'] : ['#3b82f6'Dark, '#3b82f6']} style={styles.submitGrad}>
                        <Text style={styles.submitText}>Add Comment</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => {
                      handleDeleteTask(selectedTask._id);
                      setShowDetailModal(false);
                    }}>
                      <Ionicons name="trash-outline" size={18} color={'#ef4444'} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { ...Typography.h1 },
  subtitle: { ...Typography.caption, marginTop: 2 },
  addBtn: { borderRadius: Radius.md, overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  addBtnGrad: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  statCard: { flex: 1, borderRadius: Radius.md, borderWidth: 1, paddingVertical: 10, alignItems: 'center', gap: 2 },
  statValue: { ...Typography.h3, fontWeight: '700' },
  statLabel: { ...Typography.label, fontSize: 10 },

  // Filters
  filterChip: { height: 34, paddingHorizontal: 16, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { borderColor: '#3b82f6' },
  filterText: { ...Typography.captionMedium },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  // Empty / Loading
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...Typography.bodyMedium },
  emptySubText: { ...Typography.caption },

  // Task cards
  taskCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
  taskColorBar: { width: 4 },
  taskCardInner: { flex: 1, padding: 14 },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  taskTitle: { ...Typography.bodyMedium, fontWeight: '600' },
  taskDesc: { ...Typography.caption, marginTop: 2 },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  tag: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { ...Typography.caption, fontSize: 10 },
  priorityBadge: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  priorityText: { ...Typography.label, fontWeight: '700', fontSize: 12 },

  // Task bottom
  taskBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  statusText: { ...Typography.label, fontSize: 11, fontWeight: '600' },
  deadline: { ...Typography.caption, flex: 1 },
  commentCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentCountText: { ...Typography.caption, fontSize: 10 },

  // Modal (bottom sheet)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { ...Typography.h2, marginBottom: 20 },
  fieldLabel: { ...Typography.label, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  fieldInput: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, ...Typography.body, marginBottom: 16 },

  // Priority picker
  priorityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  priorityChip: { flex: 1, minWidth: '45%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center' },
  priorityChipText: { ...Typography.captionMedium },

  // Modal actions
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, height: 52, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...Typography.bodyMedium },
  submitBtn: { flex: 2, height: 52, borderRadius: Radius.md, overflow: 'hidden', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  submitGrad: { width: '100%', height: 52, alignItems: 'center', justifyContent: 'center' },
  submitText: { ...Typography.bodyMedium, color: '#fff', fontWeight: '700' },
  deleteBtn: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C84C4C' + '15', borderWidth: 1, borderColor: '#C84C4C' + '33' },

  // Task detail
  taskDetailDesc: { ...Typography.body, marginBottom: 16, lineHeight: 22 },
  detailRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  detailValue: { ...Typography.bodyMedium, fontWeight: '600', marginTop: 4 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: Radius.md, marginBottom: 10, borderWidth: 1 },
  statusBtnText: { ...Typography.captionMedium, fontWeight: '600' },

  // Assignee
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 6 },
  avatarInitials: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Typography.caption, color: '#fff', fontWeight: '700', fontSize: 10 },
  assigneeName: { ...Typography.caption, flex: 1 },

  // Assign picker dropdown
  assignPickerList: { borderRadius: Radius.md, borderWidth: 1, marginBottom: 16, overflow: 'hidden', maxHeight: 220 },
  assignPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },

  // Attachments
  attachmentButton: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderRadius: Radius.md, borderWidth: 1, marginBottom: 12 },
  attachmentButtonText: { ...Typography.body, fontWeight: '600' },
  attachmentsContainer: { gap: 8, marginBottom: 16 },
  attachmentChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1 },
  attachmentFileName: { ...Typography.caption, flex: 1 },
  attachmentFileSize: { ...Typography.caption, fontSize: 9 },
  attachmentRemove: { padding: 4 },

  // Comments
  commentsContainer: { borderRadius: Radius.md, padding: 12, marginBottom: 16, minHeight: 80, borderWidth: 1 },
  comment: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1 },
  commentAuthor: { ...Typography.label, fontWeight: '600', marginBottom: 2 },
  commentContent: { ...Typography.caption, lineHeight: 18 },
  noComments: { ...Typography.caption, textAlign: 'center', paddingVertical: 20 },
});


