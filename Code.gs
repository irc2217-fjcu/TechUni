/**
 * 科技大學-原住民族跨領域課程資源地圖 V6.0 GAS 後端腳本
 * * 部署說明：
 * 1. 請確認 ssId 對接您最新的試算表 ID（目前已設定為您的 17xgU7D08XMKytbgzDQx9-kxOC7eM59QqGklAGN4FTVM）。
 * 2. 第一次使用時，請在上方選單選擇 "authTrigger" 並點擊「執行」以進行安全授權。
 * 3. 部署為「新版本」網頁應用程式。
 */

function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('科技大學-原住民族跨領域課程資源地圖')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function authTrigger() {
  const ssId = '17xgU7D08XMKytbgzDQx9-kxOC7eM59QqGklAGN4FTVM';
  const ss = SpreadsheetApp.openById(ssId);
  console.log("授權成功！已成功開啟試算表：" + ss.getName());
}

function getSpreadsheetData() {
  try {
    const ssId = '17xgU7D08XMKytbgzDQx9-kxOC7eM59QqGklAGN4FTVM';
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheets()[0]; 
    const rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) return JSON.stringify({ nodes: [], links: [] });
    rows.shift(); // 移除標題列

    // 嚴格落實一對一去識別化函數
    const deIdentify = (text) => {
      if (!text) return "";
      return text.toString().trim()
        .replace(/\d{3}年度/g, "年度")
        .replace(/\d{3}年/g, "年度")
        .replace(/輔仁大學/g, "核心示範大學")
        .replace(/輔大/g, "示範大學")
        .replace(/原資中心/g, "中心樞紐")
        .replace(/"/g, ""); // 移除多餘引號
    };

    const nodes = [];
    const links = [];
    const nodeIds = new Set();
    
    // Group 標籤與 Phase 雙向對齊 (樹德科大模組與標準規格)
    const groupToPhase = {
      '行政授權': 'PHASE 01: 建立學程架構', '核心主軸': 'PHASE 01: 建立學程架構',
      '證照導向': 'PHASE 02: 產學技術對接', '自媒體實戰': 'PHASE 02: 產學技術對接',
      '專業技藝': 'PHASE 02: 產學技術對接', '產學資源': 'PHASE 02: 產學技術對接',
      '實習經營': 'PHASE 03: 文化內涵深耕', '跨域展演': 'PHASE 03: 文化內涵深耕',
      '行政瑣務': 'PHASE 04: 培育成果驗收',

      '[行政授權]': 'PHASE 01: 建立學程架構', '[核心主軸]': 'PHASE 01: 建立學程架構',
      '[證照導向]': 'PHASE 02: 產學技術對接', '[自媒體實戰]': 'PHASE 02: 產學技術對接',
      '[專業技藝]': 'PHASE 02: 產學技術對接', '[產學資源]': 'PHASE 02: 產學技術對接',
      '[實習經營]': 'PHASE 03: 文化內涵深耕', '[跨域展演]': 'PHASE 03: 文化內涵深耕',
      '[行政瑣務]': 'PHASE 04: 培育成果驗收',
      '[技術指標]': 'PHASE 02: 產學技術對接', '[產學對接]': 'PHASE 02: 產學技術對接',
      '[文化深耕]': 'PHASE 03: 文化內涵深耕', '[部落連結]': 'PHASE 03: 文化內涵深耕',
      '[成果驗收]': 'PHASE 04: 培育成果驗收', '[績效指標]': 'PHASE 04: 培育成果驗收'
    };

    // 建立 4 個主要階段的中樞節點
    const phases = ['PHASE 01: 建立學程架構', 'PHASE 02: 產學技術對接', 'PHASE 03: 文化內涵深耕', 'PHASE 04: 培育成果驗收'];
    phases.forEach(p => {
      nodes.push({ id: p, group: p, importance: 5, desc: p + " 戰略核心", source: "系統定義" });
      nodeIds.add(p);
    });

    // 階段一：掃描並提取 Nodes
    const rawData = rows.map(row => {
      const cleanId = deIdentify(row[0]);
      if (!cleanId || nodeIds.has(cleanId)) return null;
      
      const groupLabel = row[1] ? row[1].toString().trim() : "";
      const phase = groupToPhase[groupLabel] || 'PHASE 01: 建立學程架構';
      
      nodeIds.add(cleanId);
      nodes.push({
        id: cleanId,
        group: phase,
        importance: parseInt(row[2]) || 1,
        desc: deIdentify(row[3]),
        source: groupLabel
      });
      
      return { id: cleanId, phase: phase, rawLinks: row[4] };
    }).filter(d => d !== null);

    // 階段二：建立自適應 Links（防止 node not found 崩潰）
    rawData.forEach(item => {
      // 歸屬連線
      links.push({ source: item.phase, target: item.id, label: "歸屬" });

      // 跨單位橫向關聯連線
      if (item.rawLinks) {
        const targets = item.rawLinks.toString().split(',');
        targets.forEach(t => {
          const targetId = deIdentify(t.trim());
          // 只有當目標 ID 確實存在於節點清單中，才建立連線，防止 D3 繪圖引擎中斷
          if (targetId && nodeIds.has(targetId) && targetId !== item.id) {
            links.push({ source: item.id, target: targetId, label: "關聯" });
          }
        });
      }
    });

    return JSON.stringify({ nodes, links });
  } catch (e) {
    return JSON.stringify({ error: "GAS讀取錯誤: " + e.toString() });
  }
}
