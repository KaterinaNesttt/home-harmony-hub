import { useState, useEffect, useCallback } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets,
  Eye, Thermometer, Shirt, Umbrella, FootprintsIcon, RefreshCw, MapPin
} from 'lucide-react';

interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  visibility: number;
  description: string;
  code: number;
  icon: string;
  forecast: ForecastDay[];
}

interface ForecastDay {
  date: string;
  temp_max: number;
  temp_min: number;
  code: number;
  description: string;
}

interface Advice {
  clothes: string[];
  shoes: string[];
  umbrella: boolean;
  umbrellaText: string;
  summary: string;
}

function getWeatherIcon(code: number, large = false) {
  const cls = large ? 'w-16 h-16' : 'w-6 h-6';
  if (code >= 200 && code < 300) return <CloudLightning className={cls} />;
  if (code >= 300 && code < 600) return <CloudRain className={cls} />;
  if (code >= 600 && code < 700) return <CloudSnow className={cls} />;
  if (code === 800) return <Sun className={cls} />;
  if (code > 800) return <Cloud className={cls} />;
  return <Cloud className={cls} />;
}

function getAdvice(weather: WeatherData): Advice {
  const { temp, code, wind_speed, humidity } = weather;
  const isRain = code >= 200 && code < 600;
  const isSnow = code >= 600 && code < 700;
  const isWind = wind_speed > 10;
  const isCold = temp < 5;
  const isCool = temp >= 5 && temp < 15;
  const isWarm = temp >= 15 && temp < 25;
  const isHot = temp >= 25;

  const clothes: string[] = [];
  const shoes: string[] = [];

  if (isCold) {
    clothes.push('🧥 Важке пальто або пуховик');
    clothes.push('🧣 Шарф і шапка обов\'язкові');
    clothes.push('🧤 Теплі рукавички');
    shoes.push('👢 Утеплені зимові чоботи');
    shoes.push('🧦 Термо-шкарпетки');
  } else if (isCool) {
    clothes.push('🧥 Куртка або тепла кофта');
    clothes.push('👕 Шаруватий одяг — краще кілька шарів');
    if (isWind) clothes.push('🧣 Шарф від вітру');
    shoes.push('👟 Закрите взуття');
    shoes.push('👞 Черевики підійдуть ідеально');
  } else if (isWarm) {
    clothes.push('👔 Легка сорочка або блузка');
    if (isWind || isRain) clothes.push('🧥 Легка куртка на всяк випадок');
    else clothes.push('☀️ Досить легкого одягу');
    shoes.push('👟 Кросівки або мокасини');
    shoes.push('👟 Будь-яке зручне взуття');
  } else {
    clothes.push('👕 Легкі майки і шорти');
    clothes.push('🕶️ Сонцезахисні окуляри');
    clothes.push('🧴 Сонцезахисний крем — обов\'язково!');
    shoes.push('👡 Сандалі або відкрите взуття');
    shoes.push('👟 Легкі кросівки');
  }

  if (isSnow) {
    clothes.splice(0, 0, '❄️ Сніг! Одягайтесь по-зимовому');
    shoes.splice(0, 0, '👢 Непромокаючі чоботи — must have');
  }

  const umbrella = isRain || humidity > 80;
  const umbrellaText = isRain
    ? '☔ Парасоля обов\'язкова — очікуються опади!'
    : humidity > 80
    ? '🌂 Можливий дощ — краще взяти парасолю'
    : '✨ Парасоля не потрібна — гарна погода';

  const summaries: string[] = [];
  if (isCold && isSnow) summaries.push('Зимова казка, але тепліше вдягайтесь!');
  else if (isCold) summaries.push('Мороз! Не забудьте утеплитися.');
  else if (isRain && isCool) summaries.push('Типова осіння погода — куртка і парасоля');
  else if (isHot) summaries.push('Спекотний день — залишайтесь гідратованими');
  else if (isWarm && !isRain) summaries.push('Чудова погода для прогулянки!');
  else summaries.push('Звичайний день — одягайтесь комфортно');

  return { clothes, shoes, umbrella, umbrellaText, summary: summaries[0] };
}

