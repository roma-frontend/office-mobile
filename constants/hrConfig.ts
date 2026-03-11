// HR и Leave конфигурация

export const LEAVE_CONFIG: Record<string, { label: string; icon: string; gradient: [string, string] }> = {
  paid:   { label: 'Paid Vacation',  icon: '🏖️',  gradient: ['#2563eb', '#3b82f6'] },
  sick:   { label: 'Sick Leave',     icon: '🤒',  gradient: ['#ef4444', '#f87171'] },
  family: { label: 'Family Leave',   icon: '👨‍👩‍👧', gradient: ['#10b981', '#34d399'] },
  doctor: { label: 'Doctor Visit',   icon: '🏥',  gradient: ['#06b6d4', '#22d3ee'] },
  unpaid: { label: 'Unpaid Leave',   icon: '💼',  gradient: ['#f59e0b', '#fbbf24'] },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  approved: { label: 'Approved',  color: '#10b981', bg: '#d1fae5', icon: '✅' },
  pending:  { label: 'Pending',   color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  rejected: { label: 'Rejected',  color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

export const LEAVE_BALANCES = {
  paid: { total: 20, label: 'Paid Leave', icon: '🏖️', color: '#3b82f6' },
  sick: { total: 10, label: 'Sick Leave', icon: '🤒', color: '#ef4444' },
  family: { total: 5, label: 'Family Leave', icon: '👨‍👩‍👧', color: '#10b981' },
};
