/* ==========================================
   NOTED · PDF.JS
   Beautiful viewer — glass dark UI
========================================== */

"use strict";

pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ==========================================
//  STATE
// ==========================================

let pdfDoc        = null;
let totalPages    = 0;
let currentPage   = 1;
let zoomLevel     = 1.0;
let sidebarOpen   = true;
let activeTool    = null;

const pageCanvases    = {};
const overlayCanvases = {};
const overlayCtxs     = {};
const undoStack       = [];
const redoStack       = [];

let isDrawing      = false;
let isHighlighting = false;
let hlStartX = 0, hlStartY = 0;

// ==========================================
//  DOM
// ==========================================

const $ = id => document.getElementById(id);

const pdfViewer          = $("pdfViewer");
const thumbnailContainer = $("thumbnailContainer");
const sidebar            = $("sidebar");
const loadingScreen      = $("loadingScreen");
const overlayBg          = $("overlay");
const viewerContainer    = $("viewerContainer");

const currentPageInput   = $("currentPage");
const totalPagesSpan     = $("totalPages");
const zoomPercentSpan    = $("zoomPercent");

const toggleSidebarBtn   = $("toggleSidebar");
const zoomInBtn          = $("zoomIn");
const zoomOutBtn         = $("zoomOut");
const editBtn            = $("editBtn");
const undoBtn            = $("undoBtn");
const redoBtn            = $("redoBtn");
const eraserBtn          = $("eraserBtn");
const saveBtn            = $("saveBtn");
const shaBtn             = $("shaBtn");

const editPopup          = $("editPopup");
const closeEditBtn       = $("closeEdit");
const highlightYellowBtn = $("highlightYellow");
const highlightGreenBtn  = $("highlightGreen");
const highlightBlueBtn   = $("highlightBlue");
const highlightPinkBtn   = $("highlightPink");
const drawToolBtn        = $("drawTool");
const textToolBtn        = $("textTool");

const shaPopup           = $("shaPopup");
const closeShaBtn        = $("closeSha");
const shaInput           = $("shaInput");
const generateHashBtn    = $("generateHash");
const hashResult         = $("hashResult");
const saveStatus         = $("saveStatus");

// ==========================================
//  INIT
// ==========================================

async function init() {

  loadingScreen.style.display = "flex";

  const response = await fetch("The_physchology_of_money.pdf");

  if (!response.ok) {
    throw new Error("PDF not found");
  }

  const buffer = await response.arrayBuffer();

  await loadPDF(buffer);
}

function showPickerScreen() {
  loadingScreen.style.display = "flex";
  loadingScreen.innerHTML = `
    <div class="file-pick-zone">
      <p>Open a PDF</p>
      <small>Your file stays in your browser — nothing is uploaded</small>
      <label class="pick-btn">
        📂 &nbsp;Choose File
        <input type="file" accept=".pdf" id="fileInput" style="display:none">
      </label>
    </div>
  `;
  $("fileInput").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    cacheToSession(buf);
    await loadPDF(buf);
  });
}

function cacheToSession(buf) {
  if (buf.byteLength > 50 * 1024 * 1024) return;
  try {
    const bytes = new Uint8Array(buf);
    let b = "";
    bytes.forEach(x => b += String.fromCharCode(x));
    sessionStorage.setItem("notedPDF", btoa(b));
  } catch (_) {}
}

