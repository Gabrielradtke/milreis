const form = document.getElementById("transactionForm");
const transactionList = document.getElementById("transactionList");
const transactionCount = document.getElementById("transactionCount");
const dateInput = document.getElementById("date");
const monthTitle = document.getElementById("monthTitle");
const monthFilter = document.getElementById("monthFilter");
const currentMonthBtn = document.getElementById("currentMonthBtn");

const balanceMain = document.getElementById("balanceMain");
const incomeMain = document.getElementById("incomeMain");
const expenseMain = document.getElementById("expenseMain");

const logoutBtn = document.getElementById("logoutBtn");
const userAvatar = document.getElementById("userAvatar");

const formTitle = document.getElementById("formTitle");
const formModeText = document.getElementById("formModeText");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const typeButtons = document.querySelectorAll(".type-btn");
const deleteModal = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let currentType = "receita";
let currentUser = null;
let transactions = [];
let filteredTransactions = [];
let transactionIdToDelete = null;
let editingTransactionId = null;
let selectedMonth = getCurrentMonthValue();
let currentViewMode = "monthly";

dateInput.value = getToday();
monthFilter.value = selectedMonth;

const balanceLabel = setupBalanceLabel();
const periodHint = setupPeriodHint();
const viewMode = setupViewModeSelect();

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  currentUser = user;
  setUserAvatar(user);
  await ensureUserProfile(user);
  listenTransactions();
});

typeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setType(button.dataset.type);
  });
});

monthFilter.addEventListener("change", () => {
  selectedMonth = monthFilter.value || getCurrentMonthValue();
  applyMonthFilter();
  renderAll();
});

currentMonthBtn.addEventListener("click", () => {
  selectedMonth = getCurrentMonthValue();
  monthFilter.value = selectedMonth;
  applyMonthFilter();
  renderAll();
});

viewMode.addEventListener("change", () => {
  currentViewMode = viewMode.value || "monthly";
  updateViewModeUI();
  applyMonthFilter();
  renderAll();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const description = form.description.value.trim();
  const amount = Number(form.amount.value);
  const date = form.date.value;
  const category = form.category.value;
  const paymentMethod = form.paymentMethod.value;

  if (!description || amount <= 0 || !date || !category || !paymentMethod) {
    return;
  }

  const payload = {
    userId: currentUser.uid,
    type: currentType,
    description,
    amount,
    date,
    category,
    paymentMethod,
  };

  try {
    if (editingTransactionId) {
      await db.collection("transactions").doc(editingTransactionId).update({
        ...payload,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      resetFormMode();
      return;
    }

    await db.collection("transactions").add({
      ...payload,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    form.reset();
    dateInput.value = getToday();
    setType("receita");

    if (date) {
      selectedMonth = date.slice(0, 7);
      monthFilter.value = selectedMonth;
    }

    if (currentViewMode !== "all") {
      updateViewModeUI();
    }
  } catch (error) {
    console.error("Erro ao salvar lançamento:", error);
    alert("Não foi possível salvar o lançamento.");
  }
});

logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "auth.html";
});

cancelEditBtn.addEventListener("click", () => {
  resetFormMode();
});

cancelDeleteBtn.addEventListener("click", closeDeleteModal);

confirmDeleteBtn.addEventListener("click", async () => {
  if (!transactionIdToDelete) {
    closeDeleteModal();
    return;
  }

  try {
    await db.collection("transactions").doc(transactionIdToDelete).delete();

    if (editingTransactionId === transactionIdToDelete) {
      resetFormMode();
    }

    closeDeleteModal();
  } catch (error) {
    console.error("Erro ao excluir lançamento:", error);
    alert("Não foi possível excluir o lançamento.");
  }
});

deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) {
    closeDeleteModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !deleteModal.classList.contains("hidden")) {
    closeDeleteModal();
  }
});

function setupBalanceLabel() {
  const heroCardLabel = document.querySelector(".hero-card small");
  if (heroCardLabel) {
    heroCardLabel.textContent = "Saldo geral";
    heroCardLabel.id = "balanceLabel";
    return heroCardLabel;
  }

  return {
    textContent: "",
  };
}

function setupPeriodHint() {
  const filterCard = monthFilter.closest(".card");
  const muted = filterCard?.querySelector(".card-header .muted");

  if (muted) {
    muted.textContent = "visão mensal";
    muted.id = "periodHint";
    return muted;
  }

  return {
    textContent: "",
  };
}

function setupViewModeSelect() {
  let existing = document.getElementById("viewMode");
  if (existing) return existing;

  const monthFilterWrapper = monthFilter.closest(".month-filter");
  const monthField = monthFilter.closest(".field");

  const field = document.createElement("div");
  field.className = "field";
  field.innerHTML = `
    <label for="viewMode">Tipo de visão</label>
    <select id="viewMode" name="viewMode">
      <option value="monthly">Mensal</option>
      <option value="all">Desde o início</option>
    </select>
  `;

  if (monthFilterWrapper) {
    monthFilterWrapper.insertBefore(field, monthField || monthFilterWrapper.firstChild);
  }

  existing = document.getElementById("viewMode");
  if (existing) {
    existing.value = currentViewMode;
  }

  return existing;
}

function updateViewModeUI() {
  const isAll = currentViewMode === "all";

  monthFilter.disabled = isAll;
  currentMonthBtn.disabled = isAll;

  monthFilter.style.opacity = isAll ? "0.55" : "1";
  currentMonthBtn.style.opacity = isAll ? "0.55" : "1";
  currentMonthBtn.style.cursor = isAll ? "not-allowed" : "pointer";

  if (periodHint) {
    periodHint.textContent = isAll ? "Desde o início" : "Visão mensal";
  }
}

