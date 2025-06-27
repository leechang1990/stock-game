document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("login-section");
  const adminDashboard = document.getElementById("admin-dashboard");
  const userDashboard = document.getElementById("user-dashboard");
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginMessage = document.getElementById("login-message");

  const adminLogoutBtn = document.getElementById("admin-logout-btn");
  const adminGameStatus = document.getElementById("admin-game-status");
  const startRoundBtn = document.getElementById("start-round-btn");
  const startInvestmentBtn = document.getElementById("start-investment-btn");
  const endRoundBtn = document.getElementById("end-round-btn");
  const adminResultsContainer = document.getElementById(
    "admin-results-container"
  );
  const adminResultsYear = document.getElementById("admin-results-year");
  const adminResultsTable = document.getElementById("admin-results-table");
  const adminUserListContainer = document.getElementById(
    "admin-user-list-container"
  );
  const adminUserCount = document.getElementById("admin-user-count");
  const adminUserListTable = document.getElementById("admin-user-list-table");
  const adminRoundInfo = document.getElementById("admin-round-info");
  const adminRoundTimer = document.getElementById("admin-round-timer");
  const adminInvestmentStatus = document.getElementById(
    "admin-investment-status"
  );
  const adminHintRequestsContainer = document.getElementById(
    "admin-hint-requests-container"
  );
  const adminHintRequestsTable = document.getElementById(
    "admin-hint-requests-table"
  );

  const userLogoutBtn = document.getElementById("user-logout-btn");
  const userWelcomeMsg = document.getElementById("user-welcome-msg");
  const userPoints = document.getElementById("user-points");
  const userGameView = document.getElementById("user-game-view");
  const userHistoryBody = document.getElementById("user-history-body");
  const userRoundTimer = document.getElementById("user-round-timer");
  const userHintView = document.getElementById("user-hint-view");
  const userHintsRevealed = document.getElementById("user-hints-revealed");

  let socket = null;
  let roundTimerInterval = null;
  let currentUsername = "";
  let isAdmin = false;

  // 관리자 결과 그래프용 캔버스 참조
  const adminBarChart = document.getElementById("admin-bar-chart");

  // 연도별 유튜브 링크 매핑
  const YOUTUBE_LINKS = {
    2015: "https://www.youtube.com/embed/kIEaqlh5M1w",
    2016: "https://www.youtube.com/embed/NuhXFignj4Y",
    2017: "https://www.youtube.com/embed/8MKqn1YcZzk",
    2018: "https://www.youtube.com/embed/GtHUvD1nysI",
    2019: "https://www.youtube.com/embed/MLlfmd0xzbE",
    2020: "https://www.youtube.com/embed/CLe5zRHJjsk",
    2021: "https://www.youtube.com/embed/PBNYikxZY8o",
    2022: "https://www.youtube.com/embed/egp5-EIeyDQ",
    2023: "https://www.youtube.com/embed/wdeHOENF-tQ",
    2024: "https://www.youtube.com/embed/9rQqoFWUrBo",
  };

  // 종목 코드-이름 매핑
  const STOCK_LABELS = {
    A: "비트코인",
    B: "도지코인",
    C: "이더리움",
    D: "솔라나",
    E: "테슬라",
    F: "엔비디아",
    G: "AMD",
    H: "금",
    I: "Moderna",
    J: "셀트리온",
    K: "삼성전자",
    L: "카카오",
    M: "대한항공",
    N: "팔란티어",
  };

  checkSession();

  async function checkSession() {
    const res = await fetch("/api/check_session");
    const data = await res.json();
    if (data.logged_in) {
      currentUsername = data.is_admin
        ? "root"
        : data.user?.username || "Player";
      isAdmin = data.is_admin;
      loginSection.style.display = "none";
      if (isAdmin) {
        adminDashboard.style.display = "block";
      } else {
        userDashboard.style.display = "block";
      }
      connectSocket();
    } else {
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    loginSection.style.display = "block";
    adminDashboard.style.display = "none";
    userDashboard.style.display = "none";
    usernameInput.value = "";
    passwordInput.value = "";
    passwordInput.style.display = "none";
    loginMessage.textContent = "";
    currentUsername = "";
    isAdmin = false;
    if (roundTimerInterval) clearInterval(roundTimerInterval);
  }

  usernameInput.addEventListener("input", () => {
    passwordInput.style.display =
      usernameInput.value.toLowerCase() === "root" ? "block" : "none";
  });

  loginForm.addEventListener("submit", handleLogin);
  adminLogoutBtn.addEventListener("click", handleLogout);
  userLogoutBtn.addEventListener("click", handleLogout);
  startRoundBtn.addEventListener("click", () =>
    socket.emit("admin_action", { action: "start_round" })
  );
  startInvestmentBtn.addEventListener("click", () =>
    socket.emit("admin_action", { action: "start_investment" })
  );
  endRoundBtn.addEventListener("click", () => {
    socket.emit("admin_action", { action: "end_round" });
    fetchAndShowResults();
  });

  function connectSocket() {
    socket = io();

    socket.on("connect", () => {
      console.log("Connected to server");
      socket.emit("associate_sid");
      socket.emit("register");
    });

    socket.on("state_update", (state) => {
      console.log("State update received:", state);
      if (isAdmin) {
        renderAdminDashboard(state);
      } else {
        renderUserDashboard(state);
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });
  }

  async function handleLogin(e) {
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
      loginMessage.textContent = "";
      currentUsername = username;
      isAdmin = data.is_admin;
      loginSection.style.display = "none";

      if (isAdmin) {
        adminDashboard.style.display = "block";
      } else {
        userDashboard.style.display = "block";
      }
      connectSocket();
    } else {
      loginMessage.textContent = data.message;
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    if (socket) socket.disconnect();

    loginSection.style.display = "block";
    adminDashboard.style.display = "none";
    userDashboard.style.display = "none";
    usernameInput.value = "";
    passwordInput.value = "";
    passwordInput.style.display = "none";
    loginMessage.textContent = "";
    currentUsername = "";
    isAdmin = false;
    if (roundTimerInterval) clearInterval(roundTimerInterval);
  }

  function renderAdminDashboard(state) {
    const {
      game_state,
      current_year,
      users,
      online_user_count,
      game_years_count,
      invested_users,
      round_end_time,
      hint_requests,
    } = state;
    let statusText = "";
    switch (game_state.game_phase) {
      case "not_started":
        statusText =
          "게임 시작 전입니다. '라운드 시작' 버튼을 눌러 게임을 시작하세요.";
        break;
      case "hint":
        statusText = `${current_year}년, 힌트 요청 단계입니다. '투자 시작' 버튼을 눌러 투자를 시작하세요.`;
        break;
      case "investment":
        statusText = `라운드 진행 중 (${current_year}년)`;
        break;
      case "settling":
        statusText = `정산중... (${current_year}년)`;
        break;
      case "round_over":
        if (game_state.current_year_index >= game_years_count - 1) {
          statusText = `모든 라운드가 종료되었습니다.`;
        } else {
          statusText = `라운드 종료 (${current_year}년). '라운드 시작'을 눌러 다음 라운드를 진행하세요.`;
        }
        break;
    }
    adminGameStatus.textContent = statusText;

    startRoundBtn.style.display =
      game_state.game_phase === "not_started" ||
      game_state.game_phase === "round_over"
        ? "inline-block"
        : "none";
    startInvestmentBtn.style.display =
      game_state.game_phase === "hint" ? "inline-block" : "none";
    endRoundBtn.style.display =
      game_state.game_phase === "investment" ? "inline-block" : "none";

    startRoundBtn.disabled =
      game_state.current_year_index >= game_years_count - 1 &&
      game_state.game_phase === "round_over";
    startInvestmentBtn.disabled = false;
    endRoundBtn.disabled = false;

    adminUserListContainer.style.display = "block";
    adminUserCount.textContent = `현재 접속 중인 인원: ${online_user_count}명`;
    let userTableHTML = `<table role="grid"><thead><tr><th>사용자 이름</th><th>보유 포인트</th></tr></thead><tbody>`;
    if (users.length === 0) {
      userTableHTML += `<tr><td colspan="2">아직 접속한 사용자가 없습니다.</td></tr>`;
    } else {
      users.forEach((user) => {
        userTableHTML += `<tr><td>${
          user.username
        }</td><td>${user.points.toLocaleString()}P</td></tr>`;
      });
    }
    userTableHTML += `</tbody></table>`;
    adminUserListTable.innerHTML = userTableHTML;

    adminHintRequestsContainer.style.display =
      game_state.game_phase === "hint" ? "block" : "none";
    if (game_state.game_phase === "hint") {
      let tableHTML = `<table role="grid"><thead><tr><th>사용자</th><th>요청 종목</th><th>상태</th><th>승인</th></tr></thead><tbody>`;
      if (!hint_requests || hint_requests.length === 0) {
        tableHTML += `<tr><td colspan="4">아직 힌트 요청이 없습니다.</td></tr>`;
      } else {
        hint_requests.forEach((req) => {
          const isApproved = req.status === "approved";
          const statusText = isApproved ? "승인됨" : "대기중";
          tableHTML += `
                    <tr>
                        <td>${req.username}</td>
                        <td>${req.stock}</td>
                        <td>${statusText}</td>
                        <td>
                            <button class="secondary approve-hint-btn" 
                                data-username="${req.username}" 
                                data-stock="${req.stock}" 
                                ${isApproved ? "disabled" : ""}>
                                ${isApproved ? "승인됨" : "승인"}
                            </button>
                        </td>
                    </tr>`;
        });
      }
      tableHTML += `</tbody></table>`;
      adminHintRequestsTable.innerHTML = tableHTML;
      document.querySelectorAll(".approve-hint-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const { username, stock } = e.target.dataset;
          socket.emit("approve_hint", { username, stock });
        });
      });
    }

    adminRoundInfo.style.display =
      game_state.game_phase === "investment" ? "block" : "none";
    if (game_state.game_phase === "investment" && round_end_time) {
      updateRoundTimer(round_end_time, [adminRoundTimer, userRoundTimer]);
      const investedCount = invested_users.length;
      const totalPlayers = online_user_count;
      const percentage =
        totalPlayers > 0
          ? ((investedCount / totalPlayers) * 100).toFixed(1)
          : 0;
      let statusHTML = `<p><strong>투자 현황:</strong> ${investedCount} / ${totalPlayers} 명 완료 (${percentage}%)</p><ul>${invested_users
        .map((u) => `<li>${u}</li>`)
        .join("")}</ul>`;
      adminInvestmentStatus.innerHTML = statusHTML;
    } else {
      if (roundTimerInterval) clearInterval(roundTimerInterval);
      roundTimerInterval = null;
      adminRoundTimer.textContent = "";
    }

    // 정산중 단계: 막대그래프 + 정산 완료 버튼
    if (game_state.game_phase === "settling") {
      adminResultsContainer.style.display = "block";
      adminBarChart.style.display = "block";
      // fetch 결과 데이터
      fetch("/api/admin/results")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            renderAdminBarChart(data.bar_chart_stocks);
          }
        });
      // 정산 완료 버튼 추가
      if (!document.getElementById("settle-finish-btn")) {
        const btn = document.createElement("button");
        btn.id = "settle-finish-btn";
        btn.textContent = "정산 완료";
        btn.className = "primary";
        btn.style.marginTop = "1rem";
        btn.onclick = () => {
          socket.emit("admin_action", { action: "settle_result" });
        };
        adminResultsContainer.appendChild(btn);
      }
    } else {
      if (adminBarChart) adminBarChart.style.display = "none";
      const btn = document.getElementById("settle-finish-btn");
      if (btn) btn.remove();
    }

    const currentYear = state.current_year;
    const youtubeContainer = document.getElementById("youtube-video-container");
    const youtubeFrame = document.getElementById("youtube-video-frame");
    if (
      youtubeFrame &&
      game_state.game_phase === "hint" &&
      currentYear &&
      YOUTUBE_LINKS[currentYear]
    ) {
      const newSrc = YOUTUBE_LINKS[currentYear];
      if (youtubeFrame.src !== newSrc && !youtubeFrame.src.endsWith(newSrc)) {
        youtubeFrame.src = newSrc;
      }
      youtubeFrame.style.display = "block";
      youtubeContainer.style.display = "block";
    } else if (youtubeFrame) {
      youtubeFrame.src = "";
      youtubeFrame.style.display = "none";
      if (youtubeContainer) {
        youtubeContainer.style.display = "none";
      }
    }

    const adminRankingContainer = document.getElementById(
      "admin-ranking-container"
    );
    const adminStockLabelsContainer = document.getElementById(
      "admin-stock-labels-container"
    );
    if (game_state.game_phase === "game_over") {
      // 1. 전체 참가자 포인트 순위표
      const sortedUsers = [...users]
        .filter((u) => u.username !== "root")
        .sort((a, b) => b.points - a.points);
      let rankingHTML = `<h4>전체 참가자 순위</h4><table role="grid"><thead><tr><th>순위</th><th>이름</th><th>포인트</th></tr></thead><tbody>`;
      sortedUsers.forEach((u, i) => {
        rankingHTML += `<tr><td>${i + 1}</td><td>${
          u.username
        }</td><td>${u.points.toLocaleString()}P</td></tr>`;
      });
      rankingHTML += `</tbody></table>`;
      adminRankingContainer.innerHTML = rankingHTML;
      adminRankingContainer.style.display = "block";
      // 2. 종목 설명 그리드
      let stockGridHTML = `<h4>종목 코드 안내</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;">`;
      Object.entries(STOCK_LABELS).forEach(([code, name]) => {
        stockGridHTML += `<div style='border:1px solid #ccc;padding:0.5rem;border-radius:6px;text-align:center;'><strong>${code}</strong><br>${name}</div>`;
      });
      stockGridHTML += `</div>`;
      // 종료하기 버튼 추가
      stockGridHTML += `<div style='text-align:center;margin-top:2rem;'><button id='reset-game-btn' class='secondary'>종료하기 (게임 초기화)</button></div>`;
      adminStockLabelsContainer.innerHTML = stockGridHTML;
      adminStockLabelsContainer.style.display = "block";
      // 버튼 이벤트
      setTimeout(() => {
        const resetBtn = document.getElementById("reset-game-btn");
        if (resetBtn) {
          resetBtn.onclick = () => {
            if (
              confirm(
                "정말로 게임을 초기화하시겠습니까? 모든 데이터가 삭제됩니다."
              )
            ) {
              socket.emit("admin_action", { action: "reset_game" });
            }
          };
        }
      }, 0);
    } else {
      adminRankingContainer.style.display = "none";
      adminStockLabelsContainer.style.display = "none";
    }

    // 부활 요청 목록 표시 (힌트 단계에서만)
    const reviveRequests = state.revive_requests || [];
    const adminReviveRequestsContainer = document.getElementById(
      "admin-revive-requests-container"
    );
    if (game_state.game_phase === "hint") {
      if (adminReviveRequestsContainer) {
        let reviveHTML = `<h4>부활 요청 목록</h4><table role="grid"><thead><tr><th>사용자</th><th>상태</th><th>승인</th></tr></thead><tbody>`;
        if (reviveRequests.length === 0) {
          reviveHTML += `<tr><td colspan="3">아직 부활 요청이 없습니다.</td></tr>`;
        } else {
          reviveRequests.forEach((req) => {
            const isApproved = req.status === "approved";
            const statusText = isApproved ? "승인됨" : "대기중";
            reviveHTML += `
              <tr>
                <td>${req.username}</td>
                <td>${statusText}</td>
                <td>
                  <button class="secondary approve-revive-btn" data-username="${
                    req.username
                  }" ${isApproved ? "disabled" : ""}>
                    ${isApproved ? "승인됨" : "승인"}
                  </button>
                </td>
              </tr>`;
          });
        }
        reviveHTML += `</tbody></table>`;
        adminReviveRequestsContainer.innerHTML = reviveHTML;
        document.querySelectorAll(".approve-revive-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const username = e.target.dataset.username;
            socket.emit("admin_action", { action: "approve_revive", username });
          });
        });
        adminReviveRequestsContainer.style.display = "block";
      }
    } else {
      if (adminReviveRequestsContainer)
        adminReviveRequestsContainer.style.display = "none";
    }
  }

  function renderAdminBarChart(barChartStocks) {
    if (!barChartStocks) {
      adminBarChart.style.display = "none";
      return;
    }
    const labels = Object.keys(barChartStocks);
    const data = Object.values(barChartStocks);
    if (labels.length === 0) {
      adminBarChart.style.display = "none";
      return;
    }
    adminBarChart.style.display = "block";
    if (window.adminBarChartInstance) {
      window.adminBarChartInstance.destroy();
    }
    const ctx = adminBarChart.getContext("2d");
    window.adminBarChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "이번 라운드 종목별 수익률(%)",
            data,
            backgroundColor: "rgba(54, 162, 235, 0.5)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  function renderUserDashboard(state) {
    if (!state.user) return;
    updateUserInfo(state.user, state.current_year);
    renderUserGameView(state);
    if (state.game_state.game_phase === "investment" && state.round_end_time) {
      updateRoundTimer(state.round_end_time, [userRoundTimer]);
      userRoundTimer.style.display = "block";
    } else {
      userRoundTimer.style.display = "none";
    }
    if (state.game_state.game_phase === "round_over") {
      updateUserInfo(state.user, state.current_year);
    }
  }

  function renderUserGameView(state) {
    const gamePhase = state.game_state.game_phase;
    const currentYear = state.current_year;

    if (!currentYear) {
      userGameView.innerHTML = `<article><p>게임이 아직 시작되지 않았습니다. 관리자가 라운드를 시작할 때까지 기다려주세요.</p></article>`;
      return;
    }

    let viewHTML = "";
    switch (gamePhase) {
      case "hint":
        const hintUI = document.getElementById("stock-selection-ui");
        if (hintUI) {
          updateHintStatus(state);
          return;
        }

        viewHTML = `
                <article>
                    <h3>${currentYear}년 힌트 요청</h3>
                    <p>힌트를 요청할 종목을 선택해주세요. 각 종목은 한 번만 요청할 수 있습니다.</p>
                    <div id="stock-selection-ui" class="grid">
                    ${state.available_stocks
                      .map((s) => {
                        return `<div class=\"stock-item\">
                          <button class=\"outline stock-hint-btn\" data-stock-name=\"${s}\">${s}</button>
                          <div class=\"stock-request-container\" id=\"request-container-${s}\" style=\"display: none;\">
                            <button class=\"secondary request-hint-btn\" data-stock-name=\"${s}\">요청하기</button>
                          </div>
                        </div>`;
                      })
                      .join("")}
                    </div>
                </article>`;
        userGameView.innerHTML = viewHTML;
        updateHintStatus(state);
        // 부활 요청 버튼 조건: 4,7,10라운드(2018,2021,2024) & 포인트 0 (힌트 페이지에서만)
        const reviveYears = ["2018", "2021", "2024"];
        if (
          reviveYears.includes(String(currentYear)) &&
          Number(state.user?.points) === 0
        ) {
          const reviveBtn = document.createElement("button");
          reviveBtn.textContent = "부활 요청하기 (1000P 지급)";
          reviveBtn.className = "primary";
          reviveBtn.style.marginTop = "1rem";
          reviveBtn.onclick = () => {
            socket.emit("user_action", { action: "revive_request" });
            reviveBtn.disabled = true;
            reviveBtn.textContent = "요청 완료 (관리자 승인 대기)";
          };
          userGameView.appendChild(reviveBtn);
        }
        document.querySelectorAll(".stock-hint-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const stock = e.target.dataset.stockName;
            const requestContainer = document.getElementById(
              `request-container-${stock}`
            );
            document
              .querySelectorAll(".stock-request-container")
              .forEach((c) => {
                if (c !== requestContainer) c.style.display = "none";
              });
            requestContainer.style.display =
              requestContainer.style.display === "none" ? "block" : "none";
          });
        });
        document.querySelectorAll(".request-hint-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const stock = e.target.dataset.stockName;
            socket.emit("user_action", {
              action: "request_hint",
              stock: stock,
            });
          });
        });
        break;
      case "investment":
        if (state.user_has_invested) {
          userGameView.innerHTML = `<article><p><strong>${currentYear}년도 투자 완료.</strong> 라운드가 종료될 때까지 기다려주세요.</p></article>`;
        } else {
          const investmentForm = document.getElementById(
            "user-investment-form"
          );
          if (investmentForm) {
            const pointsDisplay = document.getElementById("investment-points");
            if (pointsDisplay)
              pointsDisplay.textContent = (
                state.user?.points ?? 0
              ).toLocaleString();
            return;
          }

          let investmentHTML = `
                    <article>
                    <h3>${currentYear}년도 투자</h3>
                    <p>
                        투자할 종목(최대 2개)과 금액을 정해주세요. (현재 보유 포인트: <span id="investment-points">${(
                          state.user?.points ?? 0
                        ).toLocaleString()}</span>P)
                    </p>
                    <div id="stock-selection-ui" class="grid">
                        ${state.available_stocks
                          .map(
                            (s) =>
                              `<button class="outline stock-btn" data-stock-name="${s}">${s}</button>`
                          )
                          .join("")}
                    </div>
                    <form id="user-investment-form">
                        <div id="user-investment-inputs"></div>
                        <button type="submit">투자 확정</button>
                    </form>
                    </article>`;
          userGameView.innerHTML = investmentHTML;
          setupInvestmentFormListeners(state);
        }
        break;
      case "settling":
        userGameView.innerHTML = `<article><p style="text-align:center;font-size:1.2rem;">정산중입니다...<br>관리자가 정산을 완료할 때까지 기다려주세요.</p></article>`;
        break;
      case "round_over":
        userGameView.innerHTML = `<article><p><strong>${currentYear}년도 라운드가 종료되었습니다.</strong> 관리자가 다음 라운드를 시작할 때까지 기다려주세요.</p></article>`;
        break;
      default:
        userGameView.innerHTML = `<article><p>게임이 아직 시작되지 않았습니다. 관리자가 라운드를 시작할 때까지 기다려주세요.</p></article>`;
    }
  }

  function setupInvestmentFormListeners(state) {
    const form = document.getElementById("user-investment-form");
    if (!form) return;
    const stockBtns = document.querySelectorAll(".stock-btn");
    const inputsContainer = document.getElementById("user-investment-inputs");
    const submitBtn = form.querySelector("button[type='submit']");
    let selected = [];
    const isFinalRound = state.current_year === "2024";

    const updateSubmitButtonState = () => {
      if (isFinalRound) {
        submitBtn.disabled = selected.length === 0;
      } else {
        submitBtn.disabled = false;
      }
    };

    updateSubmitButtonState();

    stockBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const stockName = btn.dataset.stockName;
        const isSelected = selected.includes(stockName);

        if (isSelected) {
          selected = selected.filter((s) => s !== stockName);
          btn.classList.replace("primary", "outline");
          const inputGroup = document.getElementById(`user-input-${stockName}`);
          if (inputGroup) inputGroup.remove();
        } else if (selected.length < 2) {
          selected.push(stockName);
          btn.classList.replace("outline", "primary");

          const inputGroup = document.createElement("div");
          inputGroup.id = `user-input-${stockName}`;

          const label = document.createElement("label");
          label.textContent = `종목 ${stockName} 투자금액`;

          const grid = document.createElement("div");
          grid.className = "grid";

          const input = document.createElement("input");
          input.type = "number";
          input.inputMode = "numeric";
          input.pattern = "[0-9]*";
          input.required = true;
          input.min = "1";
          input.className = "investment-amount-input";

          const maxButton = document.createElement("button");
          maxButton.type = "button";
          maxButton.textContent = "MAX";
          maxButton.className = "secondary";

          maxButton.addEventListener("click", () => {
            const currentTotalPoints = state.user?.points ?? 0;
            const otherInputs = Array.from(
              document.querySelectorAll(".investment-amount-input")
            ).filter((i) => i !== input);
            const otherInvestmentAmount = otherInputs.reduce(
              (sum, el) => sum + (parseInt(el.value, 10) || 0),
              0
            );
            const maxForThisInput = currentTotalPoints - otherInvestmentAmount;
            input.value = maxForThisInput > 0 ? maxForThisInput : 0;
          });

          // 레버리지 인풋 추가 (2017년 이상부터)
          let leverageInput = null;
          let leverageLabel = null;
          if (parseInt(state.current_year, 10) >= 2017) {
            leverageLabel = document.createElement("label");
            leverageLabel.textContent = "레버리지 (1~100, 기본 1)";
            leverageInput = document.createElement("input");
            leverageInput.type = "number";
            leverageInput.className = "leverage-input";
            leverageInput.min = "1";
            leverageInput.max = "100";
            leverageInput.value = "1";
            leverageInput.inputMode = "numeric";
            leverageInput.style.marginLeft = "0.5rem";
            grid.appendChild(leverageLabel);
            grid.appendChild(leverageInput);
          }

          grid.appendChild(input);
          grid.appendChild(maxButton);

          inputGroup.appendChild(label);
          inputGroup.appendChild(grid);

          inputsContainer.appendChild(inputGroup);
        }

        updateSubmitButtonState();
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const investments = selected.map((stockName) => {
        const inputGroup = document.getElementById(`user-input-${stockName}`);
        const amountInput = inputGroup.querySelector(
          "input.investment-amount-input"
        );
        let leverage = 1;
        const leverageInput = inputGroup.querySelector("input.leverage-input");
        if (leverageInput && leverageInput.value) {
          const val = parseInt(leverageInput.value, 10);
          leverage = isNaN(val) ? 1 : Math.max(1, Math.min(100, val));
        }
        return { stock: stockName, amount: amountInput.value, leverage };
      });

      let confirmationMessage = "";
      if (investments.length > 0) {
        let totalAmount = 0;
        let summary = investments
          .map((inv) => {
            const amount = parseInt(inv.amount, 10) || 0;
            totalAmount += amount;
            return `${inv.stock}: ${amount.toLocaleString()}P (${
              inv.leverage || 1
            }배)`;
          })
          .join("\n");
        confirmationMessage = `다음과 같이 투자하시겠습니까?\n\n${summary}\n\n총 투자금액: ${totalAmount.toLocaleString()}P`;
      } else {
        confirmationMessage =
          "이번 라운드에 투자하지 않고 다음으로 넘어가시겠습니까?";
      }

      const isConfirmed = window.confirm(confirmationMessage);
      if (!isConfirmed) return;

      socket.emit("user_action", {
        action: "invest",
        investments: investments,
      });
    });
  }

  function updateUserInfo(user, currentYear) {
    userWelcomeMsg.textContent = `${currentUsername}님 환영합니다!`;
    userPoints.textContent = (user?.points ?? 0).toLocaleString();

    if (user?.investments) {
      let historyHTML = "";
      const sortedYears = Object.keys(user.investments)
        .filter((year) => user.investments[year].processed)
        .sort();

      sortedYears.forEach((year) => {
        const roundData = user.investments[year];
        const details = (roundData.investments || [])
          .map(
            (inv) =>
              `${inv.chosen_stock}: ${inv.invested_amount.toLocaleString()}P (${
                inv.return_percent || 0
              }%, ${inv.leverage || 1}배)`
          )
          .join(", ");

        historyHTML += `
          <tr>
            <td>${year}</td>
            <td>${details}</td>
            <td>${roundData.total_profit_loss?.toLocaleString() || 0}P</td>
            <td>${roundData.points_after?.toLocaleString() || 0}P</td>
          </tr>`;
      });
      userHistoryBody.innerHTML = historyHTML;
    }
  }

  function updateHintStatus(state) {
    const currentYear = state.current_year;
    const hintRequests = state.hint_requests || [];
    const revealedHints = state.user?.revealed_hints?.[currentYear] || [];
    state.available_stocks.forEach((stock) => {
      const stockBtn = document.querySelector(
        `.stock-hint-btn[data-stock-name="${stock}"]`
      );
      const requestContainer = document.getElementById(
        `request-container-${stock}`
      );
      if (!stockBtn) return;
      const myRequest = hintRequests.find(
        (r) => r.username === currentUsername && r.stock === stock
      );
      const otherRequest = hintRequests.find(
        (r) => r.username !== currentUsername && r.stock === stock
      );
      const hasRevealedHint = revealedHints.find((h) => h.stock === stock);

      if (hasRevealedHint) {
        stockBtn.textContent = `${stock} (✅ 힌트 확인)`;
        stockBtn.disabled = false;
        stockBtn.classList.remove("outline", "secondary");
        stockBtn.classList.add("primary");
        stockBtn.onclick = () => showHintModal(stock, hasRevealedHint.hint);
        if (requestContainer) requestContainer.style.display = "none";
      } else if (myRequest) {
        stockBtn.textContent = `${stock} (요청됨)`;
        stockBtn.disabled = true;
        stockBtn.classList.remove("outline", "primary");
        stockBtn.classList.add("secondary");
        stockBtn.onclick = null;
        if (requestContainer) requestContainer.style.display = "none";
      } else if (otherRequest) {
        stockBtn.textContent = `${stock} (다른 사용자 요청)`;
        stockBtn.disabled = true;
        stockBtn.classList.remove("outline", "primary");
        stockBtn.classList.add("secondary");
        stockBtn.onclick = null;
        if (requestContainer) requestContainer.style.display = "none";
      } else {
        stockBtn.textContent = stock;
        stockBtn.disabled = false;
        stockBtn.classList.remove("secondary", "primary");
        stockBtn.classList.add("outline");
        stockBtn.onclick = null;
      }
    });
  }

  function updateRoundTimer(endTime, elements) {
    if (roundTimerInterval) clearInterval(roundTimerInterval);
    roundTimerInterval = setInterval(() => {
      const now = Date.now() / 1000;
      const timeLeft = Math.max(0, Math.floor(endTime - now));
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      const timerText = `남은 시간: ${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;
      elements.forEach((el) => {
        if (el) el.textContent = timerText;
      });
      if (timeLeft <= 0) {
        clearInterval(roundTimerInterval);
        roundTimerInterval = null;
      }
    }, 1000);
  }

  async function fetchAndShowResults() {
    const response = await fetch("/api/admin/results");
    const data = await response.json();
    if (data.success) {
      adminResultsContainer.style.display = "block";
      adminResultsYear.textContent = `${data.year}년도 결과`;

      // 연도별 결과에서 상단 그리드(테이블) 제거, 그래프만 표시
      adminResultsTable.innerHTML = "";

      // phase와 상관없이 종목별 수익률 그래프도 렌더링
      if (data.bar_chart_stocks) {
        renderAdminBarChart(data.bar_chart_stocks);
      }

      let tableHTML = `<table role="grid"><thead><tr><th>사용자</th><th>상세</th><th>총 손익</th><th>종료 후 포인트</th><th>비고</th></tr></thead><tbody>`;
      if (data.results.length === 0) {
        tableHTML += `<tr><td colspan="5">이번 라운드에 투자한 사용자가 없습니다.</td></tr>`;
      } else {
        data.results.forEach((res) => {
          const details = (res.investments || [])
            .map(
              (inv) =>
                `<div>${
                  inv.chosen_stock
                }: ${inv.invested_amount.toLocaleString()}P (${
                  inv.return_percent || 0
                }%, ${inv.leverage || 1}배)</div>`
            )
            .join("");
          // phase와 무관하게 항상 표시
          let afterPoints =
            res.points_after !== undefined
              ? res.points_after.toLocaleString() + "P"
              : "";
          let totalPointsChange =
            res.total_profit_loss !== undefined
              ? res.total_profit_loss.toLocaleString() + "P"
              : "";
          tableHTML += `<tr><td>${
            res.username
          }</td><td>${details}</td><td>${totalPointsChange}</td><td>${afterPoints}</td><td>${
            res.note || ""
          }</td></tr>`;
        });
      }
      tableHTML += "</tbody></table>";
      adminResultsTable.innerHTML = tableHTML;
      if (data.bar_chart_stocks) {
        renderAdminBarChart(data.bar_chart_stocks);
      }
    } else {
      adminResultsContainer.style.display = "none";
    }
  }

  function showHintModal(stock, hint) {
    const modal = document.getElementById("hint-modal");
    const title = document.getElementById("hint-modal-title");
    const content = document.getElementById("hint-modal-content");

    title.textContent = `${stock} 종목 힌트`;
    content.innerHTML = `
      <div class="hint-content">
        <p><strong>종목:</strong> ${stock}</p>
        <div class="hint-text">
          <strong>힌트:</strong><br>
          ${hint}
        </div>
      </div>
    `;

    modal.showModal();
  }
});