async function loadPDF(buffer) {
  loadingScreen.style.display = "flex";
  loadingScreen.innerHTML = `
    <div class="loader">
      <div class="loader-ring"></div>
      <span class="loader-text">Rendering PDF…</span>
    </div>
  `;

  try {
    pdfDoc     = await pdfjsLib.getDocument({ data: buffer }).promise;
    totalPages = pdfDoc.numPages;

    totalPagesSpan.textContent = totalPages;
    currentPageInput.max       = totalPages;
    currentPageInput.value     = 1;

    pdfViewer.innerHTML          = "";
    thumbnailContainer.innerHTML = "";

    for (let p = 1; p <= totalPages; p++) {
      await renderPage(p);
      await renderThumbnail(p);
    }

    editBtn.disabled   = false;
    eraserBtn.disabled = false;
    saveBtn.disabled   = false;
    undoBtn.disabled   = true;
    redoBtn.disabled   = true;

    loadingScreen.style.display = "none";
    scrollToPage(1);

  } catch (err) {
    loadingScreen.innerHTML = `
      <div class="file-pick-zone">
        <p style="color:#f87171">❌ Couldn't load PDF</p>
        <small>${err.message}</small>
        <label class="pick-btn" style="background:linear-gradient(135deg,#ef4444,#f87171)">
          Try Another File
          <input type="file" accept=".pdf" id="fileInputRetry" style="display:none">
        </label>
      </div>
    `;
    $("fileInputRetry")?.addEventListener("change", async e => {
      const f = e.target.files[0];
      if (f) await loadPDF(await f.arrayBuffer());
    });
  }
}

// ==========================================
//  RENDER PAGE
// ==========================================

async function renderPage(pageNum) {
  const page     = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: zoomLevel });

  const wrapper = document.createElement("div");
  wrapper.className = "pageWrapper";
  wrapper.id        = `page-${pageNum}`;
  wrapper.style.cssText = `
    position:relative;
    width:${viewport.width}px;
    height:${viewport.height}px;
    flex-shrink:0;
  `;

  const canvas  = document.createElement("canvas");
  canvas.width  = viewport.width;
  canvas.height = viewport.height;
  canvas.style.cssText = "position:absolute;top:0;left:0;display:block;";

  const ov = document.createElement("canvas");
  ov.width  = viewport.width;
  ov.height = viewport.height;
  ov.style.cssText = "position:absolute;top:0;left:0;cursor:default;";
  ov.dataset.page  = pageNum;

  wrapper.appendChild(canvas);
  wrapper.appendChild(ov);
  pdfViewer.appendChild(wrapper);

  pageCanvases[pageNum]    = canvas;
  overlayCanvases[pageNum] = ov;
  overlayCtxs[pageNum]     = ov.getContext("2d");

  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

  const saved = sessionStorage.getItem(`ann-${pageNum}`);
  if (saved) {
    const img = new Image();
    img.onload = () => overlayCtxs[pageNum].drawImage(img, 0, 0);
    img.src = saved;
  }

  attachEvents(ov, pageNum);
}

// ==========================================
//  RE-RENDER (zoom)
// ==========================================

async function reRenderAll() {
  if (!pdfDoc) return;
  for (let p = 1; p <= totalPages; p++) {
    const wrapper = $(`page-${p}`);
    if (!wrapper) continue;

    const page      = await pdfDoc.getPage(p);
    const viewport  = page.getViewport({ scale: zoomLevel });
    const annData   = overlayCanvases[p]?.toDataURL();

    wrapper.style.width  = `${viewport.width}px`;
    wrapper.style.height = `${viewport.height}px`;

    const c  = pageCanvases[p];
    const ov = overlayCanvases[p];
    c.width  = ov.width  = viewport.width;
    c.height = ov.height = viewport.height;

    await page.render({ canvasContext: c.getContext("2d"), viewport }).promise;

    if (annData) {
      const img = new Image();
      img.onload = () => overlayCtxs[p].drawImage(img, 0, 0, viewport.width, viewport.height);
      img.src = annData;
    }
  }
}

// ==========================================
//  THUMBNAILS
// ==========================================

async function renderThumbnail(pageNum) {
  const page     = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 0.22 });

  const thumb = document.createElement("div");
  thumb.className = "thumbnail";
  thumb.id        = `thumb-${pageNum}`;

  const canvas  = document.createElement("canvas");
  canvas.width  = viewport.width;
  canvas.height = viewport.height;

  const label = document.createElement("div");
  label.className   = "thumb-label";
  label.textContent = pageNum;

  thumb.appendChild(canvas);
  thumb.appendChild(label);
  thumbnailContainer.appendChild(thumb);

  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

  thumb.addEventListener("click", () => scrollToPage(pageNum));
}

