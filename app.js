// Attendance Analytics & Prediction System Logic
// Phase 4: data layer rewired to AegisAPI (api.js); all rendering unchanged.

// Application State
let students = [];
let threshold = 75;
let borderlineLimit = 70;
let criticalLimit = 65;
let activeTab = 'overview';
let selectedStudent = null;
let liveFeedInterval = null;

// AI chat state (per student)
let chatHistory = [];
let chatStudentId = null;

// Chart references
let departmentChart = null;
let eligibilityChart = null;
let studentHistoryChart = null;

// ── API availability flag ─────────────────────────────────────────────────────
// Set to false if the backend health check fails; the app falls back to
// the in-memory students array (loaded from the seed / localStorage) so the
// UI still works without a running server.
let apiAvailable = false;

// Initialize App
window.addEventListener('DOMContentLoaded', async () => {
  loadConfig();
  await initDatabase();
  setupEventListeners();
  initLucide();
  renderDashboard();
  switchTab(activeTab);
  startLiveFeed();
});

// Load Config from LocalStorage
function loadConfig() {
  const savedThreshold = localStorage.getItem('att_threshold');
  const savedBorderline = localStorage.getItem('att_borderline');
  const savedCritical = localStorage.getItem('att_critical');

  if (savedThreshold) threshold = parseInt(savedThreshold);
  if (savedBorderline) borderlineLimit = parseInt(savedBorderline);
  if (savedCritical) criticalLimit = parseInt(savedCritical);

  document.getElementById('config-threshold-range').value = threshold;
  document.getElementById('config-threshold-val').textContent = threshold + '%';
  document.getElementById('config-borderline-range').value = borderlineLimit;
  document.getElementById('config-borderline-val').textContent = borderlineLimit + '%';
  document.getElementById('config-critical-range').value = criticalLimit;
  document.getElementById('config-critical-val').textContent = criticalLimit + '%';
}

// Save Config to LocalStorage
function saveConfig() {
  localStorage.setItem('att_threshold', threshold);
  localStorage.setItem('att_borderline', borderlineLimit);
  localStorage.setItem('att_critical', criticalLimit);
}

// ── initDatabase ─────────────────────────────────────────────────────────────
// Tries the real API first; falls back to localStorage → mockData.
async function initDatabase() {
  try {
    await AegisAPI.health();
    apiAvailable = true;
    const data = await AegisAPI.getStudents();
    students = data;
    // Mirror to localStorage so offline fallback is fresh
    localStorage.setItem('student_db', JSON.stringify(students));
    console.log(`[Aegis] API connected — loaded ${students.length} students from backend.`);
  } catch (err) {
    apiAvailable = false;
    console.warn('[Aegis] Backend unreachable — using local fallback.', err.message);
    const savedStudents = localStorage.getItem('student_db');
    if (savedStudents) {
      try { students = JSON.parse(savedStudents); } catch { students = [...initialStudents]; }
    } else {
      students = [...initialStudents];
      localStorage.setItem('student_db', JSON.stringify(students));
    }
  }
  if (students.length > 0) selectedStudent = students[0];
}

// ── resetDatabase ─────────────────────────────────────────────────────────────
// In API mode: re-fetches from the DB (seed must have run).
// In fallback mode: resets localStorage to the hardcoded mock list.
async function resetDatabase() {
  if (apiAvailable) {
    try {
      const data = await AegisAPI.getStudents();
      students = data;
      localStorage.setItem('student_db', JSON.stringify(students));
      showToast('Database refreshed from backend.', 'success');
    } catch (err) {
      showToast('Failed to refresh from backend: ' + err.message, 'danger');
      return;
    }
  } else {
    students = JSON.parse(JSON.stringify(initialMockDataReset()));
    localStorage.setItem('student_db', JSON.stringify(students));
    showToast('Database reset to original mock data.', 'success');
  }

  if (students.length > 0) selectedStudent = students[0];

  threshold = 75;
  borderlineLimit = 70;
  criticalLimit = 65;
  saveConfig();
  loadConfig();
  renderDashboard();
}

// Return a copy of initial data (so we don't mutate reference when restarting)
function initialMockDataReset() {
  return [
    { id:"STU001",name:"Rahul Kumar",department:"Computer Science (CSE)",semester:"Semester 4",totalWorkingDays:90,presentDays:78,absentDays:12,upcomingWorkingDays:25,subjects:[{name:"Data Structures",present:22,total:24},{name:"Operating Systems",present:18,total:22},{name:"Database Systems",present:20,total:22},{name:"Computer Networks",present:18,total:22}],history:[5,4,4,5,3,4]},
    { id:"STU002",name:"Sarah Jenkins",department:"Electronics (ECE)",semester:"Semester 6",totalWorkingDays:90,presentDays:61,absentDays:29,upcomingWorkingDays:25,subjects:[{name:"Microprocessors",present:13,total:22},{name:"Digital Signal Processing",present:16,total:23},{name:"VLSI Design",present:14,total:22},{name:"Communication Systems",present:18,total:23}],history:[4,4,3,2,1,2]},
    { id:"STU003",name:"Amit Patel",department:"Mechanical (ME)",semester:"Semester 2",totalWorkingDays:90,presentDays:65,absentDays:25,upcomingWorkingDays:25,subjects:[{name:"Engineering Mechanics",present:16,total:22},{name:"Thermodynamics",present:15,total:22},{name:"Material Science",present:17,total:23},{name:"Machine Drawing",present:17,total:23}],history:[2,3,3,4,5,5]},
    { id:"STU004",name:"Priya Sharma",department:"Computer Science (CSE)",semester:"Semester 4",totalWorkingDays:90,presentDays:88,absentDays:2,upcomingWorkingDays:25,subjects:[{name:"Data Structures",present:24,total:24},{name:"Operating Systems",present:22,total:22},{name:"Database Systems",present:21,total:22},{name:"Computer Networks",present:21,total:22}],history:[5,5,5,5,5,5]},
    { id:"STU005",name:"John Doe",department:"Information Technology (IT)",semester:"Semester 8",totalWorkingDays:90,presentDays:52,absentDays:38,upcomingWorkingDays:25,subjects:[{name:"Cloud Computing",present:12,total:23},{name:"Information Security",present:14,total:22},{name:"Big Data Analytics",present:13,total:23},{name:"Distributed Systems",present:13,total:22}],history:[3,2,2,1,1,0]},
    { id:"STU006",name:"Michael Chang",department:"Electrical (EEE)",semester:"Semester 6",totalWorkingDays:90,presentDays:64,absentDays:26,upcomingWorkingDays:25,subjects:[{name:"Power Systems",present:16,total:22},{name:"Control Systems",present:15,total:23},{name:"Electrical Machines",present:16,total:22},{name:"Power Electronics",present:17,total:23}],history:[3,4,3,4,3,4]}
  ];
}

