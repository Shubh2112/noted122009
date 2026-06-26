/* ==========================================
   NOTED - PDF.JS
   Full PDF viewer with annotations, draw,
   highlight, text tools, undo/redo, SHA256
========================================== */

"use strict";

// ==========================================
//  PDF.JS WORKER SETUP
// ==========================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";

// ==========================================
//  STATE
// ==========================================

let pdfDoc        = null;
let totalPages    = 0;
let currentPage   = 1;
let zoomLevel     = 1.0;
let sidebarOpen   = true;

// Active tool: null | 'highlight-yellow' | 'highlight-green' |
//              'highlight-blue' | 'highlight-pink' | 'draw' | 'text' | 'eraser'
let activeTool    = null;

// Per-page canvases & overlays
const pageCanvases    = {};   // pageNum → <canvas> (PDF render)
const overlayCanvases = {};   // pageNum → <canvas> (drawings / highlights)
const overlayCtxs     = {};   // pageNum → CanvasRenderingContext2D

// Undo / Redo stacks  (each entry = { pageNum, imageData })
const undoStack = [];
const redoStack = [];

// Draw state
let isDrawing      = false;
let isHighlighting = false;
let hlStartX       = 0;
let hlStartY       = 0;

// ==========================================
//  DOM REFS
// ==========================================

const pdfViewer         = document.getElementById("pdfViewer");
const thumbnailContainer= document.getElementById("thumbnailContainer");
const sidebar           = document.getElementById("sidebar");
const loadingScreen     = document.getElementById("loadingScreen");
const overlayBg         = document.getElementById("overlay");

const currentPageInput  = document.getElementById("currentPage");
const totalPagesSpan    = document.getElementById("totalPages");
const zoomPercentSpan   = document.getElementById("zoomPercent");

const toggleSidebarBtn  = document.getElementById("toggleSidebar");
const zoomInBtn         = document.getElementById("zoomIn");
const zoomOutBtn        = document.getElementById("zoomOut");
const editBtn           = document.getElementById("editBtn");
const undoBtn           = document.getElementById("undoBtn");
const redoBtn           = document.getElementById("redoBtn");
const eraserBtn         = document.getElementById("eraserBtn");
const saveBtn           = document.getElementById("saveBtn");
const shaBtn            = document.getElementById("shaBtn");

const editPopup         = document.getElementById("editPopup");
const closeEditBtn      = document.getElementById("closeEdit");
const highlightYellowBtn= document.getElementById("highlightYellow");
const highlightGreenBtn = document.getElementById("highlightGreen");
const highlightBlueBtn  = document.getElementById("highlightBlue");
const highlightPinkBtn  = document.getElementById("highlightPink");
const drawToolBtn       = document.getElementById("drawTool");
const textToolBtn       = document.getElementById("textTool");

const shaPopup          = document.getElementById("shaPopup");
const closeShaBtn       = document.getElementById("closeSha");
const shaInput          = document.getElementById("shaInput");
const generateHashBtn   = document.getElementById("generateHash");
const hashResult        = document.getElementById("hashResult");

const saveStatus        = document.getElementById("saveStatus");
const viewerContainer   = document.getElementById("viewerContainer");

// ==========================================
//  LOAD PDF FROM SESSIONSTORAGE / FILE PICK
// ==========================================

async function init() {
  const stored = sessionStorage.getItem("notedPDF");
  if (stored) {
    try {
      const binary = atob(stored);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      await loadPDF(bytes.buffer);
      return;
    } catch (_) {
      sessionStorage.removeItem("notedPDF");
    }
  }
  showFilePicker();
}

function showFilePicker() {
  loadingScreen.style.display = "flex";
  loadingScreen.innerHTML = `
    <div style="text-align:center">
      <p style="font-size:20px;margin-bottom:20px;">📄 Open a PDF file</p>
      <label style="
        cursor:pointer;
        background:#4a90ff;
        padding:13px 28px;
        border-radius:10px;
        font-size:16px;
        color:#fff;
      ">
        Choose File
        <input type="file" accept=".pdf" id="fileInput" style="display:none">
      </label>
    </div>
  `;
  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    // Cache in sessionStorage if under 50 MB
    if (buffer.byteLength < 50 * 1024 * 1024) {
      try {
        const bytes = new Uint8Array(buffer);
        let binary  = "";
        bytes.forEach(b => binary += String.fromCharCode(b));
        sessionStorage.setItem("notedPDF", btoa(binary));
      } catch (_) { /* quota exceeded — skip */ }
    }
    await loadPDF(buffer);
  });
}

