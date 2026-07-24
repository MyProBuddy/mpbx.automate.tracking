export const T = {
  bg:          'transparent',
  surface:     'rgba(255,255,255,0.72)',
  border:      '#E6E6EE',
  text:        '#0D0D14',
  muted:       '#7C7C94',
  faint:       '#B4B4C8',
  accent:      '#5647E0',
  accentLight: '#EEEDFB',
  green:       '#059669',
  greenLight:  '#ECFDF5',
  red:         '#DC2626',
  redLight:    '#FEF2F2',
  sans:        "'Inter', -apple-system, sans-serif",
  mono:        "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
}

export const OUTLOOK_DEFAULTS = {
  outlook_cred_id:   'sME6uoFuG422NF2S',
  outlook_cred_name: 'Microsoft Outlook account',
  sheet_id_master:   '1wieNKDWd6HaoZbv8BAjns2SIO7v_3LM-4YZEvznJpd0',
  drive_folder_id:   '1q1qmbvViBus5Dgoog90ELHsrQedZ-AYp',
}

export const ROLE_META = {
  superadmin: { label: 'Super Admin', color: '#7C3AED', light: '#F5F3FF' },
  admin:      { label: 'Admin',       color: '#5647E0', light: '#EEEDFB' },
  member:     { label: 'Member',      color: '#059669', light: '#ECFDF5' },
}

const SA = {
  email:    import.meta.env.VITE_SA_EMAIL,
  password: import.meta.env.VITE_SA_PASSWORD,
}

// Add admin / member emails + passwords here. Role is assigned purely by email.
export const MEMBERS = [
  { email: 'admin@example.com',  password: 'admin123',  role: 'admin'  },
  { email: 'member@example.com', password: 'member123', role: 'member' },
]

export function authenticate(email, password) {
  if (email === SA.email && password === SA.password) return 'superadmin'
  const match = MEMBERS.find(u => u.email === email && u.password === password)
  return match ? match.role : null
}
