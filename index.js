// ⚠️ 記得把下面的網址換成你在 GAS「重新部署」後產生的最新網址（/exec 結尾）
const GAS_WEB_API_URL =
  "https://script.google.com/macros/s/AKfycbySkBTGmLarfzucKgK3rqUfP6a4kU60PG2B4CXMdgGfJBDotAbuTCpaqdnXO3wr421k/exec";

// 🔒 安全驗證金鑰：必須與 Google Apps Script 裡設定的完全一致
const MY_SECRET_KEY = "SungHeMu_Secret_2026_Secure";

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

let currentTab = "prePrint";
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

function renderList() {
  const container = document.getElementById("checklistContainer");
  if (!container) return;
  container.innerHTML = "";

  const currentItems = dataData[currentTab];
  currentItems.forEach((item) => {
    const isChecked = checkedState[item.id];
    const itemDiv = document.createElement("div");
    itemDiv.className = `check-item ${isChecked ? "checked" : ""}`;
    itemDiv.onclick = () => toggleCheck(item.id);

    itemDiv.innerHTML = `
            <input type="checkbox" ${isChecked ? "checked" : ""} id="cb-${item.id}" style="pointer-events: none;">
            <span>${item.text}</span>
        `;
    container.appendChild(itemDiv);
  });

  checkLockStatus();
}

// 👤 動態取得畫面上選擇的操作員姓名
function getSelectedOperator() {
  const selectEl = document.getElementById("operatorSelect");
  return selectEl ? selectEl.value : "未知操作員";
}

// 🛠️ 2. 修改此處：切換項目勾選狀態並同步到雲端 Excel
function toggleCheck(id) {
  // 先切換本地端狀態，讓操作者網頁畫面立刻勾選（不卡頓）
  checkedState[id] = !checkedState[id];
  renderList();

  // 找出剛剛點擊的那個項目的詳細文字
  const currentItems = dataData[currentTab];
  const clickedItem = currentItems.find((item) => item.id === id);

  // 計算當前分頁是否已經全部勾選完成
  const isAllChecked = currentItems.every(
    (item) => checkedState[item.id] === true,
  );

  // 📦 打包準備送去雲端的資料（完全對應新版 GAS 的欄位名稱）
  const logData = {
    apiKey: MY_SECRET_KEY,           // 👈 🔑 注入安全驗證暗號
    operator: getSelectedOperator(), // 👈 補上操作員
    tab: currentTab,
    id: id,
    text: clickedItem ? clickedItem.text : "",
    status: checkedState[id] ? "✅ 已勾選" : "❌ 取消勾選", // 👈 改成文字，直接呈現給 Excel
    isAllChecked: isAllChecked,
  };

  // 發送給雲端
  sendToCloud(logData);
}

// 🛠️ 3. 點擊重置時，也同步發送一筆「重置紀錄」到雲端 Excel
function resetChecklist() {
  // 將目前頁籤的所有項目重置為 false
  dataData[currentTab].forEach((item) => {
    checkedState[item.id] = false;
  });
  renderList();

  // 📦 打包重置的事件資料
  const logData = {
    apiKey: MY_SECRET_KEY,           // 👈 🔑 注入安全驗證暗號
    operator: getSelectedOperator(), // 👈 補上操作員
    tab: currentTab,
    id: "RESET",                     // 👈 明確定義 ID 為重置
    text: "使用者點擊了一鍵重置按鈕",
    status: "🔄 一鍵重置",            // 👈 變更狀態寫明重置
    isAllChecked: false,
  };

  // 發送給雲端
  sendToCloud(logData);
}

// 🌐 統一呼叫 Fetch 發送資料的函式（直通免預檢優化版）
function sendToCloud(data) {
  fetch(GAS_WEB_API_URL, {
    method: "POST",
    mode: "cors", // 保持跨域模式
    headers: {
      // 💡 核心優化：改為純文字通訊，強迫瀏覽器判定為簡單請求，跳過討人厭的 OPTIONS 預檢
      "Content-Type": "text/plain;charset=utf-8", 
    },
    body: JSON.stringify(data), // 資料依然打包成乾淨的 JSON 字串
  })
    .then((res) => {
      // 如果順利拿到正常的 JSON 回應就直接解析
      return res.json();
    })
    .then((resData) => {
      if (resData.result === "success") {
        console.log("☁️ 雲端同步成功！資料已平安寫入 Excel。");
      } else {
        console.error("❌ 雲端同步被後台拒絕：", resData.message);
      }
    })
    .catch((err) => {
      /* 💡 寬容處理機制：
         因為 Google Apps Script 執行完後會有一個底層重新導向（302 Redirect）的動作，
         某些瀏覽器追蹤轉址時可能會因為沒抓到 CORS 標頭而誤跳進 catch 區塊（並顯示 Failed to fetch）。
         此處做防呆提示，基本上只要你前、後端代碼對齊、金鑰正確，看到這行時去重新整理 Google Sheet，資料就已經進去了！
      */
      console.log("⏳ 點檢同步請求已送出，請刷新 Google 試算表確認資料是否已成功寫入！");
    });
}

function switchTab(tabName) {
  currentTab = tabName;
  const buttons = document.querySelectorAll(".tab-btn");
  if (buttons.length >= 2) {
    buttons[0].classList.toggle("active", tabName === "prePrint");
    buttons[1].classList.toggle("active", tabName === "raiseHead");
  }
  renderList();
}

function checkLockStatus() {
  const currentItems = dataData[currentTab];
  const isAllChecked = currentItems.every(
    (item) => checkedState[item.id] === true,
  );
  const statusBar = document.getElementById("statusBar");

  if (statusBar) {
    if (isAllChecked) {
      statusBar.textContent = "✅ 點檢完成！流程解鎖";
      statusBar.className = "status-bar complete";
    } else {
      statusBar.textContent = "⚠️ 請確認上方所有項目皆已點檢";
      statusBar.className = "status-bar";
    }
  }
}

// 初始化第一次渲染
renderList();