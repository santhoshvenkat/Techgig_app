/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

document.addEventListener('DOMContentLoaded', () => {
  // --- START THEME TOGGLE LOGIC ---
  const themeToggleBtn = document.getElementById('theme-toggle');

  const applyTheme = (theme: 'light' | 'dark') => {
      if (theme === 'dark') {
          document.body.classList.add('dark-mode');
      } else {
          document.body.classList.remove('dark-mode');
      }
      // Update theme-color meta for native UI
      const newBgColor = getComputedStyle(document.body).getPropertyValue('--bg-color');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', newBgColor.trim());
  };

  const toggleTheme = () => {
      const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
  };

  if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Apply saved theme or system preference
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
  if (savedTheme) {
      applyTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
  } else {
      applyTheme('light');
  }
  // --- END THEME TOGGLE LOGIC ---

  // A map of view elements for easy access.
  const views = {
    alarm: document.getElementById('alarm'),
    timer: document.getElementById('timer'),
    stopwatch: document.getElementById('stopwatch'),
    weather: document.getElementById('weather'),
  };

  type ViewKey = keyof typeof views;

  /**
   * Hides all views and shows the one specified by the key.
   * @param activeViewKey The key of the view to show.
   */
  const updateVisibleView = (activeViewKey: ViewKey | null) => {
    // Hide all views by adding the 'hidden' class.
    (Object.keys(views) as ViewKey[]).forEach(key => {
      views[key]?.classList.add('hidden');
    });

    // Show the active view by removing the 'hidden' class.
    if (activeViewKey && views[activeViewKey]) {
      views[activeViewKey]?.classList.remove('hidden');
      // Update theme color for better native integration
      const themeColor = getComputedStyle(views[activeViewKey]!).backgroundColor;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    }
  };

  /**
   * Handles the orientation change event and updates the visible view based
   * on the new orientation type.
   */
  const handleOrientationChange = () => {
    // screen.orientation.type is the modern API for orientation detection.
    const orientation = screen.orientation.type;

    switch (orientation) {
      case 'portrait-primary':
        updateVisibleView('alarm');
        break;
      case 'portrait-secondary':
        updateVisibleView('timer');
        break;
      case 'landscape-secondary': // Typically landscape with device rotated left (home button on right)
        updateVisibleView('stopwatch');
        break;
      case 'landscape-primary': // Typically landscape with device rotated right (home button on left)
        updateVisibleView('weather');
        break;
      default:
        // Default to alarm view for any other unhandled cases.
        updateVisibleView('alarm');
        break;
    }
  };

  // Set the initial view based on the current orientation when the app loads.
  handleOrientationChange();

  // Add an event listener for future orientation changes.
  // The 'change' event on screen.orientation is the recommended modern approach.
  try {
     screen.orientation.addEventListener('change', handleOrientationChange);
  } catch (e) {
     // Fallback for older browsers that might not support screen.orientation
     window.addEventListener('orientationchange', handleOrientationChange);
  }

  // --- START ALARM CLOCK LOGIC ---
  const currentTimeEl = document.getElementById('currentTime') as HTMLDivElement;
  const alarmTimeInput = document.getElementById('alarmTime') as HTMLInputElement;
  const setAlarmBtn = document.getElementById('setAlarmBtn') as HTMLButtonElement;
  const clearAlarmBtn = document.getElementById('clearAlarmBtn') as HTMLButtonElement;
  const alarmStatusEl = document.getElementById('alarmStatus') as HTMLParagraphElement;
  const alarmSound = document.getElementById('alarmSound') as HTMLAudioElement;

  let alarmTimeoutId: number | undefined;

  const updateCurrentTime = () => {
    if (!currentTimeEl) return;
    const now = new Date();
    
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    const year = now.getFullYear();
    const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    currentTimeEl.textContent = `${weekday}, ${day} ${month} ${year} | ${timePart}`;
  };
  
  if (currentTimeEl) {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
  }

  const triggerAlarm = () => {
    if (!alarmSound || !alarmStatusEl || !clearAlarmBtn) return;
    alarmSound.loop = true;
    alarmSound.play().catch(e => console.error("Error playing sound:", e));
    alarmStatusEl.textContent = "Wake up!";
    document.getElementById('alarm')?.classList.add('alarming');
    clearAlarmBtn.textContent = 'Stop Alarm';
  };
  
  const setAlarm = () => {
    if (!alarmTimeInput || !alarmStatusEl) return;
    const timeValue = alarmTimeInput.value;
    if (!timeValue) {
      alarmStatusEl.textContent = 'Please select a valid time.';
      return;
    }

    const now = new Date();
    const [hours, minutes] = timeValue.split(':');
    const alarmTime = new Date();
    alarmTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    let timeToAlarm = alarmTime.getTime() - now.getTime();
    if (timeToAlarm < 0) {
      timeToAlarm += 24 * 60 * 60 * 1000;
    }
    
    const alarmDateTime = new Date(now.getTime() + timeToAlarm);
    alarmTimeoutId = window.setTimeout(triggerAlarm, timeToAlarm);

    alarmStatusEl.textContent = `Alarm set for ${alarmDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    setAlarmBtn.disabled = true;
    clearAlarmBtn.disabled = false;
    alarmTimeInput.disabled = true;
  };

  const clearAlarm = () => {
    if (!alarmSound || !alarmStatusEl || !setAlarmBtn || !clearAlarmBtn || !alarmTimeInput) return;

    if (alarmTimeoutId) {
      clearTimeout(alarmTimeoutId);
      alarmTimeoutId = undefined;
    }
    alarmSound.pause();
    alarmSound.currentTime = 0;
    alarmSound.loop = false;
    
    alarmStatusEl.textContent = 'Alarm cleared.';
    setTimeout(() => {
        if(alarmStatusEl.textContent === 'Alarm cleared.') {
            alarmStatusEl.textContent = '';
        }
    }, 2000);

    setAlarmBtn.disabled = false;
    clearAlarmBtn.disabled = true;
    clearAlarmBtn.textContent = 'Clear Alarm';
    alarmTimeInput.disabled = false;
    alarmTimeInput.value = '';
    document.getElementById('alarm')?.classList.remove('alarming');
  };

  if(setAlarmBtn && clearAlarmBtn && alarmTimeInput && alarmStatusEl && alarmSound) {
    setAlarmBtn.addEventListener('click', setAlarm);
    clearAlarmBtn.addEventListener('click', clearAlarm);
  }
  // --- END ALARM CLOCK LOGIC ---


  // --- START TIMER LOGIC ---
  const timerDisplay = document.getElementById('timerDisplay') as HTMLDivElement;
  const minutesInput = document.getElementById('timerMinutes') as HTMLInputElement;
  const secondsInput = document.getElementById('timerSeconds') as HTMLInputElement;
  const startTimerBtn = document.getElementById('startTimerBtn') as HTMLButtonElement;
  const pauseTimerBtn = document.getElementById('pauseTimerBtn') as HTMLButtonElement;
  const resetTimerBtn = document.getElementById('resetTimerBtn') as HTMLButtonElement;
  const timerSound = document.getElementById('timerSound') as HTMLAudioElement;

  let timerIntervalId: number | undefined;
  let secondsRemaining = 0;
  let isPaused = false;

  const updateTimerDisplay = () => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    const minutes = parseInt(minutesInput.value, 10) || 0;
    const seconds = parseInt(secondsInput.value, 10) || 0;
    const totalSeconds = (minutes * 60) + seconds;

    if (totalSeconds <= 0) {
      return;
    }

    secondsRemaining = totalSeconds;
    updateTimerDisplay();

    timerIntervalId = window.setInterval(tick, 1000);
    isPaused = false;

    startTimerBtn.disabled = true;
    pauseTimerBtn.disabled = false;
    pauseTimerBtn.textContent = 'Pause';
    resetTimerBtn.disabled = false;
    minutesInput.disabled = true;
    secondsInput.disabled = true;
  };

  const pauseTimer = () => {
    if (isPaused) { // Resume
      timerIntervalId = window.setInterval(tick, 1000);
      isPaused = false;
      pauseTimerBtn.textContent = 'Pause';
    } else { // Pause
      clearInterval(timerIntervalId);
      isPaused = true;
      pauseTimerBtn.textContent = 'Resume';
    }
  };

  const resetTimer = () => {
    clearInterval(timerIntervalId);
    timerIntervalId = undefined;
    secondsRemaining = 0;
    isPaused = false;
    
    updateTimerDisplay();
    timerSound.pause();
    timerSound.currentTime = 0;
    views.timer?.classList.remove('timer-finished');
    
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
    pauseTimerBtn.textContent = 'Pause';
    resetTimerBtn.disabled = true;
    minutesInput.disabled = false;
    secondsInput.disabled = false;
    minutesInput.value = '';
    secondsInput.value = '';
  };

  const tick = () => {
    secondsRemaining--;
    updateTimerDisplay();
    if (secondsRemaining <= 0) {
      clearInterval(timerIntervalId);
      timerSound.loop = true;
      timerSound.play().catch(e => console.error("Error playing timer sound:", e));
      views.timer?.classList.add('timer-finished');
    }
  };

  if(timerDisplay && minutesInput && secondsInput && startTimerBtn && pauseTimerBtn && resetTimerBtn && timerSound) {
    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);
  }
  // --- END TIMER LOGIC ---

  // --- START STOPWATCH LOGIC ---
  const stopwatchDisplay = document.getElementById('stopwatchDisplay') as HTMLDivElement;
  const stopwatchMillisecondsEl = document.querySelector('#stopwatchDisplay .milliseconds') as HTMLSpanElement;
  const primaryBtn = document.getElementById('stopwatchPrimaryBtn') as HTMLButtonElement;
  const secondaryBtn = document.getElementById('stopwatchSecondaryBtn') as HTMLButtonElement;
  const lapsList = document.getElementById('stopwatchLaps') as HTMLOListElement;

  let stopwatchIntervalId: number | undefined;
  let startTime = 0;
  let elapsedTime = 0;
  let isRunning = false;
  let lapCounter = 1;

  const formatTime = (timeInMs: number) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const milliseconds = Math.floor((timeInMs % 1000) / 10).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const minutes = (Math.floor(totalSeconds / 60) % 60).toString().padStart(2, '0');
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    return { hours, minutes, seconds, milliseconds };
  };

  const updateStopwatchDisplay = () => {
      const currentTime = Date.now();
      const currentElapsedTime = elapsedTime + (isRunning ? currentTime - startTime : 0);
      const formatted = formatTime(currentElapsedTime);
      stopwatchDisplay.childNodes[0].nodeValue = `${formatted.hours}:${formatted.minutes}:${formatted.seconds}`;
      if (stopwatchMillisecondsEl) {
        stopwatchMillisecondsEl.textContent = `.${formatted.milliseconds}`;
      }
  };

  const handlePrimaryClick = () => {
      isRunning = !isRunning;
      if (isRunning) { // Start
          startTime = Date.now();
          stopwatchIntervalId = window.setInterval(updateStopwatchDisplay, 10);
          primaryBtn.textContent = 'Stop';
          primaryBtn.classList.add('running');
          secondaryBtn.textContent = 'Lap';
          secondaryBtn.disabled = false;
      } else { // Stop
          clearInterval(stopwatchIntervalId);
          elapsedTime += Date.now() - startTime;
          primaryBtn.textContent = 'Start';
          primaryBtn.classList.remove('running');
          secondaryBtn.textContent = 'Reset';
      }
  };

  const handleSecondaryClick = () => {
      if (isRunning) { // Lap
          const lapTime = elapsedTime + (Date.now() - startTime);
          const formatted = formatTime(lapTime);
          const li = document.createElement('li');
          li.innerHTML = `<span>Lap ${lapCounter}</span><span>${formatted.hours}:${formatted.minutes}:${formatted.seconds}.${formatted.milliseconds}</span>`;
          lapsList.prepend(li); // Add to top of the list
          lapCounter++;
      } else { // Reset
          elapsedTime = 0;
          startTime = 0;
          lapCounter = 1;
          lapsList.innerHTML = '';
          updateStopwatchDisplay();
          secondaryBtn.disabled = true;
      }
  };

  if (stopwatchDisplay && primaryBtn && secondaryBtn && lapsList) {
      primaryBtn.addEventListener('click', handlePrimaryClick);
      secondaryBtn.addEventListener('click', handleSecondaryClick);
  }
  // --- END STOPWATCH LOGIC ---
  
  // --- START WEATHER LOGIC ---
    const weatherView = document.getElementById('weather');
    const weatherStatusEl = document.getElementById('weatherStatus') as HTMLParagraphElement;
    const weatherCardEl = document.getElementById('weatherCard') as HTMLDivElement;
    const weatherCityEl = document.getElementById('weatherCity') as HTMLHeadingElement;
    const weatherIconEl = document.getElementById('weatherIcon') as HTMLImageElement;
    const weatherTempEl = document.getElementById('weatherTemp') as HTMLParagraphElement;
    const weatherDescEl = document.getElementById('weatherDesc') as HTMLParagraphElement;
    
    const OPENWEATHER_API_KEY = '84e812b72370962450dcca964fb64d55';

    const updateWeatherUI = (data: any) => {
        weatherCityEl.textContent = data.name;
        weatherTempEl.textContent = `${Math.round(data.main.temp)}°C`;
        weatherDescEl.textContent = data.weather[0].description;
        weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        weatherIconEl.alt = data.weather[0].description;
        
        weatherStatusEl.classList.add('hidden');
        weatherCardEl.classList.remove('hidden');
    };

    const fetchWeather = async (lat: number, lon: number) => {
        weatherStatusEl.textContent = 'Loading weather...';
        weatherStatusEl.classList.remove('hidden');
        weatherCardEl.classList.add('hidden');

        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`);
            if (!response.ok) {
                throw new Error(`Weather data not available (HTTP ${response.status})`);
            }
            const data = await response.json();
            updateWeatherUI(data);
            weatherView?.setAttribute('data-loaded', 'true');
        } catch (error) {
            weatherStatusEl.textContent = `Error: ${error instanceof Error ? error.message : 'Could not fetch weather'}.`;
        }
    };
    
    const getWeather = () => {
        if (!weatherView || weatherView.getAttribute('data-loaded') === 'true') {
            return; // Don't fetch if already loaded
        }
        
        if ('geolocation' in navigator) {
            weatherStatusEl.textContent = 'Requesting location...';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    weatherStatusEl.textContent = `Error: ${error.message}. Please enable location services.`;
                }
            );
        } else {
            weatherStatusEl.textContent = 'Geolocation is not supported by your browser.';
        }
    };
    
    // Use Intersection Observer to trigger fetch only when the view is visible
    if(weatherView) {
      const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  getWeather();
              }
          });
      }, { threshold: 0.1 }); // Trigger when 10% of the element is visible
      
      observer.observe(weatherView);
    }
  // --- END WEATHER LOGIC ---
});