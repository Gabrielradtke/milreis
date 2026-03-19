const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));

auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "index.html";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showMessage("Login realizado com sucesso.", "success");
    window.location.href = "index.html";
  } catch (error) {
    showMessage(getFirebaseErrorMessage(error.code), "error");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  const confirmPassword = document.getElementById("registerConfirmPassword").value.trim();

  if (!name || !email || !password || !confirmPassword) {
    showMessage("Preencha todos os campos.", "error");
    return;
  }

  if (password.length < 6) {
    showMessage("A senha deve ter no mínimo 6 caracteres.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("As senhas não coincidem.", "error");
    return;
  }

  try {
    const credential = await auth.createUserWithEmailAndPassword(email, password);

    await db.collection("users").doc(credential.user.uid).set({
      name,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showMessage("Cadastro criado com sucesso.", "success");
    window.location.href = "index.html";
  } catch (error) {
    showMessage(getFirebaseErrorMessage(error.code), "error");
  }
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

function showMessage(message, type) {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function clearMessage() {
  authMessage.textContent = "";
  authMessage.className = "auth-message";
}

function getFirebaseErrorMessage(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Usuário desativado.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "Senha fraca. Use uma senha mais forte.",
    "auth/invalid-credential": "Credenciais inválidas.",
  };

  return map[code] || "Não foi possível concluir a operação.";
}