// Re-initialize Lucide Icons
function initLucide() {
  if (window.lucide) window.lucide.createIcons();
}

// Tab Switching
function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.toggle('active', section.id === `tab-${tabId}`);
  });

  const titleText    = document.getElementById('page-title-text');
  const subtitleText = document.getElementById('page-subtitle-text');

  switch (tabId) {
    case 'overview':
      titleText.textContent    = 'Dashboard Overview';
      subtitleText.textContent = 'Institute-wide attendance analytics, predictions and compliance';
      break;
    case 'students':
      titleText.textContent    = 'Student Attendance Profile';
      subtitleText.textContent = 'Detailed predictive analysis, recovery paths, and subject tracking';
      populateStudentDropdown();
      if (selectedStudent) renderStudentProfile(selectedStudent.id);
      break;
    case 'faculty':
      titleText.textContent    = 'Faculty Administration Control';
      subtitleText.textContent = 'Browse directory list, trigger warning logs, import student rosters';
      renderFacultyRegistry();
      break;
    case 'config':
      titleText.textContent    = 'System Configurations';
      subtitleText.textContent = 'Customize parameters, eligibility thresholds, and simulators';
      break;
  }
}

// Event Listeners setup
function setupEventListeners() {
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', () => switchTab(link.getAttribute('data-tab')));
  });

  document.getElementById('btn-quick-notify').addEventListener('click', () => simulateLiveCheckIn());
  document.getElementById('btn-reset-default-db').addEventListener('click', () => resetDatabase());

  document.getElementById('config-threshold-range').addEventListener('input', (e) => {
    threshold = parseInt(e.target.value);
    document.getElementById('config-threshold-val').textContent = threshold + '%';
    saveConfig(); renderDashboard();
  });
  document.getElementById('config-borderline-range').addEventListener('input', (e) => {
    borderlineLimit = parseInt(e.target.value);
    document.getElementById('config-borderline-val').textContent = borderlineLimit + '%';
    saveConfig(); renderDashboard();
  });
  document.getElementById('config-critical-range').addEventListener('input', (e) => {
    criticalLimit = parseInt(e.target.value);
    document.getElementById('config-critical-val').textContent = criticalLimit + '%';
    saveConfig(); renderDashboard();
  });

  document.getElementById('student-search-input').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const matches = students.filter(s => s.name.toLowerCase().includes(val) || s.id.toLowerCase().includes(val));
    if (matches.length > 0) { populateStudentDropdown(matches); renderStudentProfile(matches[0].id); }
  });
  document.getElementById('student-select-dropdown').addEventListener('change', (e) => {
    renderStudentProfile(e.target.value);
  });

  document.getElementById('faculty-search-input').addEventListener('input', () => renderFacultyRegistry());
  document.getElementById('faculty-filter-dept').addEventListener('change', () => renderFacultyRegistry());
  document.getElementById('faculty-filter-status').addEventListener('change', () => renderFacultyRegistry());
  document.getElementById('btn-notify-all-at-risk').addEventListener('click', () => notifyAllAtRisk());

  document.getElementById('toggle-live-simulation').addEventListener('change', (e) => {
    if (e.target.checked) { startLiveFeed(); showToast('Live simulator started.', 'info'); }
    else { stopLiveFeed(); showToast('Live simulator paused.', 'info'); }
  });

  const dropZone   = document.getElementById('drop-zone');
  const fileUploader = document.getElementById('file-uploader');
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--color-primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'rgba(255,255,255,0.15)'; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.style.borderColor = 'rgba(255,255,255,0.15)';
    const file = e.dataTransfer.files[0]; if (file) handleFileImport(file);
  });
  fileUploader.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) handleFileImport(file); });
  document.getElementById('download-sample-template').addEventListener('click', (e) => { e.preventDefault(); downloadCSVTemplate(); });

  // AI chat send button
  const chatSendBtn = document.getElementById('ai-chat-send');
  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', () => sendAIChatMessage());
  }
  const chatInput = document.getElementById('ai-chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIChatMessage(); } });
  }
}

// -------------------------------------------------------------
// CORE CALCULATIONS (unchanged — mirrors attendanceMetrics.js)
// -------------------------------------------------------------

