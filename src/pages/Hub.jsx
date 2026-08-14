import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FS   = { h: 32, sh: 18, c: 14, sc: 12 }
const INK  = '#1a1a1a'
const MUTED = '#626260'

const NEU_BG     = '#F0F0F0'
const NEU_SURF   = 'linear-gradient(145deg, #f6f6f6, #e8e8e8)'
const NEU_SHADOW = '-6px -6px 14px rgba(255,255,255,0.85), 6px 6px 14px rgba(0,0,0,0.12)'
const NEU_INSET  = 'inset 4px 4px 10px rgba(0,0,0,0.12), inset -4px -4px 10px rgba(255,255,255,0.85)'

// SVG icon components
const Icon = {
  FolderPlus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  Upload:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Table:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  Mail:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>,
  Key:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>,
  Download:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Link:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  BarChart:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Search:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Edit:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Brain:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14z"/></svg>,
  Users:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Layers:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Map:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  Globe:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  CheckMail:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Wrench:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Activity:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  TrendUp:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Cpu:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  Report:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
}

const CardIcons = {
  data:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  workflow:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="16" y="16" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M8 5.5h8M5.5 8v8M18.5 8v8M8 18.5h8"/></svg>,
  analytics: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  intel:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.14z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.14z"/></svg>,
  overview:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  tools:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  database:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>,
  internal:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  social:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
}

const OPTIONS = [
  {
    path: '/add-data',
    color: T.green, colorLight: T.greenLight,
    label: 'DATA', title: 'Add Data',
    cardIcon: CardIcons.data,
    desc: 'Create Drive folders, upload pitch docs, and set up investor sheets before running any workflow.',
    items: [
      { text: 'Create a client Drive folder', icon: Icon.FolderPlus },
      { text: 'Upload pitch documents',       icon: Icon.Upload },
      { text: 'Set up investor sheet',        icon: Icon.Table },
    ],
  },
  {
    path: '/workflow',
    color: T.accent, colorLight: T.accentLight,
    cardIcon: CardIcons.workflow,
    label: 'WORKFLOW', title: 'Get Workflow',
    desc: 'Swap credentials and IDs into an n8n workflow template, then download the ready-to-import JSON.',
    items: [
      { text: 'Choose Outlook or Gmail',  icon: Icon.Mail },
      { text: 'Swap credentials & IDs',   icon: Icon.Key },
      { text: 'Download the JSON',        icon: Icon.Download },
    ],
  },
  {
    path: '/analytics',
    color: '#7C6FF0', colorLight: '#F0EFFE',
    cardIcon: CardIcons.analytics,
    label: 'INSIGHTS', title: 'Client Analytics',
    desc: 'Visualise investor data across your sheets — sectors, geographies, fund stages, and deal flow.',
    items: [
      { text: 'Connect your investor sheet',   icon: Icon.Link },
      { text: 'Explore interactive charts',    icon: Icon.BarChart },
      { text: 'Spot patterns at a glance',     icon: Icon.Search },
    ],
  },
  {
    path: '/company-intel',
    color: '#D97706', colorLight: '#FFFBEB',
    cardIcon: CardIcons.intel,
    label: 'INTEL', title: 'Company Intel',
    desc: 'Log company updates — funding rounds, news, leadership changes — so the AI references them when writing followup emails.',
    items: [
      { text: 'Select a client sheet',           icon: Icon.Table },
      { text: 'Add updates to the Updates tab',  icon: Icon.Edit },
      { text: 'AI uses intel in followup pitches', icon: Icon.Brain },
    ],
  },
  {
    path: '/overview',
    color: '#0891B2', colorLight: '#ECFEFF',
    cardIcon: CardIcons.overview,
    label: 'OVERVIEW', title: 'Overview',
    desc: 'See a snapshot of all clients — total investors, emails sent, followups, and replies across every campaign.',
    items: [
      { text: 'All clients in one view',    icon: Icon.Users },
      { text: 'Followup stage breakdown',   icon: Icon.Layers },
      { text: 'Replies and this week stats', icon: Icon.Activity },
    ],
  },
  {
    path: '/tools',
    color: '#7C3AED', colorLight: '#F5F3FF',
    cardIcon: CardIcons.tools,
    label: 'TOOLS', title: 'Tools',
    desc: 'Utilities to validate emails, check bounce risk, and run diagnostics across your outreach campaigns.',
    items: [
      { text: 'Check sent mail',          icon: Icon.CheckMail },
      { text: 'Edit prompt template',     icon: Icon.Edit },
      { text: 'Campaign audit utilities', icon: Icon.Wrench },
    ],
  },
  {
    path: '/data-workflows',
    color: '#0891B2', colorLight: '#ECFEFF',
    cardIcon: CardIcons.database,
    label: 'DATABASE', title: 'Data Workflows',
    desc: 'Explore the master investor and firm database — view counts, activity status, and geographic density.',
    items: [
      { text: 'Master firms & investors database', icon: Icon.Users },
      { text: 'Active vs inactive breakdown',      icon: Icon.BarChart },
      { text: 'Geographic density map',            icon: Icon.Globe },
    ],
  },
  {
    path: '/internal-analytics',
    color: '#C026D3', colorLight: '#FDF4FF',
    cardIcon: CardIcons.internal,
    label: 'INTERNAL', title: 'Internal Analytics',
    desc: 'Internal performance metrics and operational analytics across all outreach campaigns and automations.',
    items: [
      { text: 'Campaign-wide performance view', icon: Icon.TrendUp },
      { text: 'Automation health metrics',      icon: Icon.Cpu },
      { text: 'Internal reporting dashboard',   icon: Icon.Report },
    ],
    disabled: true,
  },
  {
    path: '/social-analytics',
    color: '#0EA5E9', colorLight: '#F0F9FF',
    cardIcon: CardIcons.social,
    label: 'SOCIAL', title: 'Social Analytics',
    desc: 'Track engagement and performance across your social media posts — reach, likes, comments, and growth trends.',
    items: [
      { text: 'Post engagement metrics',   icon: Icon.TrendUp },
      { text: 'Platform-wise breakdown',   icon: Icon.BarChart },
      { text: 'Growth & reach tracking',   icon: Icon.Activity },
    ],
    disabled: true,
  },
]