async function loadPDF(buffer) {
  try {
    loadingScreen.style.display = "flex";
    loadingScreen.innerHTML     = `<div class="loader">Loading PDF...</div>`;

    pdfDoc     = await pdfjsLib.getDocument({ data: buffer }).promise;
    totalPages = pdfDoc.numPages;

    totalPagesSpan.textContent = totalPages;
    currentPageInput.max       = totalPages;
    currentPageInput.value     = 1;

    pdfViewer.innerHTML         = "";
    thumbnailContainer.innerHTML= "";

    for (let p = 1; p <= totalPages; p++) {
      await renderPage(p);
      renderThumbnail(p);
    }

    // Enable toolbar buttons
    editBtn.disabled   = false;
    eraserBtn.disabled = false;
    saveBtn.disabled   = false;
    undoBtn.disabled   = true;
    redoBtn.disabled   = true;

    loadingScreen.style.display = "none";
    scrollToPage(1);

  } catch (err) {
    loadingScreen.innerHTML = `
      <div style="text-align:center">
        <p style="color:#ff6b6b;font-size:18px;">❌ Failed to load PDF</p>
        <p style="color:#aaa;margin-top:8px;font-size:14px;">${err.message}</p>
        <br>
        <label style="cursor:pointer;background:#4a90ff;padding:10px 22px;border-radius:8px;color:#fff;font-size:15px;">
          Try Again
          <input type="file" accept=".pdf" id="fileInputRetry" style="display:none">
        </label>
      </div>
    `;
    document.getElementById("fileInputRetry")?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) await loadPDF(await file.arrayBuffer());
    });
    console.error("PDF load error:", err);
  }
}

// ==========================================
//  RENDER PAGE
// ==========================================

async function renderPage(pageNum) {
  const page     = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: zoomLevel });

  const wrapper       = document.createElement("div");
  wrapper.className   = "pageWrapper";
  wrapper.id          = `page-${pageNum}`;
  wrapper.style.cssText = `
    position:relative;
    width:${viewport.width}px;
    height:${viewport.height}px;
    margin:0 auto 28px;
    background:white;
    border-radius:10px;
    box-shadow:0 0 18px rgba(0,0,0,.45);
    overflow:hidden;
    flex-shrink:0;
  `;

  // Base PDF canvas
  const canvas  = document.createElement("canvas");
  canvas.width  = viewport.width;
  canvas.height = viewport.height;
  canvas.style.cssText = "display:block;position:absolute;top:0;left:0;";

  // Annotation overlay canvas
  const ov      = document.createElement("canvas");
  ov.width      = viewport.width;
  ov.height     = viewport.height;
  ov.style.cssText = "position:absolute;top:0;left:0;cursor:default;";
  ov.dataset.page  = pageNum;

  wrapper.appendChild(canvas);
  wrapper.appendChild(ov);
  pdfViewer.appendChild(wrapper);

  pageCanvases[pageNum]    = canvas;
  overlayCanvases[pageNum] = ov;
  overlayCtxs[pageNum]     = ov.getContext("2d");

  // Render PDF page
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

  // Restore saved annotation
  const saved = sessionStorage.getItem(`annotation-${pageNum}`);
  if (saved) {
    const img = new Image();
    img.onload = () => overlayCtxs[pageNum].drawImage(img, 0, 0);
    img.src = saved;
  }

  attachOverlayEvents(ov, pageNum);
}

// ==========================================
//  RE-RENDER ALL PAGES (zoom)
// ==========================================

async function reRenderAll() {
  if (!pdfDoc) return;
  for (let p = 1; p <= totalPages; p++) {
    const wrapper = document.getElementById(`page-${p}`);
    if (!wrapper) continue;

    const page     = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: zoomLevel });

    const savedAnnotation = overlayCanvases[p]?.toDataURL();

    wrapper.style.width  = `${viewport.width}px`;
    wrapper.style.height = `${viewport.height}px`;

    const canvas = pageCanvases[p];
    const ov     = overlayCanvases[p];

    canvas.width = viewport.width;
    canvas.height= viewport.height;
    ov.width     = viewport.width;
    ov.height    = viewport.height;

    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    if (savedAnnotation) {
      const img = new Image();
      img.onload = () => {
        overlayCtxs[p].drawImage(img, 0, 0, viewport.width, viewport.height);
      };
      img.src = savedAnnotation;
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
  thumb.style.position = "relative";
  thumb.style.height   = "auto";
  thumb.style.padding  = "0";

  const canvas  = document.createElement("canvas");
  canvas.width  = viewport.width;
  canvas.height = viewport.height;
  canvas.style.cssText = "width:100%;height:auto;border-radius:6px;display:block;";

  const label = document.createElement("div");
  label.textContent = pageNum;
  label.style.cssText = `
    text-align:center;font-size:12px;color:#aaa;
    padding:4px 0 6px;
  `;

  thumb.appendChild(canvas);
  thumb.appendChild(label);
  thumbnailContainer.appendChild(thumb);

  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

  thumb.addEventListener("click", () => {
    scrollToPage(pageNum);
  });
}

