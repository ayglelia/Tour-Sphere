/* ============================================================
   TOURSPHERE — database-backed data cache
   ------------------------------------------------------------
   Records are loaded from MySQL through api/data.php. There is
   intentionally NO demo/fallback dataset in this build.
   ============================================================ */
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
function daysUntil(dateStr){ return Math.ceil((new Date(dateStr) - TODAY) / 86400000); }
function fmt(dateStr){ const d=new Date(dateStr); return d.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}); }
function todayStr(){
  const y = TODAY.getFullYear(), m = String(TODAY.getMonth()+1).padStart(2,'0'), d = String(TODAY.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
let counters = {FA:0, BK:0, VS:0, DC:0, LC:0, CT:0};
function nextId(prefix){ counters[prefix]++; return prefix+'-'+String(counters[prefix]).padStart(2,'0'); }

const DB = {
  facilities: [],
  bookings: [],
  visitors: [],
  blacklist: [],
  documents: [],
  documentVersions: [],
  retentionSchedule: [],
  legalCases: [],
  correspondence: [],
  contracts: [],
  auditLog: [],
};

/* ============================================================
   PHP/MySQL backend connection (see schema.sql + api/*.php)
   ------------------------------------------------------------
   The application requires the PHP/MySQL backend. If the backend
   cannot be reached, the app stays locked instead of silently
   storing records only in browser memory.
   ============================================================ */
const API_DATA = 'api/data.php';
const API_AUTH = 'api/auth.php';
let LIVE = false; // true only when the PHP backend is reachable

// DB.<key> array name → the ?resource= name the PHP API expects
// (they're identical on purpose — see $RESOURCES in api/data.php)
const TABLES = {

  facilities:'facilities',
  bookings:'bookings',
  visitors:'visitors',
  blacklist:'blacklist',

  documents:'documents',
  documentVersions:'documentVersions',
  retentionSchedule:'retentionSchedule',
  complianceChecklist:'complianceChecklist',
  legalCases:'legalCases',

  correspondence:'correspondence',
  contracts:'contracts',
  auditLog:'auditLog'

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
  if(!LIVE){ alert('Database is not connected. Nothing was saved.'); return null; }
  const saved = await apiCall('POST', TABLES[key], {body:row});
  if(!saved) return null;
  DB[key].unshift(saved);
  return saved;
}
// Update a row by whichever field identifies it (usually 'id', but
// retentionSchedule is keyed by 'type' since it has no id column).
async function dbUpdate(key, idField, idValue, changes){
  if(!LIVE){ alert('Database is not connected. Nothing was saved.'); return null; }
  const saved = await apiCall('PUT', TABLES[key], {id:idValue, body:changes});
  if(!saved) return null;
  const idx = DB[key].findIndex(r=>r[idField]===idValue);
  if(idx>-1) DB[key][idx] = saved;
  return saved;
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
function updateIdCounters(){
  const prefixes = {facilities:'FA', bookings:'BK', visitors:'VS', documents:'DC', legalCases:'LC', contracts:'CT'};
  for(const [key,prefix] of Object.entries(prefixes)){
    const max = (DB[key]||[]).reduce((m,r)=>{
      const n = Number(String(r.id||'').replace(/^\D+-?/,'').replace(/^.*?-/,''));
      return Number.isFinite(n) ? Math.max(m,n) : m;
    },0);
    counters[prefix] = max;
  }
}

async function loadAllData(){
  if(!LIVE) return;
  for(const key of Object.keys(TABLES)){
    const rows = await apiCall('GET', TABLES[key]);
    if(rows) DB[key] = rows;
  }
  updateIdCounters();
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


function openResetStaffPassword(userId, staffName){
  if (!SESSION || SESSION.role !== 'Admin') return;

  if (document.getElementById('resetStaffModal')) return;

  const modal = document.createElement('div');
  modal.id = 'resetStaffModal';

  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  `;

  modal.innerHTML = `
    <div role="dialog" aria-modal="true" aria-label="Reset Staff Password"
         style="background:white;padding:28px;border-radius:14px;width:100%;max-width:420px;">

      <h2>Reset Staff Password</h2>

      <p style="margin:15px 0;">
        You are resetting the password for
        <strong id="resetStaffName"></strong>.
      </p>

      <p style="font-size:13px;color:#6b7280;margin-bottom:20px;">
        This will replace the staff member's current password.
        Enter your Admin password to confirm.
      </p>

      <form id="resetStaffForm">

        
<div class="field">
  <label for="resetAdminPassword">Your Admin Password</label>

  <div style="display:flex;align-items:center;gap:8px;">
    <input type="password" id="resetAdminPassword"
           autocomplete="current-password" required
           style="flex:1;min-width:0;">

    <button type="button"
            class="btn btn-ghost"
            aria-label="Show password"
            aria-pressed="false"
            onclick="togglePasswordVisibility('resetAdminPassword', this)">
      👁️
    </button>
  </div>
</div>


        <p id="resetStaffError"
           role="alert"
           style="color:#dc2626;font-size:13px;"></p>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
          <button type="button" class="btn btn-ghost"
                  id="cancelStaffReset">
            Cancel
          </button>

          <button type="submit" class="btn" id="confirmStaffReset">
            Reset Password
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('resetStaffName').textContent = staffName;

  document.getElementById('cancelStaffReset').onclick = () => {
    modal.remove();
  };

  document.getElementById('resetStaffForm').onsubmit = event => {
    handleResetStaffPassword(event, userId);
  };

  document.getElementById('resetAdminPassword').focus();
}


async function handleResetStaffPassword(event, userId){
  event.preventDefault();

  const modal = document.getElementById('resetStaffModal');
  const adminPasswordInput = document.getElementById('resetAdminPassword');
  const errorBox = document.getElementById('resetStaffError');
  const submitBtn = document.getElementById('confirmStaffReset');
  const cancelBtn = document.getElementById('cancelStaffReset');

  if (!modal || !adminPasswordInput || !submitBtn) return;

  const adminPassword = adminPasswordInput.value;

  errorBox.textContent = '';
  submitBtn.disabled = true;
  cancelBtn.disabled = true;
  submitBtn.textContent = 'Resetting...';

  try {
    const response = await fetch('api/users.php?action=reset_password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        adminPassword
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }

    // Clear the Admin password from the form.
    adminPasswordInput.value = '';

    // Remove the confirmation form.
    document.getElementById('resetStaffForm').remove();

    // Show the temporary password only in this result dialog.
    const result = document.createElement('div');
    result.style.cssText = 'margin-top:20px;';

    const message = document.createElement('p');
    message.textContent = 'Password reset successful. Give this temporary password privately to the staff member.';

    const passwordDisplay = document.createElement('div');
    passwordDisplay.style.cssText = 'padding:14px;margin:16px 0;background:#f3f4f6;border-radius:8px;font-family:monospace;word-break:break-all;font-size:16px;';
    passwordDisplay.textContent = data.temporaryPassword;

    const note = document.createElement('p');
    note.style.cssText = 'font-size:12px;color:#6b7280;margin-bottom:16px;';
    note.textContent = 'This password will not be shown again. Ask the staff member to change it after logging in.';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => modal.remove();

    result.append(message, passwordDisplay, note, closeBtn);
    modal.querySelector('[role="dialog"]').appendChild(result);

  } catch (error) {
    errorBox.textContent = error.message || 'Something went wrong.';
    submitBtn.disabled = false;
    cancelBtn.disabled = false;
    submitBtn.textContent = 'Reset Password';
  }
}

function renderStaffAccounts(){
  if(!LIVE){
    return card('Staff Accounts', `<div class="empty">Staff account management needs the live database connection — this table requires the live database connection.</div>`);
  }
  const roleOpts = ROLES;
  return `
  <div class="grid cols-2">
    ${card('Add Staff Account', `
      <form onsubmit="handleAddStaff(event)">
        <div class="field"><label>Full name</label><input id="us_name" required></div>
        <div class="field"><label>Email</label><input type="email" id="us_email" required></div>
        
<div class="field">
  <label for="us_password">Temporary Password</label>

  <div style="display:flex;align-items:center;gap:8px;">
    <input type="password" id="us_password"
           required minlength="12"
           placeholder="At least 12 characters"
           style="flex:1;min-width:0;">

    <button type="button"
            class="btn btn-ghost"
            aria-label="Show password"
            aria-pressed="false"
            onclick="togglePasswordVisibility('us_password', this)">
      👁️
    </button>
  </div>
</div>

        <div class="field"><label>Role</label><select id="us_role">${roleOpts.map(r=>`<option>${r}</option>`).join('')}</select></div>
        <button class="btn" type="submit">Create account</button>
      </form>
      
<p style="font-size:12px;color:var(--muted);margin-top:10px;">
  Share the temporary password privately with the staff member.
  They can use Change Password after signing in.
</p>

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

const resetCell = (!isSelf && u.role !== 'Admin')
  ? `<button class="btn btn-sm" onclick="openResetStaffPassword(${u.id}, '${safeName}')">Reset Password</button>`
  : '';

return [u.fullName, u.email, roleCell, `${resetCell} ${deleteCell}`];

      })
    )) + `<p style="font-size:12px;color:var(--muted);margin-top:10px;">You can't delete or change the role of your own account, and the system won't let the last remaining Admin be removed or demoted.</p>`}
  </div>`;
}
// Called once at page load — checks whether the live backend is reachable by trying
// to reach the PHP API. A network-level failure (no server, wrong path,
// CORS) means LIVE stays false; anything else (even a 401) means the
// PHP backend IS there and reachable.
async function checkBackend(){
  try{
    const res = await fetch(`${API_AUTH}?action=me`, {credentials:'same-origin', cache:'no-store'});
    if(!res.ok && res.status !== 401){ throw new Error(`Backend returned ${res.status}`); }
    LIVE = true;
    if(res.ok){
      const data = await res.json();
      if(data.user) SESSION = data.user;
    }
  }catch(e){
    LIVE = false;
    SESSION = null;
    console.error('TourSphere backend unavailable:', e);
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
  'Front Desk / Operations',
  'Facilities & Compliance Officer',
  'Legal & Contracts Officer',
  'Records & Audit Officer'
];

const PERMISSIONS = {

  // Admin has full access to everything.
  // The other four roles are restricted according to their responsibilities.

  'Front Desk / Operations': {
    facilities: ['booking'],
    visitors: 'all',
    documents: ['search'],
  },

  'Facilities & Compliance Officer': {
    facilities: 'all',
    retention: 'all',
    documents: ['search','versions','tagging','archival'],
  },

  'Legal & Contracts Officer': {
    legal: 'all',
    contracts: 'all',
    documents: ['search','versions','tagging','archival'],
  },

  'Records & Audit Officer': {
    documents: 'all',
    retention: 'all',
    legal: ['search','analytics'],
    contracts: ['verify','analytics'],
    visitors: ['search','analytics'],
    facilities: ['search','analytics'],
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
    document.getElementById('scanResult').innerHTML = `<div class="scan-error">This doesn't look like a TourSphere QR code.</div><div style="text-align:center;margin-top:10px;"><button class="btn btn-sm btn-ghost" onclick="rescan()">Try again</button></div>`;
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
  const safe = encodeURIComponent(String(title));
  return `<div class="tag-card" data-qr-card="${qrId}">
    <div class="tag-stub">
      <div class="rtitle">${eyebrow}</div>
      <h4>${title}</h4>
      <div class="meta">${meta.map(m=>`<div>${m}</div>`).join('')}</div>
    </div>
    <div class="tag-divider"></div>
    <div class="tag-qr">
      <div class="qrbox" id="${qrId}"></div>
      <div class="code">${code}</div>
      <div class="qr-actions">
        <button class="btn btn-sm" type="button" onclick="printQRPass('${qrId}','${safe}','${encodeURIComponent(code)}')">Print QR</button>
        <button class="btn btn-sm btn-ghost" type="button" onclick="sendQRToEmail('${qrId}','${safe}','${encodeURIComponent(code)}')">Send to Email</button>
      </div>
    </div>
  </div>`;
}
function qrDataUrl(qrId){
  const box=document.getElementById(qrId);
  if(!box) return '';
  const canvas=box.querySelector('canvas');
  if(canvas) return canvas.toDataURL('image/png');
  const img=box.querySelector('img');
  return img?.src || '';
}
function printQRPass(qrId,titleEnc,codeEnc){
  const box=document.getElementById(qrId);
  const img=qrDataUrl(qrId);
  if(!box || !img){ alert('QR code is not ready yet. Please wait a moment and try again.'); return; }
  const title=decodeURIComponent(titleEnc), code=decodeURIComponent(codeEnc);
  const card=box.closest('.tag-card');
  const meta=card?.querySelector('.meta')?.innerHTML || '';
  const w=window.open('', '_blank', 'width=600,height=760');
  if(!w){ alert('Please allow pop-ups to print the QR pass.'); return; }
  w.document.write(`<!doctype html><html><head><title>TourSphere QR Pass</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:30px;color:#1f2937}.pass{border:1px solid #d1d5db;border-radius:14px;padding:28px;max-width:420px;margin:auto}.meta{text-align:left;margin:20px 0;line-height:1.7}.meta div{border-bottom:1px solid #eee;padding:5px 0}img{width:280px;height:280px}.code{font-weight:700;margin-top:12px}</style></head><body><div class="pass"><h2>TourSphere</h2><h3>${title}</h3><div class="meta">${meta}</div><img src="${img}" alt="QR Code"><div class="code">${code}</div></div><script>window.onload=()=>window.print();<\/script></body></html>`);
  w.document.close();
}