function HubCard({ o }) {
  const navigate = useNavigate()
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={() => !o.disabled && navigate(o.path)}
      onMouseLeave={() => setPressed(false)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: NEU_SURF,
        borderRadius: 16, padding: 28, textAlign: 'left',
        border: 'none',
        boxShadow: pressed ? NEU_INSET : NEU_SHADOW,
        cursor: o.disabled ? 'default' : 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        display: 'flex', flexDirection: 'column',
        opacity: o.disabled ? 0.5 : 1,
        fontFamily: FONT,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, marginBottom: 16,
        background: `linear-gradient(145deg, ${o.colorLight}, ${o.color}22)`,
        boxShadow: '-3px -3px 8px rgba(255,255,255,0.9), 3px 3px 8px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: o.color, display: 'flex' }}>{o.cardIcon}</span>
      </div>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: o.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{o.label}</div>
      <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px', lineHeight: 1.25, marginBottom: 10 }}>{o.title}</div>
      <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>{o.desc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        {o.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: o.color, flexShrink: 0, display: 'flex' }}>{item.icon}</span>
            <span style={{ fontSize: FS.sc, color: MUTED }}>{item.text}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color: color || INK, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value !== null && value !== undefined ? Number(value).toLocaleString() : '—'}
      </div>
    </div>
  )
}

function GeoBar({ name, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 130, fontSize: FS.sc, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{name}</div>
      <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#5647E0', borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, width: 40, textAlign: 'right', flexShrink: 0 }}>{count.toLocaleString()}</div>
    </div>
  )
}

function MasterDatabasePanel({ stats }) {
  const loading = !stats
  const firms = stats?.firms
  const investors = stats?.investors
  const geo = stats?.topGeographies || []
  const maxGeo = geo[0]?.count || 1

  return (
    <div style={{
      background: NEU_SURF, borderRadius: 16, padding: 32,
      boxShadow: NEU_SHADOW, gridColumn: '1 / -1', fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: '#5647E0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Master Database</div>
          <div style={{ fontSize: FS.sh, fontWeight: 600, color: INK, letterSpacing: '-0.2px' }}>Data Workflows</div>
        </div>
        <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: '4px 12px' }}>Coming soon</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Firms</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 28 }}>
            <StatPill label="Total"    value={loading ? null : firms?.total} />
            <StatPill label="Active"   value={loading ? null : firms?.active}   color={T.green} />
            <StatPill label="Inactive" value={loading ? null : firms?.inactive} color={MUTED} />
          </div>

          <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Investors</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <StatPill label="Total"    value={loading ? null : investors?.total} />
            <StatPill label="Active"   value={loading ? null : investors?.active}   color={T.green} />
            <StatPill label="Inactive" value={loading ? null : investors?.inactive} color={MUTED} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: FS.sc, fontWeight: 500, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Geographic Density</div>
          {loading
            ? <div style={{ fontSize: FS.c, color: MUTED }}>Loading…</div>
            : geo.length === 0
              ? <div style={{ fontSize: FS.c, color: MUTED }}>No geography data</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {geo.map(g => <GeoBar key={g.name} name={g.name} count={g.count} max={maxGeo} />)}
                </div>
          }
        </div>
      </div>
    </div>
  )
}

export default function Hub() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: FONT, background: NEU_BG }}>
      <Nav title="Workflow Configurator" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: FS.c, fontWeight: 500, color: T.accent, marginBottom: 8 }}>Dashboard</div>
          <div style={{ fontSize: FS.h, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.2, color: INK, marginBottom: 6 }}>What would you like to do?</div>
          <div style={{ fontSize: FS.c, color: MUTED, lineHeight: 1.5 }}>Choose an action to get started.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, gridAutoRows: '1fr' }}>
          {OPTIONS.map(o => <HubCard key={o.label} o={o} />)}
        </div>
      </div>
    </div>
  )
}
