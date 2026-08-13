// Inisialisasi Icons
lucide.createIcons();

// --- STATE MANAGEMENT ---
let acData = [];
let logPemeliharaan = [];
let logMutasi = [];
let logUsulHapus = [];
let logPemakaian = [];
let usersData = [];

// Variabel untuk menyimpan hasil filter
let filteredLogPemeliharaan = [];
let filteredLogMutasi = [];
let filteredLogUsulHapus = [];
let filteredLogPemakaian = [];

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxQIo3Dj54MMMt5XAIfdS96hFLS2tk6DPh1H6PKj77hAFcaaJrvJ3_DpFDaZupBa55a/exec";

// --- PENGATURAN DATABASE ---
function extractSpreadsheetId(urlOrId) {
  if (!urlOrId) return "";
  var match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return urlOrId;
}

function getTargetSpreadsheetId() {
  return localStorage.getItem('si_ac_target_spreadsheet') || "";
}

function openSettingsModal() {
  document.getElementById('inputSpreadsheetLink').value = getTargetSpreadsheetId() ? `https://docs.google.com/spreadsheets/d/${getTargetSpreadsheetId()}/edit` : "";
  document.getElementById('settingsModal').classList.remove('hidden');
  document.getElementById('settingsModal').classList.add('show');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('show');
  setTimeout(() => {
    document.getElementById('settingsModal').classList.add('hidden');
  }, 300);
}

function saveDatabaseSettings() {
  const link = document.getElementById('inputSpreadsheetLink').value;
  const id = extractSpreadsheetId(link);
  if (id) {
    localStorage.setItem('si_ac_target_spreadsheet', id);
    closeSettingsModal();
    
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
      // Jika belum login (menghubungkan DB dari layar login), cukup reload halaman
      alert("Berhasil terhubung ke Spreadsheet tujuan! Memuat ulang aplikasi...");
      location.reload();
      return;
    }
    
    initState().then(() => {
      filterData();
      renderLogTable('pemeliharaan');
      renderLogTable('mutasi');
      renderLogTable('usul-hapus');
      initDashboard();
      alert("Berhasil terhubung ke Spreadsheet tujuan!");
    });
  } else {
    alert("Format link tidak valid! Harap masukkan link Google Spreadsheet yang benar.");
  }
}

function disconnectDatabase() {
  if (confirm("Apakah Anda yakin ingin memutus koneksi dari spreadsheet saat ini? (Data akan dikosongkan)")) {
    localStorage.removeItem('si_ac_target_spreadsheet');
    closeSettingsModal();
    alert("Koneksi diputus. Aplikasi akan dimuat ulang tanpa data.");
    location.reload();
  }
}

// Normalisasi Notasi Ilmiah
function normalizeSeri(arr, fields) {
  return arr.map(item => {
    fields.forEach(f => {
      if (item[f] && /^[\d\.]+[eE]\+\d+$/.test(String(item[f]))) {
        item[f] = Number(item[f]).toLocaleString('fullwide', {useGrouping: false});
      }
    });
    return item;
  });
}

async function saveToDatabase() {
  const payload = { acData, logPemeliharaan, logMutasi, logUsulHapus };
  const targetId = getTargetSpreadsheetId();
  try {
    console.log("Menyimpan ke Google Sheets...");
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ targetSpreadsheetId: targetId, payload: payload })
    });
    console.log("Berhasil tersimpan di Google Sheets!");
  } catch(e) {
    console.error("Gagal menyimpan ke Google Sheets:", e);
    alert("Gagal menyimpan ke Google Sheets. Pastikan koneksi internet Anda stabil.");
  }
}

