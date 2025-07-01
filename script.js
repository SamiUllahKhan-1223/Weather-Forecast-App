const apiKey = '8a5e57319c8baf77a2b40ad7efb3b1f1'; // OpenWeatherMap API key
const apiUrl = 'https://api.openweathermap.org/data/2.5/weather';
const forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';

const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const weatherCard = document.getElementById('weather');
const cityName = document.getElementById('city-name');
const description = document.getElementById('description');
const temperature = document.getElementById('temperature');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const weatherIcon = document.getElementById('weather-icon');
const errorMessage = document.getElementById('error-message');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const precipitation = document.getElementById('precipitation');
const locationBtn = document.getElementById('location-btn');

const themes = ['light', 'dark', 'blue'];
let currentThemeIndex = 0;
let debounceTimeout;
let isGeolocationRequest = false;

function setTheme(theme) {
  document.body.classList.remove('light-theme', 'dark-theme', 'blue-theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    themeIcon.textContent = '🌙';
  } else if (theme === 'blue') {
    document.body.classList.add('blue-theme');
    themeIcon.textContent = '💧';
  } else {
    document.body.classList.add('light-theme');
    themeIcon.textContent = '🌞';
  }
  localStorage.setItem('weather-theme', theme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('weather-theme');
  if (savedTheme && themes.includes(savedTheme)) {
    currentThemeIndex = themes.indexOf(savedTheme);
    setTheme(savedTheme);
  } else {
    setTheme('light');
  }
}

themeToggle.addEventListener('click', () => {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  setTheme(themes[currentThemeIndex]);
});

function getWeatherIcon(main, icon) {
  // Animated SVGs for main weather types
  switch (main) {
    case 'Clear':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="16" fill="#FFD600"><animate attributeName="r" values="16;18;16" dur="2s" repeatCount="indefinite"/></circle></svg>`;
    case 'Clouds':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="40" rx="18" ry="12" fill="#B0BEC5"><animate attributeName="rx" values="18;20;18" dur="2s" repeatCount="indefinite"/></ellipse><ellipse cx="44" cy="36" rx="10" ry="8" fill="#90A4AE"><animate attributeName="rx" values="10;12;10" dur="2s" repeatCount="indefinite"/></ellipse></svg>`;
    case 'Rain':
    case 'Drizzle':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="40" rx="16" ry="10" fill="#90A4AE"/><line x1="24" y1="52" x2="24" y2="60" stroke="#2196F3" stroke-width="3"><animate attributeName="y1" values="52;60;52" dur="1s" repeatCount="indefinite"/><animate attributeName="y2" values="60;68;60" dur="1s" repeatCount="indefinite"/></line><line x1="32" y1="54" x2="32" y2="62" stroke="#2196F3" stroke-width="3"><animate attributeName="y1" values="54;62;54" dur="1s" repeatCount="indefinite"/><animate attributeName="y2" values="62;70;62" dur="1s" repeatCount="indefinite"/></line><line x1="40" y1="52" x2="40" y2="60" stroke="#2196F3" stroke-width="3"><animate attributeName="y1" values="52;60;52" dur="1s" repeatCount="indefinite"/><animate attributeName="y2" values="60;68;60" dur="1s" repeatCount="indefinite"/></line></svg>`;
    case 'Thunderstorm':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="40" rx="16" ry="10" fill="#90A4AE"/><polygon points="30,50 36,50 32,60" fill="#FFD600"><animate attributeName="points" values="30,50 36,50 32,60;32,52 38,52 34,62;30,50 36,50 32,60" dur="1.5s" repeatCount="indefinite"/></polygon></svg>`;
    case 'Snow':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="40" rx="16" ry="10" fill="#B0BEC5"/><g><circle cx="32" cy="54" r="2" fill="#90CAF9"><animate attributeName="cy" values="54;60;54" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="40" cy="56" r="2" fill="#90CAF9"><animate attributeName="cy" values="56;62;56" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="24" cy="56" r="2" fill="#90CAF9"><animate attributeName="cy" values="56;62;56" dur="1.5s" repeatCount="indefinite"/></circle></g></svg>`;
    case 'Mist':
    case 'Fog':
    case 'Haze':
      return `<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><ellipse cx="32" cy="40" rx="16" ry="10" fill="#B0BEC5"/><rect x="16" y="50" width="32" height="4" rx="2" fill="#B0BEC5"><animate attributeName="x" values="16;20;16" dur="2s" repeatCount="indefinite"/></rect></svg>`;
    default:
      // fallback to OpenWeatherMap icon
      return `<img src="https://openweathermap.org/img/wn/${icon}@4x.png" alt="Weather icon" width="64" height="64">`;
  }
}

function showSpinnerOnBtn(btn) {
  btn.disabled = true;
  btn.innerHTML = '<span class="location-icon">📍</span> <span>Loading</span> <span class="spinner"></span>';
}
function resetLocationBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = '<span class="location-icon">📍</span> Use My Location';
}

async function fetchWeatherByCoords(lat, lon) {
  weatherCard.classList.add('hidden');
  errorMessage.classList.add('hidden');
  isGeolocationRequest = true;
  try {
    const [currentWeatherResponse, forecastWeatherResponse] = await Promise.all([
      fetch(`${apiUrl}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
      fetch(`${forecastUrl}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`)
    ]);
    if (!currentWeatherResponse.ok && !forecastWeatherResponse.ok) throw new Error('Location not found.');
    if (!currentWeatherResponse.ok) throw new Error('Location not found in current weather.');
    if (!forecastWeatherResponse.ok) throw new Error('Location not found in forecast.');
    const currentWeatherData = await currentWeatherResponse.json();
    const forecastWeatherData = await forecastWeatherResponse.json();
    displayWeather(currentWeatherData, forecastWeatherData, true);
  } catch (err) {
    errorMessage.textContent = err.message || 'Failed to fetch weather for your location.';
    errorMessage.classList.remove('hidden');
  }
}