function calculateStudentMetrics(student) {
  const present = student.presentDays;
  const total   = student.totalWorkingDays;
  const pct     = total > 0 ? (present / total) * 100 : 0;

  const requiredPresent = Math.ceil((threshold / 100) * total);
  const deficit = Math.max(0, requiredPresent - present);

  let eligibility = 'ELIGIBLE';
  if (pct < borderlineLimit) eligibility = 'NOT_ELIGIBLE';
  else if (pct < threshold)  eligibility = 'BORDERLINE';

  const subjectsDetailed = student.subjects.map(s => {
    const sPct = s.total > 0 ? (s.present / s.total) * 100 : 0;
    let sStatus = 'SAFE';
    if (sPct < borderlineLimit)  sStatus = 'CRITICAL';
    else if (sPct < threshold)   sStatus = 'BORDERLINE';
    return { ...s, pct: sPct.toFixed(2), status: sStatus };
  });

  const history = student.history || [];
  let trend = 'STABLE';
  if (history.length >= 4) {
    const recent  = history.slice(-2);
    const older   = history.slice(0, -2);
    const recentAvg  = recent.reduce((a,b)=>a+b,0) / (recent.length * 5);
    const overallAvg = older.reduce((a,b)=>a+b,0)  / (older.length  * 5);
    const diff = recentAvg - overallAvg;
    if (diff > 0.05) trend = 'IMPROVING';
    else if (diff < -0.05) trend = 'DECLINING';
  }

  const upcoming       = student.upcomingWorkingDays || 20;
  const finalTotalDays = total + upcoming;
  let estimatedFutureRate = present / total;
  if (trend === 'IMPROVING') {
    estimatedFutureRate = Math.min(0.98, (present/total) + 0.05);
  } else if (trend === 'DECLINING' && history.length >= 2) {
    const recentRate = history.slice(-2).reduce((a,b)=>a+b,0) / 10;
    estimatedFutureRate = Math.max(0.3, recentRate - 0.05);
  }
  const predictedFuturePresent = present + estimatedFutureRate * upcoming;
  const expectedPct = (predictedFuturePresent / finalTotalDays) * 100;

  let prob = 0;
  if (expectedPct >= threshold) prob = 90 + Math.min(10,(expectedPct-threshold)*2);
  else if (expectedPct >= borderlineLimit) prob = 50 + ((expectedPct-borderlineLimit)/(threshold-borderlineLimit))*40;
  else prob = Math.max(5, ((expectedPct-40)/(borderlineLimit-40))*45);
  prob = Math.min(100, Math.max(0, prob));

  let riskLevel = 'LOW';
  if (expectedPct < borderlineLimit) riskLevel = 'HIGH';
  else if (expectedPct < threshold)  riskLevel = 'MEDIUM';

  const theta = threshold / 100;
  let consecutiveNeeded = 0;
  if (pct < threshold) consecutiveNeeded = Math.ceil((theta*total - present) / (1-theta));

  const finalRequiredPresent = Math.ceil(theta * finalTotalDays);
  const futureNeededPresent  = Math.max(0, finalRequiredPresent - present);
  let requiredFutureRate = 0;
  let isRecoveryPossible = true;
  if (futureNeededPresent > upcoming) { isRecoveryPossible = false; requiredFutureRate = 100; }
  else if (upcoming > 0) requiredFutureRate = (futureNeededPresent / upcoming) * 100;

  const sorted = [...subjectsDetailed].sort((a,b) => parseFloat(a.pct)-parseFloat(b.pct));
  const missedSubjectObj = sorted[0];
  const bestSubjectObj   = sorted[sorted.length-1];

  let consistencyScore = 95;
  if (history.length > 0) {
    const mean = history.reduce((a,b)=>a+b,0)/history.length;
    const variance = history.map(x=>Math.pow(x-mean,2)).reduce((a,b)=>a+b,0)/history.length;
    consistencyScore = Math.max(10, Math.round(100 - Math.sqrt(variance)*18));
  }

  return {
    overallPct: pct.toFixed(2), deficitDays: deficit, eligibility, subjectsDetailed,
    trend, expectedPct: expectedPct.toFixed(2), probability: Math.round(prob), riskLevel,
    consecutiveNeeded, requiredFutureRate: requiredFutureRate.toFixed(2), isRecoveryPossible,
    missedSubject: missedSubjectObj ? missedSubjectObj.name : 'N/A',
    missedSubjectPct: missedSubjectObj ? missedSubjectObj.pct : '0',
    bestSubject: bestSubjectObj ? bestSubjectObj.name : 'N/A',
    bestSubjectPct: bestSubjectObj ? bestSubjectObj.pct : '0',
    consistencyScore,
  };
}

// -------------------------------------------------------------
// UI RENDERING (unchanged from original)
// -------------------------------------------------------------

function renderDashboard() {
  if (students.length === 0) return;
  let totalPctSum=0, eligibleCount=0, borderlineCount=0, riskCount=0;
  const deptAverages = {};
  students.forEach(student => {
    const metrics = calculateStudentMetrics(student);
    const pctVal  = parseFloat(metrics.overallPct);
    totalPctSum  += pctVal;
    if (metrics.eligibility === 'ELIGIBLE') eligibleCount++;
    else if (metrics.eligibility === 'BORDERLINE') borderlineCount++;
    else riskCount++;
    const dept = student.department;
    if (!deptAverages[dept]) deptAverages[dept] = { sum:0, count:0 };
    deptAverages[dept].sum += pctVal; deptAverages[dept].count += 1;
  });
  const avgAttendance = totalPctSum / students.length;
  document.getElementById('metric-total-students').textContent = students.length;
  document.getElementById('metric-avg-attendance').textContent = avgAttendance.toFixed(2) + '%';
  document.getElementById('metric-eligible-count').textContent = eligibleCount;
  document.getElementById('metric-risk-count').textContent     = riskCount;
  const eligiblePct = ((eligibleCount/students.length)*100).toFixed(0);
  const riskPct     = ((riskCount/students.length)*100).toFixed(0);
  document.getElementById('metric-eligible-pct').textContent = `${eligiblePct}% of total registry`;
  document.getElementById('metric-risk-pct').innerHTML = `<i data-lucide="alert-triangle" style="width:14px;height:14px;display:inline-block;vertical-align:middle;"></i> ${riskPct}% detained risk`;
  const trendLabel = document.getElementById('metric-avg-attendance-trend');
  if (avgAttendance >= 75) {
    trendLabel.className = 'metric-trend up';
    trendLabel.innerHTML = `<i data-lucide="trending-up"></i> SAFE ZONE`;
  } else {
    trendLabel.className = 'metric-trend down';
    trendLabel.innerHTML = `<i data-lucide="alert-triangle"></i> BELOW ACCREDITATION LIMIT`;
  }
  renderDepartmentComparisonChart(deptAverages);
  renderEligibilityBreakdownChart(eligibleCount, borderlineCount, riskCount);
  initLucide();
}