function sendQRToEmail(qrId, titleEnc, codeEnc){
  const title = decodeURIComponent(titleEnc);
  const code = decodeURIComponent(codeEnc);

  const type = qrId.startsWith('qr_visitor') ? 'visitor' : 'facility';
  const url = verifyUrl(type, code);

  const subject = `TourSphere QR Verification - ${code}`;

  const body = `Hello,

Please use the verification link below to view your QR pass.

Name / Title: ${title}
Reference ID: ${code}

Verification Link:
${url}

You may also scan the QR code provided separately.

Regards,
TourSphere`;

  window.location.href =
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  DB.contracts.forEach(c => {

    if(c.status === 'Active'){

      const d = daysUntil(c.end);

      if(d <= 30){

        alerts.push({
          type: 'Contract',
          msg: `${c.title} expires ${dayPhrase(d)}`,
          due: c.end,
          overdue: d < 0
        });

      }

    }

  });

  DB.documents.forEach(d => {

    const sched =
      DB.retentionSchedule.find(
        s => s.type === d.category
      );

    if(sched){

      const disposal =
        new Date(d.dateAdded);

      disposal.setFullYear(
        disposal.getFullYear() +
        Number(sched.years)
      );

      const days =
        Math.ceil(
          (disposal - TODAY) /
          86400000
        );

      if(days <= 60){

        alerts.push({

          type: 'Retention',

          documentId: d.id,

          msg:
            `${d.title} reaches retention limit ` +
            `(${sched.years}y) ${dayPhrase(days)}`,

          due:
            disposal.toISOString().slice(0,10),

          overdue:
            days < 0

        });

      }

    }

  });

  DB.legalCases.forEach(c => {

    const d =
      daysUntil(c.deadline);

    if(d <= 14){

      alerts.push({

        type: 'Legal',

        msg:
          `${c.title} — deadline ${dayPhrase(d)}`,

        due:
          c.deadline,

        overdue:
          d < 0

      });

    }

  });

  return alerts.sort(
    (a,b) =>
      new Date(a.due) -
      new Date(b.due)
  );

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
        <div class="field"><label>Registration Method</label><select id="vs_method" required><option value="Walk-in">Walk-in</option><option value="Email">Email</option><option value="Call">Call</option></select></div>
        <div class="field-row">
          <div class="field"><label>Full name</label><input id="vs_name" required placeholder="e.g. Juan Dela Cruz"></div>
          <div class="field"><label>Visitor email</label><input id="vs_email" type="email" placeholder="Optional for walk-in"></div>
        </div>
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
  if(!v) return `<div class="empty">No visitors registered yet.</div>`;
  return tagCard('Visitor Pass', v.name, ['Registration: '+(v.registrationMethod||'Walk-in'), 'Host: '+v.host, v.company, v.email ? 'Email: '+v.email : 'Email: —', 'Visit date: '+fmt(v.date)], 'qr_visitor', verifyUrl('visitor', v.id), v.id);
}
function visitorsPass(){
  const opts = DB.visitors.map(v=>`<option value="${v.id}">${v.id} — ${v.name}</option>`).join('');
  const v = DB.visitors[0];
  if(v) queueQR('qr_visitor', verifyUrl('visitor', v.id));
  return `
  <div class="grid cols-2">
    ${card('Select Visitor', `<div class="field"><label>Visitor</label><select id="ps_visitor" onchange="refreshVisitorQR(this.value)">${opts || '<option>No visitors registered</option>'}</select></div>
      <p style="font-size:12px;color:var(--muted);">Each pass is time-bound to the visit date and is revoked automatically at check-out.</p>`)}
    <div id="visitorTagWrap">${visitorTagFor(v)}</div>
  </div>`;
}
function visitorsLog(){
  return card('Check-in / Check-out Log', table(
    ['ID','Name','Host','Check-in','Check-out','Status',''],
    DB.visitors.map(v=>[
      `<span class="id">${v.id}</span>`,
      v.name,
      v.host,
      v.checkedInAt ? fmtDateTime(v.checkedInAt) : '—',
      v.checkedOutAt ? fmtDateTime(v.checkedOutAt) : '—',
      stamp(v.status),
      v.status==='Registered'
        ? `<button class="btn btn-sm" onclick="setVisitorStatus('${v.id}','Checked-in')">Check in</button>`
        : v.status==='Checked-in'
          ? `<button class="btn btn-sm btn-ghost" onclick="setVisitorStatus('${v.id}','Checked-out')">Check out</button>`
          : '—'
    ])
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

  const catOpts = DB.retentionSchedule
    .map(s => `
      <option value="${s.type}">
        ${s.type}
      </option>
    `)
    .join('');

  const contractOpts = `
    <option value="">No related contract</option>

    ${DB.contracts
      .filter(c => c.status !== 'Terminated')
      .map(c => `
        <option value="${c.id}">
          ${c.title} (${c.id})
        </option>
      `)
      .join('')}
  `;

  const firstSchedule = DB.retentionSchedule[0];

  const defaultRetention = firstSchedule
    ? firstSchedule.years
    : '';

  return `
  <div style="display:flex; flex-direction:column; gap:24px;">

    ${card('Upload New Document', `
      <form onsubmit="handleAddDocument(event)" enctype="multipart/form-data">

        <div class="field">
          <label>Title</label>
          <input id="dc_title" required>
        </div>

        <div class="field-row">

          <div class="field">
            <label>Record Type / Category</label>

            <select
              id="dc_category"
              onchange="updateDocumentRetentionPreview()"
              required
            >
              ${catOpts}
            </select>
          </div>

          <div class="field">
            <label>Owner</label>
            <input id="dc_owner" required>
          </div>

        </div>

        <div class="field">

          <label>Related Contract</label>

          <select id="dc_contract">
            ${contractOpts}
          </select>

          <small style="color:var(--muted);">
            Select the contract connected to this document.
            Documents under a contract legal hold cannot be disposed of.
          </small>

        </div>

        <div class="field-row">

          <div class="field">
            <label>Filed / Date Added</label>

            <input
              type="date"
              id="dc_date_added"
              value="${new Date().toISOString().slice(0,10)}"
              required
            >

            <small style="color:var(--muted);">
              For historical records, enter the original filing date.
            </small>
          </div>

          <div class="field">
            <label>Retention Period</label>

            <input
              type="text"
              id="dc_retention"
              value="${defaultRetention ? defaultRetention + ' years' : '—'}"
              readonly
            >

            <small
              id="dc_retention_help"
              style="color:var(--muted);"
            >
              Automatically determined by the selected record type.
            </small>
          </div>

        </div>

        <div class="field">
          <label>Attachment</label>

          <input
            type="file"
            id="dc_file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            required
          >

          <small style="color:var(--muted);">
            Maximum 10 MB.
          </small>
        </div>

        <button class="btn" type="submit">
          Upload & File Document
        </button>

      </form>
    `)}

    ${card('Recently Filed', table(
      ['ID','Title','Category','Attachment'],
      DB.documents.slice(0,5).map(d => [

        `<span class="id">${d.id}</span>`,

        d.title,

        d.category,

        d.fileName
          ? `<a
              href="api/download_document.php?id=${encodeURIComponent(d.id)}"
              target="_blank"
              class="btn btn-sm btn-ghost">
              Download
            </a>`
          : `<span style="color:var(--muted);">
              No attachment
            </span>`

      ])
    ))}

  </div>`;
}

function updateDocumentRetentionPreview(){

  const category =
    document.getElementById('dc_category')?.value;

  const retentionInput =
    document.getElementById('dc_retention');

  const help =
    document.getElementById('dc_retention_help');

  if(!category || !retentionInput){
    return;
  }

  const schedule =
    DB.retentionSchedule.find(
      s => s.type === category
    );

  if(!schedule){

    retentionInput.value = '—';

    if(help){
      help.textContent =
        'No retention rule configured for this record type.';
    }

    return;
  }

  retentionInput.value =
    `${schedule.years} years`;

  if(help){
    help.textContent =
      'Automatically determined by the selected record type.';
  }
}

function documentsVersions(){
  const opts = DB.documents.map(d=>`<option value="${d.id}">${d.id} — ${d.title}</option>`).join('');
  const d = DB.documents[0];
  if(!d) return card('Version Control', `<div class="empty">No documents on file yet — add one from Upload &amp; Categorization.</div>`);
  const versions = DB.documentVersions
    .filter(v=>v.documentId===d.id)
    .sort((a,b)=>String(b.editedAt||'').localeCompare(String(a.editedAt||'')));
  return `
  <div class="grid cols-2">
    ${card('Add New Version', `
      <form onsubmit="handleAddDocumentVersion(event)" enctype="multipart/form-data">

  <div class="field">
    <label>Document</label>
    <select id="dv_document" onchange="renderDocumentVersionHistory(this.value)" required>
      ${opts}
    </select>
  </div>

  <div class="field">
    <label>Version</label>
    <input id="dv_version" placeholder="e.g. v2.0" required>
  </div>

  <div class="field">
    <label>Version File</label>
    <input
      type="file"
      id="dv_file"
      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
      required
    >
    <small style="color:var(--muted);">
      Maximum 10 MB.
    </small>
  </div>

  <div class="field">
    <label>Change Description</label>
    <textarea
      id="dv_note"
      placeholder="Describe what changed in this version..."
      required
    ></textarea>
  </div>

  <button class="btn" type="submit">
    Upload & Save Version
  </button>

</form>
    `)}
    <div id="documentVersionHistory">${documentVersionHistoryHtml(d.id)}</div>
  </div>`;
}
function fmtDateTime(value){
  if(!value) return '—';

  const d = new Date(value.replace(' ','T'));

  if(isNaN(d)) return value;

  return d.toLocaleString('en-US',{
    month:'short',
    day:'numeric',
    year:'numeric',
    hour:'numeric',
    minute:'2-digit'
  });
}
function documentVersionHistoryHtml(documentId){

  const d = DB.documents.find(x => x.id === documentId);

  if(!d){
    return card(
      'Version History',
      '<div class="empty">Document not found.</div>'
    );
  }

  const versions = DB.documentVersions
    .filter(v => v.documentId === documentId)
    .sort((a,b) =>
      String(b.editedAt || '').localeCompare(
        String(a.editedAt || '')
      )
    );

  const rows = [];

  // Original uploaded document
  rows.push([
    d.version || 'v1.0',
    fmt(d.dateAdded),
    d.owner,
    'Original document',
    d.fileName
      ? `<a
          href="api/download_document.php?id=${encodeURIComponent(d.id)}"
          class="btn btn-sm btn-ghost"
          target="_blank">
          Download
        </a>`
      : '<span style="color:var(--muted);">No file</span>'
  ]);

  // Uploaded later versions
  versions.forEach(v => {

    rows.push([
      v.version,
      fmtDateTime(v.editedAt),
      v.editedBy,
      v.note || '—',
      v.fileName
        ? `<a
            href="api/download_document_version.php?id=${encodeURIComponent(v.id)}"
            class="btn btn-sm btn-ghost"
            target="_blank">
            Download
          </a>`
        : '<span style="color:var(--muted);">No file</span>'
    ]);

  });

  return card(
    'Version History — ' + d.title,
    table(
      ['Version','Date','Editor','Note','File'],
      rows
    )
  );
}

function renderDocumentVersionHistory(documentId){
  const el = document.getElementById('documentVersionHistory');
  if(el) el.innerHTML = documentVersionHistoryHtml(documentId);
}

function docTagFor(d, versionChoice){

  if(!d){
    return `<div class="empty">No documents on file yet.</div>`;
  }

  const isVersion =
    versionChoice &&
    versionChoice.type === 'document_version' &&
    versionChoice.version;

  const version = isVersion
    ? versionChoice.version
    : null;

  const versionLabel = isVersion
    ? version.version
    : (d.version || 'v1.0');

  const fileName = isVersion
    ? version.fileName
    : d.fileName;

  const qrUrl = isVersion
    ? verifyUrl('document_version', version.id)
    : verifyUrl('document', d.id);

  return tagCard(
    'Archive Folder Tag',
    d.title + ' — ' + versionLabel,
    [
      'Category: ' + d.category,
      'Owner: ' + d.owner,
      'Version: ' + versionLabel,
      'File: ' + (fileName || 'No attachment'),
      'Filed: ' + fmt(d.dateAdded)
    ],
    'qr_doc',
    qrUrl,
    d.id
  );
}

function documentsTagging(){

  const docs = DB.documents;

  if(!docs.length){
    return `
      <div class="grid cols-2">

        ${card(
          'Select Document',
          `<div class="empty">No documents on file yet.</div>`
        )}

        <div class="empty">
          No document available for QR tagging.
        </div>

      </div>
    `;
  }

  const d = docs[0];

  const docOpts = docs
    .map(x =>
      `<option value="${x.id}">
        ${x.id} — ${x.title}
      </option>`
    )
    .join('');

  queueQR(
    'qr_doc',
    verifyUrl('document', d.id)
  );

  return `
    <div class="grid cols-2">

      ${card('Select Document & Version', `

        <div class="field">
          <label>Document</label>

          <select
            id="tg_doc"
            onchange="refreshDocumentVersionOptions()"
          >
            ${docOpts}
          </select>
        </div>

        <div class="field">
          <label>Version</label>

          <select
            id="tg_version"
            onchange="refreshDocQR()"
          >
            ${documentVersionOptions(d.id)}
          </select>
        </div>

        <p style="font-size:12px;color:var(--muted);">
          Select the exact document version you want to place on the
          physical archive folder. Scanning the QR code will resolve
          directly to that version.
        </p>

      `)}

      <div id="docTagWrap">
        ${docTagFor(d, getDocumentVersionChoice(d.id))}
      </div>

    </div>
  `;
}

function refreshDocumentVersionOptions(){

  const documentId =
    document.getElementById('tg_doc').value;

  const versionSelect =
    document.getElementById('tg_version');

  if(!versionSelect){
    return;
  }

  versionSelect.innerHTML =
    documentVersionOptions(documentId);

  refreshDocQR();
}

function documentVersionOptions(documentId){

  const d = DB.documents.find(x => x.id === documentId);

  if(!d){
    return '<option value="">No document selected</option>';
  }

  const originalVersion = d.version || 'v1.0';

  let options = `
    <option value="original">
      ${originalVersion} — Original Document
    </option>
  `;

  const versions = DB.documentVersions
    .filter(v => String(v.documentId) === String(documentId))
    .sort((a,b) =>
      String(a.version || '').localeCompare(
        String(b.version || ''),
        undefined,
        {numeric:true}
      )
    );

  options += versions
    .map(v => `
      <option value="${v.id}">
        ${v.version} — ${v.fileName || 'Uploaded Version'}
      </option>
    `)
    .join('');

  return options;
}


function getDocumentVersionChoice(documentId){

  const d = DB.documents.find(x => x.id === documentId);

  if(!d){
    return null;
  }

  const versionSelect =
    document.getElementById('tg_version');

  const selectedVersion =
    versionSelect ? versionSelect.value : 'original';

  if(selectedVersion === 'original'){
    return {
      type: 'document',
      document: d,
      version: d.version || 'v1.0'
    };
  }

  const version =
    DB.documentVersions.find(
      v => String(v.id) === String(selectedVersion)
    );

  if(!version){
    return {
      type: 'document',
      document: d,
      version: d.version || 'v1.0'
    };
  }

  return {
    type: 'document_version',
    document: d,
    version: version
  };
}

function documentsSearch(){

  return card('Search Documents', `
    <div class="field" style="max-width:320px;">
      <input
        placeholder="Search title, category, owner, or contract…"
        oninput="filterDocs(this.value)"
      >
    </div>

    <div id="docSearchTable">
      ${table(
        ['ID','Title','Category','Related Contract','Owner','Status','File'],

        DB.documents.map(d => {

          const contract =
            DB.contracts.find(
              c => c.id === d.contractId
            );

          return [

            `<span class="id">${d.id}</span>`,

            d.title,

            d.category,

            contract
              ? `${contract.title} (${contract.id})`
              : `<span style="color:var(--muted);">
                  —
                </span>`,

            d.owner,

            stamp(d.status),

            d.fileName
              ? `<a
                  href="api/download_document.php?id=${encodeURIComponent(d.id)}"
                  target="_blank"
                  class="btn btn-sm btn-ghost">
                  Open / Download
                </a>`
              : `<span style="color:var(--muted);">
                  No file
                </span>`

          ];

        })
      )}
    </div>
  `);
}

function documentsPermissions(){
const roles = [
  'Admin',
  'Front Desk / Operations',
  'Facilities & Compliance Officer',
  'Legal & Contracts Officer',
  'Records & Audit Officer'
];

const permissions = {
  'Client Travel Docs': {
    'Admin': 'Edit',
    'Front Desk / Operations': 'View',
    'Facilities & Compliance Officer': 'View',
    'Legal & Contracts Officer': 'View',
    'Records & Audit Officer': 'Edit'
  },
  'Compliance Filing': {
    'Admin': 'Edit',
    'Front Desk / Operations': 'View',
    'Facilities & Compliance Officer': 'Edit',
    'Legal & Contracts Officer': 'View',
    'Records & Audit Officer': 'Edit'
  },
  'Financial Record': {
    'Admin': 'Edit',
    'Front Desk / Operations': 'View',
    'Facilities & Compliance Officer': 'View',
    'Legal & Contracts Officer': 'View',
    'Records & Audit Officer': 'Edit'
  },
  'HR Record': {
    'Admin': 'Edit',
    'Front Desk / Operations': 'View',
    'Facilities & Compliance Officer': 'View',
    'Legal & Contracts Officer': 'View',
    'Records & Audit Officer': 'Edit'
  },
  'Supplier Agreement': {
    'Admin': 'Edit',
    'Front Desk / Operations': 'View',
    'Facilities & Compliance Officer': 'View',
    'Legal & Contracts Officer': 'Edit',
    'Records & Audit Officer': 'Edit'
  },
  'Visitor Logs': {
    'Admin': 'Edit',
    'Front Desk / Operations': 'Edit',
    'Facilities & Compliance Officer': 'View',
    'Legal & Contracts Officer': 'View',
    'Records & Audit Officer': 'Edit'
  }
};

return card('Access Permission Matrix', `
  <table>
    <thead>
      <tr>
        <th>Document Category</th>
        ${roles.map(role => `<th>${role}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${Object.keys(permissions).map(category => `
        <tr>
          <td>${category}</td>
          ${roles.map(role => {
            const permission = permissions[category][role];

            return `
              <td>
                ${
                  permission === 'Edit'
                    ? '✎ Edit'
                    : permission === 'View'
                      ? '👁 View'
                      : '— No Access'
                }
              </td>
            `;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
`);
}

function documentsArchival(){

  return card(
    'Archival & Disposal Schedule',

    table(
      ['ID','Title','Category','Filed','Retention','Disposal Due'],

      DB.documents.map(d => {

        const sched =
          DB.retentionSchedule.find(
            s => s.type === d.category
          );

        const disposal =
          new Date(d.dateAdded);

        disposal.setFullYear(
          disposal.getFullYear() +
          (sched ? sched.years : 5)
        );

        const disposalDate =
          disposal.toISOString().slice(0,10);

        const isDisposed =
          String(d.status).toLowerCase() === 'disposed';

        const isOverdue =
          disposal < TODAY;

        let disposalDisplay;

        if(isDisposed){

          disposalDisplay =
            `<span style="color:#2e7d32;font-weight:600;">
              ${disposalDate} — Disposed
            </span>`;

        }else if(isOverdue){

          disposalDisplay =
            `<span style="color:#c62828;font-weight:600;">
              ${disposalDate} — Due for Disposal
            </span>`;

        }else{

          disposalDisplay =
            `<span style="color:#222;">
              ${disposalDate}
            </span>`;

        }

        return [

          `<span class="id">${d.id}</span>`,

          d.title,

          d.category,

          fmt(d.dateAdded),

          (sched ? sched.years : 5) + ' yrs',

          disposalDisplay

        ];

      })

    )

  );

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

  const alerts = computeAlerts().filter(
    a => a.type === 'Retention'
  );

  if(!alerts.length){

    return card(
      'Records Approaching Retention Limit',
      `<div class="empty">
        No records nearing disposal.
      </div>`
    );

  }

  return card(
    'Records Approaching Retention Limit',

    table(
      ['Detail','Due','Status'],

      alerts.map(a => {

        const document = DB.documents.find(
          d => d.id === a.documentId
        );

        const isDisposed =
          document &&
          String(document.status).toLowerCase() === 'disposed';

        return [

          a.msg,

          `<span class="mono">
            ${fmt(a.due)}
          </span>`,

          isDisposed
            ? `<span style="color:#2e7d32;font-weight:600;">
                ✓ Handled — Disposed
              </span>`
            : `<span style="color:#b26a00;font-weight:600;">
                Pending Disposal
              </span>`

        ];

      })

    )

  );
}

function retentionCompliance(){

  const items = DB.complianceChecklist || [];

  if(!items.length){
    return card(
      'Compliance Checklist',
      `<div class="empty">
        No compliance checklist items found.
      </div>`
    );
  }

  return card(
    'Compliance Checklist',

    `<div>
      ${items.map(item => `

        <label
          style="
            display:flex;
            align-items:flex-start;
            gap:10px;
            padding:10px 0;
            border-bottom:1px solid var(--line-soft);
            font-size:13px;
            cursor:pointer;
          "
        >

          <input
            type="checkbox"
            ${Number(item.completed) === 1 ? 'checked' : ''}
            onchange="updateComplianceChecklist(${item.id}, this.checked)"
            style="margin-top:3px;"
          >

          <div style="flex:1;">

            <div>
              ${item.item}
            </div>

            ${
              Number(item.completed) === 1
                ? `
                  <div
                    style="
                      font-size:11px;
                      color:var(--muted);
                      margin-top:4px;
                    "
                  >
                    Checked by
                    <strong>${item.checkedBy || 'Unknown'}</strong>
                    on
                    ${fmtDateTime(item.checkedAt)}
                  </div>
                `
                : `
                  <div
                    style="
                      font-size:11px;
                      color:var(--muted);
                      margin-top:4px;
                    "
                  >
                    Not yet checked
                  </div>
                `
            }

          </div>

        </label>

      `).join('')}
    </div>`

    + `

      <p
        style="
          font-size:12px;
          color:var(--muted);
          margin-top:10px;
        "
      >
        Checklist changes are recorded with the authorized user's name
        and the date and time of the change.
      </p>

    `
  );
}

function retentionDisposal(){

  const today = new Date();

  const candidates = DB.documents.filter(d => {

    // Only active documents can enter the disposal queue
    if(d.status !== 'Active'){
      return false;
    }

    // Find the retention rule for this document's category
    const schedule = DB.retentionSchedule.find(
      s => s.type === d.category
    );

    if(!schedule){
      return false;
    }

    // Documents under legal hold cannot be disposed
    const legalHold = DB.contracts.some(
  c => c.legalHold &&
       d.contractId === c.id
);

    if(legalHold){
      return false;
    }

    // Calculate the retention expiration date
    const filedDate = new Date(
      String(d.dateAdded).replace(' ', 'T')
    );

    if(isNaN(filedDate)){
      return false;
    }

    const expirationDate = new Date(filedDate);

    expirationDate.setFullYear(
      expirationDate.getFullYear() + Number(schedule.years || 0)
    );

    // Only documents whose retention period has expired
    return expirationDate <= today;

  });

  return card(
    'Disposal Approval Queue',

    candidates.length
      ? table(
          ['ID','Title','Category','Retention Status',''],
          candidates.map(d => {

            const schedule = DB.retentionSchedule.find(
              s => s.type === d.category
            );

            return [
              `<span class="id">${d.id}</span>`,
              d.title,
              d.category,
              stamp('Due for Disposal'),
              `<button
                class="btn btn-sm"
                onclick="approveDisposal('${d.id}')">
                Approve disposal
              </button>`
            ];

          })
        )
      : `<div class="empty">
          No documents are currently eligible for disposal.
        </div>`
  );
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

  const contractOpts = `
    <option value="—">No related contract</option>

    ${DB.contracts
      .filter(c => c.status !== 'Terminated')
      .map(c => `
        <option value="${c.id}">
          ${c.title} (${c.id})
        </option>
      `)
      .join('')}
  `;

  return `
  <div style="display:flex; flex-direction:column; gap:24px;">

    ${card('Log New Case', `

      <form onsubmit="handleAddCase(event)">

        <div class="field">
          <label>Case Title</label>
          <input
            id="lc_title"
            required
            placeholder="Enter case title"
          >
        </div>

        <div class="field-row">

          <div class="field">
            <label>Type</label>

            <select id="lc_type">
              <option>Client Dispute</option>
              <option>Supplier Dispute</option>
              <option>Compliance</option>
              <option>Employment</option>
              <option>Contract Dispute</option>
              <option>Service Complaint</option>
            </select>

          </div>

          <div class="field">
            <label>Related Contract</label>

            <select id="lc_contract">
              ${contractOpts}
            </select>

          </div>

        </div>

        <div class="field-row">

          <div class="field">
            <label>Filing Date</label>

            <input
              type="date"
              id="lc_filed"
              value="${todayStr()}"
              required
            >

          </div>

          <div class="field">
            <label>Deadline</label>

            <input
              type="date"
              id="lc_deadline"
              required
            >

          </div>

        </div>

        <div class="field-row">

          <div class="field">
            <label>Priority</label>

            <select id="lc_priority">
              <option>Low</option>
              <option selected>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>

          </div>

          <div class="field">
            <label>Assigned Officer</label>

            <input
              id="lc_officer"
              placeholder="Legal & Contracts Officer"
            >

          </div>

        </div>

        <div class="field">

          <label>Case Description</label>

          <textarea
            id="lc_description"
            rows="4"
            placeholder="Describe the issue, dispute, or legal matter..."
          ></textarea>

        </div>

        <div class="field">

          <label>Case Attachment</label>

          <input
            type="file"
            id="lc_attachment"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          >

          <small>
            Optional. Attach a PDF, Word document, or image related to this case.
          </small>

        </div>

        <button
          class="btn"
          type="submit"
        >
          Open Case
        </button>

      </form>

    `)}

    ${card(
      'Case Register',

      table(
        ['ID','Title','Type','Status','Related Contract','Priority','Action'],

        DB.legalCases.map(c => [

          `<span class="id">${c.id}</span>`,

          c.title,

          c.type,

          stamp(c.status),

          c.relatedContract || '—',

          c.priority || 'Medium',

          `<button
            class="btn btn-sm btn-ghost"
            onclick="viewLegalCase('${c.id}')">
            View Case
          </button>`

        ])

      )

    )}

  </div>`;
}

function viewLegalCase(id){

  const c =
    DB.legalCases.find(
      x => String(x.id) === String(id)
    );

  if(!c){
    alert('Case not found.');
    return;
  }

  const contract =
    c.relatedContract &&
    c.relatedContract !== '—'
      ? DB.contracts.find(
          ct => ct.id === c.relatedContract
        )
      : null;

  const caseDocuments =
    DB.documents.filter(
      d => d.contractId === c.relatedContract
    );

  const caseCorrespondence =
    DB.correspondence.filter(
      x =>
        x.caseId === c.id ||
        x.relatedCase === c.id
    );

  const attachmentHtml =
    c.filePath
      ? `
        <div class="field">

          <strong>Case Attachment:</strong>

          <div>

            <strong>
              ${c.fileName || 'Attached File'}
            </strong>

            <br>

            <small>
              ${
                c.fileSize
                  ? Math.round(c.fileSize / 1024) + ' KB'
                  : ''
              }

              ${c.fileType
                ? ' — ' + c.fileType
                : ''}
            </small>

            <br><br>

            <a
              class="btn btn-sm btn-ghost"
href="api/view_legal_case_file.php?id=${encodeURIComponent(c.id)}"
              target="_blank"
              rel="noopener">
              View / Download Attachment
            </a>

          </div>

        </div>
      `
      : `
        <div class="field">
          <strong>Case Attachment:</strong>
          No attachment uploaded.
        </div>
      `;

  const html = `

    ${card('Case Details', `

      <div class="field">
        <strong>Case ID:</strong>
        <span class="id">${c.id}</span>
      </div>

      <div class="field">
        <strong>Case Title:</strong>
        ${c.title || '—'}
      </div>

      <div class="field">
        <strong>Case Type:</strong>
        ${c.type || '—'}
      </div>

      <div class="field">
        <strong>Status:</strong>
        ${c.status ? stamp(c.status) : '—'}
      </div>

      <div class="field">
        <strong>Priority / Risk Level:</strong>
        ${c.priority || 'Medium'}
      </div>

      <div class="field">
        <strong>Assigned Legal Officer:</strong>
        ${c.assignedOfficer || '—'}
      </div>

      <div class="field">
        <strong>Filing Date:</strong>
        ${fmt(c.filed)}
      </div>

      <div class="field">
        <strong>Deadline:</strong>
        ${fmt(c.deadline)}
      </div>

      <div class="field">
        <strong>Related Contract:</strong>
        ${
          contract
            ? `${contract.id} — ${contract.title}`
            : '—'
        }
      </div>

      <div class="field">
        <strong>Description / Issue Details:</strong>
        ${c.description || 'No description provided.'}
      </div>

      ${attachmentHtml}

    `)}

    ${card('Case Documents', `

      ${
        caseDocuments.length
          ? table(
              ['ID','Title','Category'],
              caseDocuments.map(d => [
                `<span class="id">${d.id}</span>`,
                d.title,
                d.category
              ])
            )
          : '<div>No documents linked to this case.</div>'
      }

    `)}

    ${card('Linked Correspondence', `

      ${
        caseCorrespondence.length
          ? table(
              ['ID','Date','Subject'],
              caseCorrespondence.map(x => [
                `<span class="id">${x.id || '—'}</span>`,
                fmt(x.date),
                x.subject || '—'
              ])
            )
          : '<div>No correspondence linked to this case.</div>'
      }

    `)}

  `;

  const content =
    document.querySelector('#content');

  if(!content){
    alert('Content area not found.');
    return;
  }

  content.innerHTML = `

    <div class="page-head">

      <div>
        <h2>Case ${c.id}</h2>
        <p>Legal Case Details</p>
      </div>

      <button
        class="btn btn-ghost"
        onclick="render()">
        Back to Case Register
      </button>

    </div>

    ${html}

  `;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}

function legalRepository(){

  return card(
    'Linked Legal Documents',

    table(
      ['Case','Related Contract','Document','Action'],

      DB.legalCases.map(c => {

        const contract =
          c.relatedContract !== '—'
            ? DB.contracts.find(
                ct => ct.id === c.relatedContract
              )
            : null;

        return [

          `<span class="id">${c.id}</span> — ${c.title}`,

          c.relatedContract || '—',

          contract
            ? contract.title
            : '—',

          `<button
            class="btn btn-sm btn-ghost"
            onclick="viewLegalCase('${c.id}')">
            View Case
          </button>`

        ];

      })

    )

  );

}


function legalDeadlines(){

  const sorted =
    [...DB.legalCases].sort(
      (a,b) =>
        new Date(a.deadline) -
        new Date(b.deadline)
    );

  return card(
    'Upcoming Deadlines',

    table(
      ['Case','Deadline','Days Remaining'],

      sorted.map(c => {

        const d =
          daysUntil(c.deadline);

        return [

          `<span class="id">${c.id}</span> — ${c.title}`,

          fmt(c.deadline),

          d <= 7
            ? `<span style="color:var(--rust);">
                ${d} days
              </span>`
            : `${d} days`

        ];

      })

    )

  );

}

function legalCorrespondence(){

  const log =
    DB.correspondence ||
    (DB.correspondence = []);

  const caseOpts = `
    <option value="—">No related case</option>

    ${DB.legalCases
      .map(c => `
        <option value="${c.id}">
          ${c.id} — ${c.title}
        </option>
      `)
      .join('')}
  `;

  const contractOpts = `
    <option value="—">No related contract</option>

    ${DB.contracts
      .filter(c => c.status !== 'Terminated')
      .map(c => `
        <option value="${c.id}">
          ${c.id} — ${c.title}
        </option>
      `)
      .join('')}
  `;

  return `

  <div class="grid cols-2">

    ${card('Log Correspondence', `

      <form onsubmit="handleAddCorrespondence(event)">

        <div class="field">
          <label>Related Case</label>

          <select id="co_case">
            ${caseOpts}
          </select>
        </div>

        <div class="field">
          <label>Related Contract</label>

          <select id="co_contract">
            ${contractOpts}
          </select>
        </div>

        <div class="field">
          <label>With</label>

          <input
            id="co_with"
            required
            placeholder="Person, company, or organization"
          >
        </div>

        <div class="field-row">

          <div class="field">

            <label>Date</label>

            <input
              type="date"
              id="co_date"
              value="${todayStr()}"
              required
            >

          </div>

          <div class="field">

            <label>Direction</label>

            <select id="co_direction">
              <option>Incoming</option>
              <option>Outgoing</option>
            </select>

          </div>

        </div>

        <div class="field">

          <label>Type</label>

          <select id="co_type">
            <option>Email</option>
            <option>Letter</option>
            <option>Notice</option>
            <option>Phone Call</option>
            <option>Meeting</option>
            <option>Other</option>
          </select>

        </div>

        <div class="field">

          <label>Subject</label>

          <input
            id="co_subject"
            required
            placeholder="Enter correspondence subject"
          >

        </div>

        <div class="field">

          <label>Message / Summary</label>

          <textarea
            id="co_message"
            rows="4"
            placeholder="Enter the message, summary, or important details..."
          ></textarea>

        </div>

        <div class="field">

          <label>Attachment</label>

          <input
            type="file"
            id="co_attachment"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          >

          <small>
            Optional. Attach a related correspondence file.
          </small>

        </div>

        <button
          class="btn"
          type="submit">
          Save Correspondence
        </button>

      </form>

    `)}

    ${card(
      'Correspondence Log',

      table(
        [
          'ID',
          'Date',
          'Case',
          'With',
          'Direction',
          'Type',
          'Subject',
          'Attachment',
          'Action'
        ],

        log.map(l => [

          `<span class="id">${l.id || '—'}</span>`,

          fmt(l.date),

          l.caseId || '—',

          l.withParty || '—',

          l.direction || '—',

          l.type || '—',

          l.subject || '—',

          l.fileName
            ? l.fileName
            : '—',

          l.id
            ? `<button
                class="btn btn-sm btn-ghost"
                onclick="viewCorrespondence('${l.id}')">
                View
              </button>`
            : '—'

        ])

      )

    )}

  </div>`;

}

function viewCorrespondence(id){

  const c =
    DB.correspondence.find(
      x => String(x.id) === String(id)
    );

  if(!c){
    alert('Correspondence not found.');
    return;
  }

  const relatedCase =
    c.caseId &&
    c.caseId !== '—'
      ? DB.legalCases.find(
          x => x.id === c.caseId
        )
      : null;

  const relatedContract =
    c.contractId &&
    c.contractId !== '—'
      ? DB.contracts.find(
          x => x.id === c.contractId
        )
      : null;

  const attachmentHtml =
    c.filePath
      ? `
        <div class="field">
          <label>Attachment:</label>

          <div>
            <strong>
              ${c.fileName || 'Attached File'}
            </strong>

            <br>

            <small>
              ${
                c.fileSize
                  ? Math.round(c.fileSize / 1024) + ' KB'
                  : ''
              }

              ${c.fileType
                ? ' — ' + c.fileType
                : ''}
            </small>

            <br><br>

            <a
  class="btn btn-sm btn-ghost"
  href="api/view_correspondence_file.php?id=${c.id}"
  target="_blank"
  rel="noopener">
  Open Attachment
</a>
          </div>
        </div>
      `
      : `
        <div class="field">
          <label>Attachment:</label>
          <div>No attachment uploaded.</div>
        </div>
      `;

  const html = `

    ${card('Correspondence Details', `

      <div class="field">
        <strong>Correspondence ID:</strong>
        <span class="id">${c.id}</span>
      </div>

      <div class="field">
        <strong>Date:</strong>
        ${fmt(c.date)}
      </div>

      <div class="field">
        <strong>With:</strong>
        ${c.withParty || '—'}
      </div>

      <div class="field">
        <strong>Direction:</strong>
        ${c.direction || '—'}
      </div>

      <div class="field">
        <strong>Type:</strong>
        ${c.type || '—'}
      </div>

      <div class="field">
        <strong>Subject:</strong>
        ${c.subject || '—'}
      </div>

      <div class="field">
        <strong>Related Case:</strong>
        ${
          relatedCase
            ? `${relatedCase.id} — ${relatedCase.title}`
            : '—'
        }
      </div>

      <div class="field">
        <strong>Related Contract:</strong>
        ${
          relatedContract
            ? `${relatedContract.id} — ${relatedContract.title}`
            : '—'
        }
      </div>

      <div class="field">
        <strong>Message / Summary:</strong>
        ${c.message || 'No message or summary provided.'}
      </div>

      ${attachmentHtml}

    `)}

  `;

  const content =
    document.querySelector('#content');

  if(!content){
    alert('Content area not found.');
    return;
  }

  content.innerHTML = `

    <div class="page-head">

      <div>
        <h2>Correspondence ${c.id}</h2>
        <p>Correspondence Details</p>
      </div>

      <button
        class="btn btn-ghost"
        onclick="render()">
        Back to Correspondence
      </button>

    </div>

    ${html}

  `;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

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
  <div style="display:flex; flex-direction:column; gap:24px;">
    ${card('New Contract', `
      <form onsubmit="handleAddContract(event)" enctype="multipart/form-data">

        <div class="field">
          <label>Title</label>
          <input id="ct_title" required>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Party</label>
            <input id="ct_party" required>
          </div>

          <div class="field">
            <label>Type</label>
            <select id="ct_type">
              <option>Client Package</option>
              <option>Supplier Agreement</option>
              <option>Partner MOU</option>
              <option>Employment</option>
              <option>Lease</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Start date</label>
            <input type="date" id="ct_start" required>
          </div>

          <div class="field">
            <label>End date</label>
            <input type="date" id="ct_end" required>
          </div>
        </div>

        <div class="field">
          <label>Contract Value</label>
          <input
            id="ct_value"
            type="text"
            placeholder="e.g. PHP 150,000"
          >
        </div>

        <div class="field">
          <label>Contract Attachment</label>
          <input
            type="file"
            id="ct_file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          >
          <small style="color:var(--muted);">
            Optional. Maximum file size is 10 MB.
          </small>
        </div>

        <button class="btn" type="submit">
          Save Contract as Draft
        </button>

      </form>
    `)}

    
${card('All Contracts <span class="count">('+DB.contracts.length+')</span>', table(
  ['ID','Title','Status','Attachment'],
  DB.contracts.map(c=>[
    `<span class="id">${c.id}</span>`,
    c.title,
    stamp(c.status),
    c.fileName
      ? `<a
          class="btn btn-sm btn-ghost"
          href="api/view_contract_file.php?id=${encodeURIComponent(c.id)}"
          target="_blank"
          rel="noopener">
          Open Attachment
        </a>`
      : '<span style="color:var(--muted);">No attachment</span>'
  ])
))}


  </div>`;
}



function contractsSignature(){
  const signedCount = DB.contracts.filter(c => c.signed).length;
  const pendingCount = DB.contracts.length - signedCount;

  return `
    <div style="display:flex; flex-direction:column; gap:24px;">

      <div class="grid cols-2">
        ${card('Signed Contracts', `
          <div class="num">${signedCount}</div>
          <div class="lbl">Contracts marked as signed</div>
        `)}

        ${card('Awaiting Signature', `
          <div class="num">${pendingCount}</div>
          <div class="lbl">Contracts not yet signed</div>
        `)}
      </div>

      ${card('Contract Signature Tracking', table(
        [
          'Contract ID',
          'Title',
          'Party',
          'Signature Status',
          'Signer Name',
          'Date Signed',
          'Action'
        ],
        DB.contracts.map(c => [
          `<span class="id">${c.id}</span>`,
          c.title,
          c.party,
          c.signed ? stamp('Signed') : stamp('Pending'),
          c.signerName || '—',
          c.signedAt || '—',
          c.signed
            ? '<span style="color:var(--muted);">Signed</span>'
            : `<button class="btn btn-sm"
                onclick="markSigned('${c.id}')">
                Mark Signed
              </button>`
        ])
      ))}

    </div>
  `;
}


function contractsVerify(){
  const opts = DB.contracts.map(c=>`<option value="${c.id}">${c.id} — ${c.title}</option>`).join('');
  const c = DB.contracts[0];
  if(c) queueQR('qr_contract', verifyUrl('contract', c.id));
  return `
  <div class="grid cols-2">
    ${card('Select Contract to Verify', `<div class="field"><label>Contract</label><select id="vf_contract" onchange="refreshContractQR(this.value)">${opts || '<option>No contracts on file</option>'}</select></div>
      <p style="font-size:12px;color:var(--muted);">Printed on the physical contract. Scanning always queries live status — a terminated or held contract will show as such even if the paper copy still reads "Active".</p>`)}
    <div id="contractTagWrap">${contractTagFor(c)}</div>
  </div>`;
}

function contractTagFor(c){
  if(!c) return `<div class="empty">No contracts on file yet.</div>`;

  const displayStatus = c.legalHold ? 'Hold' : c.status;

  return `
    <div style="display:flex; flex-direction:column; gap:16px;">

      <div class="tag-card">
        <div class="tag-stub">
          <div class="rtitle">Contract Verification</div>
          <h4>${c.title}</h4>

          <div class="meta">
            <div>Party: ${c.party}</div>
            <div>Term: ${fmt(c.start)} – ${fmt(c.end)}</div>
            <div>${stamp(displayStatus)}</div>
          </div>
        </div>

        <div class="tag-divider"></div>

        <div class="tag-qr">
          <div class="qrbox" id="qr_contract"></div>
          <div class="code">${c.id}</div>
        </div>
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:10px;">
        <button class="btn btn-sm"
          onclick="downloadContractQR('${c.id}')">
          Download QR
        </button>

        <button class="btn btn-sm btn-ghost"
          onclick="printContractQR('${c.id}')">
          Print QR
        </button>

        <button class="btn btn-sm btn-ghost"
          onclick="emailContractQR('${c.id}')">
          Send via Email
        </button>
      </div>

    </div>
  `;
}


function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}


function contractsLifecycle(){
  const stages = [
    'Draft',
    'Under Review',
    'Active',
    'Expiring Soon',
    'Expired',
    'Renewed',
    'Terminated'
  ];

  const withComputed = DB.contracts.map(c => {
    let stage = c.status;

    if (c.legalHold) {
      stage = 'Hold';
    } else if (stage === 'Active' && c.end) {
      const remaining = daysUntil(c.end);

      if (remaining < 0) {
        stage = 'Expired';
      } else if (remaining <= 30) {
        stage = 'Expiring Soon';
      }
    }

    return {...c, stage};
  });

  const allStages = [...stages, 'Hold'];

  return `
    <div class="kanban">
      ${allStages.map(s => `
        <div>
          <h4>
            ${s}
            <span class="mono">
              (${withComputed.filter(c => c.stage === s).length})
            </span>
          </h4>

          ${withComputed
            .filter(c => c.stage === s)
            .map(c => `
              
<div class="kcard">
  <span class="id mono">${c.id}</span>
  ${c.title}

  
${c.stage === 'Renewed' ? `
  <div style="
    margin-top:12px;
    padding-top:10px;
    border-top:1px solid #e5e7eb;
    font-size:12px;
    line-height:1.8;
  ">
    <div>
      <strong>Previous End Date:</strong>
      ${c.previousEndDate
        ? escapeHtml(c.previousEndDate)
        : 'Not recorded'}
    </div>

    <div>
      <strong>New End Date:</strong>
      ${c.end ? escapeHtml(c.end) : 'Not recorded'}
    </div>

    <div>
      <strong>Date Renewed:</strong>
      ${c.renewedAt
        ? escapeHtml(c.renewedAt)
        : 'Not recorded'}
    </div>
  </div>
` : ''}


  ${c.stage === 'Terminated' ? `
    <div style="margin-top:10px; font-size:12px;">
      <div>
        <strong>Reason:</strong>
        ${escapeHtml(c.terminationReason || 'Not recorded')}
      </div>
      <div style="margin-top:5px;">
        <strong>Date Terminated:</strong>
        ${c.terminatedAt
          ? escapeHtml(c.terminatedAt)
          : 'Not recorded'}
      </div>
    </div>
  ` : ''}


                ${c.status === 'Active' &&
                  !c.legalHold &&
                  (c.stage === 'Active' || c.stage === 'Expiring Soon')
                  ? `
                    <div style="margin-top:12px;">
                      <button
                        class="btn btn-sm btn-ghost"
                        onclick="terminateContract('${c.id}')">
                        Terminate Contract
                      </button>
                    </div>
                  `
                  : ''
                }
              </div>
            `).join('') || `
              <div class="empty"
                style="padding:14px 8px;font-size:11px;">
                —
              </div>
            `}
        </div>
      `).join('')}
    </div>
  `;
}



function contractsRenewal(){
  const active = DB.contracts.filter(c =>
    c.status === 'Active' && c.end && !c.legalHold
  );

  const expired = active.filter(c => daysUntil(c.end) < 0);

  const urgent = active.filter(c => {
    const days = daysUntil(c.end);
    return days >= 0 && days <= 30;
  });

  const upcoming = active.filter(c => {
    const days = daysUntil(c.end);
    return days > 30 && days <= 60;
  });

  const alertTable = (contracts, type) => {
    if (!contracts.length) {
      return `<div class="empty">No contracts in this category.</div>`;
    }

    return table(
      ['ID', 'Title', 'End Date', 'Days Remaining', 'Status'],
      contracts.map(c => {
        const days = daysUntil(c.end);

        const remaining = days < 0
          ? `${Math.abs(days)} days overdue`
          : days === 0
            ? 'Expires today'
            : `${days} days`;

        
return [
  `<span class="id">${c.id}</span>`,
  escapeHtml(c.title),
  fmt(c.end),
  remaining,
  `${stamp(type)}
   <div style="margin-top:8px;">
     <button
       class="btn btn-sm"
       onclick="renewContract('${c.id}')">
       Renew Contract
     </button>
   </div>`
];

      })
    );
  };

  return `
    <div style="display:flex; flex-direction:column; gap:24px;">

      ${card(
        `Expired Contracts (${expired.length})`,
        alertTable(expired, 'Expired')
      )}

      ${card(
        `Expiring Within 30 Days (${urgent.length})`,
        alertTable(urgent, 'Expiring Soon')
      )}

      ${card(
        `Expiring Within 31–60 Days (${upcoming.length})`,
        alertTable(upcoming, 'Upcoming')
      )}

    </div>
  `;
}


function contractsApproval(){
  const pending = DB.contracts.filter(c =>
    c.status === 'Draft' || c.status === 'Under Review'
  );

  return card('Multi-level Contract Approval', pending.length ? table(
    ['ID', 'Title', 'Approval Level', 'Signature', 'Action'],
    pending.map(c => [
      `<span class="id">${c.id}</span>`,
      c.title,
      `${c.approvalLevel} / 2`,
      c.signed ? stamp('Signed') : stamp('Pending'),

      c.approvalLevel < 2
        ? `<button class="btn btn-sm"
             onclick="advanceApproval('${c.id}')">
             Approve Level ${c.approvalLevel + 1}
           </button>`
        : c.signed
          ? `<button class="btn btn-sm"
               onclick="activateContract('${c.id}')">
               Activate Contract
             </button>`
          : `<span style="color:var(--muted);">
               Awaiting Signature
             </span>`
    ])
  ) : `<div class="empty">No contracts awaiting approval or activation.</div>`);
}


function contractsAnalytics(){
  const byStatus = {};

  DB.contracts.forEach(c => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });

  const totalContracts = DB.contracts.length;
  const activeContracts = DB.contracts.filter(c => c.status === 'Active').length;
  const renewedContracts = DB.contracts.filter(c => c.status === 'Renewed').length;
  const terminatedContracts = DB.contracts.filter(c => c.status === 'Terminated').length;

  
return `
  <div class="grid cols-4">
    ${card('Total Contracts',
      `<div class="num">${totalContracts}</div>`,
      'class="card stat"')}

    ${card('Active Contracts',
      `<div class="num">${activeContracts}</div>`,
      'class="card stat"')}

    ${card('Renewed Contracts',
      `<div class="num">${renewedContracts}</div>`,
      'class="card stat"')}

    ${card('Terminated Contracts',
      `<div class="num">${terminatedContracts}</div>`,
      'class="card stat"')}
  </div>

  <div class="section-title">Contracts by Status</div>

  <div class="grid cols-4">

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
      <h1>TourSphere</h1>
      <p>FACILITIES &amp; ADMINISTRATIVE MANAGEMENT SYSTEM</p>
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
    <button class="btn-ghost btn-sm" style="margin-left:10px;" onclick="openChangePassword()">Change Password</button>
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
  const method=document.getElementById('vs_method').value;
  const email=document.getElementById('vs_email').value.trim();
  if(method==='Email' && !email){ alert('Please provide the visitor email address when Registration Method is Email.'); return; }
  const v = {id:nextId('VS'), registrationMethod:method,
    name:document.getElementById('vs_name').value, email,
    purpose:document.getElementById('vs_purpose').value, company:document.getElementById('vs_company').value||'—',
    host:document.getElementById('vs_host').value, date:todayStr(), status:'Registered', notified:false};

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
  if(!v) return;

  const changes = {status};

  if(status === 'Checked-in'){
    changes.checkedInAt = new Date().toISOString().slice(0,19).replace('T',' ');
    changes.checkedOutAt = null;
  }

  if(status === 'Checked-out'){
    changes.checkedOutAt = new Date().toISOString().slice(0,19).replace('T',' ');
  }

  const saved = await dbUpdate('visitors','id',id,changes);
  if(!saved) return;

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
  if(row.id!=null) await dbDelete('blacklist','id',row.id);
  render();
}

async function handleAddDocument(e){
  e.preventDefault();

  if(!LIVE){
    alert('Database is not connected. Document was not saved.');
    return;
  }

  const title =
    document.getElementById('dc_title').value.trim();

  const category =
    document.getElementById('dc_category').value;

  const contractId =
    document.getElementById('dc_contract').value;

  const owner =
    document.getElementById('dc_owner').value.trim();

  const dateAdded =
    document.getElementById('dc_date_added').value;

  const fileInput =
    document.getElementById('dc_file');

  const file =
    fileInput.files[0];

  if(!dateAdded){
    alert('Please select the document filed date.');
    return;
  }

  if(!file){
    alert('Please select a document file.');
    return;
  }

  const maxSize =
    10 * 1024 * 1024;

  if(file.size > maxSize){
    alert(
      'File is too large. Maximum size is 10 MB.'
    );
    return;
  }

  const allowed = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'jpg',
    'jpeg',
    'png'
  ];

  const extension =
    file.name
      .split('.')
      .pop()
      .toLowerCase();

  if(!allowed.includes(extension)){
    alert('Unsupported file type.');
    return;
  }

  const id =
    nextId('DC');

  const schedule =
    DB.retentionSchedule.find(
      s => s.type === category
    );

  const retentionYears =
    schedule
      ? Number(schedule.years)
      : 1;

  const formData =
    new FormData();

  formData.append('id', id);
  formData.append('title', title);
  formData.append('category', category);
  formData.append('contractId', contractId);
  formData.append('owner', owner);
  formData.append('dateAdded', dateAdded);
  formData.append('retentionYears', retentionYears);
  formData.append('file', file);

  try{

    const response =
      await fetch(
        'api/upload_document.php',
        {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        }
      );

    let result = null;

    try{
      result =
        await response.json();
    }catch(err){
      result = null;
    }

    if(!response.ok){
      alert(
        'Document upload failed: ' +
        (
          result?.error ||
          response.statusText
        )
      );
      return;
    }

    DB.documents.unshift(
      result
    );

    logActivity(
      `Document ${result.id} filed — ${result.title}.`
    );

    alert(
      'Document uploaded and saved successfully.'
    );

    render();

  }catch(err){

    console.error(err);

    alert(
      'Could not connect to the document upload service.'
    );
  }
}

async function handleAddDocumentVersion(e) {
  e.preventDefault();

  const documentId = document.getElementById('dv_document').value;
  const version = document.getElementById('dv_version').value.trim();
  const note = document.getElementById('dv_note').value.trim();
  const fileInput = document.getElementById('dv_file');

  if (!documentId || !version || !note || !fileInput.files.length) {
    alert('Please complete all fields and select a version file.');
    return;
  }

  const file = fileInput.files[0];

  if (file.size > 10 * 1024 * 1024) {
    alert('The version file must not exceed 10 MB.');
    return;
  }

  const formData = new FormData();

  formData.append('documentId', documentId);
  formData.append('version', version);
  formData.append('note', note);
  formData.append('file', file);

  try {
    const response = await fetch('api/upload_document_version.php', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Version upload failed.');
    }

    alert('Document version uploaded and saved successfully.');

    e.target.reset();

    await loadAllData();

    renderDocumentVersionHistory(documentId);

  } catch (error) {
    console.error(error);
    alert('Version upload failed: ' + error.message);
  }
}

function refreshDocQR(){

  const documentId = document.getElementById('tg_doc').value;
  const versionId = document.getElementById('tg_version').value;

  const d = DB.documents.find(x => x.id === documentId);

  if(!d){
    return;
  }

  const versionChoice =
    versionId === 'original'
      ? {
          type: 'document',
          document: d,
          version: d.version || 'v1.0'
        }
      : {
          type: 'document_version',
          document: d,
          version: DB.documentVersions.find(
            v => String(v.id) === String(versionId)
          )
        };

  document.getElementById('docTagWrap').innerHTML =
    docTagFor(d, versionChoice);

  const qrUrl =
    versionChoice.type === 'document_version'
      ? verifyUrl('document_version', versionChoice.version.id)
      : verifyUrl('document', d.id);

  queueQR('qr_doc', qrUrl);

  flushQR();
}

function filterDocs(value){

  const q =
    String(value || '')
      .toLowerCase()
      .trim();

  const filtered =
    DB.documents.filter(d => {

      const contract =
        DB.contracts.find(
          c => c.id === d.contractId
        );

      const contractText =
        contract
          ? `${contract.id} ${contract.title}`
          : '';

      return (
        String(d.id || '').toLowerCase().includes(q) ||
        String(d.title || '').toLowerCase().includes(q) ||
        String(d.category || '').toLowerCase().includes(q) ||
        String(d.owner || '').toLowerCase().includes(q) ||
        contractText.toLowerCase().includes(q)
      );

    });

  const container =
    document.getElementById('docSearchTable');

  if(!container){
    return;
  }

  container.innerHTML =
    table(
      ['ID','Title','Category','Related Contract','Owner','Status','File'],

      filtered.map(d => {

        const contract =
          DB.contracts.find(
            c => c.id === d.contractId
          );

        return [

          `<span class="id">${d.id}</span>`,

          d.title,

          d.category,

          contract
            ? `${contract.title} (${contract.id})`
            : `<span style="color:var(--muted);">
                —
              </span>`,

          d.owner,

          stamp(d.status),

          d.fileName
            ? `<a
                href="api/download_document.php?id=${encodeURIComponent(d.id)}"
                target="_blank"
                class="btn btn-sm btn-ghost">
                Open / Download
              </a>`
            : `<span style="color:var(--muted);">
                No file
              </span>`

        ];

      })
    );
}

async function updateRetentionYears(i,val){

  const row = DB.retentionSchedule[i];

  if(!row){
    alert('Retention schedule record not found.');
    render();
    return;
  }

  const years = parseInt(val);

  if(!years || years < 1){
    alert('Please enter a valid retention period of at least 1 year.');
    render();
    return;
  }

  const adminPassword = prompt(
    'Admin password required to change the retention period:'
  );

  if(adminPassword === null){
    render();
    return;
  }

  if(!adminPassword){
    alert('Admin password is required.');
    render();
    return;
  }

  try{

    const response = await fetch(
      'api/update_retention.php',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          type: row.type,
          years: years,
          adminPassword: adminPassword
        })
      }
    );

    const text = await response.text();

    console.log('Retention API response:', text);

    let result;

    try{
      result = JSON.parse(text);
    }catch(parseError){

      alert(
        'The server returned an unexpected response:\\n\\n' +
        text.substring(0, 1000)
      );

      render();
      return;
    }

    if(!response.ok || result.error){
      throw new Error(
        result.error || 'Retention schedule update failed.'
      );
    }

    const idx = DB.retentionSchedule.findIndex(
      r => r.type === row.type
    );

    if(idx > -1){
      DB.retentionSchedule[idx] = result;
    }

    alert('Retention period updated successfully.');

    render();

  }catch(error){

    console.error(error);

    alert(
      'Retention period was not changed: ' +
      error.message
    );

    render();
  }
}

