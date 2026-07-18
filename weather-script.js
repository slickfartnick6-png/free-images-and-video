// ==================== WEATHER DASHBOARD APP ====================

// API Configuration - Using Open-Meteo Free API (no key required)
const API_CONFIG = {
    baseUrl: 'https://api.open-meteo.com/v1',
    geocodingUrl: 'https://geocoding-api.open-meteo.com/v1',
};

// App State
const app = {
    currentWeather: null,
    forecast: null,
    savedLocations: [],
    currentLocation: null,
    tempUnit: 'celsius',
    windUnit: 'mps',
    theme: 'auto',
    
    // Initialize app
    init() {
        this.loadSettings();
        this.loadSavedLocations();
        this.setupEventListeners();
        this.setupTheme();
        this.getDefaultLocation();
    },
    
    // Setup Event Listeners
    setupEventListeners() {
        // Hamburger Menu
        document.getElementById('hamburgerMenu').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('closeSidebar').addEventListener('click', () => this.closeSidebar());
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(link.dataset.view);
            });
        });
        
        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.searchCity());
        document.getElementById('citySearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCity();
        });
        document.getElementById('citySearch').addEventListener('input', (e) => this.getSuggestions(e.target.value));
        
        // Location button
        document.getElementById('locationBtn').addEventListener('click', () => this.getGeolocation());
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Settings
        document.querySelectorAll('input[name="tempUnit"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.tempUnit = e.target.value;
                this.saveSettings();
                this.updateWeatherDisplay();
            });
        });
        
        document.querySelectorAll('input[name="windUnit"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.windUnit = e.target.value;
                this.saveSettings();
                this.updateWeatherDisplay();
            });
        });
        
        document.querySelectorAll('input[name="theme"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.theme = e.target.value;
                this.saveSettings();
                this.setupTheme();
            });
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-section')) {
                document.getElementById('suggestions').classList.remove('active');
            }
        });
    },
    
    // ==================== NAVIGATION ====================
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerMenu');
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('active');
    },
    
    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('hamburgerMenu').classList.remove('active');
    },
    
    switchView(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(view + 'View').classList.add('active');
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.closeSidebar();
        
        if (view === 'forecast' && this.currentWeather) {
            this.renderForecast();
        } else if (view === 'saved') {
            this.renderSavedLocations();
        } else if (view === 'settings') {
            this.renderSettings();
        }
    },
    
    // ==================== WEATHER API ====================
    async getDefaultLocation() {
        // Default to London if geolocation not available
        this.fetchWeather(51.5074, -0.1278, 'London, UK');
    },
    
    async getGeolocation() {
        if (!navigator.geolocation) {
            this.showNotification('Geolocation not supported', 'error');
            return;
        }
        
        this.showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                this.hideLoading();
                this.showNotification('Unable to get location', 'error');
            }
        );
    },
    
    async fetchWeatherByCoords(lat, lon) {
        try {
            // Get location name from coordinates
            const geoResponse = await fetch(
                `${API_CONFIG.geocodingUrl}/reverse?latitude=${lat}&longitude=${lon}&language=en`
            );
            const geoData = await geoResponse.json();
            const location = geoData.results?.[0]?.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
            
            this.fetchWeather(lat, lon, location);
        } catch (error) {
            this.fetchWeather(lat, lon, `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
        }
    },
    
    async searchCity() {
        const city = document.getElementById('citySearch').value.trim();
        if (!city) {
            this.showNotification('Enter a city name', 'error');
            return;
        }
        
        this.showLoading();
        try {
            const response = await fetch(
                `${API_CONFIG.geocodingUrl}/search?name=${encodeURIComponent(city)}&count=1&language=en`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                const location = `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`;
                this.fetchWeather(result.latitude, result.longitude, location);
                document.getElementById('citySearch').value = '';
                document.getElementById('suggestions').classList.remove('active');
            } else {
                this.showNotification('City not found', 'error');
                this.hideLoading();
            }
        } catch (error) {
            this.showNotification('Error searching for city', 'error');
            this.hideLoading();
        }
    },
    
    async getSuggestions(input) {
        if (input.length < 2) {
            document.getElementById('suggestions').classList.remove('active');
            return;
        }
        
        try {
            const response = await fetch(
                `${API_CONFIG.geocodingUrl}/search?name=${encodeURIComponent(input)}&count=5&language=en`
            );
            const data = await response.json();
            const suggestions = document.getElementById('suggestions');
            
            if (data.results && data.results.length > 0) {
                suggestions.innerHTML = data.results.map(result => `
                    <div class="suggestion-item" onclick="app.selectSuggestion(${result.latitude}, ${result.longitude}, '${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}')">
                        <div class="suggestion-city">${result.name}</div>
                        <div class="suggestion-country">${result.admin1 || ''} ${result.country || ''}</div>
                    </div>
                `).join('');
                suggestions.classList.add('active');
            } else {
                suggestions.classList.remove('active');
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    },
    
    selectSuggestion(lat, lon, location) {
        document.getElementById('citySearch').value = '';
        this.showLoading();
        this.fetchWeather(lat, lon, location);
    },
    
    async fetchWeather(latitude, longitude, location) {
        try {
            const tempUnit = this.tempUnit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
            const windUnit = this.getWindSpeedUnit();
            
            const response = await fetch(
                `${API_CONFIG.baseUrl}/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,visibility,pressure&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`
            );
            
            const data = await response.json();
            
            this.currentWeather = {
                ...data.current,
                latitude,
                longitude,
                location,
                timezone: data.timezone,
                hourly: data.hourly,
                daily: data.daily
            };
            
            this.currentLocation = { latitude, longitude, location };
            this.updateWeatherDisplay();
            
        } catch (error) {
            console.error('Error fetching weather:', error);
            this.showNotification('Error fetching weather data', 'error');
        } finally {
            this.hideLoading();
        }
    },
    
    // ==================== WEATHER DISPLAY ====================
    updateWeatherDisplay() {
        if (!this.currentWeather) return;
        
        const weather = this.currentWeather;
        const icon = this.getWeatherIcon(weather.weather_code);
        const description = this.getWeatherDescription(weather.weather_code);
        
        const tempValue = weather.temperature_2m;
        const windSpeedUnit = this.getWindSpeedUnitLabel();
        
        document.getElementById('currentWeather').innerHTML = `
            <div class="weather-main">
                <div>
                    <div class="weather-icon">${icon}</div>
                </div>
                <div>
                    <div class="weather-temp">${Math.round(tempValue)}°${this.tempUnit === 'fahrenheit' ? 'F' : 'C'}</div>
                    <div class="weather-desc">${description}</div>
                    <div class="weather-location">📍 ${weather.location}</div>
                    <div class="weather-details">Feels like ${Math.round(weather.apparent_temperature)}°</div>
                    <button class="save-location-btn" onclick="app.saveLocation()">⭐ Save Location</button>
                </div>
            </div>
        `;
        
        // Update info cards
        document.getElementById('humidity').textContent = `${weather.relative_humidity_2m}%`;
        document.getElementById('windSpeed').textContent = `${weather.wind_speed_10m.toFixed(1)} ${windSpeedUnit}`;
        document.getElementById('windDir').textContent = `${this.getWindDirection(weather.wind_direction_10m)}`;
        document.getElementById('visibility').textContent = `${(weather.visibility / 1000).toFixed(1)} km`;
        document.getElementById('pressure').textContent = `${weather.pressure} mb`;
        document.getElementById('uvIndex').textContent = `Medium`;
        
        // Update hourly forecast
        this.renderHourlyForecast();
        
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    },
    
    renderHourlyForecast() {
        const hourlyContainer = document.getElementById('hourlyForecast');
        const now = new Date();
        const hourly = this.currentWeather.hourly;
        
        hourlyContainer.innerHTML = hourly.time.slice(0, 24).map((time, index) => {
            const hour = new Date(time);
            const temp = hourly.temperature_2m[index];
            const code = hourly.weather_code[index];
            const icon = this.getWeatherIcon(code);
            
            return `
                <div class="hourly-item">
                    <div class="hourly-time">${hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div class="hourly-icon">${icon}</div>
                    <div class="hourly-temp">${Math.round(temp)}°</div>
                </div>
            `;
        }).join('');
    },
    
    renderForecast() {
        if (!this.currentWeather) return;
        
        const daily = this.currentWeather.daily;
        const forecastGrid = document.getElementById('forecastGrid');
        
        forecastGrid.innerHTML = daily.time.slice(0, 5).map((date, index) => {
            const day = new Date(date);
            const code = daily.weather_code[index];
            const icon = this.getWeatherIcon(code);
            const desc = this.getWeatherDescription(code);
            const tempHigh = daily.temperature_2m_max[index];
            const tempLow = daily.temperature_2m_min[index];
            const precipitation = daily.precipitation_sum[index];
            const windSpeed = daily.wind_speed_10m_max[index];
            
            return `
                <div class="forecast-card">
                    <div class="forecast-date">${day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div class="forecast-icon">${icon}</div>
                    <div class="forecast-desc">${desc}</div>
                    <div class="forecast-temps">
                        <span class="temp-high">${Math.round(tempHigh)}°</span>
                        <span class="temp-low">${Math.round(tempLow)}°</span>
                    </div>
                    <div class="forecast-details">
                        <div>💧 ${precipitation.toFixed(1)}mm</div>
                        <div>💨 ${windSpeed.toFixed(1)}${this.getWindSpeedUnitLabel()}</div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // ==================== SAVED LOCATIONS ====================
    saveLocation() {
        if (!this.currentWeather) return;
        
        const location = {
            id: Date.now(),
            name: this.currentWeather.location,
            latitude: this.currentWeather.latitude,
            longitude: this.currentWeather.longitude,
            temp: this.currentWeather.temperature_2m,
            description: this.getWeatherDescription(this.currentWeather.weather_code),
            icon: this.getWeatherIcon(this.currentWeather.weather_code)
        };
        
        // Check if already saved
        if (this.savedLocations.some(l => l.name === location.name)) {
            this.showNotification('Location already saved', 'warning');
            return;
        }
        
        this.savedLocations.push(location);
        this.saveSavedLocations();
        this.showNotification('Location saved!', 'success');
    },
    
    renderSavedLocations() {
        const container = document.getElementById('savedLocations');
        
        if (this.savedLocations.length === 0) {
            container.innerHTML = '<div class="placeholder">No saved locations yet. Search and save a city!</div>';
            return;
        }
        
        container.innerHTML = this.savedLocations.map(location => `
            <div class="location-card">
                <div class="location-name">${location.name}</div>
                <div class="location-temp">${Math.round(location.temp)}°</div>
                <div class="location-desc">${location.description}</div>
                <div class="location-buttons">
                    <button onclick="app.loadSavedLocation(${location.latitude}, ${location.longitude}, '${location.name}')">📍 View</button>
                    <button onclick="app.removeSavedLocation('${location.id}')">🗑 Remove</button>
                </div>
            </div>
        `).join('');
    },
    
    loadSavedLocation(lat, lon, name) {
        this.showLoading();
        this.fetchWeather(lat, lon, name);
        this.switchView('current');
    },
    
    removeSavedLocation(id) {
        this.savedLocations = this.savedLocations.filter(l => l.id != id);
        this.saveSavedLocations();
        this.renderSavedLocations();
        this.showNotification('Location removed', 'success');
    },
    
    // ==================== THEME ====================
    setupTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = this.theme === 'dark' || (this.theme === 'auto' && prefersDark);
        
        if (isDark) {
            document.body.classList.add('dark-theme');
            document.getElementById('themeToggle').textContent = '☀️';
        } else {
            document.body.classList.remove('dark-theme');
            document.getElementById('themeToggle').textContent = '🌙';
        }
    },
    
    toggleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.theme);
        this.theme = themes[(currentIndex + 1) % themes.length];
        this.saveSettings();
        this.setupTheme();
        this.showNotification(`Theme: ${this.theme}`, 'success');
    },
    
    // ==================== SETTINGS ====================
    renderSettings() {
        document.querySelector('input[name="tempUnit"][value="' + this.tempUnit + '"]').checked = true;
        document.querySelector('input[name="windUnit"][value="' + this.windUnit + '"]').checked = true;
        document.querySelector('input[name="theme"][value="' + this.theme + '"]').checked = true;
    },
    
    // ==================== UTILITIES ====================
    getWeatherIcon(code) {
        // WMO Weather interpretation codes
        if (code === 0 || code === 1) return '☀️'; // Clear
        if (code === 2) return '⛅'; // Partly cloudy
        if (code === 3) return '☁️'; // Cloudy
        if (code === 45 || code === 48) return '🌫️'; // Foggy
        if (code === 51 || code === 53 || code === 55 || code === 61 || code === 63 || code === 65) return '🌧️'; // Rainy
        if (code === 71 || code === 73 || code === 75 || code === 77 || code === 80 || code === 81 || code === 82) return '❄️'; // Snow
        if (code === 85 || code === 86) return '🌨️'; // Snow showers
        if (code === 90 || code === 91 || code === 92 || code === 93) return '⛈️'; // Thunderstorm
        return '🌤️';
    },
    
    getWeatherDescription(code) {
        if (code === 0) return 'Clear sky';
        if (code === 1 || code === 2) return 'Mostly clear';
        if (code === 3) return 'Overcast';
        if (code === 45 || code === 48) return 'Foggy';
        if (code === 51 || code === 53 || code === 55) return 'Drizzle';
        if (code === 61 || code === 63 || code === 65) return 'Rain';
        if (code === 71 || code === 73 || code === 75) return 'Snow';
        if (code === 80 || code === 81 || code === 82) return 'Rain showers';
        if (code === 85 || code === 86) return 'Snow showers';
        if (code === 90 || code === 91 || code === 92 || code === 93) return 'Thunderstorm';
        return 'Unknown';
    },
    
    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return `${directions[index]} (${Math.round(degrees)}°)`;
    },
    
    getWindSpeedUnit() {
        if (this.windUnit === 'kmh') return 'kmh';
        if (this.windUnit === 'mph') return 'mph';
        return 'ms'; // default m/s
    },
    
    getWindSpeedUnitLabel() {
        if (this.windUnit === 'kmh') return 'km/h';
        if (this.windUnit === 'mph') return 'mph';
        return 'm/s';
    },
    
    // ==================== STORAGE ====================
    saveSettings() {
        const settings = {
            tempUnit: this.tempUnit,
            windUnit: this.windUnit,
            theme: this.theme
        };
        localStorage.setItem('weatherSettings', JSON.stringify(settings));
    },
    
    loadSettings() {
        const saved = localStorage.getItem('weatherSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.tempUnit = settings.tempUnit || 'celsius';
            this.windUnit = settings.windUnit || 'mps';
            this.theme = settings.theme || 'auto';
        }
    },
    
    saveSavedLocations() {
        localStorage.setItem('savedLocations', JSON.stringify(this.savedLocations));
    },
    
    loadSavedLocations() {
        const saved = localStorage.getItem('savedLocations');
        if (saved) {
            this.savedLocations = JSON.parse(saved);
        }
    },
    
    // ==================== UI HELPERS ====================
    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    },
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    },
    
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());