async function initState() {
  try {
    const tbody = document.getElementById('tableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 32px;"><i data-lucide="loader" class="spin"></i> Mengunduh data dari Google Sheets...</td></tr>';
    lucide.createIcons();

    const targetId = getTargetSpreadsheetId();
    if (!targetId) {
      acData = []; logPemeliharaan = []; logMutasi = []; logUsulHapus = []; usersData = [];
      if (tbody) tbody.innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 32px; color: var(--danger-color);">⚠️ Tidak ada database yang terhubung. Silakan hubungkan link Google Sheets di Pengaturan Database (⚙️).</td></tr>';
      
      // Update UI Login agar memunculkan tombol Hubungkan Database
      const loginInitMsg = document.getElementById('loginInitMsg');
      if (loginInitMsg) {
        loginInitMsg.innerText = "Belum terhubung ke Database!";
        loginInitMsg.style.color = "var(--danger-color)";
      }
      document.getElementById('loginUserGroup')?.classList.add('hidden');
      document.getElementById('loginPassGroup')?.classList.add('hidden');
      document.getElementById('btnLoginBtn')?.classList.add('hidden');
      document.getElementById('btnConnectDbLogin')?.classList.remove('hidden');
      
      return;
    }

    // Jika targetId ada, kembalikan UI Login ke normal (siapa tahu dari state disconnect)
    document.getElementById('loginUserGroup')?.classList.remove('hidden');
    document.getElementById('loginPassGroup')?.classList.remove('hidden');
    document.getElementById('btnLoginBtn')?.classList.remove('hidden');
    document.getElementById('btnConnectDbLogin')?.classList.add('hidden');
    const loginInitMsg = document.getElementById('loginInitMsg');
    if (loginInitMsg) {
      loginInitMsg.innerText = "Memuat data pengguna dari Server...";
      loginInitMsg.style.color = "var(--text-secondary)";
    }

    const fetchUrl = `${WEB_APP_URL}?id=${targetId}`;

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    const dbData = await response.json();

    if (dbData.error) {
      alert("Error dari Server: " + dbData.error + "\n\nPastikan URL Spreadsheet di Pengaturan Database sudah benar.");
      
      // TAMPILKAN KEMBALI TOMBOL HUBUNGKAN DATABASE AGAR USER BISA MENGGANTI LINK JIKA SALAH
      document.getElementById('loginUserGroup')?.classList.add('hidden');
      document.getElementById('loginPassGroup')?.classList.add('hidden');
      document.getElementById('btnLoginBtn')?.classList.add('hidden');
      document.getElementById('btnConnectDbLogin')?.classList.remove('hidden');
      const loginInitMsg = document.getElementById('loginInitMsg');
      if (loginInitMsg) {
        loginInitMsg.innerText = "Error dari Database. Silakan periksa URL Anda.";
        loginInitMsg.style.color = "var(--danger-color)";
      }
      
      acData = []; logPemeliharaan = []; logMutasi = []; logUsulHapus = [];
      return;
    }

    let isDbEmpty = (!dbData.acData || dbData.acData.length === 0) && (!dbData.logPemeliharaan || dbData.logPemeliharaan.length === 0);

    if (isDbEmpty && typeof initialData !== 'undefined' && initialData.length > 0) {
      if (confirm("Spreadsheet Google Anda saat ini KOSONG.\n\nApakah Anda ingin memindahkan data aplikasi yang sudah ada ke Spreadsheet ini?")) {
        acData = initialData;
        logPemeliharaan = typeof initialLogPemeliharaan !== 'undefined' ? initialLogPemeliharaan : [];
        logMutasi = typeof initialLogMutasi !== 'undefined' ? initialLogMutasi : [];
        logUsulHapus = typeof initialLogUsulHapus !== 'undefined' ? initialLogUsulHapus : [];
        await saveToDatabase();
        alert("Berhasil! Data Anda sudah dipindahkan ke Spreadsheet baru.");
      } else {
        acData = []; logPemeliharaan = []; logMutasi = []; logUsulHapus = [];
      }
    } else {
      acData = dbData.acData || [];
      logPemeliharaan = dbData.logPemeliharaan || [];
      logMutasi = dbData.logMutasi || [];
      logUsulHapus = dbData.logUsulHapus || [];
      logPemakaian = dbData.logPemakaian || [];
      usersData = dbData.users || [];
      
      // Update login status message
      const loginInitMsg = document.getElementById('loginInitMsg');
      if (loginInitMsg) {
        loginInitMsg.innerText = "Sistem Siap.";
        loginInitMsg.style.color = "var(--success-color)";
      }

      // Pastikan semua data punya ID unik
      acData.forEach((x, i) => { if (!x.No) x.No = Date.now().toString() + i; });
      logPemeliharaan.forEach((x, i) => { if (!x.id_laporan) x.id_laporan = Date.now().toString() + i; });
      logMutasi.forEach((x, i) => { if (!x.id_mutasi) x.id_mutasi = Date.now().toString() + i; });
      logUsulHapus.forEach((x, i) => { if (!x.id_usulan) x.id_usulan = Date.now().toString() + i; });
    }

    // Normalisasi nomor seri dari notasi ilmiah
    acData = normalizeSeri(acData, ['No. Seri Indoor', 'No. Seri Outdoor']);
    logPemeliharaan = normalizeSeri(logPemeliharaan, ['no_seri_indoor']);
    logMutasi = normalizeSeri(logMutasi, ['no_seri_indoor']);
    logUsulHapus = normalizeSeri(logUsulHapus, ['no_seri_indoor']);

    // RETROACTIVE FIX: Pastikan AC yang sudah masuk Log Usul Hapus memiliki Gedung='Gudang'
    let needsSave = false;
    logUsulHapus.forEach(log => {
      if (!log.no_seri_indoor) return;
      const idx = acData.findIndex(x => x['No. Seri Indoor'] == log.no_seri_indoor);
      if (idx > -1) {
        let changed = false;
        if (acData[idx].Gedung !== 'Gudang') {
          acData[idx].Gedung = 'Gudang';
          if (log.Lokasi_Gudang || log.lokasi_gudang) {
            acData[idx].Lokasi = log.Lokasi_Gudang || log.lokasi_gudang;
          }
          changed = true;
        }
        
        const existingKet = acData[idx].Keterangan || '';
        const kondisi = log.kondisi_terakhir || '';
        if (kondisi && !existingKet.includes(kondisi)) {
          acData[idx].Keterangan = existingKet ? (existingKet + ' | ' + kondisi) : kondisi;
          changed = true;
        }
        
        if (changed) needsSave = true;
      }
    });
    if (needsSave) {
      console.log("Melakukan perbaikan sinkronisasi Master Data secara otomatis...");
      await saveToDatabase();
    }

  } catch(e) {
    console.error("Gagal memuat database dari server Google:", e);
    
    // TAMPILKAN KEMBALI TOMBOL HUBUNGKAN DATABASE AGAR USER BISA MENGGANTI LINK JIKA SALAH
    document.getElementById('loginUserGroup')?.classList.add('hidden');
    document.getElementById('loginPassGroup')?.classList.add('hidden');
    document.getElementById('btnLoginBtn')?.classList.add('hidden');
    document.getElementById('btnConnectDbLogin')?.classList.remove('hidden');
    const loginInitMsg = document.getElementById('loginInitMsg');
    if (loginInitMsg) {
      loginInitMsg.innerText = "Koneksi gagal. Silakan periksa URL Database.";
      loginInitMsg.style.color = "var(--danger-color)";
    }
    
    alert("Gagal mengunduh data dari Google Sheets! Pastikan Anda memiliki koneksi internet dan URL Spreadsheet (Database) sudah benar.");
  }
}

// Variables untuk Pagination & Table Utama
let currentPage = 1;
const rowsPerPage = 15;
let filteredData = [];

// ROBOT 1: Alarm Pengingat 3 Bulan (Usul Hapus)
function checkAlarmUsulHapus() {
  let jatuhTempo = 0;
  let daftarSeri = [];
  const hariIni = new Date();

  logUsulHapus.forEach(item => {
    const status = String(item.status_sistem || '');
    if (status === "✅ MASUK GUDANG" || status.includes("MASUK GUDANG")) {
      let dateStr = String(item.tanggal_usulan || '');
      if (dateStr && dateStr.includes("/")) {
        let parts = dateStr.split("/");
        if (parts[0].length === 2 && parts[1].length === 2) {
          dateStr = `${parts[1]}/${parts[0]}/${parts[2]}`;
        }
      }
      const tglUsulan = new Date(dateStr);
      if (!isNaN(tglUsulan)) {
        const selisihHari = Math.floor((hariIni - tglUsulan) / (1000 * 3600 * 24));
        if (selisihHari >= 90) {
          jatuhTempo++;
          daftarSeri.push(item.no_seri_indoor);
        }
      }
    }
  });

  if (jatuhTempo > 0) {
    alert("🚨 PERINGATAN PENGHAPUSAN ASET BMN 🚨\n\n" +
          "Terdapat " + jatuhTempo + " unit AC yang usulan penghapusannya sudah melewati batas waktu 3 bulan namun belum dihapus permanen dari tab Master.\n\n" +
          "Nomor Seri: " + daftarSeri.join(", ") + "\n\n" +
          "Silakan lakukan penghapusan manual di tab Data AC Utama, lalu ubah statusnya menjadi '✅ SUDAH DIHAPUS PERMANEN' di log usul hapus.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Selalu muat data dulu di background (termasuk data users)
  await initState();
  
  if (sessionStorage.getItem('isLoggedIn') === 'true') {
    // Jika sudah login di sesi ini, langsung masuk
    finishLogin();
  } else {
    // Jika belum login, pastikan form siap digunakan
    const btn = document.getElementById('btnLoginBtn');
    if (btn) btn.disabled = false;
  }
});

function finishLogin() {
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('mainAppContainer').style.display = 'flex';
  
  filteredData = [...acData];
  initDashboard();
  initFilters();
  renderTable();

  renderLogTable('pemeliharaan');
  renderLogTable('mutasi');
  renderLogTable('usul-hapus');

  setTimeout(checkAlarmUsulHapus, 1000);
}

function handleLogin(event) {
  event.preventDefault();
  
  const user = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();
  const errorMsg = document.getElementById('loginErrorMsg');
  const btnText = document.getElementById('btnLoginText');
  const loader = document.getElementById('btnLoginLoader');
  const btn = document.getElementById('btnLoginBtn');

  if (!usersData || usersData.length === 0) {
    errorMsg.innerText = "Error: Sheet 'users_2026' tidak ditemukan atau kosong di Spreadsheet Anda!";
    errorMsg.classList.remove('hidden');
    return;
  }

  // Tampilkan loading state
  errorMsg.classList.add('hidden');
  btnText.classList.add('hidden');
  loader.classList.remove('hidden');
  btn.disabled = true;

  setTimeout(() => {
    // Cari kecocokan username dan password dengan lebih kebal terhadap typo header/spasi
    const validUser = usersData.find(u => {
      // Deteksi otomatis kolom mana yang berisi "user" dan "pass"
      const unameKey = Object.keys(u).find(k => k.toLowerCase().includes('user')) || 'Username';
      const passKey = Object.keys(u).find(k => k.toLowerCase().includes('pass') || k.toLowerCase().includes('kata')) || 'Password';
      
      const dbUser = String(u[unameKey] || '').trim().toLowerCase();
      const dbPass = String(u[passKey] || '').trim();
      
      return dbUser === user.toLowerCase() && dbPass === pass;
    });

    if (validUser) {
      sessionStorage.setItem('isLoggedIn', 'true');
      finishLogin();
    } else {
      errorMsg.innerText = "Username atau Password salah!";
      errorMsg.classList.remove('hidden');
      btnText.classList.remove('hidden');
      loader.classList.add('hidden');
      btn.disabled = false;
    }
  }, 800); // Simulasi delay loading agar terlihat natural
}

function logout() {
  sessionStorage.removeItem('isLoggedIn');
  
  // Sembunyikan main app, tampilkan login overlay
  document.getElementById('mainAppContainer').style.display = 'none';
  const loginOverlay = document.getElementById('login-overlay');
  loginOverlay.classList.remove('hidden');
  
  // Kosongkan form
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  
  // Reset UI loading/error state
  document.getElementById('loginErrorMsg').classList.add('hidden');
  document.getElementById('btnLoginText').classList.remove('hidden');
  document.getElementById('btnLoginLoader').classList.add('hidden');
  document.getElementById('btnLoginBtn').disabled = false;
}

// --- NAVIGATION & THEME ---
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`nav-${tabId}`).classList.add('active');

  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.add('hidden');
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${tabId}`);
  targetView.classList.remove('hidden');
  targetView.classList.add('active');

  const titles = {
    'dashboard': 'Dashboard Statistik',
    'data': 'Manajemen Data AC',
    'pemeliharaan': 'Log Pemeliharaan',
    'mutasi': 'Log Mutasi AC',
    'usul-hapus': 'Log Usul Penghapusan',
    'iot': 'Log Pemakaian (IoT)',
    'rekap': 'Rekap Pemakaian & Biaya AC'
  };
  document.getElementById('page-title').innerText = titles[tabId] || 'SI-AC Dasmen';

  if (tabId === 'dashboard') initDashboard();
  if (tabId === 'rekap') initRekapPemakaian();

  // Otomatis jalankan pemantauan IoT di background jika berada di tab IoT
  if (tabId === 'iot') {
    if (!autoSyncInterval) {
      autoSyncInterval = setInterval(silentRefreshIoT, 5000);
      silentRefreshIoT();
    }
  } else {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }
  }
}

function toggleTheme() {
  const body = document.body;
  const isLight = body.classList.contains('light-theme');

  if (isLight) {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    document.querySelectorAll('#theme-text, #theme-text-top').forEach(el => el.innerText = 'Dark Mode');
    document.querySelectorAll('[id^="theme-icon"]').forEach(el => el.setAttribute('data-lucide', 'sun'));
  } else {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    document.querySelectorAll('#theme-text, #theme-text-top').forEach(el => el.innerText = 'Light Mode');
    document.querySelectorAll('[id^="theme-icon"]').forEach(el => el.setAttribute('data-lucide', 'moon'));
  }
  lucide.createIcons();

  if (document.getElementById('view-dashboard').classList.contains('active')) {
    initDashboard();
  }
}

// --- DASHBOARD LOGIC ---
let chartGedungInstance = null;
let chartMerkInstance = null;

function initDashboard() {
  const totalAC = acData.length;
  const gedungCount = {};
  const merkCount = {};
  let totalPK = 0;

  acData.forEach(item => {
    const gedung = item.Gedung || 'Tidak Diketahui';
    gedungCount[gedung] = (gedungCount[gedung] || 0) + 1;
    const merk = item.Merk || 'Tidak Diketahui';
    merkCount[merk] = (merkCount[merk] || 0) + 1;

    if (item.PK !== undefined && item.PK !== null && item.PK !== '') {
      const pkValue = parseFloat(String(item.PK).replace(',', '.'));
      if (!isNaN(pkValue)) totalPK += pkValue;
    }
  });

  const totalGedung = Object.keys(gedungCount).length;

  let topMerk = '-';
  let maxMerk = 0;
  for (let m in merkCount) {
    if (merkCount[m] > maxMerk && m !== 'Tidak Diketahui' && m !== '') {
      maxMerk = merkCount[m];
      topMerk = m;
    }
  }

  document.getElementById('stat-total-ac').innerText = totalAC;
  document.getElementById('stat-total-pk').innerText = totalPK.toFixed(1) + ' PK';
  document.getElementById('stat-total-gedung').innerText = Object.keys(gedungCount).length;
  document.getElementById('stat-top-merk').innerText = topMerk;

  renderCharts(gedungCount, merkCount);
}

function renderCharts(gedungCount, merkCount) {
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#94a3b8' : '#475569';

  const ctxGedung = document.getElementById('chartGedung').getContext('2d');
  if (chartGedungInstance) chartGedungInstance.destroy();
  const sortedGedung = Object.entries(gedungCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

  chartGedungInstance = new Chart(ctxGedung, {
    type: 'bar',
    data: {
      labels: sortedGedung.map(g => g[0]),
      datasets: [{
        label: 'Jumlah AC',
        data: sortedGedung.map(g => g[1]),
        backgroundColor: '#3b82f6',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
        x: { ticks: { color: textColor }, grid: { display: false } }
      }
    }
  });

  const ctxMerk = document.getElementById('chartMerk').getContext('2d');
  if (chartMerkInstance) chartMerkInstance.destroy();
  const sortedMerk = Object.entries(merkCount).sort((a, b) => b[1] - a[1]);

  chartMerkInstance = new Chart(ctxMerk, {
    type: 'doughnut',
    data: {
      labels: sortedMerk.map(m => m[0]),
      datasets: [{
        data: sortedMerk.map(m => m[1]),
        backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { color: textColor } } },
      cutout: '70%'
    }
  });
}

// --- DATA AC UTAMA LOGIC ---
function updateDependentDropdowns() {
  const filterGedungEl = document.getElementById('filterGedung');
  const filterLokasiEl = document.getElementById('filterLokasi');
  const filterMerkEl = document.getElementById('filterMerk');

  if (!filterGedungEl || !filterLokasiEl || !filterMerkEl) return;

  const currentGedung = filterGedungEl.value;
  const currentLokasi = filterLokasiEl.value;
  const currentMerk = filterMerkEl.value;

  const gedungSet = new Set();
  const lokasiSet = new Set();
  const merkSet = new Set();

  acData.forEach(item => {
    if (item.Gedung) gedungSet.add(item.Gedung);

    const matchGedung = currentGedung === "" || item.Gedung === currentGedung;
    if (matchGedung && item.Lokasi) lokasiSet.add(item.Lokasi);

    const matchLokasi = currentLokasi === "" || item.Lokasi === currentLokasi;
    if (matchGedung && matchLokasi && item.Merk) merkSet.add(item.Merk);
  });

  const updateSelect = (el, set, defaultText) => {
    const currentVal = el.value;
    el.innerHTML = `<option value="">${defaultText}</option>`;
    [...set].sort().forEach(val => {
      el.insertAdjacentHTML('beforeend', `<option value="${val}">${val}</option>`);
    });
    if (set.has(currentVal)) {
      el.value = currentVal;
    }
  };

  updateSelect(filterGedungEl, gedungSet, "Semua Gedung");
  updateSelect(filterLokasiEl, lokasiSet, "Semua Lokasi");
  updateSelect(filterMerkEl, merkSet, "Semua Merk");
}

function updateFormDatalists() {
  const inputGedungEl = document.getElementById('inputGedung');
  const inputLokasiEl = document.getElementById('inputLokasi');
  const inputMerkEl = document.getElementById('inputMerk');
  
  if (!inputGedungEl || !inputLokasiEl || !inputMerkEl) return;
  
  const currentGedung = inputGedungEl.value.trim().toLowerCase();
  const currentLokasi = inputLokasiEl.value.trim().toLowerCase();
  
  const gedungSet = new Set();
  const lokasiSet = new Set();
  const merkSet = new Set();
  const barcodeSet = new Set();
  const jenisSet = new Set(['Split', 'Cassette', 'Standing', 'Ceiling', 'Floor Standing', 'Window', 'Portable']);
  
  const allLokasiSet = new Set();
  const allMerkSet = new Set();
  
  acData.forEach(item => {
    if (item.Gedung) gedungSet.add(item.Gedung);
    if (item.Lokasi) allLokasiSet.add(item.Lokasi);
    if (item.Merk) allMerkSet.add(item.Merk);
    if (item.Jenis && String(item.Jenis).trim()) jenisSet.add(String(item.Jenis).trim());
    if (item['Barcode BMN (NUP)']) {
      const val = String(item['Barcode BMN (NUP)']);
      if (!/\d/.test(val)) {
        barcodeSet.add(item['Barcode BMN (NUP)']);
      }
    }
    
    const itemGedung = String(item.Gedung || '').trim().toLowerCase();
    const matchGedung = currentGedung === "" || itemGedung === currentGedung;
    if (matchGedung && item.Lokasi) lokasiSet.add(item.Lokasi);
    
    const itemLokasi = String(item.Lokasi || '').trim().toLowerCase();
    const matchLokasi = currentLokasi === "" || itemLokasi === currentLokasi;
    if (matchGedung && matchLokasi && item.Merk) merkSet.add(item.Merk);
  });
  const finalLokasiSet = lokasiSet.size > 0 ? lokasiSet : allLokasiSet;
  const finalMerkSet = allMerkSet; // Selalu tampilkan seluruh merk AC yang ada di database
  
  const populateDatalist = (id, set) => {
    const datalist = document.getElementById(id);
    if (!datalist) return;
    datalist.innerHTML = '';
    [...set].sort().forEach(val => {
      datalist.insertAdjacentHTML('beforeend', `<option value="${val}">`);
    });
  };
  
  populateDatalist('datalistGedung', gedungSet);
  populateDatalist('datalistLokasi', finalLokasiSet);
  populateDatalist('datalistMerk', finalMerkSet);
  populateDatalist('datalistBarcode', barcodeSet);
  populateDatalist('datalistJenis', jenisSet);
}

// --- LOG MUTASI DATALIST LOGIC ---
function updateMutasiLokasiDatalist() {
  const inputGedungEl = document.getElementById('m_gedung_tujuan');
  const dlGedung = document.getElementById('datalistGedungMutasi');
  const dlLokasi = document.getElementById('datalistLokasiMutasi');
  
  if (!inputGedungEl || !dlGedung || !dlLokasi) return;
  
  const currentGedung = inputGedungEl.value.trim().toLowerCase();
  
  const gedungSet = new Set();
  const lokasiSet = new Set();
  const allLokasiSet = new Set();
  
  acData.forEach(item => {
    if (item.Gedung) {
      gedungSet.add(item.Gedung);
      if (item.Lokasi) allLokasiSet.add(item.Lokasi);
      if (item.Gedung.toLowerCase() === currentGedung && item.Lokasi) {
        lokasiSet.add(item.Lokasi);
      }
    }
  });
  
  dlGedung.innerHTML = Array.from(gedungSet).sort().map(x => `<option value="${x}">`).join('');
  const targetLokasiSet = (currentGedung !== "" && lokasiSet.size > 0) ? lokasiSet : allLokasiSet;
  dlLokasi.innerHTML = Array.from(targetLokasiSet).sort().map(x => `<option value="${x}">`).join('');
}

function updateGudangDatalist() {
  const dlGudang = document.getElementById('datalistGudang');
  if (!dlGudang) return;
  const gudangSet = new Set();
  
  if (typeof logUsulHapus !== 'undefined') {
    logUsulHapus.forEach(log => {
      const g = log.Lokasi_Gudang || log.lokasi_gudang;
      if (g) gudangSet.add(g.trim());
    });
  }
  
  if (gudangSet.size === 0) {
    gudangSet.add('Gudang Utama');
  }
  
  dlGudang.innerHTML = Array.from(gudangSet).sort().map(x => `<option value="${x}">`).join('');
}

function updateStatusAkhirDatalist() {
  const dlStatus = document.getElementById('statusAkhirList');
  if (!dlStatus) return;
  const statusSet = new Set(['Pengajuan unit baru', 'Selesai', 'Tunda', 'Usul Hapus']);
  
  if (typeof logPemeliharaan !== 'undefined') {
    logPemeliharaan.forEach(log => {
      const s = log.status_akhir;
      if (s) statusSet.add(s.trim());
    });
  }
  
  dlStatus.innerHTML = Array.from(statusSet).sort().map(x => `<option value="${x}">`).join('');
}

function initFilters() {
  updateDependentDropdowns();
  initLogFiltersPemeliharaan();
  updateMutasiLokasiDatalist();
}

function initLogFiltersPemeliharaan() {
  const selSeri = document.getElementById('filterSeriPemeliharaan');
  const dlSeri = document.getElementById('datalistSeriPemeliharaan');
  const selTindakan = document.getElementById('filterTindakanPemeliharaan');
  const selStatus = document.getElementById('filterStatusPemeliharaan');

  if (!selSeri || !dlSeri || !selTindakan || !selStatus) return;

  const currentTindakan = selTindakan.value;
  const currentStatus = selStatus.value;

  const uniqueSeri = [...new Set(logPemeliharaan.map(x => x.no_seri_indoor).filter(Boolean))].sort();
  const uniqueTindakan = [...new Set(logPemeliharaan.map(x => x.jenis_tindakan).filter(Boolean))].sort();
  const uniqueStatus = [...new Set(logPemeliharaan.map(x => x.status_akhir).filter(Boolean))].sort();

  dlSeri.innerHTML = uniqueSeri.map(x => `<option value="${x}">`).join('');
  selTindakan.innerHTML = '<option value="">Semua Tindakan</option>' + uniqueTindakan.map(x => `<option value="${x}">${x}</option>`).join('');
  selStatus.innerHTML = '<option value="">Semua Status</option>' + uniqueStatus.map(x => `<option value="${x}">${x}</option>`).join('');

  selTindakan.value = currentTindakan;
  selStatus.value = currentStatus;
}

function filterData() {
  updateDependentDropdowns();
  
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();
  const filterGedung = document.getElementById('filterGedung') ? document.getElementById('filterGedung').value : '';
  const filterMerk = document.getElementById('filterMerk') ? document.getElementById('filterMerk').value : '';
  const filterLokasi = document.getElementById('filterLokasi') ? document.getElementById('filterLokasi').value : '';

  filteredData = acData.filter(item => {
    const matchSearch = Object.values(item).some(val => String(val || '').toLowerCase().includes(searchQuery));
    const matchGedung = filterGedung === "" || item.Gedung === filterGedung;
    const matchMerk = filterMerk === "" || item.Merk === filterMerk;
    const matchLokasi = filterLokasi === "" || item.Lokasi === filterLokasi;

    return matchSearch && matchGedung && matchMerk && matchLokasi;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  const startIndex = (currentPage - 1) * rowsPerPage;
  const pageData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 32px;">Tidak ada data ditemukan</td></tr>';
  } else {
    pageData.forEach((item, index) => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${startIndex + index + 1}</td>
          <td>${item.Gedung || '-'}</td>
          <td>${item.Lokasi || '-'}</td>
          <td><span class="badge">${item.Merk || '-'}</span></td>
          <td>${item.Jenis || '-'}</td>
          <td>${item.PK || '-'}</td>
          <td>${item['Kode Indoor'] || '-'}</td>
          <td>${item['No. Seri Indoor'] || '-'}</td>
          <td>${item['Kode Outdoor'] || '-'}</td>
          <td>${item['No. Seri Outdoor'] || '-'}</td>
          <td>${item.Unit || '-'}</td>
          <td>${item.BTU_h || '-'}</td>
          <td>${item['Daya Outdoor'] || '-'}</td>
          <td>${item['Daya Indoor'] || '-'}</td>
          <td>${item.Tahun || '-'}</td>
          <td>${item['Logo SKEM'] || '-'}</td>
          <td>${item['Barcode BMN (NUP)'] || '-'}</td>
          <td>${item.Keterangan || '-'}</td>
          <td>${item['Device ID IoT'] || '-'}</td>
          <td class="actions-cell">
            <button class="btn-icon btn-action-edit" onclick="editData('${item.No}')" title="Edit"><i data-lucide="edit"></i></button>
            <button class="btn-icon btn-action-delete" onclick="deleteData('${item.No}')" title="Hapus"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>
      `);
    });
  }

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  document.getElementById('pageInfo').innerText = `Halaman ${currentPage} dari ${totalPages}`;
  document.getElementById('btnPrev').disabled = currentPage === 1;
  document.getElementById('btnNext').disabled = currentPage === totalPages;
  lucide.createIcons();
}

