# TravelGoGo ✈️ - 智能直式旅遊行程規劃神器 (PWA & Web)

專為**手機直式體驗**打造的旅遊行程規劃與記錄工具，可直接部屬在 **GitHub Pages** 免費存取使用，支援像原生 App 一樣安裝到手機主畫面（PWA），離線存取、無須後端伺服器！

---

## ✨ 核心特色功能

1. **📱 專為手機直式設計 (Vertical Mobile First)**
   - 擬真直式時間軸設計，以 **30 分鐘為標準網格** 清楚呈現行程分佈。
   - 支援雙視圖切換：直式時間軸視圖（精準掌握空檔）與卡片摘要視圖。

2. **🗂️ 靈活卡片拖曳與重疊顯示 (Trello 式卡片)**
   - 支援卡片直接按住拖曳調整上下時段（自動對齊 30 分鐘網格）。
   - **時段重疊智慧排版**：當有多個景點在相同時段（例如自由活動分頭逛街或彈性行程）時，自動雙欄並排顯示，不互相遮擋。

3. **🗺️ Google Maps 即時嵌入與外鏈**
   - 填寫地點或 Google Maps 網址後，點開詳細卡片自動**內嵌 Google 地圖預覽**。
   - 支援一鍵直達 Google Maps App 導航。
   - 支援自訂外鏈（Klook/KKday 預約憑證、官方網站、部落格食記）。

4. **🚇 景點間交通方式編輯**
   - 支援設定前一個景點到下一個景點的交通方式（地鐵/火車、步行、公車、計程車、自駕）。
   - 在行程空檔中視覺化呈現交通提示條，路線一目了然。

5. **💾 JSON 本地儲存與一鍵分享**
   - 資料自動即時存放在瀏覽器 `LocalStorage`，重整或斷網不丟失。
   - **匯出 JSON**：隨時備份行程檔案。
   - **匯入 JSON**：載入朋友或旅伴分享的行程。
   - **複製分享代碼**：將行程打包成代碼字串，傳送到 LINE 或通訊軟體。

6. **🎨 質感視覺美學**
   - 內建 8 款顯目主題色票標記（海洋藍、薰衣草紫、薄荷綠、琥珀黃、玫瑰粉等）。
   - 支援深色模式 (Dark Mode) 與淺色模式 (Light Mode) 一鍵切換。

---

## 🚀 如何發布至 GitHub Pages

1. 將本專案的所有檔案推送到您的 GitHub Repository：
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for TravelGoGo"
   git branch -M main
   git remote add origin https://github.com/<您的使用者名稱>/<專案名稱>.git
   git push -u origin main
   ```
2. 進入該 GitHub 儲存庫頁面，點選 **Settings** > **Pages**。
3. 在 **Branch** 選取 `main` 分支並選擇 `/ (root)`，按下 **Save**。
4. 約 1~2 分鐘後即可透過 GitHub 提供的網址（例如 `https://<username>.github.io/<repo>/`）直接在手機或電腦上開啟使用！

## 📲 手機上當成 App 使用 (PWA)
- **iOS (Safari)**：點擊下方「分享按鈕」➔ 選擇「加入主畫面」。
- **Android (Chrome)**：點擊右上角選單 ➔ 選擇「安裝應用程式」或「加到主畫面」。
