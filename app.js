// 🌍 Random Country System
const countries = [
{ name: "United States", flag: "🇺🇸", timezone: "America/New_York" }, // Washington DC
{ name: "Canada", flag: "🇨🇦", timezone: "America/Toronto" }, // Ottawa
{ name: "Mexico", flag: "🇲🇽", timezone: "America/Mexico_City" }, // Mexico City
{ name: "Brazil", flag: "🇧🇷", timezone: "America/Sao_Paulo" }, // Brasília
{ name: "Argentina", flag: "🇦🇷", timezone: "America/Argentina/Buenos_Aires" }, // Buenos Aires
{ name: "United Kingdom", flag: "🇬🇧", timezone: "Europe/London" }, // London
{ name: "France", flag: "🇫🇷", timezone: "Europe/Paris" }, // Paris
{ name: "Germany", flag: "🇩🇪", timezone: "Europe/Berlin" }, // Berlin
{ name: "Italy", flag: "🇮🇹", timezone: "Europe/Rome" }, // Rome
{ name: "Spain", flag: "🇪🇸", timezone: "Europe/Madrid" }, // Madrid
{ name: "Portugal", flag: "🇵🇹", timezone: "Europe/Lisbon" }, // Lisbon
{ name: "Netherlands", flag: "🇳🇱", timezone: "Europe/Amsterdam" }, // Amsterdam
{ name: "Belgium", flag: "🇧🇪", timezone: "Europe/Brussels" }, // Brussels
{ name: "Switzerland", flag: "🇨🇭", timezone: "Europe/Zurich" }, // Bern timezone region
{ name: "Austria", flag: "🇦🇹", timezone: "Europe/Vienna" }, // Vienna
{ name: "Sweden", flag: "🇸🇪", timezone: "Europe/Stockholm" }, // Stockholm
{ name: "Norway", flag: "🇳🇴", timezone: "Europe/Oslo" }, // Oslo
{ name: "Denmark", flag: "🇩🇰", timezone: "Europe/Copenhagen" }, // Copenhagen
{ name: "Finland", flag: "🇫🇮", timezone: "Europe/Helsinki" }, // Helsinki
{ name: "Poland", flag: "🇵🇱", timezone: "Europe/Warsaw" }, // Warsaw
{ name: "Czech Republic", flag: "🇨🇿", timezone: "Europe/Prague" }, // Prague
{ name: "Greece", flag: "🇬🇷", timezone: "Europe/Athens" }, // Athens
{ name: "Turkey", flag: "🇹🇷", timezone: "Europe/Istanbul" }, // Ankara timezone
{ name: "Russia", flag: "🇷🇺", timezone: "Europe/Moscow" }, // Moscow
{ name: "Ukraine", flag: "🇺🇦", timezone: "Europe/Kyiv" }, // Kyiv
{ name: "Ireland", flag: "🇮🇪", timezone: "Europe/Dublin" }, // Dublin
{ name: "Iceland", flag: "🇮🇸", timezone: "Atlantic/Reykjavik" }, // Reykjavik
{ name: "Australia", flag: "🇦🇺", timezone: "Australia/Sydney" }, // Canberra
{ name: "New Zealand", flag: "🇳🇿", timezone: "Pacific/Auckland" }, // Wellington
{ name: "Japan", flag: "🇯🇵", timezone: "Asia/Tokyo" }, // Tokyo
{ name: "South Korea", flag: "🇰🇷", timezone: "Asia/Seoul" }, // Seoul
{ name: "China", flag: "🇨🇳", timezone: "Asia/Shanghai" }, // Beijing
{ name: "India", flag: "🇮🇳", timezone: "Asia/Kolkata" }, // New Delhi
{ name: "Pakistan", flag: "🇵🇰", timezone: "Asia/Karachi" }, // Islamabad
{ name: "Bangladesh", flag: "🇧🇩", timezone: "Asia/Dhaka" }, // Dhaka
{ name: "Sri Lanka", flag: "🇱🇰", timezone: "Asia/Colombo" }, // Colombo
{ name: "Nepal", flag: "🇳🇵", timezone: "Asia/Kathmandu" }, // Kathmandu
{ name: "Indonesia", flag: "🇮🇩", timezone: "Asia/Jakarta" }, // Jakarta
{ name: "Malaysia", flag: "🇲🇾", timezone: "Asia/Kuala_Lumpur" }, // Kuala Lumpur
{ name: "Singapore", flag: "🇸🇬", timezone: "Asia/Singapore" }, // Singapore
{ name: "Thailand", flag: "🇹🇭", timezone: "Asia/Bangkok" }, // Bangkok
{ name: "Vietnam", flag: "🇻🇳", timezone: "Asia/Ho_Chi_Minh" }, // Hanoi timezone
{ name: "Philippines", flag: "🇵🇭", timezone: "Asia/Manila" }, // Manila
{ name: "Saudi Arabia", flag: "🇸🇦", timezone: "Asia/Riyadh" }, // Riyadh
{ name: "United Arab Emirates", flag: "🇦🇪", timezone: "Asia/Dubai" }, // Abu Dhabi
{ name: "Qatar", flag: "🇶🇦", timezone: "Asia/Qatar" }, // Doha
{ name: "Kuwait", flag: "🇰🇼", timezone: "Asia/Kuwait" }, // Kuwait City
{ name: "Israel", flag: "🇮🇱", timezone: "Asia/Jerusalem" }, // Jerusalem
{ name: "Iran", flag: "🇮🇷", timezone: "Asia/Tehran" }, // Tehran
{ name: "Iraq", flag: "🇮🇶", timezone: "Asia/Baghdad" }, // Baghdad
{ name: "Egypt", flag: "🇪🇬", timezone: "Africa/Cairo" }, // Cairo
{ name: "South Africa", flag: "🇿🇦", timezone: "Africa/Johannesburg" }, // Pretoria
{ name: "Nigeria", flag: "🇳🇬", timezone: "Africa/Lagos" }, // Abuja timezone
{ name: "Kenya", flag: "🇰🇪", timezone: "Africa/Nairobi" }, // Nairobi
{ name: "Ethiopia", flag: "🇪🇹", timezone: "Africa/Addis_Ababa" }, // Addis Ababa
{ name: "Morocco", flag: "🇲🇦", timezone: "Africa/Casablanca" }, // Rabat timezone
{ name: "Algeria", flag: "🇩🇿", timezone: "Africa/Algiers" }, // Algiers
{ name: "Tunisia", flag: "🇹🇳", timezone: "Africa/Tunis" }, // Tunis
{ name: "Ghana", flag: "🇬🇭", timezone: "Africa/Accra" }, // Accra
{ name: "Sudan", flag: "🇸🇩", timezone: "Africa/Khartoum" }, // Khartoum
{ name: "Colombia", flag: "🇨🇴", timezone: "America/Bogota" }, // Bogotá
{ name: "Peru", flag: "🇵🇪", timezone: "America/Lima" }, // Lima
{ name: "Chile", flag: "🇨🇱", timezone: "America/Santiago" }, // Santiago
{ name: "Venezuela", flag: "🇻🇪", timezone: "America/Caracas" }, // Caracas
{ name: "Uruguay", flag: "🇺🇾", timezone: "America/Montevideo" }, // Montevideo
{ name: "Paraguay", flag: "🇵🇾", timezone: "America/Asuncion" }, // Asunción
{ name: "Bolivia", flag: "🇧🇴", timezone: "America/La_Paz" }, // La Paz
{ name: "Cuba", flag: "🇨🇺", timezone: "America/Havana" }, // Havana
{ name: "Dominican Republic", flag: "🇩🇴", timezone: "America/Santo_Domingo" }, // Santo Domingo
{ name: "Costa Rica", flag: "🇨🇷", timezone: "America/Costa_Rica" }, // San José
{ name: "Panama", flag: "🇵🇦", timezone: "America/Panama" }, // Panama City
{ name: "Guatemala", flag: "🇬🇹", timezone: "America/Guatemala" }, // Guatemala City
{ name: "Honduras", flag: "🇭🇳", timezone: "America/Tegucigalpa" }, // Tegucigalpa
{ name: "El Salvador", flag: "🇸🇻", timezone: "America/El_Salvador" }, // San Salvador
{ name: "Nicaragua", flag: "🇳🇮", timezone: "America/Managua" }, // Managua
{ name: "Puerto Rico", flag: "🇵🇷", timezone: "America/Puerto_Rico" }, // San Juan
{ name: "Jamaica", flag: "🇯🇲", timezone: "America/Jamaica" }, // Kingston
{ name: "Haiti", flag: "🇭🇹", timezone: "America/Port-au-Prince" }, // Port-au-Prince

{ name: "Kazakhstan", flag: "🇰🇿", timezone: "Asia/Almaty" }, // Astana
{ name: "Uzbekistan", flag: "🇺🇿", timezone: "Asia/Tashkent" }, // Tashkent
{ name: "Turkmenistan", flag: "🇹🇲", timezone: "Asia/Ashgabat" }, // Ashgabat
{ name: "Azerbaijan", flag: "🇦🇿", timezone: "Asia/Baku" }, // Baku
{ name: "Armenia", flag: "🇦🇲", timezone: "Asia/Yerevan" }, // Yerevan
{ name: "Georgia", flag: "🇬🇪", timezone: "Asia/Tbilisi" }, // Tbilisi
{ name: "Mongolia", flag: "🇲🇳", timezone: "Asia/Ulaanbaatar" }, // Ulaanbaatar
{ name: "North Korea", flag: "🇰🇵", timezone: "Asia/Pyongyang" }, // Pyongyang
{ name: "Taiwan", flag: "🇹🇼", timezone: "Asia/Taipei" }, // Taipei
{ name: "Hong Kong", flag: "🇭🇰", timezone: "Asia/Hong_Kong" }, // Hong Kong
{ name: "Macau", flag: "🇲🇴", timezone: "Asia/Macau" }, // Macau

{ name: "Luxembourg", flag: "🇱🇺", timezone: "Europe/Luxembourg" }, // Luxembourg
{ name: "Slovakia", flag: "🇸🇰", timezone: "Europe/Bratislava" }, // Bratislava
{ name: "Slovenia", flag: "🇸🇮", timezone: "Europe/Ljubljana" }, // Ljubljana
{ name: "Croatia", flag: "🇭🇷", timezone: "Europe/Zagreb" }, // Zagreb
{ name: "Serbia", flag: "🇷🇸", timezone: "Europe/Belgrade" }, // Belgrade
{ name: "Albania", flag: "🇦🇱", timezone: "Europe/Tirane" }, // Tirana
{ name: "Bulgaria", flag: "🇧🇬", timezone: "Europe/Sofia" }, // Sofia
{ name: "Romania", flag: "🇷🇴", timezone: "Europe/Bucharest" }, // Bucharest
{ name: "Hungary", flag: "🇭🇺", timezone: "Europe/Budapest" } // Budapest
];