function updateActiveThumbnail(pageNum) {
  document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"));
  const t = document.getElementById(`thumb-${pageNum}`);
  if (t) t.classList.add("active");
}

function scrollToPage(pageNum) {
  const wrapper = document.getElementById(`page-${pageNum}`);
  if (wrapper) wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
  currentPage = pageNum;
  currentPageInput.value = pageNum;
  updateActiveThumbnail(pageNum);
}

// ==========================================
//  SCROLL → UPDATE CURRENT PAGE
// ==========================================

viewerContainer.addEventListener("scroll", () => {
  if (!pdfDoc) return;
  for (let p = 1; p <= totalPages; p++) {
    const wrapper = document.getElementById(`page-${p}`);
    if (!wrapper) continue;
    const rect = wrapper.getBoundingClientRect();
    if (rect.top >= 50 && rect.top < window.innerHeight * 0.6) {
      if (currentPage !== p) {
        currentPage = p;
        currentPageInput.value = p;
        updateActiveThumbnail(p);
      }
      break;
    }
  }
});

// ==========================================
//  OVERLAY EVENTS
// ==========================================

function attachOverlayEvents(canvas, pageNum) {
  canvas.addEventListener("mousedown",  e => onPointerDown(e, pageNum));
  canvas.addEventListener("mousemove",  e => onPointerMove(e, pageNum));
  canvas.addEventListener("mouseup",    e => onPointerUp(e, pageNum));
  canvas.addEventListener("mouseleave", e => onPointerUp(e, pageNum));

  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    onPointerDown(touchToMouse(e), pageNum);
  }, { passive: false });
  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    onPointerMove(touchToMouse(e), pageNum);
  }, { passive: false });
  canvas.addEventListener("touchend", e => {
    onPointerUp(touchToMouse(e), pageNum);
  });
}

function touchToMouse(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY };
}

function canvasXY(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  return [
    (e.clientX - rect.left) * scaleX,
    (e.clientY - rect.top)  * scaleY
  ];
}

