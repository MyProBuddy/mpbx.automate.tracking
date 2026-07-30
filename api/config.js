export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  return res.json({
    googleClientId:  process.env.GOOGLE_CLIENT_ID,
    clientsFolderId: process.env.DRIVE_CLIENTS_FOLDER_ID,
    sheetsFolderId:  process.env.DRIVE_SHEETS_FOLDER_ID,
    templateSheetId: process.env.TEMPLATE_SHEET_ID,
  })
}