function renderDepartmentComparisonChart(deptAverages) {
  const ctx = document.getElementById('chart-department'); if (!ctx) return;
  const labels = Object.keys(deptAverages).map(d => d.replace('Computer Science (CSE)','CSE').replace('Electronics (ECE)','ECE').replace('Mechanical (ME)','ME').replace('Information Technology (IT)','IT').replace('Electrical (EEE)','EEE'));
  const dataValues = Object.values(deptAverages).map(d => (d.sum/d.count).toFixed(1));
  if (departmentChart) departmentChart.destroy();
  departmentChart = new Chart(ctx, {
    type:'bar', data:{ labels, datasets:[{ label:'Average Attendance %', data:dataValues, backgroundColor:'rgba(59,130,246,0.4)', borderColor:'#3b82f6', borderWidth:2, borderRadius:6, hoverBackgroundColor:'rgba(139,92,246,0.5)', hoverBorderColor:'#8b5cf6' }] },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ min:40, max:100, grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#94a3b8'} }, x:{ grid:{display:false}, ticks:{color:'#94a3b8'} } }, plugins:{ legend:{display:false} } }
  });
}

function renderEligibilityBreakdownChart(eligible, borderline, risk) {
  const ctx = document.getElementById('chart-eligibility'); if (!ctx) return;
  if (eligibilityChart) eligibilityChart.destroy();
  eligibilityChart = new Chart(ctx, {
    type:'doughnut',
    data:{ labels:['Eligible (≥75%)','Borderline (70%-75%)','Not Eligible (<70%)'], datasets:[{ data:[eligible,borderline,risk], backgroundColor:['rgba(16,185,129,0.25)','rgba(245,158,11,0.25)','rgba(239,68,68,0.25)'], borderColor:['#10b981','#f59e0b','#ef4444'], borderWidth:1.5, hoverOffset:4 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{color:'#94a3b8',font:{family:'Plus Jakarta Sans',size:12}} } }, cutout:'65%' }
  });
}

function populateStudentDropdown(list = null) {
  const dropdown = document.getElementById('student-select-dropdown'); if (!dropdown) return;
  dropdown.innerHTML = '';
  const targetList = list || students;
  if (targetList.length === 0) { dropdown.innerHTML = "<option value=''>No Students Match</option>"; return; }
  targetList.forEach(student => {
    const opt = document.createElement('option');
    opt.value = student.id;
    opt.textContent = `${student.name} (${student.id})`;
    if (selectedStudent && student.id === selectedStudent.id) opt.selected = true;
    dropdown.appendChild(opt);
  });
}

function selectFirstStudent() {
  if (students.length > 0) {
    selectedStudent = students[0];
    document.getElementById('student-empty-state').style.display = 'none';
    document.getElementById('student-detail-container').style.display = 'block';
    const chatPanel = document.getElementById('ai-chat-panel');
    if (chatPanel) chatPanel.style.display = 'block';
    populateStudentDropdown(); renderStudentProfile(selectedStudent.id);
  }
}

