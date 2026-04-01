import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Eye,
  RefreshCw,
  Shirt,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  MapPin,
  X,
  Search,
  Umbrella,
  Wind,
} from 'lucide-react';
import { getAdvice, type AdviceHourlyEntry } from '@/lib/weather-advice';
import type { WardrobeSuggestion } from '@/types';

interface WeatherPageProps {
  wardrobeCount: number;
  lastSuggestion: WardrobeSuggestion | null;
  onSuggestOutfit: (params: {
    temp: number;
    tempMin: number;
    tempMax: number;
    precip: number;
    windSpeed: number;
    weatherDesc: string;
    season: string;
  }) => Promise<WardrobeSuggestion | null>;
  onSaveOutfit: (itemIds: string[], weatherTemp: number) => Promise<unknown>;
}

interface WeatherData {
  city: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  weatherCode: number;
  weatherText: string;
  precipChance: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  tempMin: number;
  tempMax: number;
  hourly: AdviceHourlyEntry[];
}

interface CityResult {
  name: string;
  country: string;
  admin1?: string;
  lat: number;
  lon: number;
}


const DEFAULT_CITY = {
  name: 'Кропивницький',
  lat: 48.51,
  lon: 32.26,
};

const WEATHER_TEXT: Record<number, string> = {
  0: 'Ясно',
  1: 'Переважно ясно',
  2: 'Мінлива хмарність',
  3: 'Похмуро',
  45: 'Туман',
  48: 'Паморозний туман',
  51: 'Мряка',
  53: 'Мряка помірна',
  55: 'Мряка сильна',
  61: 'Дощ слабкий',
  63: 'Дощ помірний',
  65: 'Дощ сильний',
  71: 'Сніг слабкий',
  73: 'Сніг помірний',
  75: 'Сніг сильний',
  77: 'Снігова крупа',
  80: 'Злива слабка',
  81: 'Злива помірна',
  82: 'Злива сильна',
  85: 'Снігові зливи',
  86: 'Снігові зливи сильні',
  95: 'Гроза',
  96: 'Гроза з градом',
  99: 'Гроза з сильним градом',
};

function getWeatherIcon(code: number, large = false) {
  const className = large ? 'w-14 h-14' : 'w-5 h-5';
  if (code >= 200 && code < 300) return <CloudLightning className={className} />;
  if (code >= 300 && code < 600) return <CloudRain className={className} />;
  if (code >= 600 && code < 700) return <CloudSnow className={className} />;
  if (code === 800) return <Sun className={className} />;
  if (code > 800) return <Cloud className={className} />;
  return <Cloud className={className} />;
}

function weatherCodeToIconCode(code: number) {
  if (code === 0) return 800;
  if (code <= 3) return 801;
  if (code <= 48) return 741;
  if (code <= 55) return 300;
  if (code <= 65) return 500;
  if (code <= 77) return 600;
  if (code <= 86) return 620;
  return 200;
}

function currentSeason() {
  const month = new Date().getMonth() + 1;
  if (month === 12 || month <= 2) return 'Зима';
  if (month <= 5) return 'Весна';
  if (month <= 8) return 'Літо';
  return 'Осінь';
}

function shouldAutoSuggest() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 10;
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

async function resolveCity(lat: number, lon: number) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const data = await response.json();
    return data.address?.city || data.address?.town || data.address?.village || DEFAULT_CITY.name;
  } catch {
    return DEFAULT_CITY.name;
  }
}

