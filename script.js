// Open-Meteo APIs (free, no API key required)
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// DOM elements
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const message = document.getElementById("message");
const currentCard = document.getElementById("current");
const forecastSection = document.getElementById("forecast-section");
const forecastEl = document.getElementById("forecast");

// Weather code -> [description, emoji]
const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "❄️"],
  75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Violent showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Severe thunderstorm", "⛈️"],
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || ["Unknown", "❓"];
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

// Step 1: city name -> latitude/longitude
async function getCoordinates(city) {
  const url = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not reach the geocoding service.");

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${city}" not found.`);
  }

  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

// Step 2: coordinates -> weather data
async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: 5,
  });

  const res = await fetch(`${WEATHER_URL}?${params}`);
  if (!res.ok) throw new Error("Could not fetch weather data.");
  return res.json();
}

// Step 3: show current weather
function renderCurrent(place, data) {
  const c = data.current;
  const [desc, emoji] = getWeatherInfo(c.weather_code);

  document.getElementById("location").textContent = `${place.name}, ${place.country}`;
  document.getElementById("icon").textContent = emoji;
  document.getElementById("temp").textContent = `${Math.round(c.temperature_2m)}°C`;
  document.getElementById("description").textContent = desc;
  document.getElementById("feels").textContent = `${Math.round(c.apparent_temperature)}°C`;
  document.getElementById("humidity").textContent = `${c.relative_humidity_2m}%`;
  document.getElementById("wind").textContent = `${c.wind_speed_10m} km/h`;

  currentCard.classList.remove("hidden");
}

// Step 4: show 5-day forecast
function renderForecast(data) {
  const d = data.daily;
  forecastEl.innerHTML = "";

  d.time.forEach((date, i) => {
    const [, emoji] = getWeatherInfo(d.weather_code[i]);
    const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" });

    const div = document.createElement("div");
    div.className = "day";
    div.innerHTML = `
      <strong>${dayName}</strong>
      <div class="emoji">${emoji}</div>
      <div class="range">${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</div>
    `;
    forecastEl.appendChild(div);
  });

  forecastSection.classList.remove("hidden");
}

// Main handler
async function searchWeather(city) {
  showMessage("Loading...");
  currentCard.classList.add("hidden");
  forecastSection.classList.add("hidden");

  try {
    const place = await getCoordinates(city);
    const weather = await getWeather(place.latitude, place.longitude);

    renderCurrent(place, weather);
    renderForecast(weather);
    showMessage("");
    localStorage.setItem("lastCity", city);
  } catch (err) {
    showMessage(err.message, true);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) searchWeather(city);
});

// Load last searched city (or a default) on startup
const lastCity = localStorage.getItem("lastCity") || "Kolkata";
cityInput.value = lastCity;
searchWeather(lastCity);