async function updateComplianceChecklist(id, completed){

  try{

    const response = await fetch(
      'api/update_compliance.php',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: id,
          completed: completed
        })
      }
    );

    const text = await response.text();

    console.log(
      'Compliance API response:',
      text
    );

    let result;

    try{

      result = JSON.parse(text);

    }catch(parseError){

      alert(
        'The server returned an unexpected response:\n\n' +
        text.substring(0, 1000)
      );

      await loadAllData();
      render();

      return;
    }

    if(!response.ok || result.error){

      throw new Error(
        result.error ||
        'Compliance checklist update failed.'
      );

    }

    /*
     * Update the local copy.
     */
    const index =
      DB.complianceChecklist.findIndex(
        item => Number(item.id) === Number(id)
      );

    if(index > -1){
      DB.complianceChecklist[index] = result;
    }

    /*
     * Refresh the checklist so the
     * saved user and timestamp appear.
     */
    render();

  }catch(error){

    console.error(error);

    alert(
      'Compliance checklist was not changed: ' +
      error.message
    );

    /*
     * Reload the saved database value
     * if the update failed.
     */
    await loadAllData();

    render();
  }
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

  const attachment = document.getElementById('lc_attachment').files[0];

  if (attachment && attachment.size > 10 * 1024 * 1024) {
    alert('Case attachment must not exceed 10 MB.');
    return;
  }

  const c = {
    id: nextId('LC'),
    title: document.getElementById('lc_title').value.trim(),
    type: document.getElementById('lc_type').value,
    filed: document.getElementById('lc_filed').value,
    deadline: document.getElementById('lc_deadline').value,
    status: 'Open',
    relatedContract: document.getElementById('lc_contract').value,
    priority: document.getElementById('lc_priority').value,
    assignedOfficer: document.getElementById('lc_officer').value.trim(),
    description: document.getElementById('lc_description').value.trim()
  };

  if (!c.filed) {
    alert('Please select a filing date.');
    return;
  }

  if (!c.deadline) {
    alert('Please select a deadline.');
    return;
  }

  const saved = await dbInsert('legalCases', c);

  if (!saved) {
    alert('Legal case could not be saved.');
    return;
  }

  if (attachment) {
    const formData = new FormData();

    formData.append('caseId', saved.id);
    formData.append('file', attachment);

    try {
      const response = await fetch('api/upload_legal_case.php', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Attachment upload failed.');
      }

    } catch (error) {
      logActivity(`Legal case ${saved.id} created without attachment.`);
      render();

      alert(
        'Legal case was saved, but the attachment was not uploaded. ' +
        error.message
      );
      return;
    }
  }

  logActivity(`Legal case ${saved.id} opened — ${saved.title}.`);

  render();

  alert('Legal case created successfully.');
}


