document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  socket.on("state_update", (state) => {
    renderAdminDashboard(state);
  });
  // ... 기존 admin.js 코드(버튼 이벤트 등) ...
});