// renderStudentProfile — unchanged rendering, with AI calls layered on top
function renderStudentProfile(studentId) {
  const student = students.find(s => s.id === studentId);
  if (!student) {
    document.getElementById('student-detail-container').style.display = 'none';
    document.getElementById('student-empty-state').style.display = 'block';
    const chatPanel = document.getElementById('ai-chat-panel');
    if (chatPanel) chatPanel.style.display = 'none';
    return;
  }
  selectedStudent = student;
  document.getElementById('student-empty-state').style.display = 'none';
  document.getElementById('student-detail-container').style.display = 'block';
  const chatPanel = document.getElementById('ai-chat-panel');
  if (chatPanel) chatPanel.style.display = 'block';
  const m = calculateStudentMetrics(student);

  document.getElementById('student-detail-name').textContent = student.name;
  document.getElementById('student-detail-id').textContent   = student.id;
  document.getElementById('student-detail-dept').textContent = student.department;
  document.getElementById('student-detail-sem').textContent  = student.semester;
  document.getElementById('student-avatar-letter').textContent = student.name.split(' ').map(w=>w[0]).join('').toUpperCase();

  const statusBadge = document.getElementById('student-detail-status-badge');
  if (m.eligibility === 'ELIGIBLE')
    statusBadge.innerHTML = `<span class="badge badge-success" style="font-size:0.95rem;padding:0.5rem 1rem;"><i data-lucide="check-circle" style="width:16px;height:16px;"></i> ELIGIBLE</span>`;
  else if (m.eligibility === 'BORDERLINE')
    statusBadge.innerHTML = `<span class="badge badge-warning" style="font-size:0.95rem;padding:0.5rem 1rem;"><i data-lucide="alert-circle" style="width:16px;height:16px;"></i> BORDERLINE</span>`;
  else
    statusBadge.innerHTML = `<span class="badge badge-danger" style="font-size:0.95rem;padding:0.5rem 1rem;"><i data-lucide="x-circle" style="width:16px;height:16px;"></i> NOT ELIGIBLE</span>`;

  document.getElementById('student-overall-pct').textContent  = m.overallPct + '%';
  document.getElementById('student-stat-total').textContent   = student.totalWorkingDays + ' Days';
  document.getElementById('student-stat-present').textContent = student.presentDays + ' Days';
  document.getElementById('student-stat-absent').textContent  = student.absentDays + ' Days';
  document.getElementById('student-stat-deficit').textContent = m.deficitDays + ' Days';

  const circleBar = document.getElementById('student-progress-circle');
  if (circleBar) {
    const radius = 65; const circumference = 2*Math.PI*radius;
    const pct = parseFloat(m.overallPct);
    circleBar.style.strokeDasharray  = circumference;
    circleBar.style.strokeDashoffset = circumference - (pct/100)*circumference;
    let col = '#ef4444';
    if (pct >= threshold) col = '#10b981';
    else if (pct >= borderlineLimit) col = '#f59e0b';
    circleBar.style.setProperty('--progress-color', col);
  }

  const subjectRowsContainer = document.getElementById('student-subject-rows');
  subjectRowsContainer.innerHTML = '';
  m.subjectsDetailed.forEach(s => {
    const row = document.createElement('tr');
    let sBadgeClass = 'badge-success';
    if (s.status === 'CRITICAL') sBadgeClass = 'badge-danger';
    else if (s.status === 'BORDERLINE') sBadgeClass = 'badge-warning';
    row.innerHTML = `<td style="font-weight:500;">${s.name}</td><td>${s.present} <span class="text-muted">/ ${s.total}</span></td><td style="font-family:var(--font-heading);font-weight:600;">${s.pct}%</td><td><span class="badge ${sBadgeClass}">${s.status}</span></td>`;
    subjectRowsContainer.appendChild(row);
  });

  document.getElementById('student-pred-pct').textContent  = m.expectedPct + '%';
  document.getElementById('student-pred-prob').textContent = m.probability + '%';
  const riskBadge = document.getElementById('student-pred-risk');
  riskBadge.textContent = m.riskLevel;
  riskBadge.className = m.riskLevel === 'LOW' ? 'badge badge-success' : m.riskLevel === 'MEDIUM' ? 'badge badge-warning' : 'badge badge-danger';

  const recBox   = document.getElementById('student-recovery-alert-box');
  const recTitle = document.getElementById('student-recovery-title');
  const recText  = document.getElementById('student-recovery-text');
  const recStats = document.getElementById('student-recovery-stats');
  const recIcon  = document.getElementById('student-recovery-icon');

  if (parseFloat(m.overallPct) >= threshold) {
    recBox.className = 'alert-box alert-box-success';
    recIcon.setAttribute('data-lucide','shield-check');
    recTitle.textContent = 'Safe Standing Achieved';
    recText.textContent  = 'Attendance matches the academy guidelines. Continue maintaining consistency to stay qualified.';
    recStats.style.display = 'none';
  } else {
    recBox.className = 'alert-box alert-box-warning';
    recIcon.setAttribute('data-lucide','alert-triangle');
    recTitle.textContent   = 'Deficit Recovery Plan Required';
    recStats.style.display = 'grid';
    document.getElementById('student-recovery-consec').textContent = m.consecutiveNeeded;
    if (m.isRecoveryPossible) {
      document.getElementById('student-recovery-rate').textContent = parseFloat(m.requiredFutureRate).toFixed(0) + '%';
      recText.textContent = `You must attend the next ${m.consecutiveNeeded} consecutive classes to reach the baseline of ${threshold}%. Alternatively, maintain a ${parseFloat(m.requiredFutureRate).toFixed(0)}% attendance rate in remaining working days.`;
    } else {
      document.getElementById('student-recovery-rate').textContent = 'ERR';
      recBox.className = 'alert-box alert-box-danger';
      recText.textContent = `CRITICAL DETENTION THRESHOLD. Math shows it is impossible to reach ${threshold}% even with 100% attendance in all remaining ${student.upcomingWorkingDays} classes. Contact Dean immediately.`;
    }
  }

  renderWeeklyHistoryChart(student.history);

  const trendBadge = document.getElementById('student-trend-badge');
  trendBadge.textContent = m.trend + ' TREND';
  trendBadge.className   = m.trend === 'IMPROVING' ? 'badge badge-success' : m.trend === 'DECLINING' ? 'badge badge-danger' : 'badge badge-info';

  // Render deterministic insights (always instant)
  const insightsList = document.getElementById('student-insights-list');
  insightsList.innerHTML = '';
  const insights = [
    { type:'danger',  icon:'alert-triangle', title:`Weakest Coverage: ${m.missedSubject}`, desc:`Subject attendance stands at ${m.missedSubjectPct}%. Needs rapid check-ins.` },
    { type:'success', icon:'check',          title:`Highest Coverage: ${m.bestSubject}`,   desc:`Doing great in this domain with ${m.bestSubjectPct}% coverage.` },
    { type:'info',    icon:'calendar',       title:`Consistency Index: ${m.consistencyScore}%`, desc:'Measures the uniformity of class attendance logs week-over-week.' },
  ];
  insights.forEach(ins => {
    const card = document.createElement('div');
    card.className = `insight-card ${ins.type}`;
    card.innerHTML = `<i data-lucide="${ins.icon}" class="insight-icon text-${ins.type}"></i><div class="insight-text"><div class="insight-title">${ins.title}</div><div class="insight-desc">${ins.desc}</div></div>`;
    insightsList.appendChild(card);
  });

  // Render AI recommendations (async, replaces static list when ready)
  renderAIRecommendations(student.id, m);

  // Reset AI chat for new student
  resetAIChat(student.id);

  initLucide();
}

// ── AI Recommendations (async, replaces static list) ─────────────────────────
async function renderAIRecommendations(studentId, metrics) {
  const recList = document.getElementById('student-recommendation-list');
  if (!recList) return;

  // Show deterministic fallback immediately, then replace with AI result
  const staticRecs = parseFloat(metrics.overallPct) >= threshold
    ? [
        'Avoid unnecessary leave to maintain the safe eligible standing.',
        'Support peers in study groups to encourage class participation.',
        'Maintain active communication logs with subject faculty advisors.',
      ]
    : [
        `Prioritize attending the next ${metrics.consecutiveNeeded} consecutive sessions in ${metrics.missedSubject} immediately.`,
        'Submit official medical excuses or extenuating logs for recent absences.',
        'Schedule a tutoring check-in with the academic advisor to lock a condoration backup.',
      ];

  function renderList(recs) {
    recList.innerHTML = '';
    recs.forEach(recText => {
      const item = document.createElement('li');
      item.className = 'rec-item';
      item.innerHTML = `<i data-lucide="chevron-right"></i> <span>${recText}</span>`;
      recList.appendChild(item);
    });
    initLucide();
  }

  renderList(staticRecs);

  if (!apiAvailable) return;

  // Non-blocking: fetch AI recs and swap in silently
  try {
    const data = await AegisAPI.getRecommendations(studentId);
    if (data.recommendations && data.recommendations.length > 0) {
      renderList(data.recommendations);
    }
  } catch (err) {
    console.warn('[Aegis AI] Recommendations unavailable:', err.message);
    // Static list already shown — no visible error to user
  }
}