function prevPage() { if (currentPage > 1) { currentPage--; renderTable(); } }
function nextPage() { if (currentPage < Math.ceil(filteredData.length / rowsPerPage)) { currentPage++; renderTable(); } }

function openModal() {
  document.getElementById('crudModal').classList.remove('hidden');
  document.getElementById('crudModal').classList.add('show');
  updateFormDatalists();
}

function closeModal() {
  document.getElementById('crudModal').classList.remove('show');
  setTimeout(() => {
    document.getElementById('crudModal').classList.add('hidden');
    document.getElementById('crudForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('inputSeriIndoor').readOnly = false;
    document.getElementById('modalTitle').innerText = 'Tambah Data AC';
  }, 300);
}

function saveData(event) {
  event.preventDefault();
  const idToEdit = document.getElementById('editId').value;
  const seriIndoor = document.getElementById('inputSeriIndoor').value;

  const newData = {
    No: idToEdit || Date.now().toString(),
    "Kode Outdoor": document.getElementById('inputKodeOutdoor').value,
    "No. Seri Outdoor": document.getElementById('inputSeriOutdoor').value,
    "Kode Indoor": document.getElementById('inputKodeIndoor').value,
    "No. Seri Indoor": seriIndoor,
    Jenis: document.getElementById('inputJenis').value,
    Merk: document.getElementById('inputMerk').value,
    Unit: document.getElementById('inputUnit').value,
    PK: document.getElementById('inputPK').value,
    BTU_h: document.getElementById('inputBTU').value,
    "Daya Outdoor": document.getElementById('inputDayaOutdoor').value,
    "Daya Indoor": document.getElementById('inputDayaIndoor').value,
    Tahun: document.getElementById('inputTahun').value,
    Gedung: document.getElementById('inputGedung').value,
    Lokasi: document.getElementById('inputLokasi').value,
    "Logo SKEM": document.getElementById('inputSKEM').value,
    "Barcode BMN (NUP)": document.getElementById('inputBarcode').value,
    Keterangan: document.getElementById('inputKeterangan').value,
    "Device ID IoT": document.getElementById('inputDeviceId').value
  };

  if (idToEdit) {
    const index = acData.findIndex(item => item.No == idToEdit);
    if (index > -1) {
      acData[index] = newData;
    }
  } else {
    if (seriIndoor && acData.some(item => item['No. Seri Indoor'] == seriIndoor)) {
      alert("Error: No. Seri Indoor sudah terdaftar di database!");
      return;
    }
    acData.unshift(newData);
  }

  saveToDatabase();
  closeModal();
  filterData();
  initFilters();
}

function editData(id) {
  const item = acData.find(x => x.No == id);
  if (item) {
    document.getElementById('modalTitle').innerText = 'Edit Data AC';
    document.getElementById('editId').value = item.No;
    document.getElementById('inputGedung').value = item.Gedung || '';
    document.getElementById('inputLokasi').value = item.Lokasi || '';
    document.getElementById('inputMerk').value = item.Merk || '';
    document.getElementById('inputJenis').value = item.Jenis || '';
    
    updateFormDatalists();
    document.getElementById('inputKodeIndoor').value = item['Kode Indoor'] || '';
    document.getElementById('inputSeriIndoor').value = item['No. Seri Indoor'] || '';
    document.getElementById('inputSeriIndoor').readOnly = true;
    document.getElementById('inputKodeOutdoor').value = item['Kode Outdoor'] || '';
    document.getElementById('inputSeriOutdoor').value = item['No. Seri Outdoor'] || '';
    document.getElementById('inputUnit').value = item.Unit || '';
    document.getElementById('inputPK').value = item.PK || '';
    document.getElementById('inputBTU').value = item.BTU_h || '';
    document.getElementById('inputDayaOutdoor').value = item['Daya Outdoor'] || '';
    document.getElementById('inputDayaIndoor').value = item['Daya Indoor'] || '';
    document.getElementById('inputTahun').value = item.Tahun || '';
    document.getElementById('inputSKEM').value = item['Logo SKEM'] || '';
    document.getElementById('inputBarcode').value = item['Barcode BMN (NUP)'] || '';
    document.getElementById('inputKeterangan').value = item.Keterangan || '';
    document.getElementById('inputDeviceId').value = item['Device ID IoT'] || '';
    openModal();
  }
}

function deleteData(id) {
  if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
    acData = acData.filter(item => item.No != id);
    saveToDatabase();
    filterData();
  }
}

