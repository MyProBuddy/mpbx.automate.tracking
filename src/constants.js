export const T = {
  // surfaces
  bg:          '#f5f1ec',
  surface:     '#ffffff',
  border:      '#d3cec6',
  borderSoft:  '#ebe7e1',

  // text — Intercom ink scale
  text:        '#111111',
  muted:       '#626260',
  subtle:      '#7b7b78',
  faint:       '#9c9fa5',

  // brand / semantic (keep existing accent, keep green/red)
  accent:      '#5647E0',
  accentLight: '#EEEDFB',
  green:       '#059669',
  greenLight:  '#ECFDF5',
  red:         '#DC2626',
  redLight:    '#FEF2F2',

  // typography — Intercom scale (Inter as Saans substitute)
  sans:        "'Inter', ui-sans-serif, system-ui, sans-serif",
  mono:        "'JetBrains Mono', ui-monospace, monospace",

  // button shape — Intercom spec: 8px radius, 10px 18px padding, 15px/500
  btnRadius:   '8px',
  btnPadding:  '10px 18px',
  btnFontSize: '15px',
  btnWeight:   700,
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
