/* ============================================================
   TRAVELCORE — mock in-memory data store (no backend; demo only)
   ============================================================ */
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0); // normalize to midnight so "days until" counts whole days cleanly
function daysUntil(dateStr){ return Math.ceil((new Date(dateStr) - TODAY) / 86400000); }
function fmt(dateStr){ const d=new Date(dateStr); return d.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}); }
// Real today's date as 'YYYY-MM-DD', for stamping newly-created records —
// distinct from the hardcoded demo dates in the seed data below, which are
// meant to stay fixed since they're historical example content.
function todayStr(){
  const y = TODAY.getFullYear(), m = String(TODAY.getMonth()+1).padStart(2,'0'), d = String(TODAY.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
let counters = {FA:5, BK:104, VS:212, DC:340, LC:18, CT:88};
function nextId(prefix){ counters[prefix]++; return prefix+'-'+counters[prefix]; }

const DB = {
  facilities: [
    {id:'FA-01', name:'Tour Briefing Room', type:'Meeting Room', capacity:12},
    {id:'FA-02', name:'Client Consultation Lounge', type:'Client Meeting', capacity:6},
    {id:'FA-03', name:'Tour Guide Training Hall', type:'Training', capacity:25},
    {id:'FA-04', name:'Agency Tour Coaster (Toyota Coaster)', type:'Vehicle', capacity:28},
    {id:'FA-05', name:'Passport & Travel Document Vault', type:'Secure Storage', capacity:'Restricted'},
  ],
  bookings: [
    {id:'BK-101', facility:'Tour Briefing Room', purpose:'Partner airline route briefing', requestedBy:'M. Santos', date:'2026-07-19', start:'09:00', end:'11:00', status:'Checked-in'},
    {id:'BK-102', facility:'Client Consultation Lounge', purpose:'Europe tour package consultation', requestedBy:'R. Dizon', date:'2026-07-19', start:'13:00', end:'14:00', status:'Approved'},
    {id:'BK-103', facility:'Tour Guide Training Hall', purpose:'New tour guide orientation', requestedBy:'HR — A. Cruz', date:'2026-07-21', start:'08:30', end:'12:00', status:'Pending'},
    {id:'BK-104', facility:'Agency Tour Coaster (Toyota Coaster)', purpose:'Airport pickup — Boracay group tour', requestedBy:'T. Reyes', date:'2026-07-20', start:'05:00', end:'08:00', status:'Approved'},
  ],
  visitors: [
    {id:'VS-210', name:'Liza Gomez', purpose:'Tour package contract signing', host:'M. Santos', company:'Client — Europe Tour Group', date:'2026-07-19', status:'Checked-in', notified:true},
    {id:'VS-211', name:'Paolo Reyes', purpose:'Hotel partnership meeting', host:'R. Dizon', company:'Boracay Sands Resort', date:'2026-07-19', status:'Registered', notified:false},
    {id:'VS-212', name:'Anna Villanueva', purpose:'Walk-in tour package inquiry', host:'Front Desk', company:'—', date:'2026-07-18', status:'Checked-out', notified:true},
  ],
  documents: [
    {id:'DC-338', title:'Client Travel Waiver & Insurance — Boracay Group 22-A', category:'Client Travel Docs', owner:'M. Santos', dateAdded:'2021-08-02', version:'v1.0', retentionYears:5, status:'Active'},
    {id:'DC-339', title:'Hotel Partnership Agreement — Boracay Sands Resort', category:'Supplier Agreement', owner:'R. Dizon', dateAdded:'2023-02-14', version:'v2.1', retentionYears:5, status:'Active'},
    {id:'DC-340', title:'Q2 Tour Package Sales & Revenue Report 2026', category:'Financial Record', owner:'Finance Dept.', dateAdded:'2026-04-10', version:'v1.0', retentionYears:10, status:'Active'},
    {id:'DC-341', title:'Employment Contract — J. Cruz (Tour Consultant)', category:'HR Record', owner:'HR Dept.', dateAdded:'2019-06-20', version:'v1.0', retentionYears:7, status:'Active'},
    {id:'DC-342', title:'DOT & IATA Accreditation Filing 2026', category:'Compliance Filing', owner:'Compliance Officer', dateAdded:'2026-01-15', version:'v1.0', retentionYears:3, status:'Active'},
  ],
  legalCases: [
    {id:'LC-16', title:'Refund dispute — cancelled Boracay tour package BK-071', type:'Client Dispute', filed:'2026-06-02', deadline:'2026-07-25', status:'Under Review', relatedContract:'CT-081'},
    {id:'LC-17', title:'Supplier breach — hotel overbooking incident', type:'Supplier Dispute', filed:'2026-05-18', deadline:'2026-08-01', status:'Open', relatedContract:'CT-084'},
    {id:'LC-18', title:'Data privacy inquiry — client passport records', type:'Compliance', filed:'2026-07-10', deadline:'2026-07-30', status:'Open', relatedContract:'—'},
  ],
  contracts: [
    {id:'CT-081', title:'Partner Agreement — Meridian Travel Consortium', party:'Meridian Travel Consortium', type:'Partner MOU', start:'2024-01-01', end:'2026-08-05', value:'₱1,250,000', status:'Active', signed:true, approvalLevel:2, legalHold:true},
    {id:'CT-084', title:'Hotel Partnership Contract — Boracay Sands Resort', party:'Boracay Sands Resort', type:'Supplier Agreement', start:'2023-03-01', end:'2026-07-28', value:'₱480,000', status:'Active', signed:true, approvalLevel:2, legalHold:true},
    {id:'CT-085', title:'Employment Contract — J. Cruz (Tour Consultant)', party:'J. Cruz', type:'Employment', start:'2019-06-20', end:'2027-06-20', value:'—', status:'Active', signed:true, approvalLevel:1, legalHold:false},
    {id:'CT-086', title:'Airline Ticketing Agreement — SkyPacific Airlines', party:'SkyPacific Airlines', type:'Airline Ticketing Agreement', start:'2026-01-01', end:'2028-01-01', value:'₱900,000', status:'Active', signed:true, approvalLevel:2, legalHold:false},
    {id:'CT-087', title:'Tour Package Agreement — Boracay Group 22-A', party:'Group 22-A (14 pax)', type:'Client Package', start:'2026-07-01', end:'2026-07-01', value:'₱620,000', status:'Draft', signed:false, approvalLevel:0, legalHold:false},
    {id:'CT-088', title:'Former Land Transport Contract — QuickCab Transport', party:'QuickCab Transport', type:'Supplier Agreement', start:'2021-01-01', end:'2025-12-31', value:'₱150,000', status:'Terminated', signed:true, approvalLevel:2, legalHold:false},
  ],
  retentionSchedule: [
    {type:'Client Travel Docs', years:5},
    {type:'Supplier Agreement', years:5},
    {type:'Financial Record', years:10},
    {type:'HR Record', years:7},
    {type:'Compliance Filing', years:3},
    {type:'Visitor Logs', years:1},
  ],
  auditLog: [
    {t:'08:41', d:'Admin approved facility booking BK-104 (Agency Tour Coaster).'},
    {t:'08:55', d:'Visitor Liza Gomez checked in via QR pass VS-210.'},
    {t:'09:02', d:'Contract CT-081 flagged under Legal Hold (case LC-16).'},
    {t:'09:20', d:'Document DC-342 filed — DOT & IATA Accreditation.'},
  ],
};

/* ============================================================
   PHP/MySQL backend connection (see schema.sql + api/*.php)
   ------------------------------------------------------------
   LIVE is detected automatically: on load, the app pings
   api/auth.php?action=me. If that succeeds, it's running on a
   real PHP server with the database wired up. If the API can't
   be reached at all (e.g. you just opened this file directly in
   a browser instead of through Apache), LIVE stays false and the
   app runs on the in-memory demo data below — nothing breaks,
   nothing is required to present this as-is.
   ============================================================ */
const API_DATA = 'api/data.php';
const API_AUTH = 'api/auth.php';
let LIVE = false; // set by checkBackend() during init, below

// DB.<key> array name → the ?resource= name the PHP API expects
// (they're identical on purpose — see $RESOURCES in api/data.php)
const TABLES = {
  facilities:'facilities', bookings:'bookings', visitors:'visitors', blacklist:'blacklist',
  documents:'documents', retentionSchedule:'retentionSchedule', legalCases:'legalCases',
  correspondence:'correspondence', contracts:'contracts', auditLog:'auditLog'
};

let SESSION = null; // {id, fullName, role, email} once signed in

async function apiCall(method, resource, opts={}){
  let url = `${API_DATA}?resource=${resource}`;
  if(opts.id!==undefined) url += `&id=${encodeURIComponent(opts.id)}`;
  const res = await fetch(url, {
    method, credentials:'same-origin',
    headers: opts.body ? {'Content-Type':'application/json'} : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let payload = null;
  try{ payload = await res.json(); }catch(e){ /* empty body, e.g. some errors */ }
  if(!res.ok){
    if(res.status===401){ await handleLogout(); }
    alert('Database error: ' + (payload?.error || res.statusText));
    return null;
  }
  return payload;
}

// Insert a row into both the local DB cache (so the UI updates instantly)
// and, in LIVE mode, the real table. Returns the row that was saved.
async function dbInsert(key, row){
  if(LIVE){
    const saved = await apiCall('POST', TABLES[key], {body:row});
    if(!saved) return null;
    DB[key].unshift(saved);
    return saved;
  }
  DB[key].unshift(row);
  return row;
}
// Update a row by whichever field identifies it (usually 'id', but
// retentionSchedule is keyed by 'type' since it has no id column).
async function dbUpdate(key, idField, idValue, changes){
  if(LIVE){
    const saved = await apiCall('PUT', TABLES[key], {id:idValue, body:changes});
    if(!saved) return null;
    const idx = DB[key].findIndex(r=>r[idField]===idValue);
    if(idx>-1) DB[key][idx] = saved;
    return saved;
  }
  const row = DB[key].find(r=>r[idField]===idValue);
  if(row) Object.assign(row, changes);
  return row;
}
async function dbDelete(key, idField, idValue){
  if(LIVE){
    const ok = await apiCall('DELETE', TABLES[key], {id:idValue});
    if(!ok) return false;
  }
  const idx = DB[key].findIndex(r=>r[idField]===idValue);
  if(idx>-1) DB[key].splice(idx,1);
  return true;
}
// On startup in LIVE mode, replace the demo seed arrays with real rows.
async function loadAllData(){
  if(!LIVE) return;
  for(const key of Object.keys(TABLES)){
    const rows = await apiCall('GET', TABLES[key]);
    if(rows) DB[key] = rows;
  }
}

/* ------------------------------------------------------------
   Staff Accounts (Admin only) — talks to api/users.php, kept
   separate from apiCall()/TABLES since it's a different endpoint
   with its own validation (passwords, last-Admin guardrails).
   ------------------------------------------------------------ */
let STAFF = [];
async function usersCall(method, opts={}){
  let url = 'api/users.php';
  if(opts.id!==undefined) url += `?id=${encodeURIComponent(opts.id)}`;
  const res = await fetch(url, {
    method, credentials:'same-origin',
    headers: opts.body ? {'Content-Type':'application/json'} : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let payload = null;
  try{ payload = await res.json(); }catch(e){}
  if(!res.ok){ alert(payload?.error || 'Request failed.'); return null; }
  return payload;
}
async function loadUsers(){
  if(!LIVE || !SESSION || SESSION.role!=='Admin') { STAFF = []; return; }
  const rows = await usersCall('GET');
  if(rows) STAFF = rows;
}
async function handleAddStaff(e){
  e.preventDefault();
  const body = {
    fullName: document.getElementById('us_name').value,
    email: document.getElementById('us_email').value,
    password: document.getElementById('us_password').value,
    role: document.getElementById('us_role').value,
  };
  const saved = await usersCall('POST', {body});
  if(!saved) return;
  STAFF.push(saved);
  logActivity(`Staff account created for ${saved.fullName} (${saved.role}).`);
  render();
}
async function handleDeleteStaff(id, name){
  if(!confirm(`Delete the staff account for ${name}? This can't be undone.`)) return;
  const ok = await usersCall('DELETE', {id});
  if(!ok) return;
  STAFF = STAFF.filter(u=>u.id!==id);
  logActivity(`Staff account removed: ${name}.`);
  render();
}
async function handleChangeStaffRole(id, name, newRole){
  const saved = await usersCall('PUT', {id, body:{role:newRole}});
  if(!saved){ render(); return; } // re-render to reset the <select> if the change was rejected
  const idx = STAFF.findIndex(u=>u.id===id);
  if(idx>-1) STAFF[idx] = saved;
  logActivity(`${name}'s role changed to ${newRole}.`);
  render();
}
function renderStaffAccounts(){
  if(!LIVE){
    return card('Staff Accounts', `<div class="empty">Staff account management needs the live database connection — this table doesn't exist in Demo Mode.</div>`);
  }
  const roleOpts = ROLES;
  return `
  <div class="grid cols-2">
    ${card('Add Staff Account', `
      <form onsubmit="handleAddStaff(event)">
        <div class="field"><label>Full name</label><input id="us_name" required></div>
        <div class="field"><label>Email</label><input type="email" id="us_email" required></div>
        <div class="field"><label>Temporary password</label><input type="password" id="us_password" required minlength="8" placeholder="At least 8 characters"></div>
        <div class="field"><label>Role</label><select id="us_role">${roleOpts.map(r=>`<option>${r}</option>`).join('')}</select></div>
        <button class="btn" type="submit">Create account</button>
      </form>
      <p style="font-size:12px;color:var(--muted);margin-top:10px;">Share this password with them directly — there's no "change my password" screen yet, so treat it as a temporary one for now.</p>
    `)}
    ${card('Existing Staff <span class="count">('+STAFF.length+')</span>', table(
      ['Name','Email','Role',''],
      STAFF.map(u=>{
        const isSelf = u.id===SESSION.id;
        const safeName = u.fullName.replace(/'/g, "\\'");
        const roleCell = isSelf
          ? u.role + ' <span style="color:var(--muted);font-size:11px;">(you)</span>'
          : `<select onchange="handleChangeStaffRole(${u.id}, '${safeName}', this.value)" style="width:auto;padding:4px 8px;">${roleOpts.map(r=>`<option ${r===u.role?'selected':''}>${r}</option>`).join('')}</select>`;
        const deleteCell = isSelf ? '—' : `<button class="btn btn-sm btn-danger" onclick="handleDeleteStaff(${u.id}, '${safeName}')">Delete</button>`;
        return [u.fullName, u.email, roleCell, deleteCell];
      })
    )) + `<p style="font-size:12px;color:var(--muted);margin-top:10px;">You can't delete or change the role of your own account, and the system won't let the last remaining Admin be removed or demoted.</p>`}
  </div>`;
}
// Called once at page load — decides demo mode vs. live mode by trying
// to reach the PHP API. A network-level failure (no server, wrong path,
// CORS) means LIVE stays false; anything else (even a 401) means the
// PHP backend IS there and reachable.
async function checkBackend(){
  try{
    const res = await fetch(`${API_AUTH}?action=me`, {credentials:'same-origin'});
    LIVE = true;
    if(res.ok){
      const data = await res.json();
      if(data.user) SESSION = data.user; // already has a valid PHP session cookie
    }
  }catch(e){
    LIVE = false;
  }
}

/* ============================================================
   Navigation config
   ============================================================ */
const SUBSYSTEMS = [
  {key:'facilities', label:'Facilities Reservation', seal:'F', modules:[
    {key:'listing', label:'Facility Listing'},
    {key:'booking', label:'Booking & Scheduling'},
    {key:'checkin', label:'QR Check-in / Check-out'},
    {key:'approval', label:'Approval Workflow'},
    {key:'reports', label:'Usage Reports'},
  ]},
  {key:'visitors', label:'Visitor Management', seal:'V', modules:[
    {key:'register', label:'Pre-registration / Walk-in'},
    {key:'pass', label:'QR Visitor Pass'},
    {key:'log', label:'Check-in / Check-out Log'},
    {key:'host', label:'Host Notification'},
    {key:'history', label:'Visitor Logs & History'},
    {key:'blacklist', label:'Blacklist / Watchlist'},
  ]},
  {key:'documents', label:'Document Management', seal:'D', modules:[
    {key:'upload', label:'Upload & Categorization'},
    {key:'versions', label:'Version Control'},
    {key:'tagging', label:'QR Document Tagging'},
    {key:'search', label:'Search'},
    {key:'permissions', label:'Access Permissions'},
    {key:'archival', label:'Archival & Disposal Scheduling'},
  ]},
  {key:'retention', label:'Records Retention & Compliance', seal:'R', modules:[
    {key:'schedule', label:'Retention Schedule Config'},
    {key:'alerts', label:'Expiration Alerts'},
    {key:'compliance', label:'Compliance Checklist'},
    {key:'disposal', label:'Disposal Approval Workflow'},
    {key:'legalhold', label:'Legal Hold Override'},
  ]},
  {key:'legal', label:'Legal Management', seal:'L', modules:[
    {key:'cases', label:'Case / Issue Tracking'},
    {key:'repository', label:'Legal Document Repository'},
    {key:'deadlines', label:'Deadline & Court Date Reminders'},
    {key:'correspondence', label:'Correspondence Log'},
    {key:'riskflag', label:'Risk / Compliance Flagging'},
  ]},
  {key:'contracts', label:'Contract Management', seal:'C', modules:[
    {key:'create', label:'Contract Creation / Upload'},
    {key:'signature', label:'Signature Tracking'},
    {key:'verify', label:'QR Contract Verification'},
    {key:'lifecycle', label:'Lifecycle Tracking'},
    {key:'renewal', label:'Renewal & Expiration Alerts'},
    {key:'approval', label:'Approval Workflow'},
    {key:'analytics', label:'Contract Analytics'},
  ]},
];

/* ============================================================
   Roles & Permissions
   ------------------------------------------------------------
   Every role except Admin gets access to a deliberately narrow
   slice of the system — a whitelist of exact subsystem+module
   pairs, not just hidden buttons. goTo() enforces this (see
   below), so a role can't reach a screen it isn't permitted to
   even by typing a link or clicking a stale bookmark.

   'modules': 'all' → every module in that subsystem
   'modules': [...] → only those module keys
   ============================================================ */
const ROLES = [
  'Admin',
  'Facilities Specialist',
  'Front Desk / Security',
  'Legal Counsel',
  'Compliance Manager',
  'Contract Administrator',
  'General Staff',
  'Records Officer',
  'Approver (Director/VP)',
  'External Auditor',
];

const PERMISSIONS = {
  // Admin is special-cased in hasAccess()/visibleSubsystems() below — full access to everything.
  'Facilities Specialist': {
    facilities: 'all',
  },
  'Front Desk / Security': {
    visitors: 'all',
  },
  'Legal Counsel': {
    legal: 'all',
  },
  'Compliance Manager': {
    retention: 'all',
  },
  'Contract Administrator': {
    // Drafts, reviews, and renews contracts — but final sign-off on
    // high-value contracts belongs to Approvers, not Administrators.
    contracts: ['create','signature','verify','lifecycle','renewal','analytics'],
  },
  'General Staff': {
    // Regular employees: book a room, invite a guest, search policies —
    // nothing beyond those three specific everyday actions.
    facilities: ['booking'],
    visitors: ['register'],
    documents: ['search'],
  },
  'Records Officer': {
    documents: 'all',
  },
  'Approver (Director/VP)': {
    // Reviews and signs — not drafting, not day-to-day contract admin.
    contracts: ['lifecycle','approval','analytics'],
  },
  'External Auditor': {
    // Read-only in spirit: only the view-oriented modules are reachable at
    // all, so there's nothing to edit even if they poke around. Excludes
    // Upload (Documents) and Schedule/Disposal/Legal Hold (Retention),
    // which are the only modules in those two subsystems with forms or
    // approve/toggle actions.
    documents: ['versions','tagging','search','permissions','archival'],
    retention: ['alerts','compliance'],
  },
};

// Does this role have access to this exact subsystem+module?
function hasAccess(role, sub, mod){
  if(sub==='dashboard') return true; // everyone lands here
  if(role==='Admin') return true;
  const perm = PERMISSIONS[role]?.[sub];
  if(!perm) return false;
  return perm==='all' || perm.includes(mod);
}
// Which subsystems (and which of their modules) should this role see in the sidebar?
function visibleSubsystems(role){
  if(role==='Admin') return SUBSYSTEMS.map(s=>({...s, modules:s.modules}));
  return SUBSYSTEMS
    .filter(s=>PERMISSIONS[role]?.[s.key])
    .map(s=>{
      const perm = PERMISSIONS[role][s.key];
      const modules = perm==='all' ? s.modules : s.modules.filter(m=>perm.includes(m.key));
      return {...s, modules};
    });
}
// First module a role is allowed to land on when opening a subsystem —
// used by goTo() when no specific module is requested.
function firstAllowedModule(role, sub){
  if(role==='Admin') return SUBSYSTEMS.find(s=>s.key===sub).modules[0].key;
  const perm = PERMISSIONS[role]?.[sub];
  if(!perm) return null;
  const s = SUBSYSTEMS.find(x=>x.key===sub);
  return perm==='all' ? s.modules[0].key : s.modules.find(m=>perm.includes(m.key))?.key;
}

const APP = { sub:'dashboard', mod:null, openGroup:null, qrQueue:[] };

/* ============================================================
   Small render helpers
   ============================================================ */
function stampClass(status){ return 'stamp stamp-' + status.toLowerCase().replace(/[^a-z]/g,''); }
function stamp(status){ return `<span class="${stampClass(status)}">${status}</span>`; }
function card(title,inner,extra){ return `<div class="card" ${extra||''}><h3>${title}</h3>${inner}</div>`; }
function table(headers, rows){
  if(!rows.length) return `<div class="empty">No records yet.</div>`;
  return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function queueQR(id,text){ APP.qrQueue.push({id,text}); }
// Builds the actual URL a scanned QR should open — resolved relative to
// wherever index.html is currently being served from, so it works whether
// you're on localhost, a LAN IP, or a real domain. verify.php is public
// and requires no login (see api/db.php's note on this) — that's the
// whole point of a scannable verification QR.
function verifyUrl(type, id){
  return new URL(`verify.php?type=${type}&id=${encodeURIComponent(id)}`, window.location.href).href;
}
function flushQR(){
  APP.qrQueue.forEach(q=>{
    const el = document.getElementById(q.id);
    if(el && window.QRCode){ el.innerHTML=''; new QRCode(el,{text:q.text,width:104,height:104,colorDark:'#1F2937',colorLight:'#ffffff'}); }
  });
  APP.qrQueue = [];
}

/* ------------------------------------------------------------
   Camera QR Scanner — the "scan" half of the QR system. Uses the
   device camera + jsQR to read a code live, then looks the record
   up right here (no need to leave the app or open verify.php),
   with contextual check-in/out actions where that makes sense.
   Permission to actually perform an action is still enforced by
   the normal API/writeRoles path underneath — scanning something
   you can't act on just surfaces the same error you'd get from
   the regular screen.
   ------------------------------------------------------------ */
let scanStream = null;
let scanRAF = null;

async function openScanner(){
  document.getElementById('scanResult').innerHTML = '';
  document.getElementById('scanHint').style.display = 'block';
  document.getElementById('scanCameraWrap').style.display = 'block';
  document.getElementById('scanOverlay').classList.add('open');
  if(!window.jsQR){
    document.getElementById('scanCameraWrap').style.display = 'none';
    document.getElementById('scanResult').innerHTML = `<div class="scan-error">QR scanning library failed to load — check your internet connection and reload the page.</div>`;
    return;
  }
  try{
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('scanVideo');
    video.srcObject = scanStream;
    await video.play();
    scanLoop();
  }catch(err){
    document.getElementById('scanCameraWrap').style.display = 'none';
    document.getElementById('scanResult').innerHTML = `<div class="scan-error">Couldn't access the camera (${err.message}). Check your browser's camera permission for this site — note the camera only works over "localhost" or a real HTTPS address, not a plain http:// LAN address from another device.</div>`;
  }
}
function closeScanner(){
  document.getElementById('scanOverlay').classList.remove('open');
  if(scanRAF){ cancelAnimationFrame(scanRAF); scanRAF=null; }
  if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; }
}
function scanLoop(){
  const video = document.getElementById('scanVideo');
  const canvas = document.getElementById('scanCanvas');
  if(video.readyState === video.HAVE_ENOUGH_DATA){
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if(code && code.data){ handleScannedText(code.data); return; }
  }
  scanRAF = requestAnimationFrame(scanLoop);
}
function handleScannedText(text){
  if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; }
  if(scanRAF){ cancelAnimationFrame(scanRAF); scanRAF=null; }
  document.getElementById('scanCameraWrap').style.display = 'none';
  document.getElementById('scanHint').style.display = 'none';

  let type=null, id=null;
  try{
    const u = new URL(text);
    type = u.searchParams.get('type');
    id = u.searchParams.get('id');
  }catch(e){ /* scanned text wasn't a URL at all */ }

  if(!type || !id){
    document.getElementById('scanResult').innerHTML = `<div class="scan-error">This doesn't look like a TravelCore QR code.</div><div style="text-align:center;margin-top:10px;"><button class="btn btn-sm btn-ghost" onclick="rescan()">Try again</button></div>`;
    return;
  }
  renderScanResult(type, id);
}
function rescan(){
  document.getElementById('scanResult').innerHTML = '';
  openScanner();
}
const QR_TYPE_CONFIG = {
  facility: { key:'bookings', title:r=>r.facility, status:r=>r.status,
    rows:r=>({'Booking ID':r.id,'Purpose':r.purpose,'Date':fmt(r.date),'Time':r.start+'–'+r.end}) },
  visitor: { key:'visitors', title:r=>r.name, status:r=>r.status,
    rows:r=>({'Visitor ID':r.id,'Host':r.host,'Company':r.company,'Purpose':r.purpose}) },
  document: { key:'documents', title:r=>r.title, status:r=>r.status,
    rows:r=>({'Document ID':r.id,'Category':r.category,'Owner':r.owner,'Filed':fmt(r.dateAdded)}) },
  contract: { key:'contracts', title:r=>r.title, status:r=>(r.legalHold?'Hold':r.status),
    rows:r=>({'Contract ID':r.id,'Party':r.party,'Term':fmt(r.start)+' – '+fmt(r.end),'Value':r.value||'—'}) },
};
function renderScanResult(type, id){
  const cfg = QR_TYPE_CONFIG[type];
  const resultEl = document.getElementById('scanResult');
  if(!cfg){ resultEl.innerHTML = `<div class="scan-error">Unrecognized QR type: "${type}".</div>`; return; }
  const record = DB[cfg.key].find(r=>r.id===id);
  if(!record){
    resultEl.innerHTML = `<div class="scan-error">No matching record found for ${id}. It may have been removed.</div><div style="text-align:center;margin-top:10px;"><button class="btn btn-sm btn-ghost" onclick="rescan()">Scan again</button></div>`;
    return;
  }
  const rows = cfg.rows(record);
  const status = cfg.status(record);
  const actions = [];
  if(type==='facility'){
    if(record.status==='Approved') actions.push({label:'Check In', onclick:`scanQrAction('facility','${id}','checkin')`});
    else if(record.status==='Checked-in') actions.push({label:'Check Out', onclick:`scanQrAction('facility','${id}','checkout')`});
  }
  if(type==='visitor'){
    if(record.status==='Registered') actions.push({label:'Check In', onclick:`scanQrAction('visitor','${id}','checkin')`});
    else if(record.status==='Checked-in') actions.push({label:'Check Out', onclick:`scanQrAction('visitor','${id}','checkout')`});
  }
  resultEl.innerHTML = `
    <div class="scan-result-card">
      ${stamp(status)}
      <h4>${cfg.title(record)}</h4>
      ${Object.entries(rows).map(([k,v])=>`<div class="scan-result-row"><span style="color:var(--muted);">${k}</span><span style="font-weight:500;">${v}</span></div>`).join('')}
      <div class="btn-row" style="margin-top:14px;">
        ${actions.map(a=>`<button class="btn btn-sm" onclick="${a.onclick}">${a.label}</button>`).join('')}
        <button class="btn btn-sm btn-ghost" onclick="rescan()">Scan another</button>
      </div>
    </div>
  `;
}
async function scanQrAction(type, id, action){
  if(type==='facility'){
    await setBookingStatus(id, action==='checkin' ? 'Checked-in' : 'Completed');
  }
  if(type==='visitor'){
    await setVisitorStatus(id, action==='checkin' ? 'Checked-in' : 'Checked-out');
  }
  renderScanResult(type, id);
}
function logActivity(msg){
  const t = new Date().toTimeString().slice(0,5);
  DB.auditLog.unshift({t,d:msg});
  if(DB.auditLog.length>10) DB.auditLog.pop();
}
function tagCard(eyebrow,title,meta,qrId,qrText,code){
  return `<div class="tag-card">
    <div class="tag-stub">
      <div class="rtitle">${eyebrow}</div>
      <h4>${title}</h4>
      <div class="meta">${meta.map(m=>`<div>${m}</div>`).join('')}</div>
    </div>
    <div class="tag-divider"></div>
    <div class="tag-qr">
      <div class="qrbox" id="${qrId}"></div>
      <div class="code">${code}</div>
    </div>
  </div>`;
}

/* ============================================================
   DASHBOARD
   ============================================================ */
// Turns a day count into readable phrasing whether it's upcoming or
// already overdue — "-3" reads a lot worse to a user than "3 days overdue".
function dayPhrase(days){
  if(days < 0) return `${Math.abs(days)} day(s) overdue`;
  if(days === 0) return 'today';
  return `in ${days} day(s)`;
}
function computeAlerts(){
  const alerts = [];
  DB.contracts.forEach(c=>{ if(c.status==='Active'){ const d=daysUntil(c.end); if(d<=30) alerts.push({type:'Contract',msg:`${c.title} expires ${dayPhrase(d)}`,due:c.end,overdue:d<0}); }});
  DB.documents.forEach(d=>{
    const sched = DB.retentionSchedule.find(s=>s.type===d.category);
    if(sched){ const disposal = new Date(d.dateAdded); disposal.setFullYear(disposal.getFullYear()+sched.years);
      const days = Math.ceil((disposal-TODAY)/86400000);
      if(days<=60) alerts.push({type:'Retention',msg:`${d.title} reaches retention limit (${sched.years}y) ${dayPhrase(days)}`,due:disposal.toISOString().slice(0,10),overdue:days<0});
    }
  });
  DB.legalCases.forEach(c=>{ const d=daysUntil(c.deadline); if(d<=14) alerts.push({type:'Legal',msg:`${c.title} — deadline ${dayPhrase(d)}`,due:c.deadline,overdue:d<0}); });
  return alerts.sort((a,b)=>new Date(a.due)-new Date(b.due));
}

function renderDashboard(){
  const alerts = computeAlerts();
  const onSite = DB.visitors.filter(v=>v.status==='Checked-in').length;
  const bookingsToday = DB.bookings.filter(b=>b.date===todayStr()).length;
  const pendingApprovals = DB.bookings.filter(b=>b.status==='Pending').length + DB.contracts.filter(c=>c.status==='Draft').length;

  return `
  <div class="page-head">
    <div class="eyebrow">Centralized Overview</div>
    <h2>Good morning — here's today at a glance</h2>
    <p class="sub">Branch-wide status across all six subsystems, pulled live from bookings, visitor logs, documents, and contracts.</p>
  </div>
  <div class="grid cols-4">
    ${card('',`<div class="num">${bookingsToday}</div><div class="lbl">Facility bookings today</div><span class="delta up">on schedule</span>`,'class="card stat"')}
    ${card('',`<div class="num">${onSite}</div><div class="lbl">Visitors on-site now</div><span class="delta up">checked in</span>`,'class="card stat"')}
    ${card('',`<div class="num">${alerts.length}</div><div class="lbl">Open compliance / renewal alerts</div><span class="delta warn">needs review</span>`,'class="card stat"')}
    ${card('',`<div class="num">${pendingApprovals}</div><div class="lbl">Items pending approval</div><span class="delta warn">action needed</span>`,'class="card stat"')}
  </div>

  <div class="grid cols-2" style="margin-top:18px;">
    ${card('Alerts requiring attention <span class="count">(' + alerts.length + ')</span>',
      alerts.length ? `<table><thead><tr><th>Type</th><th>Detail</th><th>Due</th></tr></thead><tbody>${
        alerts.slice(0,6).map(a=>`<tr><td>${stamp(a.type)}</td><td>${a.msg}</td><td class="mono">${fmt(a.due)}</td></tr>`).join('')
      }</tbody></table>` : `<div class="empty">Nothing needs attention right now.</div>`
    )}
    ${card('Recent activity',
      `<div>${DB.auditLog.map(a=>`<div class="feed-item"><div class="t">${a.t}</div><div class="d">${a.d}</div></div>`).join('')}</div>`
    )}
  </div>

  <div class="section-title">Quick access</div>
  <div class="grid cols-3">
    ${[
      hasAccess(SESSION.role,'facilities','booking') ? card('Facilities Reservation','<p style="color:var(--muted);font-size:12.5px;">'+DB.bookings.length+' active bookings across '+DB.facilities.length+' facilities.</p><button class="btn btn-sm" onclick="goTo(\'facilities\',\'booking\')">Open module</button>') : '',
      hasAccess(SESSION.role,'contracts','lifecycle') ? card('Contract Management','<p style="color:var(--muted);font-size:12.5px;">'+DB.contracts.filter(c=>c.status==="Active").length+' active contracts on file.</p><button class="btn btn-sm" onclick="goTo(\'contracts\',\'lifecycle\')">Open module</button>') : '',
      hasAccess(SESSION.role,'retention','alerts') ? card('Records Retention','<p style="color:var(--muted);font-size:12.5px;">'+DB.documents.length+' archived documents tracked.</p><button class="btn btn-sm" onclick="goTo(\'retention\',\'alerts\')">Open module</button>') : '',
    ].filter(Boolean).join('') || '<div class="empty">No quick-access modules for your role — use the sidebar to get started.</div>'}
  </div>
  `;
}

/* ============================================================
   FACILITIES RESERVATION
   ============================================================ */
function facilitiesListing(){
  return card('Registered Facilities & Resources', table(
    ['ID','Name','Type','Capacity'],
    DB.facilities.map(f=>[`<span class="id">${f.id}</span>`, f.name, f.type, f.capacity])
  ));
}
function facilitiesBooking(){
  const opts = DB.facilities.map(f=>`<option>${f.name}</option>`).join('');
  return `
  <div class="grid cols-2">
    ${card('New Reservation Request', `
      <form onsubmit="handleAddBooking(event)">
        <div class="field"><label>Facility</label><select id="bk_facility">${opts}</select></div>
        <div class="field"><label>Purpose</label><input id="bk_purpose" placeholder="e.g. Client consultation" required></div>
        <div class="field-row">
          <div class="field"><label>Date</label><input type="date" id="bk_date" value="2026-07-22" required></div>
          <div class="field"><label>Requested by</label><input id="bk_by" placeholder="Staff name" required></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Start time</label><input type="time" id="bk_start" value="09:00" required></div>
          <div class="field"><label>End time</label><input type="time" id="bk_end" value="10:00" required></div>
        </div>
        <button class="btn" type="submit">Submit request</button>
      </form>
    `)}
    ${card('Booking Calendar <span class="count">('+DB.bookings.length+')</span>', table(
      ['ID','Facility','Date','Time','Status'],
      DB.bookings.map(b=>[`<span class="id">${b.id}</span>`, b.facility, fmt(b.date), b.start+'–'+b.end, stamp(b.status)])
    ))}
  </div>`;
}
function facilityTagFor(b){
  if(!b) return `<div class="empty">No bookings available for check-in.</div>`;
  return tagCard('Facility Access Pass', b.facility, ['Booking '+b.id, fmt(b.date)+' · '+b.start+'–'+b.end, 'Status: '+b.status], 'qr_facility', verifyUrl('facility', b.id), b.id);
}
function facilitiesCheckin(){
  const eligible = DB.bookings.filter(b=>b.status==='Approved'||b.status==='Checked-in');
  const opts = eligible.map(b=>`<option value="${b.id}">${b.id} — ${b.facility}</option>`).join('');
  const first = eligible[0];
  if(first) queueQR('qr_facility', verifyUrl('facility', first.id));
  return `
  <div class="grid cols-2">
    ${card('Generate Check-in QR', `
      <div class="field"><label>Booking</label><select id="ci_booking" onchange="refreshFacilityQR(this.value)">${opts || '<option>No approved bookings</option>'}</select></div>
      <p style="font-size:12px;color:var(--muted);">The QR resolves live against this booking's record — scanning after cancellation or completion will show an invalid stamp instead of granting access.</p>
    `)}
    <div id="facilityTagWrap">${facilityTagFor(first)}</div>
  </div>
  <div class="section-title">Simulate scan</div>
  ${card("Today's Check-in Activity", table(
    ['ID','Facility','Status',''],
    DB.bookings.map(b=>[`<span class="id">${b.id}</span>`, b.facility, stamp(b.status),
      b.status==='Approved' ? `<button class="btn btn-sm" onclick="scanFacility('${b.id}')">Scan → Check-in</button>` :
      b.status==='Checked-in' ? `<button class="btn btn-sm btn-ghost" onclick="completeFacility('${b.id}')">Scan → Check-out</button>` : '—'
    ])
  ))}
  `;
}
function facilitiesApproval(){
  const pending = DB.bookings.filter(b=>b.status==='Pending');
  return card('Bookings Awaiting Approval <span class="count">('+pending.length+')</span>', table(
    ['ID','Facility','Purpose','Requested by',''],
    pending.map(b=>[`<span class="id">${b.id}</span>`, b.facility, b.purpose, b.requestedBy,
      `<div class="btn-row"><button class="btn btn-sm" onclick="setBookingStatus('${b.id}','Approved')">Approve</button><button class="btn btn-sm btn-danger" onclick="setBookingStatus('${b.id}','Rejected')">Reject</button></div>`])
  ) + (pending.length ? '' : ''));
}
function facilitiesReports(){
  const byFacility = {};
  DB.bookings.forEach(b=>{ byFacility[b.facility]=(byFacility[b.facility]||0)+1; });
  const max = Math.max(1,...Object.values(byFacility));
  const rows = Object.entries(byFacility).sort((a,b)=>b[1]-a[1]);
  return card('Utilization — Bookings per Facility', `
    <div style="display:flex;flex-direction:column;gap:12px;">
    ${rows.map(([name,count])=>`
      <div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;"><span>${name}</span><span class="mono">${count}</span></div>
        <div style="background:var(--line-soft);height:8px;border-radius:4px;"><div style="width:${(count/max)*100}%;background:var(--brass);height:8px;border-radius:4px;"></div></div>
      </div>`).join('')}
    </div>
  `);
}

/* ============================================================
   VISITOR MANAGEMENT
   ============================================================ */
// Case-insensitive match against the Blacklist/Watchlist — exact match or
// one name containing the other, so "Juan Dela Cruz" still catches a
// watchlist entry of just "Dela Cruz". Returns the matched entry, or null.
function findBlacklistMatch(name){
  const norm = (name||'').trim().toLowerCase();
  if(!norm) return null;
  return DB.blacklist.find(b=>{
    const bn = b.name.trim().toLowerCase();
    return bn===norm || norm.includes(bn) || bn.includes(norm);
  }) || null;
}
function visitorsRegister(){
  return `
  <div class="grid cols-2">
    ${card('Register Visitor', `
      <form onsubmit="handleAddVisitor(event)">
        <div class="field"><label>Full name</label><input id="vs_name" required placeholder="e.g. Juan Dela Cruz"></div>
        <div class="field"><label>Purpose of visit</label><input id="vs_purpose" required placeholder="e.g. Contract signing"></div>
        <div class="field-row">
          <div class="field"><label>Company / Affiliation</label><input id="vs_company" placeholder="Optional"></div>
          <div class="field"><label>Host employee</label><input id="vs_host" required placeholder="Staff being visited"></div>
        </div>
        <button class="btn" type="submit">Register &amp; generate pass</button>
      </form>
    `)}
    ${card("Today's Registrations", table(
      ['ID','Name','Purpose','Status'],
      DB.visitors.filter(v=>v.date===todayStr()).map(v=>{
        const flagged = findBlacklistMatch(v.name);
        const nameCell = flagged ? `${v.name} <span title="Matches Blacklist/Watchlist: ${flagged.reason}" style="color:var(--rust);font-size:11px;font-weight:600;">⚠ Flagged</span>` : v.name;
        return [`<span class="id">${v.id}</span>`, nameCell, v.purpose, stamp(v.status)];
      })
    ))}
  </div>`;
}
function visitorTagFor(v){
  return tagCard('Visitor Pass', v.name, ['Host: '+v.host, v.company, fmt(v.date)], 'qr_visitor', verifyUrl('visitor', v.id), v.id);
}
function visitorsPass(){
  const opts = DB.visitors.map(v=>`<option value="${v.id}">${v.id} — ${v.name}</option>`).join('');
  const v = DB.visitors[0];
  queueQR('qr_visitor', verifyUrl('visitor', v.id));
  return `
  <div class="grid cols-2">
    ${card('Select Visitor', `<div class="field"><label>Visitor</label><select id="ps_visitor" onchange="refreshVisitorQR(this.value)">${opts}</select></div>
      <p style="font-size:12px;color:var(--muted);">Each pass is time-bound to the visit date and is revoked automatically at check-out.</p>`)}
    <div id="visitorTagWrap">${visitorTagFor(v)}</div>
  </div>`;
}
function visitorsLog(){
  return card('Check-in / Check-out Log', table(
    ['ID','Name','Host','Status',''],
    DB.visitors.map(v=>[`<span class="id">${v.id}</span>`, v.name, v.host, stamp(v.status),
      v.status==='Registered' ? `<button class="btn btn-sm" onclick="setVisitorStatus('${v.id}','Checked-in')">Check in</button>` :
      v.status==='Checked-in' ? `<button class="btn btn-sm btn-ghost" onclick="setVisitorStatus('${v.id}','Checked-out')">Check out</button>` : '—'])
  ));
}
function visitorsHost(){
  return card('Host Notifications', table(
    ['Visitor','Host','Status',''],
    DB.visitors.map(v=>[v.name, v.host, v.notified?stamp('Notified'):stamp('Pending'),
      v.notified ? '—' : `<button class="btn btn-sm" onclick="notifyHost('${v.id}')">Send notification</button>`])
  ));
}
function visitorsHistory(){
  return card('Visitor History', `
    <div class="field" style="max-width:280px;"><input placeholder="Search by name or company…" oninput="filterVisitorHistory(this.value)"></div>
    <div id="visitorHistoryTable">${table(['ID','Name','Company','Date','Status'], DB.visitors.map(v=>[`<span class="id">${v.id}</span>`,v.name,v.company,fmt(v.date),stamp(v.status)]))}</div>
  `);
}
function visitorsBlacklist(){
  const list = DB.blacklist || (DB.blacklist=[{name:'Unknown Solicitor', reason:'Repeated unsolicited sales visits', date:'2026-05-02'}]);
  return `
  <div class="grid cols-2">
    ${card('Add to Watchlist', `
      <form onsubmit="handleAddBlacklist(event)">
        <div class="field"><label>Name</label><input id="bl_name" required></div>
        <div class="field"><label>Reason</label><input id="bl_reason" required></div>
        <button class="btn" type="submit">Flag entry</button>
      </form>
    `)}
    ${card('Flagged Individuals', table(['Name','Reason','Date Added',''],
      list.map((b,i)=>[b.name,b.reason,fmt(b.date),`<button class="btn btn-sm btn-ghost" onclick="removeBlacklist(${i})">Remove</button>`])
    ))}
  </div>`;
}

/* ============================================================
   DOCUMENT MANAGEMENT
   ============================================================ */
function documentsUpload(){
  const catOpts = DB.retentionSchedule.map(s=>`<option>${s.type}</option>`).join('');
  return `
  <div class="grid cols-2">
    ${card('Upload New Document (metadata)', `
      <form onsubmit="handleAddDocument(event)">
        <div class="field"><label>Title</label><input id="dc_title" required></div>
        <div class="field-row">
          <div class="field"><label>Category</label><select id="dc_category">${catOpts}</select></div>
          <div class="field"><label>Owner</label><input id="dc_owner" required></div>
        </div>
        <button class="btn" type="submit">File document</button>
      </form>
    `)}
    ${card('Recently Filed', table(['ID','Title','Category'],
      DB.documents.slice(0,5).map(d=>[`<span class="id">${d.id}</span>`,d.title,d.category])
    ))}
  </div>`;
}
function documentsVersions(){
  const d = DB.documents[1];
  return card('Version History — ' + d.title, table(
    ['Version','Date','Editor','Note'],
    [[d.version,fmt(d.dateAdded),d.owner,'Current filed version'],
     ['v1.0','2022-11-03','R. Dizon','Initial supplier agreement upload'],
     ['v1.2','2022-12-19','Legal Dept.','Amended payment terms clause']]
  ));
}
function docTagFor(d){
  return tagCard('Archive Folder Tag', d.title, ['Category: '+d.category, 'Owner: '+d.owner, 'Filed: '+fmt(d.dateAdded)], 'qr_doc', verifyUrl('document', d.id), d.id);
}
function documentsTagging(){
  const opts = DB.documents.map(d=>`<option value="${d.id}">${d.id} — ${d.title}</option>`).join('');
  const d = DB.documents[0];
  queueQR('qr_doc', verifyUrl('document', d.id));
  return `
  <div class="grid cols-2">
    ${card('Select Document', `<div class="field"><label>Document</label><select id="tg_doc" onchange="refreshDocQR(this.value)">${opts}</select></div>
      <p style="font-size:12px;color:var(--muted);">Print this tag on the physical archive folder — scanning resolves live to this record's digital index, status, and retention date.</p>`)}
    <div id="docTagWrap">${docTagFor(d)}</div>
  </div>`;
}
function documentsSearch(){
  return card('Search Documents', `
    <div class="field" style="max-width:320px;"><input placeholder="Search title, category, or owner…" oninput="filterDocs(this.value)"></div>
    <div id="docSearchTable">${table(['ID','Title','Category','Owner','Status'], DB.documents.map(d=>[`<span class="id">${d.id}</span>`,d.title,d.category,d.owner,stamp(d.status)]))}</div>
  `);
}
function documentsPermissions(){
  // Reflects the real PERMISSIONS map: Records Officer has full edit rights
  // in Document Management, Admin always does, External Auditor is
  // view-only by design, and everyone else here simply has no access to
  // this subsystem at all (they wouldn't reach this screen in the first
  // place — see hasAccess()).
  const roles = ['Admin','Records Officer','External Auditor'];
  return card('Access Permission Matrix', `<table><thead><tr><th>Document Category</th>${roles.map(r=>`<th>${r}</th>`).join('')}</tr></thead><tbody>
    ${DB.retentionSchedule.map(s=>`<tr><td>${s.type}</td>${roles.map(r=>`<td>${r==='External Auditor' ? '👁 View' : '✎ Edit'}</td>`).join('')}</tr>`).join('')}
  </tbody></table>`);
}
function documentsArchival(){
  return card('Archival & Disposal Schedule', table(
    ['ID','Title','Category','Filed','Retention','Disposal Due'],
    DB.documents.map(d=>{
      const sched = DB.retentionSchedule.find(s=>s.type===d.category);
      const disposal = new Date(d.dateAdded); disposal.setFullYear(disposal.getFullYear()+(sched?sched.years:5));
      const soon = (disposal-TODAY)/86400000 <= 60;
      return [`<span class="id">${d.id}</span>`,d.title,d.category,fmt(d.dateAdded),(sched?sched.years:5)+' yrs', soon ? `<span style="color:var(--rust);font-family:'Poppins',sans-serif;">${disposal.toISOString().slice(0,10)}</span>` : disposal.toISOString().slice(0,10)];
    })
  ));
}

/* ============================================================
   RECORDS RETENTION & COMPLIANCE
   ============================================================ */
function retentionSchedule(){
  return card('Retention Schedule Configuration', table(
    ['Record Type','Retention Period'],
    DB.retentionSchedule.map((s,i)=>[s.type, `<input type="number" value="${s.years}" style="width:70px;display:inline-block;" onchange="updateRetentionYears(${i}, this.value)"> years`])
  ) + `<p style="font-size:12px;color:var(--muted);margin-top:10px;">Editing a period recalculates disposal alerts and archival schedules across the Document Management subsystem automatically.</p>`);
}
function retentionAlerts(){
  const alerts = computeAlerts().filter(a=>a.type==='Retention');
  return card('Records Approaching Retention Limit', alerts.length ? table(['Detail','Due'], alerts.map(a=>[a.msg, `<span class="mono">${fmt(a.due)}</span>`])) : `<div class="empty">No records nearing disposal.</div>`);
}
function retentionCompliance(){
  const items = [
    'DTI business permit accreditation on file',
    'DOT/DOTr travel agency accreditation current',
    'Data Privacy Act (RA 10173) registration active',
    'Annual records disposal log submitted',
    'Contract legal-hold list reviewed this quarter',
  ];
  return card('Compliance Checklist', `<div>${items.map((it,i)=>`
    <label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line-soft);font-size:13px;">
      <input type="checkbox" ${i<3?'checked':''}> ${it}
    </label>`).join('')}</div>`);
}
function retentionDisposal(){
  const candidates = DB.documents.filter(d=>d.status==='Active').slice(0,3);
  return card('Disposal Approval Queue', table(
    ['ID','Title','Category',''],
    candidates.map(d=>[`<span class="id">${d.id}</span>`,d.title,d.category,
      `<button class="btn btn-sm" onclick="approveDisposal('${d.id}')">Approve disposal</button>`])
  ));
}
function retentionLegalHold(){
  return card('Legal Hold Overrides', table(
    ['Contract','Related Case','Hold Status',''],
    DB.contracts.filter(c=>c.legalHold || DB.legalCases.some(l=>l.relatedContract===c.id)).map(c=>{
      const lc = DB.legalCases.find(l=>l.relatedContract===c.id);
      return [c.title, lc?lc.id:'—', c.legalHold?stamp('Hold'):stamp('Active'),
        `<button class="btn btn-sm btn-ghost" onclick="toggleLegalHold('${c.id}')">${c.legalHold?'Release hold':'Place hold'}</button>`];
    })
  ) + `<p style="font-size:12px;color:var(--muted);margin-top:10px;">Records under legal hold cannot be disposed of, even past their retention date, until released here.</p>`);
}

/* ============================================================
   LEGAL MANAGEMENT
   ============================================================ */
function legalCases(){
  return `
  <div class="grid cols-2">
    ${card('Log New Case', `
      <form onsubmit="handleAddCase(event)">
        <div class="field"><label>Title</label><input id="lc_title" required></div>
        <div class="field-row">
          <div class="field"><label>Type</label><select id="lc_type"><option>Client Dispute</option><option>Supplier Dispute</option><option>Compliance</option><option>Employment</option></select></div>
          <div class="field"><label>Deadline</label><input type="date" id="lc_deadline" required></div>
        </div>
        <button class="btn" type="submit">Open case</button>
      </form>
    `)}
    ${card('Case Register', table(['ID','Title','Type','Status'], DB.legalCases.map(c=>[`<span class="id">${c.id}</span>`,c.title,c.type,stamp(c.status)])))}
  </div>`;
}
function legalRepository(){
  return card('Linked Legal Documents', table(
    ['Case','Related Contract','Document'],
    DB.legalCases.map(c=>[c.title, c.relatedContract, c.relatedContract!=='—' ? (DB.contracts.find(ct=>ct.id===c.relatedContract)?.title || '—') : '—'])
  ));
}
function legalDeadlines(){
  const sorted = [...DB.legalCases].sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  return card('Upcoming Deadlines', table(
    ['Case','Deadline','Days Remaining'],
    sorted.map(c=>{ const d=daysUntil(c.deadline); return [c.title, fmt(c.deadline), d<=7?`<span style="color:var(--rust);">${d} days</span>`:d+' days']; })
  ));
}
function legalCorrespondence(){
  const log = DB.correspondence || (DB.correspondence=[
    {date:'2026-07-11', withParty:'Meridian Travel Consortium (Legal)', subject:'Notice re: Booking BK-071 refund dispute'},
    {date:'2026-06-28', withParty:'Boracay Sands Resort', subject:'Formal notice — overbooking incident clause 4.2'},
  ]);
  return `
  <div class="grid cols-2">
    ${card('Log Correspondence', `
      <form onsubmit="handleAddCorrespondence(event)">
        <div class="field"><label>With</label><input id="co_with" required></div>
        <div class="field"><label>Subject</label><input id="co_subject" required></div>
        <button class="btn" type="submit">Add entry</button>
      </form>
    `)}
    ${card('Correspondence Log', table(['Date','With','Subject'], log.map(l=>[fmt(l.date),l.withParty,l.subject])))}
  </div>`;
}
function legalRiskflag(){
  const flagged = DB.contracts.filter(c=>c.legalHold);
  return card('Contracts Flagged for Risk', flagged.length ? table(
    ['Contract','Party','Reason'],
    flagged.map(c=>[c.title,c.party, DB.legalCases.find(l=>l.relatedContract===c.id)?.title || 'Under legal review'])
  ) : `<div class="empty">No contracts currently flagged.</div>`);
}

/* ============================================================
   CONTRACT MANAGEMENT
   ============================================================ */
function contractsCreate(){
  return `
  <div class="grid cols-2">
    ${card('New Contract', `
      <form onsubmit="handleAddContract(event)">
        <div class="field"><label>Title</label><input id="ct_title" required></div>
        <div class="field-row">
          <div class="field"><label>Party</label><input id="ct_party" required></div>
          <div class="field"><label>Type</label><select id="ct_type"><option>Client Package</option><option>Supplier Agreement</option><option>Partner MOU</option><option>Employment</option><option>Lease</option></select></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Start date</label><input type="date" id="ct_start" required></div>
          <div class="field"><label>End date</label><input type="date" id="ct_end" required></div>
        </div>
        <button class="btn" type="submit">Save as draft</button>
      </form>
    `)}
    ${card('All Contracts <span class="count">('+DB.contracts.length+')</span>', table(
      ['ID','Title','Status'], DB.contracts.map(c=>[`<span class="id">${c.id}</span>`,c.title,stamp(c.status)])
    ))}
  </div>`;
}
function contractsSignature(){
  return card('Signature Status', table(
    ['ID','Title','Signed',''],
    DB.contracts.map(c=>[`<span class="id">${c.id}</span>`,c.title, c.signed?stamp('Active'):stamp('Pending'),
      c.signed?'—':`<button class="btn btn-sm" onclick="markSigned('${c.id}')">Mark signed</button>`])
  ));
}
function contractsVerify(){
  const opts = DB.contracts.map(c=>`<option value="${c.id}">${c.id} — ${c.title}</option>`).join('');
  const c = DB.contracts[0];
  queueQR('qr_contract', verifyUrl('contract', c.id));
  return `
  <div class="grid cols-2">
    ${card('Select Contract to Verify', `<div class="field"><label>Contract</label><select id="vf_contract" onchange="refreshContractQR(this.value)">${opts}</select></div>
      <p style="font-size:12px;color:var(--muted);">Printed on the physical contract. Scanning always queries live status — a terminated or held contract will show as such even if the paper copy still reads "Active".</p>`)}
    <div id="contractTagWrap">${contractTagFor(c)}</div>
  </div>`;
}
function contractTagFor(c){
  const displayStatus = c.legalHold ? 'Hold' : c.status;
  return `<div class="tag-card">
    <div class="tag-stub">
      <div class="rtitle">Contract Verification</div>
      <h4>${c.title}</h4>
      <div class="meta"><div>Party: ${c.party}</div><div>Term: ${fmt(c.start)} – ${fmt(c.end)}</div><div>${stamp(displayStatus)}</div></div>
    </div>
    <div class="tag-divider"></div>
    <div class="tag-qr"><div class="qrbox" id="qr_contract"></div><div class="code">${c.id}</div></div>
  </div>`;
}
function contractsLifecycle(){
  const stages = ['Draft','Active','Expiring Soon','Renewed','Terminated'];
  const withComputed = DB.contracts.map(c=>{
    let stage = c.status;
    if(stage==='Active' && daysUntil(c.end)<=30) stage='Expiring Soon';
    return {...c, stage};
  });
  return `<div class="kanban">${stages.map(s=>`
    <div><h4>${s} <span class="mono">(${withComputed.filter(c=>c.stage===s).length})</span></h4>
    ${withComputed.filter(c=>c.stage===s).map(c=>`<div class="kcard"><span class="id mono">${c.id}</span>${c.title}</div>`).join('') || '<div class="empty" style="padding:14px 8px;font-size:11px;">—</div>'}
    </div>`).join('')}</div>`;
}
function contractsRenewal(){
  const soon = DB.contracts.filter(c=>c.status==='Active' && daysUntil(c.end)<=30);
  return card('Contracts Expiring Within 30 Days', soon.length ? table(
    ['ID','Title','End Date','Days Left',''],
    soon.map(c=>[`<span class="id">${c.id}</span>`,c.title,fmt(c.end),daysUntil(c.end), `<button class="btn btn-sm" onclick="renewContract('${c.id}')">Mark renewed</button>`])
  ) : `<div class="empty">No contracts expiring soon.</div>`);
}
function contractsApproval(){
  const drafts = DB.contracts.filter(c=>c.status==='Draft');
  return card('Multi-level Sign-off Queue', drafts.length ? table(
    ['ID','Title','Approval Level',''],
    drafts.map(c=>[`<span class="id">${c.id}</span>`,c.title, c.approvalLevel+' / 2',
      `<button class="btn btn-sm" onclick="advanceApproval('${c.id}')">${c.approvalLevel<2?'Approve next level':'Activate contract'}</button>`])
  ) : `<div class="empty">No drafts awaiting approval.</div>`);
}
function contractsAnalytics(){
  const byStatus = {};
  DB.contracts.forEach(c=>byStatus[c.status]=(byStatus[c.status]||0)+1);
  return `<div class="grid cols-4">
    ${Object.entries(byStatus).map(([s,n])=>card('',`<div class="num">${n}</div><div class="lbl">${s}</div>`,'class="card stat"')).join('')}
  </div>
  <div class="section-title">By type</div>
  ${card('Contract Types on File', table(['Type','Count'], Object.entries(DB.contracts.reduce((a,c)=>{a[c.type]=(a[c.type]||0)+1;return a;},{})).map(([t,n])=>[t,n])))}`;
}

/* ============================================================
   Module registry
   ============================================================ */
const MODULE_RENDER = {
  facilities:{listing:facilitiesListing, booking:facilitiesBooking, checkin:facilitiesCheckin, approval:facilitiesApproval, reports:facilitiesReports},
  visitors:{register:visitorsRegister, pass:visitorsPass, log:visitorsLog, host:visitorsHost, history:visitorsHistory, blacklist:visitorsBlacklist},
  documents:{upload:documentsUpload, versions:documentsVersions, tagging:documentsTagging, search:documentsSearch, permissions:documentsPermissions, archival:documentsArchival},
  retention:{schedule:retentionSchedule, alerts:retentionAlerts, compliance:retentionCompliance, disposal:retentionDisposal, legalhold:retentionLegalHold},
  legal:{cases:legalCases, repository:legalRepository, deadlines:legalDeadlines, correspondence:legalCorrespondence, riskflag:legalRiskflag},
  contracts:{create:contractsCreate, signature:contractsSignature, verify:contractsVerify, lifecycle:contractsLifecycle, renewal:contractsRenewal, approval:contractsApproval, analytics:contractsAnalytics},
};

/* ============================================================
   Chrome: sidebar / topbar / content orchestration
   ============================================================ */
function renderSidebar(){
  const el = document.getElementById('sidebar');
  const role = SESSION?.role;
  const subs = role ? visibleSubsystems(role) : [];
  el.innerHTML = `
    <div class="brand">
      <div class="mark">T</div>
      <h1>TravelCore</h1>
      <p>TOUR &amp; TRAVEL ADMIN SYSTEM</p>
    </div>
    <a href="#" class="nav-dash ${APP.sub==='dashboard'?'active':''}" onclick="goTo('dashboard',null);return false;">Dashboard</a>
    ${SESSION && SESSION.role==='Admin' ? `<a href="#" class="nav-dash ${APP.sub==='staff'?'active':''}" onclick="goTo('staff',null);return false;">Staff Accounts</a>` : ''}
    ${subs.map(s=>`
      <div class="nav-group">
        <div class="nav-head ${APP.sub===s.key?'active':''} ${APP.openGroup===s.key?'open':''}" onclick="toggleGroup('${s.key}')">
          <span class="seal">${s.seal}</span>${s.label}<span class="chev">›</span>
        </div>
        <div class="nav-modules ${APP.openGroup===s.key?'open':''}">
          ${s.modules.map(m=>`<a href="#" class="${APP.sub===s.key&&APP.mod===m.key?'active':''}" onclick="goTo('${s.key}','${m.key}');return false;">${m.label}</a>`).join('')}
        </div>
      </div>
    `).join('')}
  `;
}
function toggleGroup(key){
  APP.openGroup = APP.openGroup===key ? null : key;
  renderSidebar();
}
async function goTo(sub,mod){
  const role = SESSION?.role;
  // Staff Accounts is Admin-only, gated separately from the module map below.
  if(sub==='staff'){
    if(role!=='Admin'){ sub='dashboard'; mod=null; }
  } else if(sub!=='dashboard'){
    // Resolve which module we're actually trying to land on, then check
    // the role is allowed there at all — covers direct clicks, the bell's
    // "jump to alert" links, and any stale/typed-in navigation alike.
    const targetMod = mod || firstAllowedModule(role, sub);
    if(!role || !targetMod || !hasAccess(role, sub, targetMod)){
      sub = 'dashboard'; mod = null;
    } else {
      mod = targetMod;
    }
  }
  APP.sub = sub;
  APP.mod = mod;
  APP.openGroup = sub;
  if(sub==='staff') await loadUsers();
  render();
}
function currentSubsystem(){ return SUBSYSTEMS.find(s=>s.key===APP.sub); }

/* ------------------------------------------------------------
   Notification bell — a real dropdown now, not just a static count
   ------------------------------------------------------------ */
function renderBellDropdown(){
  const alerts = computeAlerts();
  const wrap = document.getElementById('bellDropdown');
  if(!wrap) return;
  const list = alerts.length
    ? alerts.slice(0,8).map(a=>`
        <div class="bd-item" onclick="jumpToAlert('${a.type}')">
          <div class="bd-type" style="color:${a.overdue ? 'var(--rust)' : 'var(--warn)'};">${a.type}${a.overdue ? ' · Overdue' : ''}</div>
          <div class="bd-msg">${a.msg}</div>
        </div>`).join('')
    : `<div class="bd-empty">Nothing needs attention right now.</div>`;
  wrap.innerHTML = `
    <div class="bd-head">${alerts.length} alert${alerts.length===1?'':'s'} need${alerts.length===1?'s':''} attention</div>
    ${list}
    <div class="bd-foot" onclick="goTo('dashboard',null); toggleBell();">View full dashboard</div>
  `;
}
function toggleBell(e){
  if(e) e.stopPropagation();
  document.getElementById('bellDropdown').classList.toggle('open');
}
function jumpToAlert(type){
  // Contract/Retention/Legal alerts each live in a different subsystem —
  // send the person straight to the module where they'd act on it.
  if(type==='Contract') goTo('contracts','renewal');
  else if(type==='Retention') goTo('retention','alerts');
  else if(type==='Legal') goTo('legal','deadlines');
  toggleBell();
}
// Close the dropdown when clicking anywhere outside it.
document.addEventListener('click', (e)=>{
  const wrap = document.getElementById('bellWrap');
  if(wrap && !wrap.contains(e.target)) document.getElementById('bellDropdown')?.classList.remove('open');
});

function render(){
  renderSidebar();
  const crumb = document.getElementById('crumb');
  const content = document.getElementById('content');
  document.getElementById('alertCount').textContent = computeAlerts().length;
  renderBellDropdown();

  if(SESSION){
    const initials = SESSION.fullName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    document.getElementById('userChip').innerHTML = `
      <div class="av">${initials}</div> ${SESSION.fullName} — ${SESSION.role}
      <button class="btn-ghost btn-sm" style="margin-left:10px;" onclick="handleLogout()">Sign out</button>
    `;
  }

  if(APP.sub==='dashboard'){
    crumb.innerHTML = '<b>Dashboard</b>';
    content.innerHTML = renderDashboard();
  } else if(APP.sub==='staff'){
    crumb.innerHTML = '<b>Staff Accounts</b>';
    content.innerHTML = renderStaffAccounts();
  } else {
    const sub = currentSubsystem();
    const allowedModules = SESSION.role==='Admin' ? sub.modules : sub.modules.filter(m=>hasAccess(SESSION.role, sub.key, m.key));
    const modLabel = sub.modules.find(m=>m.key===APP.mod)?.label || '';
    crumb.innerHTML = `${sub.label} / <b>${modLabel}</b>`;
    content.innerHTML = `
      <div class="page-head">
        <div class="eyebrow">${sub.label}</div>
        <h2>${modLabel}</h2>
      </div>
      <div class="tabs">
        ${allowedModules.map(m=>`<div class="tab-pill ${APP.mod===m.key?'active':''}" onclick="goTo('${sub.key}','${m.key}')">${m.label}</div>`).join('')}
      </div>
      <div id="moduleBody">${MODULE_RENDER[sub.key][APP.mod]()}</div>
    `;
  }
  flushQR();
}

/* ============================================================
   Action handlers (mutate DB, re-render)
   ============================================================ */
async function handleAddBooking(e){
  e.preventDefault();
  const b = {id:nextId('BK'), facility:document.getElementById('bk_facility').value, purpose:document.getElementById('bk_purpose').value,
    requestedBy:document.getElementById('bk_by').value, date:document.getElementById('bk_date').value,
    start:document.getElementById('bk_start').value, end:document.getElementById('bk_end').value, status:'Pending'};
  await dbInsert('bookings', b);
  logActivity(`New booking request ${b.id} submitted for ${b.facility}.`);
  render();
}
async function setBookingStatus(id,status){
  await dbUpdate('bookings','id',id,{status});
  logActivity(`Booking ${id} marked ${status}.`);
  render();
}
function refreshFacilityQR(id){
  const b = DB.bookings.find(x=>x.id===id);
  document.getElementById('facilityTagWrap').innerHTML = facilityTagFor(b);
  queueQR('qr_facility', verifyUrl('facility', b.id));
  flushQR();
}
function scanFacility(id){ setBookingStatus(id,'Checked-in'); }
function completeFacility(id){ setBookingStatus(id,'Completed'); }

async function handleAddVisitor(e){
  e.preventDefault();
  const v = {id:nextId('VS'), name:document.getElementById('vs_name').value, purpose:document.getElementById('vs_purpose').value,
    company:document.getElementById('vs_company').value||'—', host:document.getElementById('vs_host').value,
    date:todayStr(), status:'Registered', notified:false};

  // Warn staff if this name matches the Blacklist/Watchlist — this never
  // blocks registration. Whether to actually let the visitor in is a
  // judgment call for whoever's checking ID at the front desk, not
  // something the system decides for them.
  const flagged = findBlacklistMatch(v.name);
  if(flagged){
    alert(`⚠ WATCHLIST MATCH\n\n"${v.name}" matches an entry on the Blacklist/Watchlist:\n\nReason: ${flagged.reason}\nFlagged on: ${fmt(flagged.date)}\n\nRegistration will still proceed — please verify this visitor's ID before allowing entry.`);
  }

  await dbInsert('visitors', v);
  logActivity(`Visitor ${v.name} registered (${v.id}).` + (flagged ? ' ⚠ Name matches Blacklist/Watchlist — verify ID.' : ''));
  render();
}
async function setVisitorStatus(id,status){
  const v = DB.visitors.find(x=>x.id===id);
  await dbUpdate('visitors','id',id,{status});
  logActivity(`Visitor ${v.name} — ${status}.`);
  render();
}
async function notifyHost(id){
  const v = DB.visitors.find(x=>x.id===id);
  await dbUpdate('visitors','id',id,{notified:true});
  logActivity(`Host ${v.host} notified of visitor ${v.name}.`);
  render();
}
function refreshVisitorQR(id){
  const v = DB.visitors.find(x=>x.id===id);
  document.getElementById('visitorTagWrap').innerHTML = visitorTagFor(v);
  queueQR('qr_visitor', verifyUrl('visitor', v.id));
  flushQR();
}
function filterVisitorHistory(q){
  const rows = DB.visitors.filter(v=>v.name.toLowerCase().includes(q.toLowerCase())||v.company.toLowerCase().includes(q.toLowerCase()));
  document.getElementById('visitorHistoryTable').innerHTML = table(['ID','Name','Company','Date','Status'], rows.map(v=>[`<span class="id">${v.id}</span>`,v.name,v.company,fmt(v.date),stamp(v.status)]));
}
async function handleAddBlacklist(e){
  e.preventDefault();
  await dbInsert('blacklist', {name:document.getElementById('bl_name').value, reason:document.getElementById('bl_reason').value, date:todayStr()});
  render();
}
async function removeBlacklist(i){
  const row = DB.blacklist[i];
  if(LIVE && row.id!=null){ await dbDelete('blacklist','id',row.id); }
  else { DB.blacklist.splice(i,1); }
  render();
}

async function handleAddDocument(e){
  e.preventDefault();
  const d = {id:nextId('DC'), title:document.getElementById('dc_title').value, category:document.getElementById('dc_category').value,
    owner:document.getElementById('dc_owner').value, dateAdded:todayStr(), version:'v1.0', retentionYears:5, status:'Active'};
  await dbInsert('documents', d);
  logActivity(`Document ${d.id} filed — ${d.title}.`);
  render();
}
function refreshDocQR(id){
  const d = DB.documents.find(x=>x.id===id);
  document.getElementById('docTagWrap').innerHTML = docTagFor(d);
  queueQR('qr_doc', verifyUrl('document', d.id));
  flushQR();
}
function filterDocs(q){
  const rows = DB.documents.filter(d=>[d.title,d.category,d.owner].join(' ').toLowerCase().includes(q.toLowerCase()));
  document.getElementById('docSearchTable').innerHTML = table(['ID','Title','Category','Owner','Status'], rows.map(d=>[`<span class="id">${d.id}</span>`,d.title,d.category,d.owner,stamp(d.status)]));
}

async function updateRetentionYears(i,val){
  const row = DB.retentionSchedule[i];
  await dbUpdate('retentionSchedule','type',row.type,{years: parseInt(val)||1});
  render();
}
async function approveDisposal(id){
  await dbUpdate('documents','id',id,{status:'Disposed'});
  logActivity(`Document ${id} approved for disposal.`);
  render();
}
async function toggleLegalHold(id){
  const c = DB.contracts.find(x=>x.id===id);
  const next = !c.legalHold;
  await dbUpdate('contracts','id',id,{legalHold: next});
  logActivity(`Legal hold ${next?'placed on':'released from'} contract ${id}.`);
  render();
}

async function handleAddCase(e){
  e.preventDefault();
  const c = {id:nextId('LC'), title:document.getElementById('lc_title').value, type:document.getElementById('lc_type').value,
    filed:todayStr(), deadline:document.getElementById('lc_deadline').value, status:'Open', relatedContract:'—'};
  await dbInsert('legalCases', c);
  logActivity(`Legal case ${c.id} opened — ${c.title}.`);
  render();
}
async function handleAddCorrespondence(e){
  e.preventDefault();
  await dbInsert('correspondence', {date:todayStr(), withParty:document.getElementById('co_with').value, subject:document.getElementById('co_subject').value});
  render();
}

async function handleAddContract(e){
  e.preventDefault();
  const c = {id:nextId('CT'), title:document.getElementById('ct_title').value, party:document.getElementById('ct_party').value,
    type:document.getElementById('ct_type').value, start:document.getElementById('ct_start').value, end:document.getElementById('ct_end').value,
    value:'—', status:'Draft', signed:false, approvalLevel:0, legalHold:false};
  await dbInsert('contracts', c);
  logActivity(`Contract ${c.id} created as draft — ${c.title}.`);
  render();
}
async function markSigned(id){
  await dbUpdate('contracts','id',id,{signed:true});
  logActivity(`Contract ${id} signed.`);
  render();
}
function refreshContractQR(id){
  const c = DB.contracts.find(x=>x.id===id);
  document.getElementById('contractTagWrap').innerHTML = contractTagFor(c);
  queueQR('qr_contract', verifyUrl('contract', c.id));
  flushQR();
}
async function renewContract(id){
  const c = DB.contracts.find(x=>x.id===id);
  const end = new Date(c.end); end.setFullYear(end.getFullYear()+1);
  const newEnd = end.toISOString().slice(0,10);
  await dbUpdate('contracts','id',id,{status:'Renewed', end:newEnd});
  logActivity(`Contract ${id} renewed — new term ends ${newEnd}.`);
  render();
}
async function advanceApproval(id){
  const c = DB.contracts.find(x=>x.id===id);
  if(c.approvalLevel<2){
    const nextLevel = c.approvalLevel+1;
    await dbUpdate('contracts','id',id,{approvalLevel: nextLevel});
    logActivity(`Contract ${id} approved at level ${nextLevel}.`);
    const updated = DB.contracts.find(x=>x.id===id);
    if(updated.approvalLevel>=2){
      await dbUpdate('contracts','id',id,{status:'Active', signed:true});
      logActivity(`Contract ${id} fully approved and activated.`);
    }
  }
  render();
}

/* ============================================================
   Authentication
   ============================================================ */
function setLoginModeUI(){
  const badge = document.getElementById('loginModeBadge');
  const note = document.getElementById('loginModeNote');
  const roleField = document.getElementById('demoRoleField');
  document.getElementById('login_role').innerHTML = ROLES.map(r=>`<option>${r}</option>`).join('');
  if(LIVE){
    badge.textContent = '● Connected to database';
    badge.style.color = 'var(--teal)'; badge.style.background = '#E7F8EF';
    note.textContent = 'Sign in with a staff account created via api/setup_admin.php.';
    roleField.style.display = 'none';
  } else {
    badge.textContent = '● Demo Mode (PHP backend not reachable)';
    badge.style.color = 'var(--warn)'; badge.style.background = '#FDF0E5';
    note.textContent = 'Any email/password works in demo mode — pick a role to explore its view. Serve this folder through Apache/XAMPP to connect the real database.';
    roleField.style.display = 'block';
  }
}
async function handleLogin(e){
  e.preventDefault();
  const email = document.getElementById('login_email').value.trim();
  const password = document.getElementById('login_password').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  if(LIVE){
    let res, payload;
    try{
      res = await fetch(`${API_AUTH}?action=login`, {
        method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email, password}),
      });
      payload = await res.json();
    }catch(err){ errEl.textContent = 'Could not reach the server.'; return; }
    if(!res.ok){ errEl.textContent = payload.error || 'Sign in failed.'; return; }
    SESSION = payload.user;
    await loadAllData();
  } else {
    if(!email || !password){ errEl.textContent = 'Enter an email and password.'; return; }
    const role = document.getElementById('login_role').value;
    SESSION = { id:'demo', fullName: email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), role, email };
  }
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appRoot').style.display = 'grid';
  goTo('dashboard', null);
}
async function handleLogout(){
  closeScanner(); // make sure the camera isn't left running behind the login screen
  if(LIVE){
    try{ await fetch(`${API_AUTH}?action=logout`, {method:'POST', credentials:'same-origin'}); }catch(e){}
  }
  SESSION = null;
  document.getElementById('appRoot').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginForm').reset();
}

/* ============================================================
   Init
   ============================================================ */
(async function init(){
  await checkBackend();
  setLoginModeUI();
  if(SESSION){
    // an existing PHP session cookie was already valid — skip the login form
    await loadAllData();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appRoot').style.display = 'grid';
    goTo('dashboard', null);
  }
})();