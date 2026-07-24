import { T } from '../constants.js'
import Nav from '../components/Nav.jsx'
import { ComingSoonBody } from '../components/UI.jsx'

export default function GmailConfigurator() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: T.sans }}>
      <Nav title="Gmail Outreach" subtitle="· configure" backTo="/workflow" />
      <ComingSoonBody label="Drop template-gmail.json into the application folder to enable this." />
    </div>
  )
}
