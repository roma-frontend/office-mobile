// Мессенджер конфигурация

export const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#60a5fa'];

export const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  admin:      { label: 'Admin',      color: '#3b82f6', icon: 'shield'        },
  supervisor: { label: 'Supervisor', color: '#f59e0b', icon: 'star'          },
  employee:   { label: 'Employee',   color: '#10b981', icon: 'person'        },
};

export const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  staff:      { label: 'Staff',      color: '#3b82f6' },
  contractor: { label: 'Contractor', color: '#f59e0b' },
};

export const PRESENCE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  available:     { label: 'Available',     color: '#4CAF7C', icon: 'checkmark-circle' },
  in_meeting:    { label: 'In Meeting',    color: '#f59e0b', icon: 'calendar'         },
  in_call:       { label: 'In Call',       color: '#06b6d4', icon: 'call'             },
  out_of_office: { label: 'Out of Office', color: '#C84C4C', icon: 'home'             },
  busy:          { label: 'Busy',          color: '#f97316', icon: 'ban'              },
};

export const SWIPE_CONFIG = {
  rightThreshold: 80,
  leftThreshold: 80,
  animationDuration: 50,
};

export const MESSAGE_CONFIG = {
  maxLength: 4000,
  previewLength: 60,
};
