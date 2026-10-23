/* ============================================================
   EduPay — Frontend JavaScript
   ============================================================ */

const API = '';  // same origin

let allStudents = [];
let deleteTargetId = null;
let editingStudentId = null;

/* ============================================================
   NAVIGATION
   ============================================================ */
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`).classList.add('active');

  if (name === 'students') loadStudents();
  if (name === 'pay') loadStudentsForSelect();
}

/* ============================================================
   DEBTORS
   ============================================================ */
function setCurrentMonth() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('month-picker').value = `${yyyy}-${mm}`;
}

async function loadDebtors() {
  const month = document.getElementById('month-picker').value;
  if (!month) { showToast('Выберите месяц', 'error'); return; }

  const list  = document.getElementById('debtors-list');
  const empty = document.getElementById('debtors-empty');
  const loading = document.getElementById('debtors-loading');

  list.innerHTML = '';
  empty.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const res = await fetch(`${API}/debtors?month=${month}`);
    const data = await res.json();
    loading.classList.add('hidden');

    if (!res.ok) { showToast(data.error || 'Ошибка', 'error'); return; }

    if (data.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    data.forEach(d => {
      const pct = Math.min(100, Math.round((d.paid / d.monthly_amount) * 100));
      const card = document.createElement('div');
      card.className = 'card debtor-card';
      card.innerHTML = `
        <div class="card-badge">⚠️ Долг</div>
        <div class="card-name">${esc(d.name)}</div>
        <div class="card-meta">
          <span class="card-meta-item">📞 ${esc(d.phone)}</span>
          <span class="card-meta-item">📚 ${esc(d.group_name)}</span>
        </div>
        <div class="card-progress">
          <div class="progress-labels">
            <span>Оплачено: ${formatMoney(d.paid)}</span>
            <span>${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
        <div class="debt-amount">−${formatMoney(d.debt)}</div>
        <div class="debt-label">из ${formatMoney(d.monthly_amount)} в месяц</div>
      `;
      list.appendChild(card);
    });
  } catch (e) {
    loading.classList.add('hidden');
    showToast('Ошибка соединения', 'error');
  }
}

/* ============================================================
   STUDENTS
   ============================================================ */
async function loadStudents() {
  const list = document.getElementById('students-list');
  const loading = document.getElementById('students-loading');
  list.innerHTML = '';
  loading.classList.remove('hidden');

  try {
    const res = await fetch(`${API}/students`);
    const data = await res.json();
    allStudents = data;
    loading.classList.add('hidden');

    if (data.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p class="empty-text">Учеников пока нет. Добавьте первого!</p></div>`;
      return;
    }

    data.forEach(s => {
      const card = document.createElement('div');
      card.className = 'card student-card';
      card.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <span class="tag">📚 ${esc(s.group_name)}</span>
          <span class="tag amount-tag">💰 ${formatMoney(s.monthly_amount)}/мес</span>
        </div>
        <div class="card-name">${esc(s.name)}</div>
        <div class="card-meta">
          <span class="card-meta-item">📞 ${esc(s.phone)}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost btn-sm" onclick="viewPayments(${s.id}, '${esc(s.name)}')">📋 Оплаты</button>
          <button class="btn btn-ghost btn-sm" onclick="openEditStudent(${s.id})">✏️ Изменить</button>
          <button class="btn btn-danger btn-sm" onclick="openDelete(${s.id})">🗑️ Удалить</button>
        </div>
      `;
      list.appendChild(card);
    });
  } catch (e) {
    loading.classList.add('hidden');
    showToast('Ошибка загрузки учеников', 'error');
  }
}

function openAddStudent() {
  editingStudentId = null;
  document.getElementById('modal-student-title').textContent = 'Новый ученик';
  document.getElementById('btn-submit-student').textContent = 'Добавить';
  document.getElementById('form-student').reset();
  document.getElementById('s-id').value = '';
  hideFeedback('student-feedback');
  openModal('modal-student');
}

function openEditStudent(id) {
  const s = allStudents.find(x => x.id === id);
  if (!s) return;
  editingStudentId = id;
  document.getElementById('modal-student-title').textContent = 'Изменить ученика';
  document.getElementById('btn-submit-student').textContent = 'Сохранить';
  document.getElementById('s-id').value = id;
  document.getElementById('s-name').value = s.name;
  document.getElementById('s-phone').value = s.phone;
  document.getElementById('s-group').value = s.group_name;
  document.getElementById('s-amount').value = s.monthly_amount;
  hideFeedback('student-feedback');
  openModal('modal-student');
}

async function submitStudent(e) {
  e.preventDefault();
  const body = {
    name:           document.getElementById('s-name').value.trim(),
    phone:          document.getElementById('s-phone').value.trim(),
    group_name:     document.getElementById('s-group').value.trim(),
    monthly_amount: Number(document.getElementById('s-amount').value),
  };
  const id = document.getElementById('s-id').value;
  const isEdit = Boolean(id);

  const btn = document.getElementById('btn-submit-student');
  btn.disabled = true;
  btn.textContent = 'Сохраняем...';

  try {
    const res = await fetch(`${API}/students${isEdit ? '/' + id : ''}`, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback('student-feedback', data.error || 'Ошибка', 'error');
    } else {
      closeModal('modal-student');
      showToast(isEdit ? '✅ Ученик обновлён' : '✅ Ученик добавлен', 'success');
      loadStudents();
    }
  } catch {
    showFeedback('student-feedback', 'Ошибка соединения', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = isEdit ? 'Сохранить' : 'Добавить';
  }
}

function openDelete(id) {
  deleteTargetId = id;
  openModal('modal-delete');
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    const res = await fetch(`${API}/students/${deleteTargetId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('🗑️ Ученик удалён', 'success');
      closeModal('modal-delete');
      loadStudents();
    } else {
      showToast('Ошибка удаления', 'error');
    }
  } catch {
    showToast('Ошибка соединения', 'error');
  }
  deleteTargetId = null;
}