function setActiveThumbnail(p) {
  document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"));
  $(`thumb-${p}`)?.classList.add("active");
}

function scrollToPage(p) {
  $(`page-${p}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  currentPage = p;
  currentPageInput.value = p;
  setActiveThumbnail(p);
}

// ==========================================
//  SCROLL TRACKER
// ==========================================

viewerContainer.addEventListener("scroll", () => {
  if (!pdfDoc) return;
  for (let p = 1; p <= totalPages; p++) {
    const r = $(`page-${p}`)?.getBoundingClientRect();
    if (r && r.top >= 50 && r.top < window.innerHeight * 0.55) {
      if (currentPage !== p) {
        currentPage = p;
        currentPageInput.value = p;
        setActiveThumbnail(p);
      }
      break;
    }
  }
});

// ==========================================
//  POINTER EVENTS
// ==========================================

function attachEvents(canvas, pn) {
  canvas.addEventListener("mousedown",  e => down(e, pn));
  canvas.addEventListener("mousemove",  e => move(e, pn));
  canvas.addEventListener("mouseup",    e => up(e, pn));
  canvas.addEventListener("mouseleave", e => up(e, pn));

  canvas.addEventListener("touchstart", e => { e.preventDefault(); down(t2m(e), pn); }, { passive: false });
  canvas.addEventListener("touchmove",  e => { e.preventDefault(); move(t2m(e), pn); }, { passive: false });
  canvas.addEventListener("touchend",   e => up(t2m(e), pn));
}

const t2m = e => ({
  clientX: (e.touches[0] || e.changedTouches[0]).clientX,
  clientY: (e.touches[0] || e.changedTouches[0]).clientY
});

function xy(e, cv) {
  const r  = cv.getBoundingClientRect();
  const sx = cv.width  / r.width;
  const sy = cv.height / r.height;
  return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy];
}

function down(e, pn) {
  if (!activeTool) return;
  const cv  = overlayCanvases[pn];
  const ctx = overlayCtxs[pn];
  const [x, y] = xy(e, cv);

  saveUndo(pn);

  if (activeTool === "draw") {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  if (activeTool.startsWith("hl-")) {
    isHighlighting = true;
    hlStartX = x; hlStartY = y;
  }
  if (activeTool === "eraser") {
    isDrawing = true;
    ctx.clearRect(x - 18, y - 18, 36, 36);
  }
  if (activeTool === "text") {
    placeText(pn, x, y);
  }
}

function move(e, pn) {
  if (!activeTool) return;
  const cv  = overlayCanvases[pn];
  const ctx = overlayCtxs[pn];
  const [x, y] = xy(e, cv);

  if (activeTool === "draw" && isDrawing) {
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
  }
  if (activeTool === "eraser" && isDrawing) {
    ctx.clearRect(x - 18, y - 18, 36, 36);
  }
}

function up(e, pn) {
  const cv  = overlayCanvases[pn];
  const ctx = overlayCtxs[pn];

  if (activeTool?.startsWith("hl-") && isHighlighting) {
    const [x, y] = xy(e, cv);
    const rx = Math.min(hlStartX, x), ry = Math.min(hlStartY, y);
    const rw = Math.abs(x - hlStartX), rh = Math.abs(y - hlStartY);
    const colors = {
      "hl-yellow": "rgba(253,224,71,0.38)",
      "hl-green":  "rgba(74,222,128,0.38)",
      "hl-blue":   "rgba(96,165,250,0.38)",
      "hl-pink":   "rgba(244,114,182,0.38)"
    };
    ctx.fillStyle = colors[activeTool] || "rgba(253,224,71,0.38)";
    ctx.fillRect(rx, ry, rw, rh);
    isHighlighting = false;
  }

  isDrawing = false;
  saveAnn(pn);
  syncUndoRedo();
}

// ==========================================
//  TEXT TOOL
// ==========================================

function placeText(pn, cx, cy) {
  const cv      = overlayCanvases[pn];
  const wrapper = cv.parentElement;
  const rect    = cv.getBoundingClientRect();
  const cssX    = (cx / cv.width)  * rect.width;
  const cssY    = (cy / cv.height) * rect.height;

  const inp = document.createElement("input");
  inp.type  = "text";
  inp.placeholder = "Type here…";
  inp.style.cssText = `
    position:absolute;left:${cssX}px;top:${cssY - 16}px;
    background:rgba(255,255,255,0.9);border:none;
    border-bottom:2px solid #6366f1;color:#111;
    font-size:15px;outline:none;min-width:90px;
    z-index:50;padding:2px 6px;border-radius:4px;
    font-family:Inter,sans-serif;
  `;
  wrapper.appendChild(inp);
  inp.focus();

  const commit = () => {
    const text = inp.value.trim();
    if (text) {
      const ctx = overlayCtxs[pn];
      ctx.font      = "bold 15px Inter, Arial, sans-serif";
      ctx.fillStyle = "#1e40af";
      ctx.fillText(text, cx, cy);
      saveAnn(pn);
    }
    inp.remove();
  };
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter")  commit();
    if (e.key === "Escape") inp.remove();
  });
  inp.addEventListener("blur", commit);
}

// ==========================================
//  UNDO / REDO
// ==========================================

function saveUndo(pn) {
  const cv = overlayCanvases[pn];
  if (!cv) return;
  undoStack.push({ pn, d: overlayCtxs[pn].getImageData(0, 0, cv.width, cv.height) });
  redoStack.length = 0;
  syncUndoRedo();
}

function undo() {
  if (!undoStack.length) return;
  const e  = undoStack.pop();
  const cv = overlayCanvases[e.pn];
  redoStack.push({ pn: e.pn, d: overlayCtxs[e.pn].getImageData(0, 0, cv.width, cv.height) });
  overlayCtxs[e.pn].putImageData(e.d, 0, 0);
  saveAnn(e.pn);
  syncUndoRedo();
}

function redo() {
  if (!redoStack.length) return;
  const e  = redoStack.pop();
  const cv = overlayCanvases[e.pn];
  undoStack.push({ pn: e.pn, d: overlayCtxs[e.pn].getImageData(0, 0, cv.width, cv.height) });
  overlayCtxs[e.pn].putImageData(e.d, 0, 0);
  saveAnn(e.pn);
  syncUndoRedo();
}

function syncUndoRedo() {
  undoBtn.disabled = !undoStack.length;
  redoBtn.disabled = !redoStack.length;
}

// ==========================================
//  ANNOTATION PERSISTENCE
// ==========================================

function saveAnn(pn) {
  const cv = overlayCanvases[pn];
  if (!cv) return;
  try { sessionStorage.setItem(`ann-${pn}`, cv.toDataURL()); } catch (_) {}
}

// ==========================================
//  SAVE PAGE AS PNG
// ==========================================

async function savePage() {
  if (!pdfDoc) return;
  saveBtn.disabled = true;
  toast("Saving…");

  const pdfCv = pageCanvases[currentPage];
  const ovCv  = overlayCanvases[currentPage];
  if (!pdfCv) return;

  const merged = document.createElement("canvas");
  merged.width  = pdfCv.width;
  merged.height = pdfCv.height;
  const ctx    = merged.getContext("2d");
  ctx.drawImage(pdfCv, 0, 0);
  if (ovCv) ctx.drawImage(ovCv, 0, 0);

  const a   = document.createElement("a");
  a.href    = merged.toDataURL("image/png");
  a.download= `noted-page-${currentPage}.png`;
  a.click();

  toast("✅ Page saved");
  saveBtn.disabled = false;
}

function toast(msg) {
  saveStatus.textContent = msg;
  saveStatus.classList.remove("hidden");
  clearTimeout(saveStatus._t);
  saveStatus._t = setTimeout(() => saveStatus.classList.add("hidden"), 2400);
}

// ==========================================
//  SHA-256
// ==========================================

async function sha256(text) {
  const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

// ==========================================
//  TOOLS
// ==========================================

const toolMap = {
  highlightYellow: "hl-yellow",
  highlightGreen:  "hl-green",
  highlightBlue:   "hl-blue",
  highlightPink:   "hl-pink",
  drawTool:        "draw",
  textTool:        "text"
};

function setTool(t) {
  activeTool = activeTool === t ? null : t;
  // Update eraser visual
  eraserBtn.classList.toggle("active-tool", activeTool === "eraser");
  // Update cursors
  Object.values(overlayCanvases).forEach(cv => {
    cv.style.cursor = !activeTool ? "default" : activeTool === "text" ? "text" : "crosshair";
  });
}

// ==========================================
//  POPUP HELPERS
// ==========================================

function openPopup(p)  { p.classList.remove("hidden"); overlayBg.classList.remove("hidden"); }
function closePopup(p) { p.classList.add("hidden");    overlayBg.classList.add("hidden"); }

// ==========================================
//  EVENT BINDINGS
// ==========================================

// Sidebar
toggleSidebarBtn.addEventListener("click", () => {
  sidebarOpen = !sidebarOpen;
  if (window.innerWidth <= 650) {
    sidebar.classList.toggle("show", sidebarOpen);
  } else {
    sidebar.classList.toggle("collapsed", !sidebarOpen);
  }
});

// Zoom
zoomInBtn.addEventListener("click", async () => {
  if (!pdfDoc || zoomLevel >= 3) return;
  zoomLevel = +(zoomLevel + 0.25).toFixed(2);
  zoomPercentSpan.textContent = Math.round(zoomLevel * 100) + "%";
  await reRenderAll();
});
zoomOutBtn.addEventListener("click", async () => {
  if (!pdfDoc || zoomLevel <= 0.5) return;
  zoomLevel = +(zoomLevel - 0.25).toFixed(2);
  zoomPercentSpan.textContent = Math.round(zoomLevel * 100) + "%";
  await reRenderAll();
});

// Page input
currentPageInput.addEventListener("change", () => {
  if (!pdfDoc) return;
  const v = parseInt(currentPageInput.value, 10);
  if (!isNaN(v)) scrollToPage(Math.max(1, Math.min(totalPages, v)));
});

// Undo / Redo
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

// Save
saveBtn.addEventListener("click", savePage);

// Eraser
eraserBtn.addEventListener("click", () => setTool("eraser"));

// Edit popup
editBtn.addEventListener("click", () => openPopup(editPopup));
closeEditBtn.addEventListener("click", () => closePopup(editPopup));

// Tool buttons
[highlightYellowBtn, highlightGreenBtn, highlightBlueBtn,
 highlightPinkBtn, drawToolBtn, textToolBtn].forEach(btn => {
  btn.addEventListener("click", () => {
    setTool(toolMap[btn.id]);
    closePopup(editPopup);
  });
});

// SHA
shaBtn.addEventListener("click", () => {
  openPopup(shaPopup);
  hashResult.style.display = "none";
  shaInput.value = "";
  setTimeout(() => shaInput.focus(), 50);
});
closeShaBtn.addEventListener("click", () => closePopup(shaPopup));

generateHashBtn.addEventListener("click", async () => {
  const t = shaInput.value.trim();
  if (!t) { hashResult.style.display = "block"; hashResult.textContent = "⚠️ Enter some text first."; return; }
  hashResult.style.display = "block";
  hashResult.textContent   = "Computing…";
  const h = await sha256(t);
  hashResult.textContent = h;
});
shaInput.addEventListener("keydown", e => { if (e.key === "Enter") generateHashBtn.click(); });

// Overlay backdrop
overlayBg.addEventListener("click", () => {
  closePopup(editPopup);
  closePopup(shaPopup);
});

// Keyboard
document.addEventListener("keydown", e => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === "z") { e.preventDefault(); undo(); }
  if (ctrl && e.key === "y") { e.preventDefault(); redo(); }
  if (ctrl && e.key === "s") { e.preventDefault(); savePage(); }
  if (e.key === "Escape") {
    closePopup(editPopup);
    closePopup(shaPopup);
  }
});

// ==========================================
//  BOOT
// ==========================================

init();