// Helper untuk membaca berbagai format tanggal secara akurat
function parseRobustDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  
  // Deteksi format DD/MM/YYYY atau DD-MM-YYYY
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      // Format DD/MM/YYYY (Spreadsheet format)
      return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
    } else if (parts[0].length === 4 && !s.includes('T')) {
      // Format YYYY-MM-DD
      return new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
    }
  }
  
  // Jika ISO String (fallback)
  return new Date(s);
}

function formatDateUI(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  const d = parseRobustDate(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function renderLogTable(type) {
  const bodyId = type === 'usul-hapus' ? 'tableBodyUsulHapus' : 'tableBody' + type.charAt(0).toUpperCase() + type.slice(1);
  const tbody = document.getElementById(bodyId);
  tbody.innerHTML = '';

  const searchId = `search${type === 'usul-hapus' ? 'UsulHapus' : type.charAt(0).toUpperCase() + type.slice(1)}`;
  let filterQ = document.getElementById(searchId).value.toLowerCase();

  if (type === 'pemeliharaan') {
    const filterTglKategori = document.getElementById('filterTglKategoriPemeliharaan')?.value || 'tanggal_laporan';
    const filterTglStart = document.getElementById('filterTglStartPemeliharaan')?.value;
    const filterTglEnd = document.getElementById('filterTglEndPemeliharaan')?.value;
    const filterSeri = document.getElementById('filterSeriPemeliharaan')?.value;
    const filterTindakan = document.getElementById('filterTindakanPemeliharaan')?.value;
    const filterStatus = document.getElementById('filterStatusPemeliharaan')?.value;

    const dataToRender = logPemeliharaan.filter(item => {
      const matchSearch = Object.values(item).some(val => String(val || '').toLowerCase().includes(filterQ));
      
      let matchTgl = true;
      if (filterTglStart || filterTglEnd) {
        const itemDateStr = formatDateForInput(item[filterTglKategori]);
        if (!itemDateStr) {
          matchTgl = false;
        } else {
          if (filterTglStart && itemDateStr < filterTglStart) matchTgl = false;
          if (filterTglEnd && itemDateStr > filterTglEnd) matchTgl = false;
        }
      }

      const matchSeri = !filterSeri || item.no_seri_indoor === filterSeri;
      const matchTindakan = !filterTindakan || item.jenis_tindakan === filterTindakan;
      const matchStatus = !filterStatus || item.status_akhir === filterStatus;
      
      return matchSearch && matchTgl && matchSeri && matchTindakan && matchStatus;
    });

    filteredLogPemeliharaan = dataToRender;

    // --- Smart Cascading Dropdowns ---
    // Hitung ulang opsi Tindakan dan Status berdasarkan filter lain (kecuali filter diri sendiri)
    const dataForTindakan = logPemeliharaan.filter(item => {
      const matchSeri = !filterSeri || item.no_seri_indoor === filterSeri;
      const matchStatus = !filterStatus || item.status_akhir === filterStatus;
      return matchSeri && matchStatus; // Sederhananya, abaikan tindakan saat filter tindakan
    });
    
    const dataForStatus = logPemeliharaan.filter(item => {
      const matchSeri = !filterSeri || item.no_seri_indoor === filterSeri;
      const matchTindakan = !filterTindakan || item.jenis_tindakan === filterTindakan;
      return matchSeri && matchTindakan; // Sederhananya, abaikan status saat filter status
    });

    const uniqueTindakan = [...new Set(dataForTindakan.map(x => x.jenis_tindakan).filter(Boolean))].sort();
    const uniqueStatus = [...new Set(dataForStatus.map(x => x.status_akhir).filter(Boolean))].sort();

    const selTindakan = document.getElementById('filterTindakanPemeliharaan');
    const selStatus = document.getElementById('filterStatusPemeliharaan');
    
    if (selTindakan) {
      selTindakan.innerHTML = '<option value="">Semua Tindakan</option>' + uniqueTindakan.map(x => `<option value="${x}">${x}</option>`).join('');
      selTindakan.value = filterTindakan;
    }
    if (selStatus) {
      selStatus.innerHTML = '<option value="">Semua Status</option>' + uniqueStatus.map(x => `<option value="${x}">${x}</option>`).join('');
      selStatus.value = filterStatus;
    }
    // --- End Smart Cascading ---

    dataToRender.forEach(item => {
      const acInfo = acData.find(x => x['No. Seri Indoor'] == item.no_seri_indoor);
      const lokasiText = acInfo ? `${acInfo.Gedung || '-'} / ${acInfo.Lokasi || '-'}` : '-';
      tbody.insertAdjacentHTML('beforeend', `<tr>
        <td>${formatDateUI(item.tanggal_laporan)}</td>
        <td>${item.nama_pelapor || '-'}</td>
        <td>${item.no_seri_indoor || '-'}</td>
        <td>${lokasiText}</td>
        <td>${item.keluhan_awal || '-'}</td>
        <td>${formatDateUI(item.tanggal_servis_cek) || '-'}</td>
        <td>${item.nama_vendor_teknisi || '-'}</td>
        <td>${item.jenis_tindakan || '-'}</td>
        <td>${item.tindakan_perbaikan || '-'}</td>
        <td>${formatDateUI(item.tanggal_selesai) || '-'}</td>
        <td><span class="badge">${item.status_akhir || '-'}</span></td>
        <td>${item.keterangan || '-'}</td>
        <td class="actions-cell">
          <button class="btn-icon btn-action-edit" onclick="editLog('${item.id_laporan}', 'pemeliharaan')" title="Edit"><i data-lucide="edit"></i></button>
          <button class="btn-icon btn-action-delete" onclick="deleteLog('${item.id_laporan}', 'pemeliharaan')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`);
    });

  } else if (type === 'mutasi') {
    const filterTglStart = document.getElementById('filterTglStartMutasi')?.value;
    const filterTglEnd = document.getElementById('filterTglEndMutasi')?.value;

    const dataToRender = logMutasi.filter(item => {
      const matchSearch = Object.values(item).some(val => String(val || '').toLowerCase().includes(filterQ));
      
      let matchTgl = true;
      if (filterTglStart || filterTglEnd) {
        const itemDateStr = formatDateForInput(item.tanggal_mutasi);
        if (!itemDateStr) {
          matchTgl = false;
        } else {
          if (filterTglStart && itemDateStr < filterTglStart) matchTgl = false;
          if (filterTglEnd && itemDateStr > filterTglEnd) matchTgl = false;
        }
      }
      return matchSearch && matchTgl;
    });

    filteredLogMutasi = dataToRender;

    dataToRender.forEach(item => {
      tbody.insertAdjacentHTML('beforeend', `<tr>
        <td>${formatDateUI(item.tanggal_mutasi)}</td>
        <td>${item.no_seri_indoor || '-'}</td>
        <td>${item.gedung_asal || item['Gedung Asal'] || '-'}</td>
        <td>${item.lokasi_asal || item['Lokasi Asal'] || '-'}</td>
        <td>${item.gedung_tujuan || item['Gedung Tujuan'] || '-'}</td>
        <td>${item.lokasi_tujuan || item['Lokasi Tujuan'] || '-'}</td>
        <td>${item.alasan_mutasi || item['Alasan Mutasi'] || '-'}</td>
        <td>${item.nama_pelaksana || '-'}</td>
        <td><span class="badge">${item.status_mutasi || '-'}</span></td>
        <td class="actions-cell">
          <button class="btn-icon btn-action-edit" onclick="editLog('${item.id_mutasi}', 'mutasi')" title="Edit"><i data-lucide="edit"></i></button>
          <button class="btn-icon btn-action-delete" onclick="deleteLog('${item.id_mutasi}', 'mutasi')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`);
    });

  } else if (type === 'usul-hapus') {
    const filterTglKategori = document.getElementById('filterTglKategoriUsulHapus')?.value || 'tanggal_usulan';
    const filterTglStart = document.getElementById('filterTglStartUsulHapus')?.value;
    const filterTglEnd = document.getElementById('filterTglEndUsulHapus')?.value;

    const dataToRender = logUsulHapus.filter(item => {
      const matchSearch = Object.values(item).some(val => String(val || '').toLowerCase().includes(filterQ));
      
      let matchTgl = true;
      if (filterTglStart || filterTglEnd) {
        const itemDateStr = formatDateForInput(item[filterTglKategori]);
        if (!itemDateStr) {
          matchTgl = false;
        } else {
          if (filterTglStart && itemDateStr < filterTglStart) matchTgl = false;
          if (filterTglEnd && itemDateStr > filterTglEnd) matchTgl = false;
        }
      }
      return matchSearch && matchTgl;
    });

    filteredLogUsulHapus = dataToRender;

    dataToRender.forEach(item => {
      tbody.insertAdjacentHTML('beforeend', `<tr>
        <td>${formatDateUI(item.tanggal_usulan)}</td>
        <td>${formatDateUI(item.tanggal_masuk_gudang) || '-'}</td>
        <td>${item.no_nota_dinas || '-'}</td>
        <td>${item.no_seri_indoor || '-'}</td>
        <td>${item.kondisi_terakhir || '-'}</td>
        <td>${item.Lokasi_Gudang || item.lokasi_gudang || '-'}</td>
        <td><span class="badge">${item.status_sistem || '-'}</span></td>
        <td class="actions-cell">
          <button class="btn-icon btn-action-edit" onclick="editLog('${item.id_usulan}', 'usul-hapus')" title="Edit"><i data-lucide="edit"></i></button>
          <button class="btn-icon btn-action-delete" onclick="deleteLog('${item.id_usulan}', 'usul-hapus')" title="Hapus"><i data-lucide="trash-2"></i></button>
        </td>
      </tr>`);
    });

  } else if (type === 'iot') {
    const filterTglStart = document.getElementById('filterTglStartIot')?.value;
    const filterTglEnd = document.getElementById('filterTglEndIot')?.value;

    const dataToRender = logPemakaian.filter(item => {
      const vals = Object.values(item);
      const matchSearch = vals.some(val => String(val || '').toLowerCase().includes(filterQ));
      
      let matchTgl = true;
      if (filterTglStart || filterTglEnd) {
        const tglValue = vals.length > 0 ? vals[0] : null;
        const itemDateStr = formatDateForInput(tglValue);
        if (!itemDateStr) {
          matchTgl = false;
        } else {
          if (filterTglStart && itemDateStr < filterTglStart) matchTgl = false;
          if (filterTglEnd && itemDateStr > filterTglEnd) matchTgl = false;
        }
      }
      return matchSearch && matchTgl;
    });

    // Ambil hanya data terbaru per Device ID
    const latestDataMap = new Map();
    dataToRender.forEach(item => {
      const vals = Object.values(item);
      const deviceIdText = vals[1] || '-';
      latestDataMap.set(deviceIdText, item);
    });
    const uniqueDataToRender = Array.from(latestDataMap.values());
    
    filteredLogPemakaian = uniqueDataToRender;

    uniqueDataToRender.forEach(item => {
      const waktuText = item.tanggal ? new Date(item.tanggal).toLocaleString('id-ID') : '-';
      const deviceIdText = item.id_iot || '-';
      const statusText = item.status_terakhir || '-';
      
      const acInfo = acData.find(x => x['Device ID (IoT)'] === deviceIdText || x['Device ID IoT'] === deviceIdText || x['id_iot'] === deviceIdText || (x.Keterangan && x.Keterangan.includes(deviceIdText)));
      const noSeriText = acInfo ? (acInfo['No. Seri Indoor'] || '-') : '-';
      const lokasiText = acInfo ? `${acInfo.Gedung || '-'} / ${acInfo.Lokasi || '-'}` : '-';
      
      let badgeClass = 'badge';
      let isOn = false;
      if (String(statusText).toUpperCase() === 'ON' || String(statusText) === 'true') { badgeClass += ' badge-success'; isOn = true; }
      if (String(statusText).toUpperCase() === 'OFF' || String(statusText) === 'false') { badgeClass += ' badge-danger'; isOn = false; }
      
      // Kalkulasi Durasi Pemakaian (Total Akumulasi)
      let durationText = '-';
      if (deviceIdText && deviceIdText !== '-') {
        // Ambil riwayat khusus device ini, perhatikan bahwa logPemakaian sudah difilter berdasarkan tanggal di UI
        const deviceHistory = logPemakaian.filter(row => Object.values(row)[1] === deviceIdText);
        
        const formatDuration = (ms) => {
          if (ms <= 0) return '0 mnt';
          const seconds = Math.floor(ms / 1000);
          const m = Math.floor(seconds / 60) % 60;
          const h = Math.floor(seconds / 3600);
          return h > 0 ? `${h} jam ${m} mnt` : `${m} mnt`;
        };
        
        let totalMs = 0;
        let currentBlockStart = null;
        
        for (let i = 0; i < deviceHistory.length; i++) {
          const hVals = Object.values(deviceHistory[i]);
          const hTime = new Date(hVals[0]).getTime();
          const hStatus = String(hVals[2]).toUpperCase();
          const isThisOn = (hStatus === 'ON' || hStatus === 'TRUE');
        
          if (isThisOn) {
            if (currentBlockStart === null) {
              currentBlockStart = hTime; // Catat waktu mulai nyala
            }
          } else {
            if (currentBlockStart !== null) {
              totalMs += (hTime - currentBlockStart); // Tambahkan selisih waktu ke total
              currentBlockStart = null;
            }
          }
        }
        
        // Jika saat ini masih menyala, tambahkan durasi yang sedang berjalan hingga detik ini
        if (currentBlockStart !== null) {
          totalMs += (new Date().getTime() - currentBlockStart);
          durationText = `<span style="color:#eab308; font-weight:bold;">${formatDuration(totalMs)}</span> <br><small style="color:#22c55e;">(Sedang Berjalan)</small>`;
        } else {
          durationText = `<span style="color:#eab308; font-weight:bold;">${formatDuration(totalMs)}</span> <br><small>(Total Filter)</small>`;
        }
      }

      let actionBtn = '-';
      if (deviceIdText && deviceIdText !== '-') {
        // Tombol aktif hanya kebalikan dari status saat ini
        // Status ON  → tombol OFF aktif, tombol ON disabled
        // Status OFF → tombol ON aktif, tombol OFF disabled
        const btnOnStyle = isOn 
          ? "background-color:#22c55e; color:white; opacity:0.4; cursor:not-allowed;"
          : "background-color:#22c55e; border-color:#22c55e; color:white;";
        const btnOffStyle = !isOn 
          ? "background-color:#ef4444; color:white; opacity:0.4; cursor:not-allowed;"
          : "background-color:#ef4444; border-color:#ef4444; color:white;";
        
        actionBtn = `
          <div style="display: flex; flex-direction: row; gap: 4px; flex-wrap: nowrap; min-width: 130px;">
            <button class="btn btn-secondary" ${isOn ? 'disabled' : `onclick="toggleAc('${deviceIdText}', true)"`} style="flex: 1; padding: 4px 6px; font-size: 11px; display: flex; justify-content: center; align-items: center; gap: 2px; ${btnOnStyle}"><i data-lucide="power" style="width: 14px; height: 14px;"></i> ON</button>
            <button class="btn btn-secondary" ${!isOn ? 'disabled' : `onclick="toggleAc('${deviceIdText}', false)"`} style="flex: 1; padding: 4px 6px; font-size: 11px; display: flex; justify-content: center; align-items: center; gap: 2px; ${btnOffStyle}"><i data-lucide="power" style="width: 14px; height: 14px;"></i> OFF</button>
          </div>
        `;
      }

      // Desain indikator lampu
      const lightbulbIcon = isOn 
        ? `<i data-lucide="lightbulb" style="color: #22c55e; fill: #22c55e; width: 16px; height: 16px; margin-right: 4px;"></i>` 
        : `<i data-lucide="lightbulb" style="color: #ef4444; fill: #ef4444; width: 16px; height: 16px; margin-right: 4px;"></i>`;
      
      const statusHtml = `<div style="display: flex; align-items: center;">${lightbulbIcon} <span class="${badgeClass}">${statusText === 'true' ? 'ON' : (statusText === 'false' ? 'OFF' : statusText)}</span></div>`;
      
      tbody.insertAdjacentHTML('beforeend', `<tr>
        <td>${waktuText}</td>
        <td>${deviceIdText}</td>
        <td>${noSeriText}</td>
        <td>${lokasiText}</td>
        <td>${statusHtml}</td>
        <td>${durationText}</td>
        <td>${actionBtn}</td>
      </tr>`);
    });
  }
  lucide.createIcons();
}

function filterLog(type) {
  renderLogTable(type);
}

function openModalLog(type) {
  const modalId = type === 'usul-hapus' ? 'modalUsulHapus' : 'modal' + type.charAt(0).toUpperCase() + type.slice(1);
  document.getElementById(modalId).classList.remove('hidden');
  document.getElementById(modalId).classList.add('show');
  if (type === 'usul-hapus') {
    updateGudangDatalist();
  } else if (type === 'pemeliharaan') {
    updateStatusAkhirDatalist();
  }
}

function closeLogModal(type) {
  const modalId = type === 'usul-hapus' ? 'modalUsulHapus' : 'modal' + type.charAt(0).toUpperCase() + type.slice(1);
  const formId = `form${type === 'usul-hapus' ? 'UsulHapus' : type.charAt(0).toUpperCase() + type.slice(1)}`;
  document.getElementById(modalId).classList.remove('show');
  setTimeout(() => {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById(formId).reset();

    if (type === 'pemeliharaan') {
      document.getElementById('editIdPemeliharaan').value = '';
      document.getElementById('titlePemeliharaan').innerText = 'Log Pemeliharaan';
      document.getElementById('btnSubmitPemeliharaan').innerText = 'Simpan Log';
    } else if (type === 'mutasi') {
      document.getElementById('editIdMutasi').value = '';
      document.getElementById('titleMutasi').innerText = 'Log Mutasi';
      document.getElementById('btnSubmitMutasi').innerText = 'Simpan & Proses';
      updateMutasiLokasiDatalist();
    } else if (type === 'usul-hapus') {
      document.getElementById('editIdUsulHapus').value = '';
      document.getElementById('titleUsulHapus').innerText = 'Log Usul Hapus';
      document.getElementById('btnSubmitUsulHapus').innerText = 'Simpan & Proses';
    }
  }, 300);
}

function deleteLog(id, type) {
  if (confirm("Yakin ingin menghapus log ini?")) {
    if (type === 'pemeliharaan') { logPemeliharaan = logPemeliharaan.filter(x => x.id_laporan != id); initLogFiltersPemeliharaan(); }
    if (type === 'mutasi') { logMutasi = logMutasi.filter(x => x.id_mutasi != id); }
    if (type === 'usul-hapus') { logUsulHapus = logUsulHapus.filter(x => x.id_usulan != id); }
    saveToDatabase();
    renderLogTable(type);
  }
}

// Helper untuk memastikan nilai masuk ke dropdown meskipun tidak ada di daftar opsi
function setSelectValueOrAdd(selectId, value) {
  const sel = document.getElementById(selectId);
  if (!sel || value === undefined || value === null || value === '' || !sel.options) return;
  
  const valStr = String(value);
  let exists = false;
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === valStr) {
      exists = true;
      break;
    }
  }
  
  if (!exists) {
    const opt = document.createElement('option');
    opt.value = valStr;
    opt.text = valStr + " (Data Lama)";
    sel.add(opt);
  }
  sel.value = valStr;
}