function onPointerDown(e, pageNum) {
  if (!activeTool) return;
  const canvas = overlayCanvases[pageNum];
  const ctx    = overlayCtxs[pageNum];
  const [x, y] = canvasXY(e, canvas);

  saveUndo(pageNum);

  if (activeTool === "draw") {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  if (activeTool.startsWith("highlight")) {
    isHighlighting = true;
    hlStartX = x; hlStartY = y;
  }

  if (activeTool === "eraser") {
    isDrawing = true;
    ctx.clearRect(x - 18, y - 18, 36, 36);
  }

  if (activeTool === "text") {
    placeTextInput(pageNum, x, y);
  }
}

function onPointerMove(e, pageNum) {
  if (!activeTool) return;
  const canvas = overlayCanvases[pageNum];
  const ctx    = overlayCtxs[pageNum];
  const [x, y] = canvasXY(e, canvas);

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

function onPointerUp(e, pageNum) {
  const canvas = overlayCanvases[pageNum];
  const ctx    = overlayCtxs[pageNum];

  if (activeTool && activeTool.startsWith("highlight") && isHighlighting) {
    const [x, y] = canvasXY(e, canvas);
    const rx = Math.min(hlStartX, x);
    const ry = Math.min(hlStartY, y);
    const rw = Math.abs(x - hlStartX);
    const rh = Math.abs(y - hlStartY);

    const colorMap = {
      "highlight-yellow": "rgba(255,230,0,0.38)",
      "highlight-green":  "rgba(60,220,80,0.38)",
      "highlight-blue":   "rgba(60,150,255,0.38)",
      "highlight-pink":   "rgba(255,90,170,0.38)"
    };
    ctx.fillStyle = colorMap[activeTool] || "rgba(255,230,0,0.38)";
    ctx.fillRect(rx, ry, rw, rh);
    isHighlighting = false;
  }

  if (isDrawing) {
    isDrawing = false;
  }

  autoSaveAnnotation(pageNum);
  updateUndoRedoBtns();
}

// ==========================================
//  TEXT TOOL
// ==========================================

function placeTextInput(pageNum, x, y) {
  const canvas  = overlayCanvases[pageNum];
  const wrapper = canvas.parentElement;

  // Convert canvas coords back to CSS pixels
  const rect   = canvas.getBoundingClientRect();
  const cssX   = (x / canvas.width)  * rect.width;
  const cssY   = (y / canvas.height) * rect.height;

  const inp = document.createElement("input");
  inp.type  = "text";
  inp.placeholder = "Type here…";
  inp.style.cssText = `
    position:absolute;
    left:${cssX}px;
    top:${cssY - 16}px;
    background:rgba(255,255,255,0.85);
    border:none;
    border-bottom:2px solid #4a90ff;
    color:#111;
    font-size:15px;
    outline:none;
    min-width:90px;
    z-index:50;
    padding:2px 4px;
    border-radius:3px;
  `;
  wrapper.appendChild(inp);
  inp.focus();

  function commit() {
    const text = inp.value.trim();
    if (text) {
      const ctx = overlayCtxs[pageNum];
      ctx.font      = "bold 16px Arial";
      ctx.fillStyle = "#1a1aff";
      ctx.fillText(text, x, y);
      autoSaveAnnotation(pageNum);
    }
    inp.remove();
  }

  inp.addEventListener("keydown", e => {
    if (e.key === "Enter")  commit();
    if (e.key === "Escape") inp.remove();
  });
  inp.addEventListener("blur", commit);
}

// ==========================================
//  UNDO / REDO
// ==========================================

function saveUndo(pageNum) {
  const canvas = overlayCanvases[pageNum];
  if (!canvas) return;
  const imageData = overlayCtxs[pageNum].getImageData(0, 0, canvas.width, canvas.height);
  undoStack.push({ pageNum, imageData });
  redoStack.length = 0;
  updateUndoRedoBtns();
}

function undo() {
  if (!undoStack.length) return;
  const entry  = undoStack.pop();
  const canvas = overlayCanvases[entry.pageNum];
  const cur    = overlayCtxs[entry.pageNum].getImageData(0, 0, canvas.width, canvas.height);
  redoStack.push({ pageNum: entry.pageNum, imageData: cur });
  overlayCtxs[entry.pageNum].putImageData(entry.imageData, 0, 0);
  autoSaveAnnotation(entry.pageNum);
  updateUndoRedoBtns();
}

function redo() {
  if (!redoStack.length) return;
  const entry  = redoStack.pop();
  const canvas = overlayCanvases[entry.pageNum];
  const cur    = overlayCtxs[entry.pageNum].getImageData(0, 0, canvas.width, canvas.height);
  undoStack.push({ pageNum: entry.pageNum, imageData: cur });
  overlayCtxs[entry.pageNum].putImageData(entry.imageData, 0, 0);
  autoSaveAnnotation(entry.pageNum);
  updateUndoRedoBtns();
}

function updateUndoRedoBtns() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

// ==========================================
//  AUTO-SAVE ANNOTATION
// ==========================================

function autoSaveAnnotation(pageNum) {
  const canvas = overlayCanvases[pageNum];
  if (!canvas) return;
  try {
    sessionStorage.setItem(`annotation-${pageNum}`, canvas.toDataURL());
  } catch (_) { /* storage quota — ignore */ }
}

// ==========================================
//  SAVE — Download merged PNG of current page
// ==========================================

async function savePDF() {
  if (!pdfDoc) return;
  saveBtn.disabled = true;
  showSaveStatus("Saving…");

  try {
    const p      = currentPage;
    const pdfCvs = pageCanvases[p];
    const ovCvs  = overlayCanvases[p];
    if (!pdfCvs) return;

    const merged  = document.createElement("canvas");
    merged.width  = pdfCvs.width;
    merged.height = pdfCvs.height;
    const mCtx   = merged.getContext("2d");
    mCtx.drawImage(pdfCvs, 0, 0);
    if (ovCvs) mCtx.drawImage(ovCvs, 0, 0);

    const link    = document.createElement("a");
    link.href     = merged.toDataURL("image/png");
    link.download = `noted-page-${p}.png`;
    link.click();

    showSaveStatus("✅ Saved");
  } catch (err) {
    showSaveStatus("❌ Error");
    console.error("Save error:", err);
  }
  saveBtn.disabled = false;
}

function showSaveStatus(text) {
  saveStatus.textContent = text;
  saveStatus.classList.remove("hidden");
  clearTimeout(saveStatus._timer);
  saveStatus._timer = setTimeout(() => saveStatus.classList.add("hidden"), 2200);
}

// ==========================================
//  SHA-256
// ==========================================

async function generateSHA256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ==========================================
//  POPUPS
// ==========================================

function openPopup(popup) {
  popup.classList.remove("hidden");
  overlayBg.classList.remove("hidden");
}

function closePopup(popup) {
  popup.classList.add("hidden");
  overlayBg.classList.add("hidden");
}

function closeEditPopup()  { closePopup(editPopup); }
function closeShaPopup()   { closePopup(shaPopup);  }

// ==========================================
//  TOOLBAR EVENTS
// ==========================================

// Sidebar toggle
toggleSidebarBtn.addEventListener("click", () => {
  sidebarOpen = !sidebarOpen;
  if (sidebarOpen) {
    sidebar.classList.remove("hidden");
    sidebar.style.display = "";
  } else {
    sidebar.style.display = "none";
  }
  // Mobile: use class toggle for fixed sidebar
  sidebar.classList.toggle("show", sidebarOpen);
});

// Zoom In
zoomInBtn.addEventListener("click", async () => {
  if (!pdfDoc || zoomLevel >= 3.0) return;
  zoomLevel = +(Math.min(3.0, zoomLevel + 0.25)).toFixed(2);
  zoomPercentSpan.textContent = Math.round(zoomLevel * 100) + "%";
  await reRenderAll();
});

// Zoom Out
zoomOutBtn.addEventListener("click", async () => {
  if (!pdfDoc || zoomLevel <= 0.5) return;
  zoomLevel = +(Math.max(0.5, zoomLevel - 0.25)).toFixed(2);
  zoomPercentSpan.textContent = Math.round(zoomLevel * 100) + "%";
  await reRenderAll();
});

// Page number input
currentPageInput.addEventListener("change", () => {
  if (!pdfDoc) return;
  const val = parseInt(currentPageInput.value, 10);
  if (isNaN(val)) return;
  scrollToPage(Math.max(1, Math.min(totalPages, val)));
});

// Undo / Redo buttons
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

// Save button
saveBtn.addEventListener("click", savePDF);

// Edit popup
editBtn.addEventListener("click", () => openPopup(editPopup));
closeEditBtn.addEventListener("click", closeEditPopup);

// Highlight & draw tools
const toolMap = {
  highlightYellow: "highlight-yellow",
  highlightGreen:  "highlight-green",
  highlightBlue:   "highlight-blue",
  highlightPink:   "highlight-pink",
  drawTool:        "draw",
  textTool:        "text"
};

[highlightYellowBtn, highlightGreenBtn, highlightBlueBtn,
 highlightPinkBtn, drawToolBtn, textToolBtn].forEach(btn => {
  btn.addEventListener("click", () => {
    const tool = toolMap[btn.id];
    setTool(tool);
    closeEditPopup();
  });
});

// Eraser button
eraserBtn.addEventListener("click", () => {
  setTool(activeTool === "eraser" ? null : "eraser");
});

function setTool(tool) {
  activeTool = (activeTool === tool) ? null : tool;
  eraserBtn.style.background = activeTool === "eraser" ? "#4a90ff" : "";
  updateCursors();
}

function updateCursors() {
  Object.values(overlayCanvases).forEach(c => {
    if (!activeTool)               c.style.cursor = "default";
    else if (activeTool === "text") c.style.cursor = "text";
    else                            c.style.cursor = "crosshair";
  });
}

// Overlay backdrop
overlayBg.addEventListener("click", () => {
  closeEditPopup();
  closeShaPopup();
});

// SHA popup
shaBtn.addEventListener("click", () => {
  openPopup(shaPopup);
  shaInput.focus();
});
closeShaBtn.addEventListener("click", closeShaPopup);

generateHashBtn.addEventListener("click", async () => {
  const text = shaInput.value;
  if (!text.trim()) {
    hashResult.textContent = "⚠️ Please enter some text first.";
    return;
  }
  hashResult.textContent = "Computing…";
  const hash = await generateSHA256(text);
  hashResult.textContent = hash;
});

shaInput.addEventListener("keydown", e => {
  if (e.key === "Enter") generateHashBtn.click();
});

// Keyboard shortcuts
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === "z") { e.preventDefault(); undo(); }
    if (e.key === "y") { e.preventDefault(); redo(); }
    if (e.key === "s") { e.preventDefault(); savePDF(); }
  }
  if (e.key === "Escape") {
    closeEditPopup();
    closeShaPopup();
  }
});

// ==========================================
//  BOOT
// ==========================================

init();