// ── AI Chat ───────────────────────────────────────────────────────────────────
function resetAIChat(studentId) {
  if (chatStudentId === studentId) return; // same student, preserve history
  chatStudentId = studentId;
  chatHistory   = [];
  const log = document.getElementById('ai-chat-log');
  if (log) {
    log.innerHTML = `<div class="chat-message assistant"><span class="chat-bubble">Hi! I'm Aegis AI. Ask me anything about this student's attendance, recovery plan, or predictions.</span></div>`;
  }
}

async function sendAIChatMessage() {
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;
  if (!apiAvailable) { showToast('Backend not connected — AI chat unavailable.', 'warning'); return; }
  if (!chatStudentId) { showToast('Select a student first.', 'warning'); return; }

  input.value = '';
  appendChatMessage('user', message);
  appendChatMessage('assistant', '<span class="chat-typing">Aegis AI is thinking…</span>');

  try {
    const data = await AegisAPI.chat(chatStudentId, message, chatHistory);
    // Replace typing indicator with real reply
    const log   = document.getElementById('ai-chat-log');
    const typing = log.querySelector('.chat-typing');
    if (typing) typing.closest('.chat-message').remove();
    appendChatMessage('assistant', data.reply);
    chatHistory = data.updatedHistory;
  } catch (err) {
    const log    = document.getElementById('ai-chat-log');
    const typing = log ? log.querySelector('.chat-typing') : null;
    if (typing) typing.closest('.chat-message').remove();
    appendChatMessage('assistant', `Sorry, I encountered an error: ${err.message}`);
  }
}

function appendChatMessage(role, html) {
  const log = document.getElementById('ai-chat-log'); if (!log) return;
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  div.innerHTML = `<span class="chat-bubble">${html}</span>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// Line chart for student history (unchanged)
function renderWeeklyHistoryChart(history = []) {
  const ctx = document.getElementById('chart-student-history'); if (!ctx) return;
  if (studentHistoryChart) studentHistoryChart.destroy();
  const labels = history.map((_,i) => `Wk ${i+1}`);
  const percentages = history.map(days => (days/5)*100);
  studentHistoryChart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets:[{ label:'Weekly Rate %', data:percentages, borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.1)', borderWidth:2, tension:0.3, fill:true, pointBackgroundColor:'#8b5cf6', pointRadius:4 }] },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8',font:{size:10}}}, x:{grid:{display:false},ticks:{color:'#94a3b8',font:{size:10}}} }, plugins:{legend:{display:false}} }
  });
}

// -------------------------------------------------------------
// FACULTY REGISTRY TABLE (unchanged)
// -------------------------------------------------------------

function renderFacultyRegistry() {
  const tbody = document.getElementById('faculty-registry-rows'); if (!tbody) return;
  tbody.innerHTML = '';
  const searchVal  = document.getElementById('faculty-search-input').value.toLowerCase();
  const deptVal    = document.getElementById('faculty-filter-dept').value;
  const statusVal  = document.getElementById('faculty-filter-status').value;

  const filtered = students.filter(student => {
    const m = calculateStudentMetrics(student);
    const matchesSearch  = student.name.toLowerCase().includes(searchVal) || student.id.toLowerCase().includes(searchVal);
    const matchesDept    = deptVal === 'ALL' || student.department.includes(deptVal);
    let matchesStatus = true;
    if (statusVal !== 'ALL') {
      if (statusVal === 'RISK_HIGH') matchesStatus = m.riskLevel === 'HIGH';
      else matchesStatus = m.eligibility === statusVal;
    }
    return matchesSearch && matchesDept && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:3rem;">No student records match search criteria.</td></tr>`;
    return;
  }

  filtered.forEach(student => {
    const m = calculateStudentMetrics(student);
    const row = document.createElement('tr');
    let badgeClass = 'badge-success';
    if (m.eligibility === 'NOT_ELIGIBLE') badgeClass = 'badge-danger';
    else if (m.eligibility === 'BORDERLINE') badgeClass = 'badge-warning';
    row.innerHTML = `
      <td><strong>${student.id}</strong></td>
      <td><a class="student-list-item-link" onclick="viewStudentDetailsDirectly('${student.id}')">${student.name}</a></td>
      <td>${student.department.replace('Computer Science ','').replace('Electronics ','').replace('Mechanical ','').replace('Information Technology ','').replace('Electrical ','')}</td>
      <td style="text-align:right;">${student.presentDays} <span class="text-muted">/ ${student.totalWorkingDays}</span></td>
      <td style="text-align:right;font-weight:600;font-family:var(--font-heading);">${m.overallPct}%</td>
      <td><span class="badge ${badgeClass}">${m.eligibility.replace('_',' ')}</span></td>
      <td style="text-align:center;">
        <div style="display:flex;gap:0.5rem;justify-content:center;">
          <button class="btn btn-secondary btn-sm" onclick="sendSimulationNotification('${student.id}','email')" title="Email Notification" style="padding:0.35rem 0.5rem;font-size:0.75rem;"><i data-lucide="mail" style="width:14px;height:14px;"></i></button>
          <button class="btn btn-secondary btn-sm" onclick="sendSimulationNotification('${student.id}','whatsapp')" title="WhatsApp Alert" style="padding:0.35rem 0.5rem;font-size:0.75rem;color:#25D366;"><i data-lucide="message-circle" style="width:14px;height:14px;"></i></button>
        </div>
      </td>`;
    tbody.appendChild(row);
  });
  initLucide();
}

