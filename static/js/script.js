// 스크립트는 여기에 작성합니다.

document.addEventListener("DOMContentLoaded", () => {
  const stockTableBody = document.getElementById("stock-table-body");

  const loginSection = document.getElementById("login-section");
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const userSection = document.getElementById("user-section");
  const userNameSpan = document.getElementById("user-name");
  const userCashSpan = document.getElementById("user-cash");
  const userPortfolioDiv = document.getElementById("user-portfolio");

  let isLoggedIn = false;

  // 1. 로그인 처리
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = usernameInput.value;

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username }),
    });
    const data = await response.json();

    if (data.success) {
      isLoggedIn = true;
      loginSection.style.display = "none";
      userSection.style.display = "block";
      updateUI(); // 로그인 성공 시 즉시 UI 업데이트
    } else {
      alert(data.message);
    }
  });

  // 2. UI 업데이트 함수
  async function updateUI() {
    if (!isLoggedIn) return;

    try {
      const response = await fetch("/api/data");
      const data = await response.json();

      // 2.1 사용자 정보 업데이트
      if (data.user) {
        userNameSpan.textContent = data.user.username;
        userCashSpan.textContent = data.user.cash.toLocaleString();

        userPortfolioDiv.innerHTML = ""; // 포트폴리오 초기화
        const portfolio = data.user.stocks;
        if (Object.keys(portfolio).length > 0) {
          const ul = document.createElement("ul");
          for (const stockName in portfolio) {
            const li = document.createElement("li");
            li.textContent = `${stockName}: ${portfolio[stockName]}주`;
            ul.appendChild(li);
          }
          userPortfolioDiv.appendChild(ul);
        } else {
          userPortfolioDiv.textContent = "보유 주식이 없습니다.";
        }
      }

      // 2.2 주식 테이블 업데이트
      stockTableBody.innerHTML = "";
      data.stocks.forEach((stock) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${stock.name}</td>
          <td>${stock.price.toLocaleString()} 원</td>
          <td><input type="number" min="1" value="1" id="amount-${
            stock.name
          }"></td>
          <td>
            <button class="buy-btn" data-stock-name="${
              stock.name
            }">매수</button>
            <button class="sell-btn" data-stock-name="${
              stock.name
            }">매도</button>
          </td>
        `;
        stockTableBody.appendChild(row);
      });
    } catch (error) {
      console.error("데이터를 가져오는 중 오류 발생:", error);
    }
  }

  // 3. 거래 처리
  stockTableBody.addEventListener("click", async (e) => {
    if (!e.target.matches(".buy-btn, .sell-btn")) return;

    const button = e.target;
    const stockName = button.dataset.stockName;
    const amountInput = document.getElementById(`amount-${stockName}`);
    const amount = parseInt(amountInput.value, 10);

    if (isNaN(amount) || amount <= 0) {
      alert("유효한 수량을 입력하세요.");
      return;
    }

    const action = button.classList.contains("buy-btn") ? "buy" : "sell";
    const endpoint = `/api/${action}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_name: stockName, amount: amount }),
      });
      const result = await response.json();
      alert(result.message);

      if (result.success) {
        updateUI(); // 거래 성공 시 UI 즉시 업데이트
      }
    } catch (error) {
      console.error("거래 처리 중 오류 발생:", error);
      alert("거래를 처리하는 동안 오류가 발생했습니다.");
    }
  });

  // 4. 주기적 업데이트
  setInterval(updateUI, 3000);
});