async function handleAddCorrespondence(e){

  e.preventDefault();

  const entry = {

    id: Math.max(
  0,
  ...DB.correspondence.map(
    c => Number(c.id) || 0
  )
) + 1,

    date:
      document.getElementById('co_date').value,

    caseId:
      document.getElementById('co_case').value,

    contractId:
      document.getElementById('co_contract').value,

    withParty:
      document.getElementById('co_with').value.trim(),

    direction:
      document.getElementById('co_direction').value,

    type:
      document.getElementById('co_type').value,

    subject:
      document.getElementById('co_subject').value.trim(),

    message:
      document.getElementById('co_message').value.trim()

  };

  if(!entry.date){
    alert('Please select a correspondence date.');
    return;
  }

  if(!entry.withParty){
    alert('Please enter who the correspondence was with.');
    return;
  }

  if(!entry.subject){
    alert('Please enter a subject.');
    return;
  }

  await dbInsert(
    'correspondence',
    entry
  );

  const fileInput =
    document.getElementById('co_attachment');

  const file =
    fileInput && fileInput.files.length
      ? fileInput.files[0]
      : null;

  if(file){

    const formData =
      new FormData();

    formData.append(
      'correspondenceId',
      entry.id
    );

    formData.append(
      'file',
      file
    );

    try{

      const response =
        await fetch(
          'api/upload_correspondence.php',
          {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
          }
        );

      const result =
        await response.json();

      if(!result.ok){

        alert(
          'Correspondence was saved, but the attachment could not be uploaded.\n\n' +
          result.error
        );

      }

    }catch(error){

      console.error(
        'Correspondence attachment upload error:',
        error
      );

      alert(
        'Correspondence was saved, but the attachment upload failed.'
      );

    }

  }

  logActivity(
    `Correspondence ${entry.id} logged — ${entry.subject}.`
  );

  await loadAllData();

  render();

}


