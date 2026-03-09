import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Typography, Radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface OrgPickerProps {
  userId: Id<"users">;
  selectedOrgId: Id<"organizations"> | null;
  onSelect: (orgId: Id<"organizations">) => void;
}

export default function OrgPicker({ userId, selectedOrgId, onSelect }: OrgPickerProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const orgs = useQuery(api.organizations.getOrganizationsForPicker, { userId });

  // Auto-select single org via useEffect (not during render)
  useEffect(() => {
    if (orgs?.length === 1 && !selectedOrgId) {
      onSelect(orgs[0]._id);
    }
  }, [orgs, selectedOrgId, onSelect]);

  // Always show the picker so user can see which org is selected
  // Even with 1 org, show it as a non-interactive label
  if (!orgs || orgs.length === 0) return null;

  const selected = orgs.find((o) => o._id === selectedOrgId);

  // Single org — show as label, not interactive
  if (orgs.length === 1) {
    return (
      <View style={[styles.picker, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Ionicons name="business-outline" size={16} color={colors.primary} />
        <Text style={[styles.pickerText, { color: colors.textPrimary }]} numberOfLines={1}>
          {orgs[0].name}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.picker, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() => setOpen(!open)}
      >
        <Ionicons name="business-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.pickerText, { color: selected ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
          {selected?.name ?? 'Select organization'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.dropdown, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {orgs.map((org) => (
              <TouchableOpacity
                key={org._id}
                style={[styles.option, selectedOrgId === org._id && { backgroundColor: colors.primary + '22' }]}
                onPress={() => { onSelect(org._id); setOpen(false); }}
              >
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>{org.name}</Text>
                {selectedOrgId === org._id && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 10 },
  picker: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.md, borderWidth: 1,
  },
  pickerText: { ...Typography.body, flex: 1 },
  dropdown: {
    position: 'absolute', top: 48, left: 0, right: 0,
    borderRadius: Radius.md, borderWidth: 1,
    overflow: 'hidden', zIndex: 20,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  optionText: { ...Typography.body },
});
