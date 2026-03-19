const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

const USERS_KEY = "controle_gastos_users";
const SESSION_KEY = "controle_gastos_session";

checkSession();

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value.trim();

  const users = getUsers();
  const user = users.find((item) => item.email === email);

  if (!user || user.password !== password) {
    showMessage("E-mail ou senha inválidos.", "error");
    return;
  }

  saveSession({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  showMessage("Login realizado com sucesso.", "success");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 500);
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const password = document.getElementById("registerPassword").value.trim();
  const confirmPassword = document.getElementById("registerConfirmPassword").value.trim();

  if (!name || !email || !password || !confirmPassword) {
    showMessage("Preencha todos os campos.", "error");
    return;
  }

  if (password.length < 4) {
    showMessage("A senha deve ter no mínimo 4 caracteres.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("As senhas não coincidem.", "error");
    return;
  }

  const users = getUsers();
  const emailAlreadyExists = users.some((item) => item.email === email);

  if (emailAlreadyExists) {
    showMessage("Já existe uma conta com este e-mail.", "error");
    return;
  }

  const newUser = {
    id: generateId(),
    name,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  saveSession({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
  });

  showMessage("Cadastro criado com sucesso.", "success");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 500);
});

function setMode(mode) {
  clearMessage();

  if (mode === "login") {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    return;
  }

  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveSession(sessionData) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

function checkSession() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY));

  if (session) {
    window.location.href = "index.html";
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function showMessage(message, type) {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function clearMessage() {
  authMessage.textContent = "";
  authMessage.className = "auth-message";
}