const weekdays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      // Using Open-Meteo (free, no API key needed)
      const [currentRes, forecastRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,visibility,weather_code&timezone=auto`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`),
      ]);
      const current = await currentRes.json();
      const forecast = await forecastRes.json();

      // Reverse geocode with nominatim
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const geo = await geoRes.json();
      const city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || 'Ваше місто';

      const wc = current.current.weather_code;
      const descriptions: Record<number, string> = {
        0:'Ясно', 1:'Переважно ясно', 2:'Мінлива хмарність', 3:'Похмуро',
        45:'Туман', 48:'Паморозний туман',
        51:'Мряка', 53:'Мряка помірна', 55:'Мряка сильна',
        61:'Дощ слабкий', 63:'Дощ помірний', 65:'Дощ сильний',
        71:'Сніг слабкий', 73:'Сніг помірний', 75:'Сніг сильний',
        77:'Снігова крупа', 80:'Злива слабка', 81:'Злива помірна', 82:'Злива сильна',
        85:'Снігові зливи', 86:'Снігові зливи сильні',
        95:'Гроза', 96:'Гроза з градом', 99:'Гроза з сильним градом',
      };

      // Map open-meteo weather code to OWM-like code for icons
      const codeMap = (wc: number) => {
        if (wc === 0) return 800;
        if (wc <= 3) return 801 + (wc - 1);
        if (wc <= 48) return 741;
        if (wc <= 55) return 300;
        if (wc <= 65) return 500;
        if (wc <= 77) return 600;
        if (wc <= 82) return 520;
        if (wc <= 86) return 620;
        return 200;
      };

      setWeather({
        city,
        temp: Math.round(current.current.temperature_2m),
        feels_like: Math.round(current.current.apparent_temperature),
        humidity: current.current.relative_humidity_2m,
        wind_speed: Math.round(current.current.wind_speed_10m),
        visibility: Math.round((current.current.visibility || 10000) / 1000),
        description: descriptions[wc] || 'Невідомо',
        code: codeMap(wc),
        icon: '',
        forecast: forecast.daily.time.slice(1, 6).map((date: string, i: number) => ({
          date,
          temp_max: Math.round(forecast.daily.temperature_2m_max[i + 1]),
          temp_min: Math.round(forecast.daily.temperature_2m_min[i + 1]),
          code: codeMap(forecast.daily.weather_code[i + 1]),
          description: descriptions[forecast.daily.weather_code[i + 1]] || '',
        })),
      });
      setError(null);
    } catch (e) {
      setError('Не вдалося завантажити погоду');
    }
  }, []);

  const locate = useCallback(() => {
    setLoading(true);
    if (!navigator.geolocation) {
      setError('Геолокація недоступна');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        await fetchWeather(pos.coords.latitude, pos.coords.longitude);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        // fallback: Kyiv
        fetchWeather(50.45, 30.52).then(() => { setLoading(false); setRefreshing(false); });
      }
    );
  }, [fetchWeather]);

  useEffect(() => { locate(); }, [locate]);

  const handleRefresh = () => { setRefreshing(true); locate(); };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center animate-pulse">
          <Cloud className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground">Визначаємо погоду...</p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <p className="text-destructive">{error || 'Помилка'}</p>
        <button onClick={locate} className="btn-gold px-6 py-3 rounded-2xl font-bold tap-scale">
          Спробувати знову
        </button>
      </div>
    );
  }

  const advice = getAdvice(weather);

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Погода</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{weather.city}</span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="glass w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main weather card */}
      <div className="glass-strong rounded-3xl p-6 animate-scale-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-end gap-2">
              <span className="text-7xl font-bold font-display text-gold leading-none">{weather.temp}°</span>
              <span className="text-2xl text-muted-foreground mb-2">C</span>
            </div>
            <p className="text-lg font-medium text-foreground mt-1">{weather.description}</p>
            <p className="text-sm text-muted-foreground">Відчувається як {weather.feels_like}°</p>
          </div>
          <div className="text-gold/80 drop-shadow-[0_0_20px_hsla(42,85%,58%,0.5)]">
            {getWeatherIcon(weather.code, true)}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-border/40">
          {[
            { icon: <Droplets className="w-4 h-4" />, val: `${weather.humidity}%`, label: 'Вологість' },
            { icon: <Wind className="w-4 h-4" />, val: `${weather.wind_speed}км/г`, label: 'Вітер' },
            { icon: <Eye className="w-4 h-4" />, val: `${weather.visibility}км`, label: 'Видим.' },
            { icon: <Thermometer className="w-4 h-4" />, val: `${weather.feels_like}°`, label: 'Відчув.' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="flex justify-center text-primary mb-1">{s.icon}</div>
              <p className="text-sm font-bold">{s.val}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">5 Днів</h2>
        <div className="space-y-2.5">
          {weather.forecast.map((day, i) => {
            const d = new Date(day.date);
            return (
              <div key={i} className="flex items-center justify-between tap-scale">
                <span className="text-sm font-semibold w-8">{weekdays[d.getDay()]}</span>
                <span className="text-muted-foreground">{getWeatherIcon(day.code)}</span>
                <span className="text-xs text-muted-foreground flex-1 ml-2">{day.description}</span>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-foreground">{day.temp_max}°</span>
                  <span className="text-muted-foreground">{day.temp_min}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Umbrella advice */}
      <div
        className={`rounded-2xl p-4 flex items-center gap-3 animate-slide-up ${
          advice.umbrella
            ? 'bg-accent/15 border border-accent/30'
            : 'bg-green-500/10 border border-green-500/20'
        }`}
        style={{ animationDelay: '0.15s' }}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${advice.umbrella ? 'bg-accent/20' : 'bg-green-500/20'}`}>
          <Umbrella className={`w-5 h-5 ${advice.umbrella ? 'text-accent' : 'text-green-500'}`} />
        </div>
        <p className="text-sm font-medium">{advice.umbrellaText}</p>
      </div>

      {/* Clothing advice */}
      <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Shirt className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-bold text-base">Що вдягнути</h2>
        </div>
        <div className="space-y-2">
          {advice.clothes.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm animate-fade-in" style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              {c}
            </div>
          ))}
        </div>
      </div>

      {/* Shoes advice */}
      <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <span className="text-base">👟</span>
          </div>
          <h2 className="font-bold text-base">Яке взуття</h2>
        </div>
        <div className="space-y-2">
          {advice.shoes.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm animate-fade-in" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="glass-strong rounded-2xl p-4 text-center animate-scale-in" style={{ animationDelay: '0.35s' }}>
        <p className="text-base font-bold text-gold-shimmer font-display">{advice.summary}</p>
      </div>
    </div>
  );
}