// Helper untuk format date ke YYYY-MM-DD dengan aman (mengikuti zona waktu lokal)
function formatDateForInput(dateStr) {
  if (!dateStr || dateStr === '-') return '';
  const d = parseRobustDate(dateStr);
  if (!d || isNaN(d.getTime())) {
    return String(dateStr).substring(0, 10);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Buka modal Log dalam mode Edit
function editLog(id, type) {
  if (type === 'pemeliharaan') {
    const item = logPemeliharaan.find(x => x.id_laporan == id);
    if (!item) return;
    document.getElementById('titlePemeliharaan').innerText = 'Edit Log Pemeliharaan';
    document.getElementById('editIdPemeliharaan').value = item.id_laporan;
    document.getElementById('p_tglLaporan').value = formatDateForInput(item.tanggal_laporan);
    document.getElementById('p_pelapor').value = item.nama_pelapor || '';
    document.getElementById('p_seri').value = item.no_seri_indoor || '';
    autoFillPemeliharaan();
    setSelectValueOrAdd('p_keluhan', item.keluhan_awal);
    document.getElementById('p_tglServis').value = formatDateForInput(item.tanggal_servis_cek);
    document.getElementById('p_vendor').value = item.nama_vendor_teknisi || '';
    setSelectValueOrAdd('p_tindakan', item.jenis_tindakan);
    document.getElementById('p_tindakanPerbaikan').value = item.tindakan_perbaikan || '';
    document.getElementById('p_tglSelesai').value = formatDateForInput(item.tanggal_selesai);
    document.getElementById('p_status').value = item.status_akhir || '';
    document.getElementById('p_keterangan').value = item.keterangan || '';
    document.getElementById('btnSubmitPemeliharaan').innerText = 'Update Log';
    openModalLog('pemeliharaan');

  } else if (type === 'mutasi') {
    const item = logMutasi.find(x => x.id_mutasi == id);
    if (!item) return;
    document.getElementById('titleMutasi').innerText = 'Edit Log Mutasi';
    document.getElementById('editIdMutasi').value = item.id_mutasi;
    document.getElementById('m_tglMutasi').value = formatDateForInput(item.tanggal_mutasi);
    document.getElementById('m_pelaksana').value = item.nama_pelaksana || '';
    document.getElementById('m_seri').value = item.no_seri_indoor || '';
    document.getElementById('m_gedung_asal').value = item.gedung_asal || item['Gedung Asal'] || '';
    document.getElementById('m_lokasi_asal').value = item.lokasi_asal || item['Lokasi Asal'] || '';
    
    // Jika data lama kosong (mungkin karena belum ada kolom gedung), coba auto-fill dari master data
    if (!document.getElementById('m_gedung_asal').value && !document.getElementById('m_lokasi_asal').value) {
      autoFillMutasi();
    }
    document.getElementById('m_gedung_tujuan').value = item.gedung_tujuan || item['Gedung Tujuan'] || '';
    document.getElementById('m_lokasi_tujuan').value = item.lokasi_tujuan || item['Lokasi Tujuan'] || '';
    document.getElementById('m_alasan').value = item.alasan_mutasi || item['Alasan Mutasi'] || '';
    // Status Mutasi kini otomatis (hidden)
    document.getElementById('btnSubmitMutasi').innerText = 'Update Log';
    updateMutasiLokasiDatalist();
    openModalLog('mutasi');

  } else if (type === 'usul-hapus') {
    const item = logUsulHapus.find(x => x.id_usulan == id);
    if (!item) return;
    document.getElementById('titleUsulHapus').innerText = 'Edit Log Usul Hapus';
    document.getElementById('editIdUsulHapus').value = item.id_usulan;
    document.getElementById('h_tglUsulan').value = formatDateForInput(item.tanggal_usulan);
    document.getElementById('h_tglMasukGudang').value = formatDateForInput(item.tanggal_masuk_gudang);
    document.getElementById('h_seri').value = item.no_seri_indoor || '';
    document.getElementById('h_nota').value = item.no_nota_dinas || '';
    document.getElementById('h_kondisi').value = item.kondisi_terakhir || '';
    updateGudangDatalist();
    document.getElementById('h_gudang').value = item.Lokasi_Gudang || item.lokasi_gudang || '';
    document.getElementById('btnSubmitUsulHapus').innerText = 'Update Log';
    openModalLog('usul-hapus');
  }
}

// Auto-Fill No Nota (Usul Hapus)
function autoFillNoNota() {
  const tglInput = document.getElementById('h_tglUsulan').value;
  const notaField = document.getElementById('h_nota');
  if (tglInput) {
    const parts = tglInput.split('-'); // Format HTML date: YYYY-MM-DD
    if (parts.length === 3) {
      const formattedDate = parts[2] + parts[1] + parts[0]; // DDMMYYYY
      notaField.value = "ND-" + formattedDate;
    }
  } else {
    notaField.value = "";
  }
}

// Auto-Fill Lokasi (Pemeliharaan)
function autoFillPemeliharaan() {
  const noSeri = document.getElementById('p_seri').value.trim();
  const lokasiAuto = document.getElementById('p_lokasi_auto');
  if (!lokasiAuto) return;
  if (!noSeri) {
    lokasiAuto.value = '';
    return;
  }
  const ac = acData.find(x => x['No. Seri Indoor'] == noSeri);
  if (ac) {
    lokasiAuto.value = `${ac.Gedung || '-'} / ${ac.Lokasi || '-'}`;
  } else {
    lokasiAuto.value = '⛔ SERI TIDAK TERDAFTAR';
  }
}

// ROBOT 2: Auto-Fill Lokasi Asal (Mutasi)
function autoFillMutasi() {
  const noSeri = document.getElementById('m_seri').value.trim();
  const gedungAsalField = document.getElementById('m_gedung_asal');
  const lokasiAsalField = document.getElementById('m_lokasi_asal');
  
  if (!noSeri) { 
    gedungAsalField.value = ''; 
    lokasiAsalField.value = ''; 
    return; 
  }

  const ac = acData.find(x => x['No. Seri Indoor'] == noSeri);
  if (ac) {
    gedungAsalField.value = ac.Gedung || 'Tidak terdata';
    lokasiAsalField.value = ac.Lokasi || 'Tidak terdata';
  } else {
    gedungAsalField.value = '⚠️ SERI TIDAK TERDAFTAR';
    lokasiAsalField.value = '⚠️ SERI TIDAK TERDAFTAR';
  }
}

function saveLog(event, type) {
  event.preventDefault();

  if (type === 'pemeliharaan') {
    const editId = document.getElementById('editIdPemeliharaan').value;
    const noSeri = document.getElementById('p_seri').value.trim();
    
    // Validasi Relasi Primary Key
    if (noSeri && !acData.some(x => x['No. Seri Indoor'] == noSeri)) {
      alert(`⛔ GAGAL DISIMPAN: Nomor Seri Indoor "${noSeri}" tidak terdaftar di Data AC Utama.\n\nSilakan cek kembali penulisan Anda atau daftarkan AC tersebut di Master Data terlebih dahulu.`);
      return; // Blokir penyimpanan
    }

    // PENGAMAN: Cegah Pemeliharaan jika sudah ada di Usul Hapus
    if (noSeri && logUsulHapus.some(x => x.no_seri_indoor == noSeri)) {
      alert(`⛔ GAGAL DISIMPAN: Nomor Seri "${noSeri}" sudah berada di daftar Usul Hapus (Gudang).\n\nAC yang sudah diusulkan hapus tidak dapat dipelihara/diservis lagi.`);
      return;
    }

    const newData = {
      id_laporan: editId || Date.now().toString(),
      tanggal_laporan: document.getElementById('p_tglLaporan').value,
      nama_pelapor: document.getElementById('p_pelapor').value,
      no_seri_indoor: noSeri,
      keluhan_awal: document.getElementById('p_keluhan').value,
      tanggal_servis_cek: document.getElementById('p_tglServis').value,
      nama_vendor_teknisi: document.getElementById('p_vendor').value,
      jenis_tindakan: document.getElementById('p_tindakan').value,
      tindakan_perbaikan: document.getElementById('p_tindakanPerbaikan').value,
      tanggal_selesai: document.getElementById('p_tglSelesai').value,
      status_akhir: document.getElementById('p_status').value || 'Sedang Diproses',
      keterangan: document.getElementById('p_keterangan').value
    };
    if (editId) {
      const idx = logPemeliharaan.findIndex(x => x.id_laporan == editId);
      if (idx > -1) logPemeliharaan[idx] = newData;
    } else {
      logPemeliharaan.unshift(newData);
    }

  } else if (type === 'mutasi') {
    const editId = document.getElementById('editIdMutasi').value;
    const noSeri = document.getElementById('m_seri').value.trim();
    
    // Validasi Relasi Primary Key
    if (noSeri && !acData.some(x => x['No. Seri Indoor'] == noSeri)) {
      alert(`⛔ GAGAL DISIMPAN: Nomor Seri Indoor "${noSeri}" tidak terdaftar di Data AC Utama.\n\nSilakan cek kembali penulisan Anda atau daftarkan AC tersebut di Master Data terlebih dahulu.`);
      return;
    }

    // PENGAMAN: Cegah Mutasi jika sudah ada di Usul Hapus
    if (noSeri && logUsulHapus.some(x => x.no_seri_indoor == noSeri)) {
      alert(`⛔ GAGAL DISIMPAN: Nomor Seri "${noSeri}" sudah berada di daftar Usul Hapus (Gudang).\n\nAC yang sudah diusulkan hapus tidak dapat dimutasikan lagi.`);
      return;
    }

    const gedungBaru = document.getElementById('m_gedung_tujuan').value;
    const lokasiBaru = document.getElementById('m_lokasi_tujuan').value;
    const isSync = true;
    let statusMutasi = '✅ BERHASIL DIUBAH';

    // ROBOT 2: Jalankan sinkronisasi secara otomatis
    if (isSync) {
      const idx = acData.findIndex(x => x['No. Seri Indoor'] == noSeri);
      if (idx > -1) {
        acData[idx].Gedung = gedungBaru;
        acData[idx].Lokasi = lokasiBaru;
        filterData();
        statusMutasi = '✅ BERHASIL DIUBAH';
      } else {
        statusMutasi = '❌ SERI TIDAK ADA DI MASTER';
      }
    }

    const newData = {
      id_mutasi: editId || Date.now().toString(),
      tanggal_mutasi: document.getElementById('m_tglMutasi').value,
      no_seri_indoor: noSeri,
      gedung_asal: document.getElementById('m_gedung_asal').value,
      lokasi_asal: document.getElementById('m_lokasi_asal').value,
      gedung_tujuan: gedungBaru,
      lokasi_tujuan: lokasiBaru,
      alasan_mutasi: document.getElementById('m_alasan').value,
      nama_pelaksana: document.getElementById('m_pelaksana').value,
      status_mutasi: statusMutasi
    };
    if (editId) {
      const idx = logMutasi.findIndex(x => x.id_mutasi == editId);
      if (idx > -1) logMutasi[idx] = newData;
    } else {
      logMutasi.unshift(newData);
    }

  } else if (type === 'usul-hapus') {
    const editId = document.getElementById('editIdUsulHapus').value;
    const noSeri = document.getElementById('h_seri').value.trim();
    
    // Validasi Relasi Primary Key
    if (noSeri && !acData.some(x => x['No. Seri Indoor'] == noSeri)) {
      alert(`⛔ GAGAL DISIMPAN: Nomor Seri Indoor "${noSeri}" tidak terdaftar di Data AC Utama.\n\nSilakan cek kembali penulisan Anda atau daftarkan AC tersebut di Master Data terlebih dahulu.`);
      return;
    }

    const kondisi = document.getElementById('h_kondisi').value;
    const gudang = document.getElementById('h_gudang').value;
    const isSync = true;
    let statusHapus = '✅ MASUK GUDANG';

    // ROBOT 3: Jalankan sinkronisasi secara otomatis
    if (isSync) {
      const idx = acData.findIndex(x => x['No. Seri Indoor'] == noSeri);
      if (idx > -1) {
        acData[idx].Gedung = 'Gudang';
        acData[idx].Lokasi = gudang;
        const existingKet = acData[idx].Keterangan || '';
        if (kondisi && !existingKet.includes(kondisi)) {
          acData[idx].Keterangan = existingKet ? (existingKet + ' | ' + kondisi) : kondisi;
        }
        filterData();
        statusHapus = '✅ MASUK GUDANG';
      } else {
        statusHapus = '❌ SERI TIDAK ADA DI MASTER';
      }
    }

    const newData = {
      id_usulan: editId || Date.now().toString(),
      tanggal_usulan: document.getElementById('h_tglUsulan').value,
      tanggal_masuk_gudang: document.getElementById('h_tglMasukGudang').value,
      no_nota_dinas: document.getElementById('h_nota').value,
      no_seri_indoor: noSeri,
      kondisi_terakhir: kondisi,
      Lokasi_Gudang: gudang,
      status_sistem: statusHapus
    };
    if (editId) {
      const idx = logUsulHapus.findIndex(x => x.id_usulan == editId);
      if (idx > -1) logUsulHapus[idx] = newData;
    } else {
      logUsulHapus.unshift(newData);
    }
  }

  saveToDatabase();
  closeLogModal(type);
  if (type === 'pemeliharaan') initLogFiltersPemeliharaan();
  renderLogTable(type);
}

// Fitur Download Excel
function downloadExcel(type) {
  let dataToExport = [];
  let filename = '';

  if (type === 'acData') {
    dataToExport = filteredData.map((item, index) => ({
      "NO": index + 1,
      "GEDUNG": item.Gedung || '-',
      "LOKASI": item.Lokasi || '-',
      "MERK": item.Merk || '-',
      "JENIS": item.Jenis || '-',
      "PK": item.PK || '-',
      "KODE INDOOR": item['Kode Indoor'] || '-',
      "NO SERI INDOOR": item['No. Seri Indoor'] || '-',
      "KODE OUTDOOR": item['Kode Outdoor'] || '-',
      "NO SERI OUTDOOR": item['No. Seri Outdoor'] || '-',
      "UNIT": item.Unit || '-',
      "BTU/h": item.BTU_h || '-',
      "DAYA OUTDOOR": item['Daya Outdoor'] || '-',
      "DAYA INDOOR": item['Daya Indoor'] || '-',
      "TAHUN": item.Tahun || '-',
      "LOGO SKEM": item['Logo SKEM'] || '-',
      "BARCODE BMN (NUP)": item['Barcode BMN (NUP)'] || '-',
      "KETERANGAN": item.Keterangan || '-',
      "Device ID IoT": item['Device ID IoT'] || '-'
    }));
    filename = 'Data_AC_Utama.xlsx';
  } else if (type === 'pemeliharaan') {
    dataToExport = filteredLogPemeliharaan.map(item => {
      const acInfo = acData.find(x => x['No. Seri Indoor'] == item.no_seri_indoor);
      const lokasiText = acInfo ? `${acInfo.Gedung || '-'} / ${acInfo.Lokasi || '-'}` : '-';
      return {
        "TGL LAPORAN": formatDateUI(item.tanggal_laporan),
        "PELAPOR": item.nama_pelapor || '-',
        "NO SERI": item.no_seri_indoor || '-',
        "LOKASI": lokasiText,
        "KELUHAN": item.keluhan_awal || '-',
        "TGL SERVIS": formatDateUI(item.tanggal_servis_cek) || '-',
        "VENDOR/TEKNISI": item.nama_vendor_teknisi || '-',
        "JENIS TINDAKAN": item.jenis_tindakan || '-',
        "TINDAKAN PERBAIKAN": item.tindakan_perbaikan || '-',
        "TGL SELESAI": formatDateUI(item.tanggal_selesai) || '-',
        "STATUS": item.status_akhir || '-',
        "KETERANGAN": item.keterangan || '-'
      };
    });
    filename = 'Log_Pemeliharaan.xlsx';
  } else if (type === 'mutasi') {
    dataToExport = filteredLogMutasi.map(item => ({
      "TGL MUTASI": formatDateUI(item.tanggal_mutasi),
      "NO SERI": item.no_seri_indoor || '-',
      "GEDUNG ASAL": item.gedung_asal || item['Gedung Asal'] || '-',
      "LOKASI ASAL": item.lokasi_asal || item['Lokasi Asal'] || '-',
      "GEDUNG TUJUAN": item.gedung_tujuan || item['Gedung Tujuan'] || '-',
      "LOKASI TUJUAN": item.lokasi_tujuan || item['Lokasi Tujuan'] || '-',
      "ALASAN MUTASI": item.alasan_mutasi || item['Alasan Mutasi'] || '-',
      "PELAKSANA": item.nama_pelaksana || '-',
      "STATUS": item.status_mutasi || '-'
    }));
    filename = 'Log_Mutasi.xlsx';
  } else if (type === 'usul-hapus') {
    dataToExport = filteredLogUsulHapus.map(item => ({
      "TGL USULAN": formatDateUI(item.tanggal_usulan),
      "TGL MASUK GUDANG": formatDateUI(item.tanggal_masuk_gudang) || '-',
      "NO NOTA DINAS": item.no_nota_dinas || '-',
      "NO SERI": item.no_seri_indoor || '-',
      "KONDISI TERAKHIR": item.kondisi_terakhir || '-',
      "LOKASI GUDANG": item.Lokasi_Gudang || item.lokasi_gudang || '-',
      "STATUS SISTEM": item.status_sistem || '-'
    }));
    filename = 'Log_Usul_Hapus.xlsx';
  } else if (type === 'iot') {
    dataToExport = filteredLogPemakaian.map(item => {
      const vals = Object.values(item);
      const acInfo = acData.find(x => x['Device ID (IoT)'] === vals[1] || x['Device ID IoT'] === vals[1] || x['id_iot'] === vals[1] || (x.Keterangan && x.Keterangan.includes(vals[1])));
      return {
        "WAKTU CEK": vals[0] ? new Date(vals[0]).toLocaleString('id-ID') : '-',
        "DEVICE ID": vals[1] || '-',
        "NO SERI INDOOR": acInfo ? (acInfo['No. Seri Indoor'] || '-') : '-',
        "LOKASI / RUANGAN": acInfo ? `${acInfo.Gedung || '-'} / ${acInfo.Lokasi || '-'}` : '-',
        "STATUS AC": vals[2] || '-'
      };
    });
    filename = 'Log_Pemakaian_IoT.xlsx';
  } else if (type === 'rekap') {
    dataToExport = (filteredRekapData || []).map((item, index) => ({
      "NO": index + 1,
      "NO SERI INDOOR": item.noSeri,
      "DEVICE ID": item.devId,
      "GEDUNG": item.gedung,
      "LOKASI / RUANGAN": item.lokasi,
      "DAYA AC (WATT)": item.watt,
      "TOTAL JAM NYALA": parseFloat(item.durationHours.toFixed(1)),
      "ESTIMASI KWH": parseFloat(item.kwh.toFixed(2)),
      "ESTIMASI BIAYA (RP)": Math.round(item.biaya),
      "STATUS SAAT INI": item.status
    }));
    filename = 'Rekap_Pemakaian_AC.xlsx';
  }

  if (!dataToExport || dataToExport.length === 0) {
    alert('Tidak ada data untuk di-download.');
    return;
  }

  // Buat worksheet dan workbook dari array of objects
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  
  // Memicu unduhan file
  XLSX.writeFile(workbook, filename);
}

// ==========================================
// DRAG AND DROP FILTER MENUS (SORTABLE JS)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initSortableFilters();
});

