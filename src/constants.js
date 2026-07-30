export const T = {
  bg:          'rgba(245,245,250,0.55)',
  surface:     'rgba(255,255,255,0.75)',
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

export async function authenticate(email, password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  return data.role || null
}
