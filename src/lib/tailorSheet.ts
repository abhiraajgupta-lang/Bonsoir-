import { BRAND_LOGO_SVG } from '@/lib/brand'
import { MEASUREMENT_FIELDS } from '@/lib/constants'

export interface TailorGarment {
  jobNumber: string
  orderNumber?: number
  garmentType: string
  style?: string | null
  fabric?: string | null
  designNotes?: string | null
  jobNotes?: string | null
  deliveryDate?: string | null
}

export interface TailorSheet {
  customerName: string
  customerCode?: string | null
  measurement?: ({ version?: number; date?: string; notes?: string | null } & Record<string, unknown>) | null
  garments: TailorGarment[]
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

function sheetHtml(sheet: TailorSheet) {
  const m = sheet.measurement
  const groups = MEASUREMENT_FIELDS.map(g => `
    <div class="group">
      <h3>${esc(g.group)}</h3>
      <table class="meas">
        ${g.fields.map(f => {
          const v = m?.[f.key]
          return `<tr><td>${esc(f.label)}</td><td class="val">${v == null || v === '' ? '<span class="blank"></span>' : `${esc(Number(v).toFixed(1))}&quot;`}</td></tr>`
        }).join('')}
      </table>
    </div>`).join('')

  const garments = sheet.garments.length
    ? sheet.garments.map((g, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(g.garmentType)}</strong>${g.style ? `<div class="sub">Style: ${esc(g.style)}</div>` : ''}</td>
        <td class="mono">${esc(g.jobNumber)}${g.orderNumber ? `<div class="sub">Order #${esc(g.orderNumber)}</div>` : ''}</td>
        <td>${esc(g.fabric) || '<span class="muted">—</span>'}</td>
        <td>${[g.designNotes, g.jobNotes].filter(Boolean).map(esc).join('<br>') || '<span class="muted">—</span>'}</td>
        <td class="nowrap">${fmtDate(g.deliveryDate) || '<span class="muted">—</span>'}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" class="muted center">No garments in production</td></tr>`

  return `
  <section class="sheet">
    <header>
      <div class="logo">${BRAND_LOGO_SVG}</div>
      <div class="title">
        <h1>TAILOR SHEET</h1>
        <p>Printed ${fmtDate(new Date().toISOString())}</p>
      </div>
    </header>

    <div class="who">
      <div><label>Customer</label><p class="name">${esc(sheet.customerName)}</p></div>
      ${sheet.customerCode ? `<div><label>Customer ID</label><p>${esc(sheet.customerCode)}</p></div>` : ''}
      <div><label>Measurements</label><p>${m ? `Version ${esc(m.version ?? '')}${m.date ? ` · taken ${fmtDate(m.date)}` : ''} · in inches` : 'Not recorded — fill in by hand'}</p></div>
    </div>

    <h2>Garments to make</h2>
    <table class="garments">
      <thead><tr><th>#</th><th>Garment</th><th>Job</th><th>Fabric</th><th>Design / notes</th><th>Delivery</th></tr></thead>
      <tbody>${garments}</tbody>
    </table>

    <h2>Measurements</h2>
    <div class="groups">${groups}</div>
    ${m?.notes ? `<div class="note"><label>Measurement notes</label><p>${esc(m.notes)}</p></div>` : ''}

    <div class="remarks">
      <label>Tailor remarks</label>
      <div class="lines"><span></span><span></span><span></span></div>
    </div>

    <footer>
      <div><label>Tailor name</label><span class="line"></span></div>
      <div><label>Received on</label><span class="line"></span></div>
      <div><label>Ready by</label><span class="line"></span></div>
    </footer>
  </section>`
}

export function printTailorSheets(sheets: TailorSheet[]) {
  const title = sheets.length === 1 ? `Tailor Sheet - ${sheets[0].customerName}` : 'Tailor Sheets'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #111; font-size: 12px; }
    .sheet { max-width: 186mm; margin: 0 auto; padding: 8px 0; page-break-after: always; }
    .sheet:last-child { page-break-after: auto; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #c8102e; padding-bottom: 12px; margin-bottom: 14px; }
    .logo svg { width: 170px; height: auto; display: block; }
    .title { text-align: right; }
    .title h1 { font-size: 18px; letter-spacing: 4px; font-weight: 800; }
    .title p { font-size: 11px; color: #666; margin-top: 2px; }
    label { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 1px; color: #666; font-weight: 600; }
    .who { display: flex; gap: 28px; padding: 10px 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 16px; }
    .who p { font-size: 13px; margin-top: 2px; }
    .who .name { font-size: 17px; font-weight: 700; }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #111; }
    table { width: 100%; border-collapse: collapse; }
    .garments th { text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: 1px; color: #555; padding: 6px 8px; background: #f0f0f0; border-bottom: 1px solid #ccc; }
    .garments td { padding: 8px; border-bottom: 1px solid #e3e3e3; vertical-align: top; font-size: 12px; }
    .garments .num { width: 22px; color: #888; }
    .sub { font-size: 10.5px; color: #666; margin-top: 2px; }
    .mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; white-space: nowrap; }
    .nowrap { white-space: nowrap; }
    .muted { color: #aaa; }
    .center { text-align: center; padding: 14px; }
    .groups { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .group h3 { font-size: 11px; font-weight: 700; margin-bottom: 4px; }
    .meas td { padding: 5px 6px; border-bottom: 1px solid #e6e6e6; font-size: 12px; }
    .meas tr:nth-child(odd) td { background: #fafafa; }
    .meas .val { text-align: right; font-weight: 700; font-size: 14px; width: 64px; font-variant-numeric: tabular-nums; }
    .blank { display: inline-block; width: 44px; border-bottom: 1px solid #999; height: 12px; }
    .note { margin-top: 12px; padding: 8px 10px; border-left: 3px solid #c8102e; background: #fafafa; }
    .note p { margin-top: 3px; font-size: 12px; white-space: pre-wrap; }
    .remarks { margin-top: 18px; }
    .lines span { display: block; border-bottom: 1px solid #bbb; height: 24px; }
    footer { display: flex; gap: 24px; margin-top: 22px; }
    footer div { flex: 1; }
    footer .line { display: block; border-bottom: 1px solid #111; height: 26px; }
    @media print { .sheet { padding: 0; } }
  </style></head><body>${sheets.map(sheetHtml).join('')}</body></html>`

  const win = window.open('', '_blank')
  if (!win) return alert('Please allow pop-ups to print the tailor sheet.')
  win.document.write(html)
  win.document.close()
  let printed = false
  const go = () => {
    if (printed) return
    printed = true
    win.focus()
    win.print()
  }
  win.onload = go
  setTimeout(go, 600)
}