function viewStudentDetailsDirectly(studentId) {
  selectedStudent = students.find(s => s.id === studentId);
  switchTab('students');
}

function sendSimulationNotification(studentId, type) {
  const student = students.find(s => s.id === studentId); if (!student) return;
  const m = calculateStudentMetrics(student);
  const channelsEmail = document.getElementById('toggle-email-alerts').checked;
  const channelsWA    = document.getElementById('toggle-whatsapp-alerts').checked;
  if (type === 'email' && !channelsEmail) { showToast('Email notifications are currently disabled.', 'warning'); return; }
  if (type === 'whatsapp' && !channelsWA) { showToast('WhatsApp integrations are currently disabled.', 'warning'); return; }
  const label = type === 'email' ? 'Email sent to student inbox' : 'WhatsApp delivered to guardian';
  let text = `Ref ${student.id}: ${student.name}'s attendance is ${m.overallPct}%. `;
  if (parseFloat(m.overallPct) < threshold) text += `Deficit is ${m.deficitDays} days. Recovery requires attending ${m.consecutiveNeeded} consecutive sessions.`;
  else text += 'Registry status is compliant.';
  showToast(`<strong>${label}</strong><br><span style="font-size:0.75rem;">"${text}"</span>`, 'success');
}

function notifyAllAtRisk() {
  let cnt = 0;
  students.forEach(student => {
    const m = calculateStudentMetrics(student);
    if (parseFloat(m.overallPct) < threshold) {
      cnt++;
      const emailOn = document.getElementById('toggle-email-alerts').checked;
      const waOn    = document.getElementById('toggle-whatsapp-alerts').checked;
      console.log(`[ALERT DISPATCHED] To: ${student.name} via ${emailOn ? 'Email' : ''} ${waOn ? 'WhatsApp' : ''}`);
    }
  });
  if (cnt > 0) showToast(`Dispatched warnings to ${cnt} students currently flagged below the ${threshold}% limit.`, 'success');
  else showToast('All students comply with current attendance guidelines.', 'info');
}

// -------------------------------------------------------------
// LIVE SIMULATION FEED (rewired: check-in persists to API when available)
// -------------------------------------------------------------

function startLiveFeed() {
  if (liveFeedInterval) clearInterval(liveFeedInterval);
  const feed = document.getElementById('live-attendance-feed');
  if (feed) {
    feed.innerHTML = '';
    [
      { name:'Rahul Kumar',  action:'checked into Data Structures class', time:'2 min ago' },
      { name:'Sarah Jenkins',action:'marked absent for VLSI Design',      time:'5 min ago' },
      { name:'Amit Patel',   action:'checked into Thermodynamics session', time:'11 min ago'},
    ].forEach(item => appendFeedItem(item.name, item.action, item.time));
  }
  liveFeedInterval = setInterval(() => simulateLiveCheckIn(), 18000);
}

function stopLiveFeed() {
  if (liveFeedInterval) { clearInterval(liveFeedInterval); liveFeedInterval = null; }
}

async function simulateLiveCheckIn() {
  if (students.length === 0) return;
  const randStudent = students[Math.floor(Math.random()*students.length)];
  const randSub     = randStudent.subjects[Math.floor(Math.random()*randStudent.subjects.length)];
  const isPresent   = Math.random() < 0.8;

  if (apiAvailable && randSub.id) {
    // Persist to database and get the fresh student back
    try {
      const updated = await AegisAPI.checkIn(randStudent.id, randSub.id, isPresent);
      const idx = students.findIndex(s => s.id === updated.id);
      if (idx !== -1) students[idx] = updated;
      localStorage.setItem('student_db', JSON.stringify(students));
    } catch (err) {
      console.warn('[Aegis] check-in API failed, falling back to local mutation:', err.message);
      _mutateStudentLocally(randStudent, randSub, isPresent);
    }
  } else {
    _mutateStudentLocally(randStudent, randSub, isPresent);
  }

  const actionText = isPresent
    ? `<span style="color:var(--color-success);">checked into</span> ${randSub.name}`
    : `<span style="color:var(--color-danger);">marked absent</span> from ${randSub.name}`;
  appendFeedItem(randStudent.name, actionText, 'Just now');

  renderDashboard();
  if (activeTab === 'students' && selectedStudent && selectedStudent.id === randStudent.id) renderStudentProfile(randStudent.id);
  else if (activeTab === 'faculty') renderFacultyRegistry();

  const m = calculateStudentMetrics(randStudent);
  if (!isPresent && parseFloat(m.overallPct) < criticalLimit)
    showToast(`<strong>CRITICAL ALERT: ${randStudent.id}</strong><br>${randStudent.name}'s attendance has dropped to ${m.overallPct}%! Faculty advice recommended.`, 'danger');
  else if (!isPresent && parseFloat(m.overallPct) < threshold)
    showToast(`<strong>WARNING ALERT: ${randStudent.id}</strong><br>${randStudent.name} is now BORDERLINE. Attendance is ${m.overallPct}%.`, 'warning');
}

/** Local-only mutation used when API is unavailable (mirrors original logic) */
function _mutateStudentLocally(student, subject, isPresent) {
  student.totalWorkingDays += 1;
  subject.total += 1;
  if (isPresent) { student.presentDays += 1; subject.present += 1; }
  else { student.absentDays += 1; }
  if (student.totalWorkingDays % 5 === 0) {
    if (student.history.length >= 8) student.history.shift();
    student.history.push(isPresent ? 4+Math.round(Math.random()) : 2+Math.round(Math.random()*2));
  }
  localStorage.setItem('student_db', JSON.stringify(students));
}