/* ============================================================
   PAYMENTS
   ============================================================ */
async function loadStudentsForSelect() {
  const sel = document.getElementById('pay-student');
  sel.innerHTML = '<option value="">— Выберите ученика —</option>';
  try {
    const res = await fetch(`${API}/students`);
    const data = await res.json();
    allStudents = data;
    data.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.group_name})`;
      sel.appendChild(opt);
    });
  } catch {}
}

async function submitPayment(e) {
  e.preventDefault();
  const body = {
    student_id: Number(document.getElementById('pay-student').value),
    amount:     Number(document.getElementById('pay-amount').value),
    date:       document.getElementById('pay-date').value,
  };

  const btn = document.getElementById('btn-submit-pay');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> Сохраняем...';

  try {
    const res = await fetch(`${API}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      showFeedback('pay-feedback', data.error || 'Ошибка', 'error');
    } else {
      showFeedback('pay-feedback', `✅ Оплата ${formatMoney(data.amount)} сохранена!`, 'success');
      document.getElementById('pay-form').reset();
      setTodayDate();
    }
  } catch {
    showFeedback('pay-feedback', 'Ошибка соединения', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">💳</span> Сохранить оплату';
  }
}

async function viewPayments(studentId, studentName) {
  document.getElementById('modal-payments-title').textContent = `Оплаты — ${studentName}`;
  const container = document.getElementById('payments-list-modal');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Загружаем...</p></div>';
  openModal('modal-payments');

  try {
    const res = await fetch(`${API}/payments?student_id=${studentId}`);
    const data = await res.json();

    if (!res.ok || data.length === 0) {
      container.innerHTML = '<p class="no-payments">Платежей пока нет</p>';
      return;
    }

    container.innerHTML = data.map(p => `
      <div class="payment-item">
        <span class="payment-date">📅 ${formatDate(p.date)}</span>
        <span class="payment-amount">+${formatMoney(p.amount)}</span>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<p class="no-payments">Ошибка загрузки</p>';
  }
}

/* ============================================================
   MODAL HELPERS
   ============================================================ */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  }
});

/* ============================================================
   FEEDBACK & TOAST
   ============================================================ */
function showFeedback(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `feedback ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function hideFeedback(id) {
  const el = document.getElementById(id);
  el.classList.add('hidden');
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ============================================================
   UTILS
   ============================================================ */
function formatMoney(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₽';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('pay-date');
  if (dateInput) dateInput.value = today;
}

/* ============================================================
   INIT
   ============================================================ */
setCurrentMonth();
setTodayDate();
loadDebtors();