function initSortableFilters() {
  const containers = [
    { id: 'filterActionsData', storageKey: 'sortable_data' },
    { id: 'filterActionsPemeliharaan', storageKey: 'sortable_pemeliharaan' },
    { id: 'filterActionsMutasi', storageKey: 'sortable_mutasi' },
    { id: 'filterActionsUsulHapus', storageKey: 'sortable_usulhapus' }
  ];

  containers.forEach(containerInfo => {
    const el = document.getElementById(containerInfo.id);
    if (!el) return;

    // 1. Restore order dari localStorage sebelum Sortable diinisialisasi
    const savedOrder = localStorage.getItem(containerInfo.storageKey);
    if (savedOrder) {
      try {
        const orderArr = JSON.parse(savedOrder);
        const frag = document.createDocumentFragment();
        
        // Pindahkan elemen yang ada di daftar simpanan ke fragment
        orderArr.forEach(dataId => {
          const child = el.querySelector(`[data-id="${dataId}"]`);
          if (child) frag.appendChild(child);
        });
        
        // Pindahkan sisa elemen yang tidak ada di daftar simpanan (misal elemen baru)
        Array.from(el.children).forEach(child => {
          frag.appendChild(child);
        });
        
        // Kembalikan ke container utama
        el.appendChild(frag);
      } catch(e) {
        console.error("Gagal memulihkan urutan filter", e);
      }
    }

    // 2. Inisialisasi SortableJS
    if (typeof Sortable !== 'undefined') {
      Sortable.create(el, {
        animation: 150,
        filter: '.no-drag', // Elemen dengan kelas ini (contoh: tombol Tambah Data) tidak bisa di-drag
        preventOnFilter: false,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: function (evt) {
          // Simpan urutan baru ke localStorage
          const currentOrder = Array.from(el.children)
            .map(child => child.getAttribute('data-id'))
            .filter(id => id !== null);
          localStorage.setItem(containerInfo.storageKey, JSON.stringify(currentOrder));
        }
      });
    }
  });
}

