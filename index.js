// 1. 定義兩個分頁的點檢內容數據 (Data)
const dataData = {
  prePrint: [
    { id: "p1", text: "檢查白墨是否有沉澱並均勻搖晃" },
    { id: "p2", text: "確認噴頭導軌表面無異物且潤滑正常" },
    { id: "p3", text: "執行噴頭基本清潔與導墨測試" },
    { id: "p4", text: "確認廢墨桶容量未滿 80%" },
  ],
  raiseHead: [
    { id: "r1", text: "確認閃噴托盤與保濕單元已確實降下" },
    { id: "r2", text: "清除車頭噴頭周圍殘留紙屑與墨汙" },
    { id: "r3", text: "使用量規確認材料厚度並輸入參數" },
    { id: "r4", text: "手動測試測高感應器反彈是否正常" },
  ],
};

// 紀錄目前所在的頁籤，預設是印前點檢
let currentTab = "prePrint";

// 紀錄每個項目的勾選狀態 (State)
let checkedState = {
  p1: false,
  p2: false,
  p3: false,
  p4: false,
  r1: false,
  r2: false,
  r3: false,
  r4: false,
};

// 2. 渲染清單的函式 (Render)
function renderList() {
  const container = document.getElementById("checklistContainer");
  if (!container) return; // 安全檢查

  container.innerHTML = ""; // 清空舊畫面

  const currentItems = dataData[currentTab];

  currentItems.forEach((item) => {
    const isChecked = checkedState[item.id];

    // 建立點檢項目的 DOM
    const itemDiv = document.createElement("div");
    itemDiv.className = `check-item ${isChecked ? "checked" : ""}`;

    // 點擊整個區塊就會切換狀態
    itemDiv.onclick = () => toggleCheck(item.id);

    // 注意：把 checkbox 加上 pointer-events: none (由 CSS 控制) 或單純作為視覺呈現，避免重複觸發
    itemDiv.innerHTML = `
            <input type="checkbox" ${isChecked ? "checked" : ""} id="cb-${item.id}" style="pointer-events: none;">
            <span>${item.text}</span>
        `;

    container.appendChild(itemDiv);
  });

  // 渲染完清單後，緊接著檢查底部狀態列
  checkLockStatus();
}

// 3. 切換項目勾選狀態 (Toggle)
function toggleCheck(id) {
  checkedState[id] = !checkedState[id];
  renderList();
}

// 4. 切換頁籤 (Switch Tab)
function switchTab(tabName) {
  currentTab = tabName;

  // 更新按鈕樣式
  const buttons = document.querySelectorAll(".tab-btn");
  if (buttons.length >= 2) {
    buttons[0].classList.toggle("active", tabName === "prePrint");
    buttons[1].classList.toggle("active", tabName === "raiseHead");
  }

  renderList();
}

// 5. 一鍵重置功能 (Reset)
function resetChecklist() {
  // 將目前頁籤的所有項目重置為 false
  dataData[currentTab].forEach((item) => {
    checkedState[item.id] = false;
  });
  renderList();
}

// 6. 檢查是否全部勾選以解鎖下一步 (Lock Logic)
function checkLockStatus() {
  const currentItems = dataData[currentTab];
  // 檢查目前頁籤是否「每一個」項目都為 true
  const isAllChecked = currentItems.every(
    (item) => checkedState[item.id] === true,
  );

  const statusBar = document.getElementById("statusBar");
  const nextBtn = document.getElementById("nextActionBtn"); // ⚠️ HTML 目前沒有這個元素

  if (statusBar) {
    if (isAllChecked) {
      statusBar.textContent = "✅ 點檢完成！";
      statusBar.className = "status-bar complete";
    } else {
      statusBar.textContent = "⚠️ 請確認上方所有項目皆已點檢";
      statusBar.className = "status-bar";
    }
  }

  // 🛠️ 加上防呆安全檢查：只有當 HTML 裡有 nextActionBtn 時才去改它的 className
  if (nextBtn) {
    if (isAllChecked) {
      nextBtn.className = "action-btn active";
    } else {
      nextBtn.className = "action-btn";
    }
  }
}

// 初始化第一次渲染
renderList();