function listenTransactions() {
  db.collection("transactions")
    .where("userId", "==", currentUser.uid)
    .onSnapshot(
      (snapshot) => {
        transactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (!monthFilter.value) {
          monthFilter.value = selectedMonth;
        }

        applyMonthFilter();
        renderAll();
      },
      (error) => {
        console.error("Erro ao ouvir lançamentos:", error);
        monthTitle.textContent = "Erro ao carregar";
        transactionList.innerHTML =
          '<p class="empty">Não foi possível carregar os lançamentos.</p>';
        transactionCount.textContent = "0 itens";
      }
    );
}

function applyMonthFilter() {
  if (currentViewMode === "all") {
    filteredTransactions = transactions.filter((item) => item.date);
    return;
  }

  filteredTransactions = transactions.filter((item) => {
    if (!item.date) return false;
    return item.date.slice(0, 7) === selectedMonth;
  });
}

async function ensureUserProfile(user) {
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      name: user.displayName || user.email.split("@")[0],
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}

function setUserAvatar(user) {
  const source = user.displayName || user.email || "U";

  const initials = source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  userAvatar.textContent = initials;
}

function setType(type) {
  currentType = type;

  typeButtons.forEach((button) => {
    button.classList.remove("active");

    if (button.dataset.type === type) {
      button.classList.add("active");
    }
  });
}

function editTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;

  editingTransactionId = id;

  form.description.value = transaction.description || "";
  form.amount.value = transaction.amount || "";
  form.date.value = transaction.date || "";
  form.category.value = transaction.category || "";
  form.paymentMethod.value = transaction.paymentMethod || "";

  setType(transaction.type || "receita");

  formTitle.textContent = "Editar lançamento";
  formModeText.textContent = "modo edição";
  submitBtn.textContent = "Atualizar lançamento";
  cancelEditBtn.classList.remove("hidden");

  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetFormMode() {
  editingTransactionId = null;
  form.reset();
  dateInput.value = getToday();
  setType("receita");

  formTitle.textContent = "Novo lançamento";
  formModeText.textContent = "cadastro diário";
  submitBtn.textContent = "Salvar lançamento";
  cancelEditBtn.classList.add("hidden");
}

function askDeleteTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;

  transactionIdToDelete = id;
  deleteModalText.textContent = `Excluir o lançamento "${transaction.description}" no valor de ${formatCurrency(transaction.amount)}?`;
  deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
  transactionIdToDelete = null;
  deleteModal.classList.add("hidden");
}

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatCurrency(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function getMonthName(monthValue) {
  const [year, month] = monthValue.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function renderSummary() {
  const totalIncome = transactions
    .filter((item) => item.type === "receita")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpense = transactions
    .filter((item) => item.type === "despesa")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalBalance = totalIncome - totalExpense;

  const periodIncome = filteredTransactions
    .filter((item) => item.type === "receita")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const periodExpense = filteredTransactions
    .filter((item) => item.type === "despesa")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  balanceMain.textContent = formatCurrency(totalBalance);

  if (balanceLabel) {
    balanceLabel.textContent = "Saldo geral";
  }

  if (currentViewMode === "all") {
    incomeMain.textContent = formatCurrency(totalIncome);
    expenseMain.textContent = formatCurrency(totalExpense);
  } else {
    incomeMain.textContent = formatCurrency(periodIncome);
    expenseMain.textContent = formatCurrency(periodExpense);
  }
}

function renderTransactions() {
  if (currentViewMode === "all") {
    monthTitle.textContent = "Desde o início";
  } else {
    const monthLabel = getMonthName(selectedMonth);
    monthTitle.textContent =
      monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  }

  if (filteredTransactions.length === 0) {
    transactionList.innerHTML =
      currentViewMode === "all"
        ? '<p class="empty">Nenhum lançamento encontrado até o momento.</p>'
        : '<p class="empty">Nenhum lançamento encontrado para este mês.</p>';
    transactionCount.textContent = "0 itens";
    return;
  }

  const sorted = [...filteredTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  transactionCount.textContent = `${sorted.length} ${
    sorted.length === 1 ? "item" : "itens"
  }`;

  transactionList.innerHTML = sorted
    .map((item) => {
      const icon = item.type === "receita" ? "↑" : "↓";
      const valueClass = item.type === "receita" ? "income" : "expense";
      const signal = item.type === "receita" ? "+" : "-";

      return `
        <article class="transaction">
          <div class="icon ${valueClass}">${icon}</div>

          <div class="transaction-info">
            <strong>${item.description}</strong>
            <small>${item.category} • ${formatDate(item.date)}</small>
          </div>

          <div class="transaction-value">
            <strong class="${valueClass}">${signal} ${formatCurrency(item.amount)}</strong>
            <small>${item.paymentMethod}</small>
          </div>

          <div class="transaction-actions">
            <button
              class="action-btn edit-btn"
              type="button"
              onclick="editTransaction('${item.id}')"
              title="Editar lançamento"
              aria-label="Editar lançamento"
            >
              ✎
            </button>

            <button
              class="action-btn delete-btn"
              type="button"
              onclick="askDeleteTransaction('${item.id}')"
              title="Excluir lançamento"
              aria-label="Excluir lançamento"
            >
              ×
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAll() {
  updateViewModeUI();
  renderSummary();
  renderTransactions();
}

window.editTransaction = editTransaction;
window.askDeleteTransaction = askDeleteTransaction;