async function handleAddContract(e){
  e.preventDefault();

  const fileInput = document.getElementById('ct_file');
  const file = fileInput.files[0];

  if (file && file.size > 10 * 1024 * 1024) {
    alert('Maximum contract attachment size is 10 MB.');
    return;
  }

  const c = {
    id: nextId('CT'),
    title: document.getElementById('ct_title').value.trim(),
    party: document.getElementById('ct_party').value.trim(),
    type: document.getElementById('ct_type').value,
    start: document.getElementById('ct_start').value,
    end: document.getElementById('ct_end').value,
    value: document.getElementById('ct_value').value.trim() || '—',
    status: 'Draft',
    signed: false,
    approvalLevel: 0,
    legalHold: false
  };

  if (c.end < c.start) {
    alert('End date cannot be earlier than start date.');
    return;
  }

  const submitButton = e.target.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const saved = await dbInsert('contracts', c);

    if (!saved) return;

    if (file) {
      const formData = new FormData();

      formData.append('contractId', saved.id);
      formData.append('file', file);

      const response = await fetch('api/upload_contract.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        alert(
          'Contract was created, but the attachment upload failed: ' +
          (result.error || 'Unknown error.')
        );
        await loadAllData();
        render();
        return;
      }
    }

    await loadAllData();

    logActivity(
      `Contract ${saved.id} created as draft — ${saved.title}.`
    );

    render();

    alert('Contract created successfully.');

  } catch (error) {
    console.error('Contract creation error:', error);
    alert('An error occurred while saving the contract.');
  } finally {
    if (submitButton.isConnected) {
      submitButton.disabled = false;
    }
  }
}


