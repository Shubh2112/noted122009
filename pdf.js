// your code goes here
const PDF_URL =
"https://drive.google.com/file/d/1ePQYKfgBU5SNODrPFRuV6uiLTVo2Wpr8/preview";

const pdfLink = document.getElementById("pdfLink");
const openBtn = document.getElementById("openBtn");

pdfLink.href = PDF_URL;
pdfLink.textContent = PDF_URL;

openBtn.addEventListener("click", () => {
    window.open(PDF_URL, "_blank");
});
