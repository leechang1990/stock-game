document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginMessage = document.getElementById("login-message");

  usernameInput.addEventListener("input", () => {
    passwordInput.style.display =
      usernameInput.value.toLowerCase() === "root" ? "block" : "none";
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (data.success) {
      window.location.href = "/";
    } else {
      loginMessage.textContent = data.message;
    }
  });
});