locationBtn.addEventListener('click', () => {
  errorMessage.classList.add('hidden');
  showSpinnerOnBtn(locationBtn);
  if (!navigator.geolocation) {
    errorMessage.textContent = 'Geolocation is not supported by your browser.';
    errorMessage.classList.remove('hidden');
    resetLocationBtn(locationBtn);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      fetchWeatherByCoords(latitude, longitude).finally(() => {
        resetLocationBtn(locationBtn);
      });
    },
    (err) => {
      if (err.code === 1) {
        errorMessage.textContent = 'Permission denied. Please allow location access.';
      } else {
        errorMessage.textContent = 'Unable to retrieve your location.';
      }
      errorMessage.classList.remove('hidden');
      resetLocationBtn(locationBtn);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

async function fetchWeather(city) {
  weatherCard.classList.add('hidden');
  errorMessage.classList.add('hidden');
  try {
    // Fetch current weather and forecast in parallel
    const [currentWeatherResponse, forecastWeatherResponse] = await Promise.all([
      fetch(`${apiUrl}?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`),
      fetch(`${forecastUrl}?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`)
    ]);
    if (!currentWeatherResponse.ok && !forecastWeatherResponse.ok) throw new Error('City not found. Try "City,CountryCode" (e.g. London,UK)');
    if (!currentWeatherResponse.ok) throw new Error('City not found in current weather. Try "City,CountryCode" (e.g. London,UK)');
    if (!forecastWeatherResponse.ok) throw new Error('City not found in forecast. Try "City,CountryCode" (e.g. London,UK)');
    const currentWeatherData = await currentWeatherResponse.json();
    const forecastWeatherData = await forecastWeatherResponse.json();
    displayWeather(currentWeatherData, forecastWeatherData);
  } catch (err) {
    errorMessage.textContent = err.message || 'Failed to fetch weather.';
    errorMessage.classList.remove('hidden');
  }
}

function displayWeather(weatherData, forecastData, fromGeolocation = false) {
  let locationText = '';
  if (fromGeolocation) {
    if (weatherData.name && weatherData.sys && weatherData.sys.country) {
      locationText = `Weather near you: ${weatherData.name}, ${weatherData.sys.country}`;
    } else {
      locationText = 'Weather near you: Your Current Location';
    }
    cityName.textContent = locationText;
  } else {
    cityName.textContent = `${weatherData.name}, ${weatherData.sys.country}`;
  }
  description.textContent = weatherData.weather[0].description.replace(/\b\w/g, c => c.toUpperCase());
  // Temperature
  const celsius = Math.round(weatherData.main.temp);
  const fahrenheit = ((weatherData.main.temp * 9) / 5 + 32).toFixed(1);
  const temperatureCelsiusElement = document.getElementById('temperature-c');
  const temperatureFahrenheitElement = document.getElementById('temperature-f');
  if (temperatureCelsiusElement && temperatureFahrenheitElement) {
    temperatureCelsiusElement.textContent = `${celsius}°C`;
    temperatureFahrenheitElement.textContent = `${fahrenheit}°F`;
  }
  humidity.textContent = `${weatherData.main.humidity}%`;

  // Precipitation probability from forecast (first slot)
  let precipPercent = 0;
  if (forecastData && forecastData.list && forecastData.list.length > 0) {
    // Use the first forecast slot (closest to now)
    precipPercent = Math.round((forecastData.list[0].pop || 0) * 100);
  }
  precipitation.textContent = `${precipPercent}%`;

  // Convert wind speed from m/s to km/h
  wind.textContent = `${Math.round(weatherData.wind.speed * 3.6)} km/h`;
  weatherIcon.innerHTML = getWeatherIcon(weatherData.weather[0].main, weatherData.weather[0].icon);
  weatherCard.classList.remove('hidden');
}

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    const city = cityInput.value.trim();
    if (city) {
      fetchWeather(city);
    }
  }, 300);
});

// On load
window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  // Optionally, show weather for a default city
  // fetchWeather('Quetta');
});