// secret CODE :-
const SECRET = "POSSIBLE";

let selectedCountry = null;

// 🌍 COUNTRY LOAD
function initCountry() {
  const countryElement = document.getElementById("country");

  if (!countryElement) {
    console.log("Country element not found");
    return;
  }

  if (!countries || countries.length === 0) {
    console.log("Countries list missing");
    return;
  }

  selectedCountry =
    countries[Math.floor(Math.random() * countries.length)];

  countryElement.textContent =
    `${selectedCountry.flag} ${selectedCountry.name} Server`;
}

// ✅ run after page loads
document.addEventListener("DOMContentLoaded", initCountry);

// ⏰ TIME (capital city timezone)
function getTime() {
  if (!selectedCountry || !selectedCountry.timezone) {
    return null;
  }

  const now = new Date();

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: selectedCountry.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);

  return time.replace(":", "");
}

// 🔐 LOGIN
function login() {
  const input = document.getElementById("pass")?.value.trim();
  const msg = document.getElementById("msg");

  if (!msg) return;

  // Country must exist
  if (!selectedCountry) {
    msg.textContent = "❌ Country not loaded";
    msg.style.color = "red";
    return;
  }

  // Time must exist
  const currentTime = getTime();

  if (!currentTime) {
    msg.textContent = "❌ Time not available";
    msg.style.color = "red";
    return;
  }

  const correctPassword = `${SECRET} ${currentTime}`;

  if (input === correctPassword) {
    msg.textContent = "✅ Login Success";
    msg.style.color = "lightgreen";

    setTimeout(() => {
      window.location.href = "pdf.html";
    }, 600);

  } else {
    msg.textContent = "❌ Wrong Password";
    msg.style.color = "red";
  }
}
