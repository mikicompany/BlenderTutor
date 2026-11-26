// Generates the printable one-page "Blender Topology Cheat Sheet" lead magnet.
//
// This is a standalone, purpose-built deliverable (not a rendering of a blog
// post), so it lives in its own script rather than in guide-pdf.mjs. It writes
// a static asset into public/, which vite copies into docs/ at build time.
//
// Run with: PLAYWRIGHT_CHROMIUM_PATH=<chrome> node scripts/topology-cheatsheet-pdf.mjs
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const OUT = 'public/blender-topology-cheat-sheet.pdf'
const SITE = 'blendertutoring.com'

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Blender Topology Cheat Sheet</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html,body { margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif; color:#1c1a17; }
  .page { padding: 34px 40px 30px; }
  .top { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #f0781a; padding-bottom:12px; margin-bottom:18px; }
  .kicker { color:#f0781a; font-size:11px; letter-spacing:3px; font-weight:800; text-transform:uppercase; }
  h1 { font-size:27px; margin:3px 0 0; font-weight:800; }
  .brand { text-align:right; font-size:12px; color:#6b655c; }
  .brand b { color:#1c1a17; font-size:14px; }
  .lead { font-size:12.5px; color:#4a443c; margin:0 0 16px; line-height:1.5; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .card { border:1px solid #e4ddd1; border-radius:10px; padding:13px 15px; background:#fbf8f3; }
  .card h2 { font-size:14px; margin:0 0 8px; display:flex; align-items:center; gap:7px; }
  .dot { width:9px; height:9px; border-radius:50%; background:#f0781a; display:inline-block; }
  .card p, .card li { font-size:11.2px; line-height:1.48; color:#39342d; }
  ul { margin:4px 0 0; padding-left:16px; } li { margin:3px 0; }
  .faces { display:flex; gap:8px; margin-top:4px; }
  .face { flex:1; border-radius:7px; padding:7px 8px; font-size:10.3px; line-height:1.35; }
  .q { background:#e7f5ec; border:1px solid #bfe3cc; } .t { background:#fdf3e2; border:1px solid #f2d9ab; } .n { background:#fbe6e0; border:1px solid #f1bdae; }
  .face b { display:block; font-size:11.5px; margin-bottom:2px; }
  .check li { margin:4px 0; font-size:11.2px; }
  .check li::marker { color:#f0781a; content:"✓  "; font-weight:800; }
  .fine { background:#1c1a17; color:#f6f1e8; border-radius:10px; padding:13px 15px; margin-top:14px; }
  .fine h2 { color:#f5b53a; font-size:13.5px; margin:0 0 6px; }
  .fine p { font-size:11.2px; line-height:1.5; margin:0; color:#d9d2c6; }
  .fine b { color:#fff; }
  .foot { margin-top:16px; border-top:1px solid #e4ddd1; padding-top:11px; display:flex; justify-content:space-between; align-items:center; }
  .foot .cta { font-size:12px; color:#1c1a17; } .foot .cta b { color:#f0781a; }
  .foot .url { font-size:11px; color:#6b655c; }
  .mini { font-size:10px; color:#8a8375; margin-top:3px; }
</style></head>
<body><div class="page">
  <div class="top">
    <div><div class="kicker">Blender · Modelling</div><h1>Topology Cheat Sheet</h1></div>
    <div class="brand"><b>Blender Tutoring</b><br>${SITE}</div>
  </div>

  <p class="lead">Topology is the layout of the polygons in your mesh. It decides whether a model subdivides cleanly, deforms well, shades smoothly and unwraps without a fight. Keep this beside you while you model.</p>

  <div class="grid">
    <div class="card">
      <h2><span class="dot"></span>The three face types</h2>
      <div class="faces">
        <div class="face q"><b>Quad · 4 sides</b>The goal. Subdivides &amp; deforms predictably. Make most of your mesh from these.</div>
        <div class="face t"><b>Tri · 3 sides</b>OK in flat/hidden spots. Breaks loop flow &amp; can pinch — use sparingly.</div>
        <div class="face n"><b>N-gon · 5+ sides</b>Blockout only. Shades &amp; subdivides badly. Clean up before you finish.</div>
      </div>
    </div>

    <div class="card">
      <h2><span class="dot"></span>Edge flow</h2>
      <p>Edge loops should <b>follow the form</b> and wrap around anything that bends — eyes, mouth, elbow, knee, muscle. When a surface folds, aligned loops fold cleanly; loops cutting across the bend crumple and pinch.</p>
    </div>

    <div class="card">
      <h2><span class="dot"></span>Poles — place, don't fear</h2>
      <p>A <b>pole</b> is a vertex where 3 or 5 edges meet (you need them to redirect flow). Hide them on <b>flat, static, low-visibility</b> areas. A pole on a nose tip, cheek or joint = a visible pinch or star-shaped shading artifact.</p>
    </div>

    <div class="card">
      <h2><span class="dot"></span>Why it matters</h2>
      <ul>
        <li><b>Subdivide</b> — SubSurf assumes quads; add support loops for sharp edges.</li>
        <li><b>Deform</b> — rigs bend at the loops; good flow = flesh-like bends.</li>
        <li><b>Shade</b> — n-gons/poles in view = dark smudges &amp; wobbles.</li>
        <li><b>UVs</b> — clean quads unwrap into clean UVs.</li>
      </ul>
    </div>
  </div>

  <div class="card" style="margin-top:14px;">
    <h2><span class="dot"></span>Before you call a deforming / subdividing model done</h2>
    <ul class="check">
      <li>Mostly quads — tris &amp; n-gons only in flat, hidden, non-deforming spots</li>
      <li>Edge loops follow the form and wrap around anything that bends</li>
      <li>Poles tucked into flat, low-visibility areas — never on a crease or highlight</li>
      <li>Even-ish density; more detail where curvature or deformation needs it</li>
      <li>Support loops where subdivided edges must stay sharp</li>
      <li>Wireframe + matcap on — hunt for pinches and dark smudges with your eyes</li>
    </ul>
  </div>

  <div class="fine">
    <h2>When "bad" topology is totally fine</h2>
    <p><b>Context decides.</b> The rules serve subdivision, deformation &amp; clean shading — where those don't apply, relax. <b>Static game props</b> (crates, rocks, walls) are triangulated for the engine anyway and never deform, so tris are fine if shading looks right. <b>Hard-surface</b> models that won't subdivide can carry tris in flat areas. <b>High-poly sculpts</b> for baking don't need clean base topology — that's what retopology is for. Spend your topology budget on characters, creatures and anything animated.</p>
  </div>

  <div class="foot">
    <div class="cta">Want eyes on your mesh? <b>Book a free 15-minute call →</b><div class="mini">1:1 Blender tutoring, matched to what you want to make.</div></div>
    <div class="url">${SITE}</div>
  </div>
</div></body></html>`

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--headless'],
})
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
const pdf = await page.pdf({ format: 'A4', printBackground: true })
writeFileSync(OUT, pdf)
await browser.close()
console.log(`topology-cheatsheet-pdf: wrote ${OUT} (${pdf.length} bytes)`)
