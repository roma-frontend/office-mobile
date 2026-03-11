import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';

import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface OrgPickerProps {
  userId: Id<"users">;
  selectedOrgId: Id<"organizations"> | null;
  onSelect: (orgId: Id<"organizations"> | null) => void;
  showAllOption?: boolean; // Show "All Organizations" option for superadmin
}

export default function OrgPicker({ userId, selectedOrgId, onSelect, showAllOption = false }: OrgPickerProps) {
  const { colors } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const orgs = useQuery(api.organizations.getOrganizationsForPicker, { userId });

  // Auto-select if only one org
  useEffect(() => {
    if (orgs && orgs.length === 1 && selectedOrgId !== orgs[0]._id) {
      onSelect(orgs[0]._id);
    }
  }, [orgs, selectedOrgId, onSelect]);

  // Hide if 0 or 1 org (no choice to make)
  if (!orgs || orgs.length <= 1) {
    return null;
  }


  const selected = orgs.find((o) => o._id === selectedOrgId);

  // Show "All Organizations" option if enabled and multiple orgs exist
  const canShowAll = showAllOption && orgs.length > 1;

  const handleSelectOrg = (orgId: Id<"organizations"> | null) => {
    onSelect(orgId);
    setModalOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.picker, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={selectedOrgId === null && canShowAll ? "grid-outline" : "business-outline"}
          size={18}
          color={selectedOrgId === null && canShowAll ? colors.success : colors.primary}
        />
        <Text style={[styles.pickerText, { color: colors.textPrimary, fontWeight: selectedOrgId ? '600' : '400' }]} numberOfLines={1}>
          {selectedOrgId === null && canShowAll
            ? 'All Organizations'
            : selected?.name ?? 'Select organization'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Modal for org selection - more reliable than dropdown */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalOpen(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select Organization
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {canShowAll && (
              <TouchableOpacity
                style={[styles.modalOption, selectedOrgId === null && { backgroundColor: colors.success + '22' }]}
                onPress={() => handleSelectOrg(null)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name="grid-outline" size={20} color={selectedOrgId === null ? colors.success : colors.textMuted} />
                  <Text style={[styles.modalOptionText, { color: colors.textPrimary, fontWeight: selectedOrgId === null ? '600' : '400' }]}>
                    All Organizations
                  </Text>
                </View>
                {selectedOrgId === null && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                )}
              </TouchableOpacity>
            )}

            <ScrollView style={styles.modalScroll} nestedScrollEnabled>
              {orgs.map((org) => (
                <TouchableOpacity
                  key={org._id}
                  style={[styles.modalOption, selectedOrgId === org._id && { backgroundColor: colors.primary + '22' }]}
                  onPress={() => handleSelectOrg(org._id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Ionicons name="business-outline" size={20} color={selectedOrgId === org._id ? colors.primary : colors.textMuted} />
                    <Text style={[styles.modalOptionText, { color: colors.textPrimary, fontWeight: selectedOrgId === org._id ? '600' : '400' }]}>
                      {org.name}
                    </Text>
                  </View>
                  {selectedOrgId === org._id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: Radius.lg, borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerText: { ...Typography.body, flex: 1 },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { ...Typography.h3 },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  modalOptionText: { ...Typography.body, flex: 1 },
});
