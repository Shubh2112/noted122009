const PDF_URL =
"https://drive.google.com/file/d/1ePQYKfgBU5SNODrPFRuV6uiLTVo2Wpr8/view";

const openBtn = document.getElementById("openBtn");

openBtn.addEventListener("click", () => {
    window.location.href = PDF_URL;
});