async function markSigned(id){
  const contract = DB.contracts.find(c => c.id === id);

  if (!contract) {
    alert('Contract not found.');
    return;
  }

  if (contract.signed) {
    alert('This contract is already marked as signed.');
    return;
  }

  const signerName = prompt('Enter the full name of the person who signed this contract:');

  if (signerName === null) return;

  if (!signerName.trim()) {
    alert('Signer name is required.');
    return;
  }

  if (!confirm(`Mark contract ${id} as signed by ${signerName.trim()}?`)) {
    return;
  }

  const signedAt = new Date().toLocaleString('sv-SE', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

  const saved = await dbUpdate('contracts', 'id', id, {
    signed: true,
    signerName: signerName.trim(),
    signedAt: signedAt
  });

  if (!saved) return;

  logActivity(`Contract ${id} marked as signed by ${signerName.trim()}.`);
  render();

  alert('Contract signature recorded successfully.');
}

function refreshContractQR(id){
  const c = DB.contracts.find(x=>x.id===id);
  document.getElementById('contractTagWrap').innerHTML = contractTagFor(c);
  queueQR('qr_contract', verifyUrl('contract', c.id));
  flushQR();
}


function downloadContractQR(id){
  const qrBox = document.getElementById('qr_contract');

  if (!qrBox) {
    alert('QR code not found.');
    return;
  }

  const canvas = qrBox.querySelector('canvas');
  const img = qrBox.querySelector('img');

  if (canvas) {
    const link = document.createElement('a');
    link.download = `TourSphere_Contract_${id}_QR.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return;
  }

  if (img) {
    const link = document.createElement('a');
    link.download = `TourSphere_Contract_${id}_QR.png`;
    link.href = img.src;
    link.click();
    return;
  }

  alert('QR code is still loading. Please try again.');
}


function printContractQR(id){
  const contract = DB.contracts.find(c => c.id === id);

  if (!contract) {
    alert('Contract not found.');
    return;
  }

  const qrBox = document.getElementById('qr_contract');
  const canvas = qrBox?.querySelector('canvas');
  const img = qrBox?.querySelector('img');

  let qrImage = '';

  if (canvas) {
    qrImage = canvas.toDataURL('image/png');
  } else if (img) {
    qrImage = img.src;
  } else {
    alert('QR code is not ready. Please try again.');
    return;
  }

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Please allow pop-ups to print the QR code.');
    return;
  }

  const escapeHTML = value => String(value ?? '').replace(
    /[&<>"']/g,
    char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]
  );

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Contract QR - ${escapeHTML(contract.id)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 40px;
        }
        img {
          width: 250px;
          height: 250px;
          margin: 25px 0;
        }
        h2 { margin-bottom: 10px; }
        p { color: #555; }
      </style>
    </head>
    <body>
      <h2>TourSphere Contract Verification</h2>
      <h3>${escapeHTML(contract.title)}</h3>
      <p>Contract ID: ${escapeHTML(contract.id)}</p>
      <img src="${qrImage}" alt="Contract QR Code">
      <p>Scan this QR code to verify the contract.</p>
    </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}


function emailContractQR(id){
  const contract = DB.contracts.find(c => c.id === id);

  if (!contract) {
    alert('Contract not found.');
    return;
  }

  const url = verifyUrl('contract', id);

  const subject = `TourSphere Contract Verification - ${contract.id}`;

  const body = `Hello,

Please use the verification link below to check this contract.

Contract ID: ${contract.id}
Contract Title: ${contract.title}

Verification Link:
${url}

You may also scan the QR code provided separately.

Regards,
TourSphere`;

  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.location.href = mailto;
}



async function renewContract(id){
  const c = DB.contracts.find(x => x.id === id);

  if (!c) {
    alert('Contract not found.');
    return;
  }

  if (c.status !== 'Active') {
    alert('Only active contracts can be renewed.');
    return;
  }

  if (c.legalHold) {
    alert('Contracts on legal hold cannot be renewed.');
    return;
  }

  if (!c.end) {
    alert('This contract has no expiration date.');
    return;
  }

  const oldEnd = c.end;

  const newEnd = prompt(
    `Enter the new expiration date for ${id} (YYYY-MM-DD):`,
    oldEnd
  );

  if (newEnd === null) return;

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    !datePattern.test(newEnd) ||
    !Number.isFinite(Date.parse(newEnd)) ||
    new Date(newEnd).toISOString().slice(0, 10) !== newEnd
  ) {
    alert('Please enter a valid date in YYYY-MM-DD format.');
    return;
  }

  if (newEnd <= oldEnd) {
    alert('The new expiration date must be later than the current expiration date.');
    return;
  }

  if (!confirm(`Renew contract ${id} until ${newEnd}?`)) {
    return;
  }

  const renewedAt = new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const saved = await dbUpdate('contracts', 'id', id, {
    status: 'Renewed',
    end: newEnd,
    previousEndDate: oldEnd,
    renewedAt: renewedAt
  });

  if (!saved) return;

  logActivity(
    `Contract ${id} renewed. Previous end date: ${oldEnd}. New end date: ${newEnd}.`
  );

  render();

  alert('Contract renewed successfully.');
}



async function advanceApproval(id){
  const c = DB.contracts.find(x => x.id === id);

  if (!c) {
    alert('Contract not found.');
    return;
  }

  if (c.status !== 'Draft' && c.status !== 'Under Review') {
    alert('This contract is not awaiting approval.');
    return;
  }

  if (c.approvalLevel >= 2) {
    alert('This contract has already completed both approval levels.');
    return;
  }

  const nextLevel = c.approvalLevel + 1;

  const saved = await dbUpdate('contracts', 'id', id, {
    approvalLevel: nextLevel,
    status: 'Under Review'
  });

  if (!saved) return;

  logActivity(`Contract ${id} approved at level ${nextLevel}.`);

  render();

  if (nextLevel === 2) {
    alert('Both approval levels are complete. The contract is now awaiting signature and activation.');
  } else {
    alert(`Contract approved at level ${nextLevel} of 2.`);
  }
}


async function activateContract(id){
  const c = DB.contracts.find(x => x.id === id);

  if (!c) {
    alert('Contract not found.');
    return;
  }

  if (c.status !== 'Under Review') {
    alert('Only contracts under review can be activated.');
    return;
  }

  if (Number(c.approvalLevel) < 2) {
    alert('Both approval levels must be completed first.');
    return;
  }

  if (!c.signed || !c.signerName || !c.signedAt) {
    alert('A recorded signature, signer name, and signing date are required before activation.');
    return;
  }

  if (c.legalHold) {
    alert('Contracts on legal hold cannot be activated.');
    return;
  }

  if (c.end && daysUntil(c.end) < 0) {
    alert('An expired contract cannot be activated.');
    return;
  }

  if (!confirm(`Activate contract ${id}?`)) return;

  const saved = await dbUpdate('contracts', 'id', id, {
    status: 'Active'
  });

  if (!saved) return;

  logActivity(`Contract ${id} activated after completing approval and signature requirements.`);
  render();

  alert('Contract activated successfully.');
}



async function terminateContract(id){
  const c = DB.contracts.find(x => x.id === id);

  if (!c) {
    alert('Contract not found.');
    return;
  }

  if (c.status !== 'Active') {
    alert('Only active contracts can be terminated.');
    return;
  }

  if (c.legalHold) {
    alert('Contracts on legal hold cannot be terminated.');
    return;
  }

  const reason = prompt('Enter the reason for terminating this contract:');

  if (reason === null) return;

  if (!reason.trim()) {
    alert('A termination reason is required.');
    return;
  }

  if (!confirm(`Are you sure you want to terminate contract ${id}?`)) {
    return;
  }

  const terminatedAt = new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const saved = await dbUpdate('contracts', 'id', id, {
    status: 'Terminated',
    terminationReason: reason.trim(),
    terminatedAt: terminatedAt
  });

  if (!saved) return;

  logActivity(`Contract ${id} terminated. Reason: ${reason.trim()}`);

  render();

  alert('Contract terminated successfully.');
}



/* ============================================================
   Authentication
   ============================================================ */
function setLoginModeUI(){
  const badge = document.getElementById('loginModeBadge');
  const note = document.getElementById('loginModeNote');
  const roleField = document.getElementById('demoRoleField');
  document.getElementById('login_role').innerHTML = ROLES.map(r=>`<option>${r}</option>`).join('');
  roleField.style.display = 'none';
  if(LIVE){
    badge.textContent = '● Connected to database';
    badge.style.color = 'var(--teal)'; badge.style.background = '#E7F8EF';
    note.textContent = 'Sign in with a staff account stored in MySQL.';
  } else {
    badge.textContent = '● Database unavailable';
    badge.style.color = 'var(--rust)'; badge.style.background = '#FDECEC';
    note.textContent = 'TourSphere requires the PHP/MySQL backend. Offline/demo mode has been removed.';
  }
}
async function handleLogin(e){
  e.preventDefault();
  const email = document.getElementById('login_email').value.trim();
  const password = document.getElementById('login_password').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  
if(!LIVE){
  errEl.textContent = 'Unable to connect to the TourSphere server. Please try again later or contact the administrator.';
  return;
}

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

  if (SESSION.mustChangePassword) {
    openChangePassword();
    return;
  }

  await loadAllData();
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appRoot').style.display = 'grid';
  goTo('dashboard', null);

}


function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const showPassword = input.type === 'password';

  input.type = showPassword ? 'text' : 'password';
  button.textContent = showPassword ? '🙈' : '👁️';
  button.setAttribute(
    'aria-label',
    showPassword ? 'Hide password' : 'Show password'
  );
  button.setAttribute('aria-pressed', String(showPassword));
}

function openChangePassword(){
  if (!SESSION) return;

  if (document.getElementById('changePasswordModal')) return;

  const modal = document.createElement('div');
  modal.id = 'changePasswordModal';

  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  `;

  modal.innerHTML = `
    <div role="dialog" aria-modal="true" aria-label="Change Password"
         style="background:white;padding:28px;border-radius:14px;width:100%;max-width:420px;">

      <h2 style="margin-bottom:8px;">Change Password</h2>

      <p style="font-size:13px;color:#6b7280;margin-bottom:20px;">
        Enter your current password and choose a new password.
      </p>

      <form onsubmit="handleChangePassword(event)">

        
<div class="field">
  <label for="currentPassword">Current Password</label>

  <div style="display:flex;align-items:center;gap:8px;">
    <input type="password" id="currentPassword"
           autocomplete="current-password" required
           style="flex:1;min-width:0;">

    <button type="button"
            class="btn btn-ghost"
            aria-label="Show password"
            aria-pressed="false"
            onclick="togglePasswordVisibility('currentPassword', this)">
      👁️
    </button>
  </div>
</div>


        
<div class="field">
  <label for="newPassword">New Password</label>

  <div style="display:flex;align-items:center;gap:8px;">
    <input type="password" id="newPassword"
           autocomplete="new-password" minlength="12" required
           style="flex:1;min-width:0;">

    <button type="button"
            class="btn btn-ghost"
            aria-label="Show password"
            aria-pressed="false"
            onclick="togglePasswordVisibility('newPassword', this)">
      👁️
    </button>
  </div>
</div>


        
<div class="field">
  <label for="confirmPassword">Confirm New Password</label>

  <div style="display:flex;align-items:center;gap:8px;">
    <input type="password" id="confirmPassword"
           autocomplete="new-password" minlength="12" required
           style="flex:1;min-width:0;">

    <button type="button"
            class="btn btn-ghost"
            aria-label="Show password"
            aria-pressed="false"
            onclick="togglePasswordVisibility('confirmPassword', this)">
      👁️
    </button>
  </div>
</div>


        <p style="font-size:12px;color:#6b7280;">
          Use at least 12 characters.
        </p>

        <p id="changePasswordError"
           role="alert"
           style="color:#dc2626;font-size:13px;"></p>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
          
<button type="button" class="btn btn-ghost"
        onclick="document.getElementById('changePasswordModal').remove(); if(SESSION?.mustChangePassword) handleLogout();">
  ${SESSION?.mustChangePassword ? 'Sign out' : 'Cancel'}
</button>


          <button type="submit" class="btn" id="savePasswordBtn">
            Save Password
          </button>
        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('currentPassword').focus();
}


async function handleChangePassword(event){
  event.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const errorBox = document.getElementById('changePasswordError');
  const saveBtn = document.getElementById('savePasswordBtn');

  errorBox.textContent = '';

  if(newPassword.length < 12){
    errorBox.textContent = 'New password must be at least 12 characters.';
    return;
  }

  if(newPassword !== confirmPassword){
    errorBox.textContent = 'New passwords do not match.';
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const response = await fetch(`${API_AUTH}?action=change_password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword
      })
    });

    const data = await response.json();

    if(!response.ok || !data.ok){
      throw new Error(data.error || 'Unable to change password.');
    }

    
const wasRequired = SESSION?.mustChangePassword === true;

if (SESSION) {
  SESSION.mustChangePassword = false;
}

document.getElementById('changePasswordModal').remove();

if (wasRequired) {
  await loadAllData();

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appRoot').style.display = 'grid';

  goTo('dashboard', null);
}

alert('Password changed successfully!');


  } catch(error){
    errorBox.textContent = error.message || 'Something went wrong.';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Password';
  }
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

    // Require a password change even after refreshing the page.
    if(SESSION.mustChangePassword){
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('appRoot').style.display = 'none';

      openChangePassword();
      return;
    }

    // Normal login session — open the dashboard.
    await loadAllData();

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appRoot').style.display = 'grid';

    goTo('dashboard', null);
  }
})();