// ==========================================
// VALIDASI REALTIME PRIMARY KEY (NO SERI)
// ==========================================
function validateSeriRealtime(inputId, statusId) {
  const val = document.getElementById(inputId).value.trim();
  const statusEl = document.getElementById(statusId);
  
  if (!val) {
    statusEl.innerHTML = '';
    return;
  }
  
  // Cek apakah nomor seri ada di Master Data (acData)
  const exists = acData.some(x => x['No. Seri Indoor'] == val);
  
  let isValid = exists;
  let errorMsg = '';
  
  // Pengaman: Jika form mutasi atau pemeliharaan, pastikan AC tidak di Usul Hapus
  if (exists && (inputId === 'm_seri' || inputId === 'p_seri')) {
    const isUsulHapus = logUsulHapus.some(x => x.no_seri_indoor == val);
    if (isUsulHapus) {
      isValid = false;
      errorMsg = 'Sudah Usul Hapus';
    }
  }
  
  if (isValid) {
    statusEl.innerHTML = '<i data-lucide="check-circle-2" style="color: #22c55e; width: 18px; height: 18px;"></i>';
  } else {
    if (errorMsg) {
      statusEl.innerHTML = `<div style="display:inline-flex;align-items:center;gap:4px;"><i data-lucide="x-circle" style="color: #ef4444; width: 18px; height: 18px;" title="${errorMsg}"></i> <span style="color:#ef4444;font-size:12px;">${errorMsg}</span></div>`;
    } else {
      statusEl.innerHTML = '<i data-lucide="x-circle" style="color: #ef4444; width: 18px; height: 18px;"></i>';
    }
  }
  
  // Render ulang icon Lucide yang baru disuntikkan
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

async function refreshIoT() {
  const btn = document.querySelector('[onclick="refreshIoT()"]');
  const icon = btn ? btn.querySelector('i') : null;
  if (icon) icon.classList.add('spin');
  if (btn) btn.disabled = true;
  
  try {
    const targetId = getTargetSpreadsheetId();
    if (!targetId) throw new Error("No target ID");
    
    // 1. Minta backend untuk sinkronisasi dengan server Tuya
    // 1. Perintahkan backend untuk sinkronisasi dengan Tuya
    let deviceIdsFromAc = acData.map(item => item['Device ID (IoT)'] || item['Device ID IoT'] || item.id_iot);
    let deviceIdsFromLog = logPemakaian.map(item => item.id_iot);
    let allDeviceIds = deviceIdsFromAc.concat(deviceIdsFromLog);
    
    const deviceIds = [...new Set(allDeviceIds.filter(id => id && id !== '-' && String(id).trim() !== ''))];
    
    if (deviceIds.length > 0) {
      if (btn) btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Sync Tuya...`;
      
      // Pecah menjadi kelompok 50 untuk mencegah URL kepanjangan
      const chunkSize = 50;
      for (let i = 0; i < deviceIds.length; i += chunkSize) {
        const chunk = deviceIds.slice(i, i + chunkSize);
        await fetch(`${WEB_APP_URL}?action=sync_tuya&deviceIds=${chunk.join(',')}&id=${targetId}`);
      }
      
      // Beri waktu sebentar agar backend selesai update sheet sebelum kita tarik data terbaru
      await new Promise(r => setTimeout(r, 1500));
    }
    
    if (btn) btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Memuat Data...`;
    
    // 2. Tarik log terbaru dari Google Sheets
    const response = await fetch(`${WEB_APP_URL}?id=${targetId}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const dbData = await response.json();
    
    if (!dbData.error) {
      logPemakaian = dbData.logPemakaian || [];
      renderLogTable('iot');
    }
  } catch(e) {
    console.error(e);
    alert("Gagal memuat ulang data IoT. Error: " + e.message);
  } finally {
    if (btn) {
      btn.innerHTML = `<i data-lucide="refresh-cw"></i> Refresh Manual`;
      btn.disabled = false;
      lucide.createIcons();
    }
  }
}

let autoSyncInterval = null;
let isAutoSyncing = false;

async function silentRefreshIoT() {
  if (isAutoSyncing) return; // Mencegah tabrakan request jika koneksi lambat
  isAutoSyncing = true;
  try {
    const targetId = getTargetSpreadsheetId();
    if (!targetId) throw new Error("No target ID");
    
    const acDeviceIds = acData.map(x => x['Device ID IoT']).filter(id => id && id !== '-');
    const logDeviceIds = [...new Set(logPemakaian.map(x => Object.values(x)[1]).filter(id => id && id !== '-'))];
    const deviceIds = [...new Set([...acDeviceIds, ...logDeviceIds])];
    if (deviceIds.length > 0) {
      // Pecah menjadi kelompok 50
      const chunkSize = 50;
      for (let i = 0; i < deviceIds.length; i += chunkSize) {
        const chunk = deviceIds.slice(i, i + chunkSize);
        await fetch(`${WEB_APP_URL}?action=sync_tuya&deviceIds=${chunk.join(',')}&id=${targetId}`);
      }
      // Beri waktu sebentar agar backend selesai update sheet sebelum kita get
      await new Promise(r => setTimeout(r, 1500));
    }
    
    const response = await fetch(`${WEB_APP_URL}?id=${targetId}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const dbData = await response.json();
    
    if (!dbData.error) {
      logPemakaian = dbData.logPemakaian || [];
      renderLogTable('iot');
    }
  } catch(e) {
    console.error("Auto-sync error:", e);
  } finally {
    isAutoSyncing = false;
  }
}

async function toggleAc(deviceId, turnOn) {
  const confirmMsg = turnOn ? "Nyalakan AC ini?" : "Matikan AC ini?";
  if (!confirm(confirmMsg)) return;

  try {
    const targetId = getTargetSpreadsheetId();
    if (!targetId) throw new Error("No target ID");

    // Cari baris tombol dan tunjukkan loading state
    const tbody = document.getElementById('tableBodyIot');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        if (row.innerHTML.includes(`'${deviceId}'`)) {
          const btns = row.querySelectorAll('td:last-child button');
          btns.forEach(btn => {
            if (turnOn && btn.innerText.includes("ON")) {
              btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Proses...`;
            } else if (!turnOn && btn.innerText.includes("OFF")) {
              btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Proses...`;
            }
            btn.disabled = true;
          });
        }
      });
      lucide.createIcons();
    }

    const payload = { 
      action: 'toggle_ac',
      deviceId: deviceId,
      turnOn: turnOn
    };

    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ targetSpreadsheetId: targetId, payload: payload })
    });
    
    // Karena no-cors, kita anggap sukses, tunggu 2 detik agar status API Tuya terupdate, lalu refresh.
    setTimeout(() => {
      refreshIoT();
    }, 2000);

  } catch (e) {
    console.error(e);
    alert("Gagal mengirim perintah ke alat IoT.");
    refreshIoT();
  }
}