async function fetchWeather(lat: number, lon: number, cityName?: string): Promise<WeatherData> {
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,visibility,weather_code` +
      `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,uv_index` +
      `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max` +
      `&start_date=${today}&end_date=${today}&timezone=auto`,
  );
  const data = await response.json();
  const city = cityName || (await resolveCity(lat, lon));
  const currentHour = new Date().getHours();

  const hourly: AdviceHourlyEntry[] = (data.hourly?.time || [])
    .map((time: string, index: number) => ({
      time: `${new Date(time).getHours().toString().padStart(2, '0')}:00`,
      temp: Math.round(data.hourly.temperature_2m[index]),
      apparent_temp: Math.round(data.hourly.apparent_temperature[index]),
      code: weatherCodeToIconCode(data.hourly.weather_code[index]),
      precipitation_probability: data.hourly.precipitation_probability[index] ?? 0,
    }))
    .filter((_: AdviceHourlyEntry, index: number) => index >= currentHour);

  return {
    city,
    temp: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    humidity: data.current.relative_humidity_2m,
    windSpeed: Math.round(data.current.wind_speed_10m),
    visibility: Math.round((data.current.visibility || 10000) / 1000),
    weatherCode: weatherCodeToIconCode(data.current.weather_code),
    weatherText: WEATHER_TEXT[data.current.weather_code] || 'Невідомо',
    precipChance: data.daily.precipitation_probability_max?.[0] ?? 0,
    uvIndex: Math.round(data.daily.uv_index_max?.[0] ?? 0),
    sunrise: formatClock(data.daily.sunrise?.[0]),
    sunset: formatClock(data.daily.sunset?.[0]),
    tempMin: Math.round(data.daily.temperature_2m_min?.[0] ?? data.current.temperature_2m),
    tempMax: Math.round(data.daily.temperature_2m_max?.[0] ?? data.current.temperature_2m),
    hourly,
  };
}

export function WeatherPage({ wardrobeCount, lastSuggestion, onSuggestOutfit, onSaveOutfit }: WeatherPageProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [savingOutfit, setSavingOutfit] = useState(false);

  const loadWeather = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.geolocation) {
        setWeather(await fetchWeather(DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY.name));
        return;
      }

      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            setWeather(await fetchWeather(position.coords.latitude, position.coords.longitude));
            resolve();
          },
          async () => {
            setWeather(await fetchWeather(DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY.name));
            resolve();
          },
          { timeout: 5000 },
        );
      });
    } catch {
      setError('Не вдалося завантажити погоду');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const advice = useMemo(() => {
    if (!weather) return null;
    return getAdvice({
      temp: weather.temp,
      feels_like: weather.feelsLike,
      humidity: weather.humidity,
      wind_speed: weather.windSpeed,
      code: weather.weatherCode,
      precipitation_probability: weather.precipChance,
      uv_index: weather.uvIndex,
      hourly: weather.hourly,
    });
  }, [weather]);

  const requestOutfit = useCallback(async () => {
    if (!weather || wardrobeCount === 0) return;
    setSuggesting(true);
    try {
      await onSuggestOutfit({
        temp: weather.temp,
        tempMin: weather.tempMin,
        tempMax: weather.tempMax,
        precip: weather.precipChance,
        windSpeed: weather.windSpeed,
        weatherDesc: weather.weatherText,
        season: currentSeason(),
      });
    } finally {
      setSuggesting(false);
    }
  }, [onSuggestOutfit, wardrobeCount, weather]);

  useEffect(() => {
    if (weather && wardrobeCount > 0 && shouldAutoSuggest() && !lastSuggestion) {
      void requestOutfit();
    }
  }, [lastSuggestion, requestOutfit, wardrobeCount, weather]);

  const saveSuggestedOutfit = useCallback(async () => {
    if (!lastSuggestion?.outfit.length || !weather) return;
    setSavingOutfit(true);
    try {
      await onSaveOutfit(lastSuggestion.outfit, weather.temp);
    } finally {
      setSavingOutfit(false);
    }
  }, [lastSuggestion, onSaveOutfit, weather]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center animate-pulse">
          <Cloud className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground">Завантажуємо погоду...</p>
      </div>
    );
  }

  if (error || !weather || !advice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <p className="text-destructive">{error || 'Дані погоди недоступні'}</p>
        <button
          onClick={() => {
            setLoading(true);
            setRefreshing(true);
            void loadWeather();
          }}
          className="btn-gold px-6 py-3 rounded-2xl font-bold tap-scale"
        >
          Спробувати знову
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Погода</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{weather.city}</p>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            void loadWeather();
          }}
          className="glass w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="glass-strong rounded-3xl p-6 animate-scale-in space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-end gap-2">
              <span className="text-7xl font-bold font-display text-gold leading-none">{weather.temp}°</span>
              <span className="text-2xl text-muted-foreground mb-2">C</span>
            </div>
            <p className="text-lg font-medium text-foreground mt-1">{weather.weatherText}</p>
            <p className="text-sm text-muted-foreground">Відчувається як {weather.feelsLike}°</p>
          </div>
          <div className="text-gold/80 drop-shadow-[0_0_20px_hsla(42,85%,58%,0.5)]">{getWeatherIcon(weather.weatherCode, true)}</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-2xl p-3 text-center">
            <Droplets className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold">{weather.precipChance}%</p>
            <p className="text-[10px] text-muted-foreground">Опади</p>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <Wind className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold">{weather.windSpeed} км/г</p>
            <p className="text-[10px] text-muted-foreground">Вітер</p>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <Eye className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold">UV {weather.uvIndex}</p>
            <p className="text-[10px] text-muted-foreground">Індекс</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <Sunrise className="w-4 h-4 text-gold flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Схід</p>
              <p className="text-sm font-semibold">{weather.sunrise}</p>
            </div>
          </div>
          <div className="glass rounded-2xl p-3 flex items-center gap-3">
            <Sunset className="w-4 h-4 text-gold flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Захід</p>
              <p className="text-sm font-semibold">{weather.sunset}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl p-4 flex items-center gap-3 animate-slide-up ${advice.umbrella ? 'bg-accent/15 border border-accent/30' : 'bg-green-500/10 border border-green-500/20'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${advice.umbrella ? 'bg-accent/20' : 'bg-green-500/20'}`}>
          <Umbrella className={`w-5 h-5 ${advice.umbrella ? 'text-accent' : 'text-green-500'}`} />
        </div>
        <p className="text-sm font-medium">{advice.umbrellaText}</p>
      </div>

      <div className="glass rounded-2xl p-4 animate-slide-up">
        <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Що вдягнути</h2>
        <div className="space-y-2">
          {advice.clothes.map((item, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <span>🧥</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4 animate-slide-up">
        <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Взуття та аксесуари</h2>
        <div className="space-y-2 mb-3">
          {advice.shoes.map((item, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <span>👟</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {advice.accessories.map((item, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <span>{item.includes('Парасолька') ? '☂️' : '🧤'}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4 animate-slide-up">
        <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Пояснення</h2>
        <p className="text-sm font-medium mb-3">{advice.summary}</p>
        <p className="text-sm text-muted-foreground">{advice.morningHint}</p>
      </div>





      <div className="glass-strong rounded-2xl p-4 animate-slide-up">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Shirt className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold">Що вдягнути сьогодні?</h2>
              <p className="text-xs text-muted-foreground">Підбір образу з твого гардероба</p>
            </div>
          </div>
          <button
            onClick={() => void requestOutfit()}
            disabled={suggesting || wardrobeCount === 0}
            className="btn-gold px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {suggesting ? 'Підбираю...' : 'Підібрати'}
          </button>
        </div>

        {wardrobeCount === 0 && (
          <p className="text-sm text-muted-foreground">Додай речі в блок «Мій гардероб», щоб отримувати персональні образи.</p>
        )}

        {lastSuggestion && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{lastSuggestion.explanation}</p>
            <div className="space-y-2">
              {lastSuggestion.items.map((item) => (
                <div key={item.id} className="glass rounded-xl p-3 flex items-center gap-3">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg">👗</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => void saveSuggestedOutfit()}
              disabled={savingOutfit || !lastSuggestion.outfit.length}
              className="glass w-full py-3 rounded-xl font-semibold"
            >
              {savingOutfit ? 'Зберігаю...' : 'Зберегти образ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