function appendFeedItem(name, action, timeText) {
  const feed = document.getElementById('live-attendance-feed'); if (!feed) return;
  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase();
  const li = document.createElement('li');
  li.className = 'feed-item';
  li.innerHTML = `<div class="feed-avatar">${initials}</div><div class="feed-info"><div class="feed-action"><span class="feed-student-name">${name}</span> ${action}</div><div class="feed-time">${timeText}</div></div>`;
  feed.prepend(li);
  if (feed.children.length > 8) feed.removeChild(feed.lastChild);
}

// -------------------------------------------------------------
// TOAST MESSAGING (unchanged)
// -------------------------------------------------------------

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-notification-container'); if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  else if (type === 'warning') icon = 'alert-triangle';
  else if (type === 'danger')  icon = 'alert-octagon';
  toast.innerHTML = `<i data-lucide="${icon}" style="flex-shrink:0;width:18px;height:18px;margin-top:0.15rem;"></i><div style="font-size:0.85rem;line-height:1.45;">${message}</div><button class="toast-close">&times;</button>`;
  container.appendChild(toast);
  initLucide();
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.animation = 'fadeOut 0.2s ease-in forwards';
    setTimeout(() => toast.remove(), 200);
  });
  setTimeout(() => {
    if (toast.parentNode) { toast.style.animation = 'fadeOut 0.2s ease-in forwards'; setTimeout(() => toast.remove(), 200); }
  }, 6000);
}

// -------------------------------------------------------------
// SPREADSHEET IMPORTER (rewired: bulk upsert to API when available)
// -------------------------------------------------------------

function handleFileImport(file) {
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      let importedList = [];
      if (file.name.endsWith('.csv')) {
        importedList = parseCSVContent(new TextDecoder().decode(e.target.result));
      } else {
        const workbook = XLSX.read(e.target.result, { type:'binary' });
        importedList = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      }
      await processImportedStudents(importedList);
    } catch (err) {
      console.error(err);
      showToast('Failed to parse sheet file. Please ensure spreadsheet columns match layout formats.', 'danger');
    }
  };
  if (file.name.endsWith('.csv')) reader.readAsArrayBuffer(file);
  else reader.readAsBinaryString(file);
}

function parseCSVContent(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
  const list = [];
  for (let i=1; i<lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map(v=>v.trim().replace(/^"|"$/g,''));
    const obj = {};
    headers.forEach((h,idx) => { obj[h] = values[idx]; });
    list.push(obj);
  }
  return list;
}

async function processImportedStudents(rawList) {
  if (rawList.length === 0) { showToast('Import error: File was empty.', 'warning'); return; }

  let successCount = 0;
  const normalised = [];

  rawList.forEach(row => {
    const id      = row['Student ID']||row['ID']||row['id']||row['StudentId'];
    const name    = row['Student Name']||row['Name']||row['name']||row['StudentName'];
    const dept    = row['Department']||row['Dept']||row['dept']||'General Studies';
    const sem     = row['Semester']||row['Sem']||row['semester']||'Semester 1';
    const working = parseInt(row['Total Days']||row['Total Working Days']||row['totalDays']||90);
    const present = parseInt(row['Present Days']||row['Days Present']||row['presentDays']||0);
    const absent  = parseInt(row['Absent Days']||row['Days Absent']||row['absentDays']||0);
    if (!id || !name) return;

    let subjects = [];
    if (dept.includes('CSE')||dept.includes('Computer')) {
      subjects = [{name:'Data Structures',present:Math.round(present*0.28),total:Math.round(working*0.28)},{name:'Operating Systems',present:Math.round(present*0.24),total:Math.round(working*0.24)},{name:'Database Systems',present:Math.round(present*0.24),total:Math.round(working*0.24)},{name:'Computer Networks',present:Math.round(present*0.24),total:Math.round(working*0.24)}];
    } else {
      subjects = [{name:'General Syllabus 1',present:Math.round(present*0.5),total:Math.round(working*0.5)},{name:'General Syllabus 2',present:Math.round(present*0.5),total:Math.round(working*0.5)}];
    }
    const baseWeekly = Math.round((present/working)*5);
    const history = Array.from({length:6},()=>Math.max(0,Math.min(5,baseWeekly+Math.round(Math.random()*2-1))));

    normalised.push({ id, name, department:dept, semester:sem, totalWorkingDays:working, presentDays:present, absentDays:absent, upcomingWorkingDays:25, subjects, history });
    successCount++;
  });

  if (successCount === 0) { showToast('Invalid header layouts. Please check CSV column templates.', 'danger'); return; }

  if (apiAvailable) {
    try {
      await AegisAPI.bulkUpsert(normalised);
      const data = await AegisAPI.getStudents();
      students = data;
    } catch (err) {
      showToast('API bulk import failed: ' + err.message, 'danger'); return;
    }
  } else {
    normalised.forEach(ns => {
      const idx = students.findIndex(s=>s.id===ns.id);
      if (idx !== -1) students[idx] = ns; else students.push(ns);
    });
  }

  localStorage.setItem('student_db', JSON.stringify(students));
  renderDashboard();
  if (activeTab === 'faculty') renderFacultyRegistry();
  else if (activeTab === 'students') { populateStudentDropdown(); if (selectedStudent) renderStudentProfile(selectedStudent.id); }
  showToast(`Successfully imported/merged ${successCount} student records!`, 'success');
}

function downloadCSVTemplate() {
  const headers = 'Student ID,Student Name,Department,Semester,Total Days,Present Days,Absent Days\n';
  const rows = ['STU101,Aarav Sharma,Computer Science (CSE),Semester 4,90,72,18','STU102,Emma Watson,Electronics (ECE),Semester 6,90,62,28','STU103,Rohan Verma,Mechanical (ME),Semester 2,90,88,2'].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href','data:text/csv;charset=utf-8,'+encodeURI(headers+rows));
  link.setAttribute('download','attendance_template.csv');
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