// =========================================================================
// REKAP PEMAKAIAN & BIAYA LISTRIK AC
// =========================================================================
let chartRekapGedung = null;
let chartRekapTopAc = null;
let filteredRekapData = [];

function initRekapPemakaian() {
  const gedungSelect = document.getElementById('filterGedungRekap');
  if (gedungSelect) {
    const currentVal = gedungSelect.value;
    const gedungs = [...new Set(acData.map(item => item.Gedung).filter(g => g && g !== '-'))].sort();
    gedungSelect.innerHTML = '<option value="">Semua Gedung</option>' + gedungs.map(g => `<option value="${g}">${g}</option>`).join('');
    gedungSelect.value = currentVal;
  }
  handlePeriodeRekapChange();
}

function handlePeriodeRekapChange() {
  const periode = document.getElementById('filterPeriodeRekap')?.value || 'bulan_ini';
  const customGroup = document.getElementById('groupCustomDateRekap');
  const startInput = document.getElementById('filterTglStartRekap');
  const endInput = document.getElementById('filterTglEndRekap');

  const now = new Date();
  if (periode === 'bulan_ini') {
    if (customGroup) customGroup.style.display = 'none';
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (startInput) startInput.value = firstDay.toISOString().split('T')[0];
    if (endInput) endInput.value = lastDay.toISOString().split('T')[0];
  } else if (periode === 'bulan_lalu') {
    if (customGroup) customGroup.style.display = 'none';
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    if (startInput) startInput.value = firstDay.toISOString().split('T')[0];
    if (endInput) endInput.value = lastDay.toISOString().split('T')[0];
  } else if (periode === 'tahun_ini') {
    if (customGroup) customGroup.style.display = 'none';
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    if (startInput) startInput.value = firstDay.toISOString().split('T')[0];
    if (endInput) endInput.value = lastDay.toISOString().split('T')[0];
  } else if (periode === 'semua') {
    if (customGroup) customGroup.style.display = 'none';
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
  } else if (periode === 'custom') {
    if (customGroup) customGroup.style.display = 'flex';
  }

  renderRekapPemakaian();
}

function renderRekapPemakaian() {
  const startDateStr = document.getElementById('filterTglStartRekap')?.value || '';
  const endDateStr = document.getElementById('filterTglEndRekap')?.value || '';
  const selectedGedung = document.getElementById('filterGedungRekap')?.value || '';
  const tarifPln = parseFloat(document.getElementById('inputTarifPln')?.value || 1444);
  const defaultWatt = parseFloat(document.getElementById('inputDefaultWatt')?.value || 900);

  const startMs = startDateStr ? new Date(startDateStr + 'T00:00:00').getTime() : 0;
  const endMs = endDateStr ? new Date(endDateStr + 'T23:59:59').getTime() : Infinity;

  // Group logPemakaian entries per device ID
  const deviceHistoryMap = new Map();
  logPemakaian.forEach(row => {
    const vals = Object.values(row);
    const timeMs = new Date(vals[0]).getTime();
    const devId = String(vals[1] || '').trim();
    const status = String(vals[2] || '').toUpperCase();
    if (!devId || devId === '-') return;

    if (!deviceHistoryMap.has(devId)) {
      deviceHistoryMap.set(devId, []);
    }
    deviceHistoryMap.get(devId).push({ timeMs, status, raw: row });
  });

  // Unique devices from acData + deviceHistoryMap
  const allDevIds = new Set([
    ...Array.from(deviceHistoryMap.keys()),
    ...acData.map(item => item['Device ID (IoT)'] || item['Device ID IoT'] || item['id_iot']).filter(id => id && id !== '-')
  ]);

  const rekapRows = [];

  allDevIds.forEach(devId => {
    const acInfo = acData.find(x => x['Device ID (IoT)'] === devId || x['Device ID IoT'] === devId || x['id_iot'] === devId || (x.Keterangan && x.Keterangan.includes(devId)));

    const noSeri = acInfo ? (acInfo['No. Seri Indoor'] || '-') : '-';
    const gedung = acInfo ? (acInfo.Gedung || '-') : '-';
    const lokasi = acInfo ? (acInfo.Lokasi || '-') : '-';

    // Filter Gedung
    if (selectedGedung && gedung !== selectedGedung) return;

    // Calculate Daya Watt
    let watt = 0;
    if (acInfo) {
      const dOut = parseFloat(String(acInfo['Daya Outdoor'] || '').replace(/[^0-9.]/g, '')) || 0;
      const dIn = parseFloat(String(acInfo['Daya Indoor'] || '').replace(/[^0-9.]/g, '')) || 0;
      if (dOut > 0 || dIn > 0) {
        watt = dOut + dIn;
      } else if (acInfo.PK) {
        const pkStr = String(acInfo.PK).replace(',', '.').replace(/[^0-9.]/g, '');
        const pkVal = parseFloat(pkStr);
        if (!isNaN(pkVal) && pkVal > 0) {
          if (pkVal <= 0.6) watt = 400;
          else if (pkVal <= 0.8) watt = 600;
          else if (pkVal <= 1.2) watt = 900;
          else if (pkVal <= 1.7) watt = 1300;
          else if (pkVal <= 2.2) watt = 1800;
          else if (pkVal <= 2.7) watt = 2200;
          else watt = pkVal * 900;
        }
      }
    }
    if (watt <= 0) watt = defaultWatt;

    // Calculate duration (ms) within date range
    const history = deviceHistoryMap.get(devId) || [];
    history.sort((a, b) => a.timeMs - b.timeMs);

    let totalMs = 0;
    let currentBlockStart = null;
    let lastStatusStr = '-';

    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      lastStatusStr = (h.status === 'ON' || h.status === 'TRUE') ? 'ON' : 'OFF';
      const isThisOn = (lastStatusStr === 'ON');

      if (isThisOn) {
        if (currentBlockStart === null) {
          currentBlockStart = h.timeMs;
        }
      } else {
        if (currentBlockStart !== null) {
          const intervalStart = Math.max(currentBlockStart, startMs);
          const intervalEnd = Math.min(h.timeMs, endMs);
          if (intervalEnd > intervalStart) {
            totalMs += (intervalEnd - intervalStart);
          }
          currentBlockStart = null;
        }
      }
    }

    if (currentBlockStart !== null) {
      const nowMs = Date.now();
      const intervalStart = Math.max(currentBlockStart, startMs);
      const intervalEnd = Math.min(nowMs, endMs);
      if (intervalEnd > intervalStart) {
        totalMs += (intervalEnd - intervalStart);
      }
    }

    const durationHours = totalMs / (1000 * 3600);
    const kwh = (durationHours * watt) / 1000;
    const biaya = kwh * tarifPln;

    rekapRows.push({
      devId,
      noSeri,
      gedung,
      lokasi,
      watt,
      durationHours,
      kwh,
      biaya,
      status: lastStatusStr
    });
  });

  filteredRekapData = rekapRows;

  // Update Summary Cards
  const grandTotalHours = rekapRows.reduce((sum, r) => sum + r.durationHours, 0);
  const grandTotalKwh = rekapRows.reduce((sum, r) => sum + r.kwh, 0);
  const grandTotalBiaya = rekapRows.reduce((sum, r) => sum + r.biaya, 0);
  const activeUnits = rekapRows.filter(r => r.durationHours > 0 || r.status === 'ON').length;

  const elTotalJam = document.getElementById('rekap-total-jam');
  const elTotalKwh = document.getElementById('rekap-total-kwh');
  const elTotalBiaya = document.getElementById('rekap-total-biaya');
  const elTotalUnit = document.getElementById('rekap-total-unit');

  if (elTotalJam) elTotalJam.innerText = `${grandTotalHours.toFixed(1)} Jam`;
  if (elTotalKwh) elTotalKwh.innerText = `${grandTotalKwh.toFixed(2)} kWh`;
  if (elTotalBiaya) elTotalBiaya.innerText = `Rp ${Math.round(grandTotalBiaya).toLocaleString('id-ID')}`;
  if (elTotalUnit) elTotalUnit.innerText = `${activeUnits} Unit`;

  // Render Table
  const tbody = document.getElementById('tableBodyRekap');
  if (tbody) {
    if (rekapRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 20px;">Tidak ada data rekap untuk periode ini.</td></tr>`;
    } else {
      tbody.innerHTML = rekapRows.map((r, index) => {
        const badgeClass = r.status === 'ON' ? 'badge badge-success' : 'badge badge-danger';
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${r.noSeri}</td>
            <td style="font-family: monospace; font-size: 12px;">${r.devId}</td>
            <td>${r.gedung}</td>
            <td>${r.lokasi}</td>
            <td>${r.watt} W</td>
            <td><strong>${r.durationHours.toFixed(1)} Jam</strong></td>
            <td>${r.kwh.toFixed(2)} kWh</td>
            <td style="color: #3b82f6; font-weight: 600;">Rp ${Math.round(r.biaya).toLocaleString('id-ID')}</td>
            <td><span class="${badgeClass}">${r.status}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Render Charts
  renderRekapCharts(rekapRows);
}

function renderRekapCharts(rekapRows) {
  // Chart 1: Per Gedung (kWh)
  const gedungMap = {};
  rekapRows.forEach(r => {
    const g = r.gedung || 'Lainnya';
    gedungMap[g] = (gedungMap[g] || 0) + r.kwh;
  });

  const gedungLabels = Object.keys(gedungMap);
  const gedungData = Object.values(gedungMap).map(v => parseFloat(v.toFixed(2)));

  const ctxGedung = document.getElementById('chartRekapGedung');
  if (ctxGedung && typeof Chart !== 'undefined') {
    if (chartRekapGedung) chartRekapGedung.destroy();
    chartRekapGedung = new Chart(ctxGedung, {
      type: 'bar',
      data: {
        labels: gedungLabels.length ? gedungLabels : ['Belum ada data'],
        datasets: [{
          label: 'Konsumsi (kWh)',
          data: gedungData.length ? gedungData : [0],
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 2: Top 5 AC (Hours)
  const topAcList = [...rekapRows].sort((a, b) => b.durationHours - a.durationHours).slice(0, 5);
  const topAcLabels = topAcList.map(r => r.lokasi !== '-' ? r.lokasi : r.noSeri);
  const topAcData = topAcList.map(r => parseFloat(r.durationHours.toFixed(1)));

  const ctxTop = document.getElementById('chartRekapTopAc');
  if (ctxTop && typeof Chart !== 'undefined') {
    if (chartRekapTopAc) chartRekapTopAc.destroy();
    chartRekapTopAc = new Chart(ctxTop, {
      type: 'bar',
      data: {
        labels: topAcLabels.length ? topAcLabels : ['Belum ada data'],
        datasets: [{
          label: 'Total Jam Nyala',
          data: topAcData.length ? topAcData : [0],
          backgroundColor: '#10b981',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
          y: { grid: { display: false } }
        }
      }
    });
  }
}



