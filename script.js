const form = document.getElementById("transactionForm");
const transactionList = document.getElementById("transactionList");
const transactionCount = document.getElementById("transactionCount");
const dateInput = document.getElementById("date");
const monthTitle = document.getElementById("monthTitle");

const balanceMain = document.getElementById("balanceMain");
const incomeMain = document.getElementById("incomeMain");
const expenseMain = document.getElementById("expenseMain");
const incomeQuick = document.getElementById("incomeQuick");
const expenseQuick = document.getElementById("expenseQuick");
const balanceQuick = document.getElementById("balanceQuick");

const logoutBtn = document.getElementById("logoutBtn");
const userAvatar = document.getElementById("userAvatar");

const typeButtons = document.querySelectorAll(".type-btn");
const deleteModal = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let currentType = "receita";
let currentUser = null;
let transactions = [];
let transactionIdToDelete = null;

dateInput.value = getToday();

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

  await db.collection("transactions").add({
    userId: currentUser.uid,
    type: currentType,
    description,
    amount,
    date,
    category,
    paymentMethod,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  form.reset();
  dateInput.value = getToday();
  setType("receita");
});

logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "auth.html";
});

cancelDeleteBtn.addEventListener("click", closeDeleteModal);

confirmDeleteBtn.addEventListener("click", async () => {
  if (!transactionIdToDelete) {
    closeDeleteModal();
    return;
  }

  await db.collection("transactions").doc(transactionIdToDelete).delete();
  closeDeleteModal();
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

function listenTransactions() {
  db.collection("transactions")
    .where("userId", "==", currentUser.uid)
    .onSnapshot((snapshot) => {
      transactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      renderAll();
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

function getMonthName(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function renderSummary() {
  const income = transactions
    .filter((item) => item.type === "receita")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expense = transactions
    .filter((item) => item.type === "despesa")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const balance = income - expense;

  incomeMain.textContent = formatCurrency(income);
  expenseMain.textContent = formatCurrency(expense);
  balanceMain.textContent = formatCurrency(balance);

  incomeQuick.textContent = formatCurrency(income);
  expenseQuick.textContent = formatCurrency(expense);
  balanceQuick.textContent = formatCurrency(balance);
}

function renderTransactions() {
  if (transactions.length === 0) {
    transactionList.innerHTML = '<p class="empty">Nenhum lançamento ainda. Cadastre o primeiro acima.</p>';
    transactionCount.textContent = "0 itens";
    monthTitle.textContent = "Sem lançamentos";
    return;
  }

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestDate = sorted[0].date;
  const monthLabel = getMonthName(latestDate);

  monthTitle.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  transactionCount.textContent = `${sorted.length} ${sorted.length === 1 ? "item" : "itens"}`;

  transactionList.innerHTML = sorted.map((item) => {
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

        <button
          class="delete-btn"
          type="button"
          onclick="askDeleteTransaction('${item.id}')"
          title="Excluir lançamento"
          aria-label="Excluir lançamento"
        >
          ×
        </button>
      </article>
    `;
  }).join("");
}

function renderAll() {
  renderSummary();
  renderTransactions();
}