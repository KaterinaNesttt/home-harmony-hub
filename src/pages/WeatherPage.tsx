import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets,
  Eye, Thermometer, Shirt, Umbrella, RefreshCw, MapPin, Search, X
} from 'lucide-react';
import { getAdvice, getMorningCommuteAdvice } from '@/lib/weather-advice';

interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  visibility: number;
  description: string;
  code: number;
  hourly: HourlyEntry[];
  tomorrow: TomorrowData;
}

interface HourlyEntry {
  time: string;
  temp: number;
  apparent_temp?: number;
  code: number;
  description: string;
  precipitation_probability: number;
}

interface TomorrowData {
  temp_max: number;
  temp_min: number;
  code: number;
  description: string;
  precipitation_probability: number;
}

interface CityResult {
  name: string;
  country: string;
  admin1?: string;
  lat: number;
  lon: number;
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

const WC_DESCRIPTIONS: Record<number, string> = {
  0:'РЇСЃРЅРѕ', 1:'РџРµСЂРµРІР°Р¶РЅРѕ СЏСЃРЅРѕ', 2:'РњС–РЅР»РёРІР° С…РјР°СЂРЅС–СЃС‚СЊ', 3:'РџРѕС…РјСѓСЂРѕ',
  45:'РўСѓРјР°РЅ', 48:'РџР°РјРѕСЂРѕР·РЅРёР№ С‚СѓРјР°РЅ',
  51:'РњСЂСЏРєР°', 53:'РњСЂСЏРєР° РїРѕРјС–СЂРЅР°', 55:'РњСЂСЏРєР° СЃРёР»СЊРЅР°',
  61:'Р”РѕС‰ СЃР»Р°Р±РєРёР№', 63:'Р”РѕС‰ РїРѕРјС–СЂРЅРёР№', 65:'Р”РѕС‰ СЃРёР»СЊРЅРёР№',
  71:'РЎРЅС–Рі СЃР»Р°Р±РєРёР№', 73:'РЎРЅС–Рі РїРѕРјС–СЂРЅРёР№', 75:'РЎРЅС–Рі СЃРёР»СЊРЅРёР№',
  77:'РЎРЅС–РіРѕРІР° РєСЂСѓРїР°', 80:'Р—Р»РёРІР° СЃР»Р°Р±РєР°', 81:'Р—Р»РёРІР° РїРѕРјС–СЂРЅР°', 82:'Р—Р»РёРІР° СЃРёР»СЊРЅР°',
  85:'РЎРЅС–РіРѕРІС– Р·Р»РёРІРё', 86:'РЎРЅС–РіРѕРІС– Р·Р»РёРІРё СЃРёР»СЊРЅС–',
  95:'Р“СЂРѕР·Р°', 96:'Р“СЂРѕР·Р° Р· РіСЂР°РґРѕРј', 99:'Р“СЂРѕР·Р° Р· СЃРёР»СЊРЅРёРј РіСЂР°РґРѕРј',
};

function codeMap(wc: number): number {
  if (wc === 0) return 800;
  if (wc <= 3) return 801 + (wc - 1);
  if (wc <= 48) return 741;
  if (wc <= 55) return 300;
  if (wc <= 65) return 500;
  if (wc <= 77) return 600;
  if (wc <= 82) return 520;
  if (wc <= 86) return 620;
  return 200;
}

function isMorningCommuteTime(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const totalMin = now.getHours() * 60 + now.getMinutes();
  return totalMin >= 6 * 60 + 50 && totalMin <= 8 * 60;
}

const SAVED_CITY_KEY = 'hhh_weather_city';

async function fetchWeatherByCoords(lat: number, lon: number, cityName?: string): Promise<WeatherData> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  const [currentRes, hourlyRes, dailyRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,visibility,weather_code` +
      `&timezone=auto`
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability` +
      `&start_date=${todayStr}&end_date=${todayStr}&timezone=auto`
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&start_date=${tomorrowStr}&end_date=${tomorrowStr}&timezone=auto`
    ),
  ]);

  const current = await currentRes.json();
  const hourlyData = await hourlyRes.json();
  const dailyData = await dailyRes.json();

  let city = cityName || 'Р’Р°С€Рµ РјС–СЃС‚Рѕ';
  if (!cityName) {
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const geo = await geoRes.json();
      city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || city;
    } catch {}
  }

  const wc = current.current.weather_code;
  const currentHour = now.getHours();
  const hourly: HourlyEntry[] = (hourlyData.hourly?.time || [])
    .map((t: string, i: number) => {
      const h = new Date(t).getHours();
      return {
        time: `${h.toString().padStart(2, '0')}:00`,
        temp: Math.round(hourlyData.hourly.temperature_2m[i]),
        apparent_temp: Math.round(hourlyData.hourly.apparent_temperature[i]),
        code: codeMap(hourlyData.hourly.weather_code[i]),
        description: WC_DESCRIPTIONS[hourlyData.hourly.weather_code[i]] || '',
        precipitation_probability: hourlyData.hourly.precipitation_probability[i] ?? 0,
      };
    })
    .filter((_: HourlyEntry, i: number) => i >= currentHour);

  const tomorrow: TomorrowData = {
    temp_max: Math.round(dailyData.daily.temperature_2m_max[0]),
    temp_min: Math.round(dailyData.daily.temperature_2m_min[0]),
    code: codeMap(dailyData.daily.weather_code[0]),
    description: WC_DESCRIPTIONS[dailyData.daily.weather_code[0]] || '',
    precipitation_probability: dailyData.daily.precipitation_probability_max[0] ?? 0,
  };

  return {
    city,
    temp: Math.round(current.current.temperature_2m),
    feels_like: Math.round(current.current.apparent_temperature),
    humidity: current.current.relative_humidity_2m,
    wind_speed: Math.round(current.current.wind_speed_10m),
    visibility: Math.round((current.current.visibility || 10000) / 1000),
    description: WC_DESCRIPTIONS[wc] || 'РќРµРІС–РґРѕРјРѕ',
    code: codeMap(wc),
    hourly,
    tomorrow,
  };
}

export function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_CITY_KEY);
    if (saved) {
      try {
        const { lat, lon, name } = JSON.parse(saved);
        fetchWeatherByCoords(lat, lon, name)
          .then(w => { setWeather(w); setLoading(false); })
          .catch(() => { setError('РџРѕРјРёР»РєР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ'); setLoading(false); });
        return;
      } catch {}
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude)
            .then(w => { setWeather(w); setLoading(false); })
            .catch(() => { setError('РџРѕРјРёР»РєР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ'); setLoading(false); });
        },
        () => {
          fetchWeatherByCoords(48.51, 32.26, 'РљСЂРѕРїРёРІРЅРёС†СЊРєРёР№')
            .then(w => { setWeather(w); setLoading(false); })
            .catch(() => { setError('РџРѕРјРёР»РєР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ'); setLoading(false); });
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeatherByCoords(48.51, 32.26, 'РљСЂРѕРїРёРІРЅРёС†СЊРєРёР№')
        .then(w => { setWeather(w); setLoading(false); })
        .catch(() => { setError('РџРѕРјРёР»РєР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ'); setLoading(false); });
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=6&language=uk&format=json`
        );
        const data = await res.json();
        setSearchResults((data.results || []).map((r: Record<string, unknown>) => ({
          name: r.name as string,
          country: r.country as string,
          admin1: r.admin1 as string | undefined,
          lat: r.latitude as number,
          lon: r.longitude as number,
        })));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [searchQuery]);

  const selectCity = useCallback(async (city: CityResult) => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setRefreshing(true);
    try {
      const w = await fetchWeatherByCoords(city.lat, city.lon, city.name);
      setWeather(w);
      localStorage.setItem(SAVED_CITY_KEY, JSON.stringify({ lat: city.lat, lon: city.lon, name: city.name }));
    } catch {
      setError('РќРµ РІРґР°Р»РѕСЃСЏ Р·Р°РІР°РЅС‚Р°Р¶РёС‚Рё РїРѕРіРѕРґСѓ');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!weather) return;
    setRefreshing(true);
    const saved = localStorage.getItem(SAVED_CITY_KEY);
    try {
      if (saved) {
        const { lat, lon, name } = JSON.parse(saved);
        const w = await fetchWeatherByCoords(lat, lon, name);
        setWeather(w);
      }
    } catch {}
    setRefreshing(false);
  }, [weather]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center animate-pulse">
          <Cloud className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground">Р—Р°РІР°РЅС‚Р°Р¶СѓС”РјРѕ РїРѕРіРѕРґСѓ...</p>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <p className="text-destructive">{error}</p>
        <button onClick={() => { setError(null); setLoading(true); }} className="btn-gold px-6 py-3 rounded-2xl font-bold tap-scale">
          РЎРїСЂРѕР±СѓРІР°С‚Рё Р·РЅРѕРІСѓ
        </button>
      </div>
    );
  }

  const advice = weather ? getAdvice(weather) : null;
  const morningMode = isMorningCommuteTime();
  const commuteAdvice = weather && morningMode ? getMorningCommuteAdvice(weather) : null;

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">РџРѕРіРѕРґР°</h1>
          {weather && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{weather.city}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowSearch(s => !s); setTimeout(() => searchRef.current?.focus(), 80); }}
            className={`w-11 h-11 rounded-xl flex items-center justify-center tap-scale transition-all ${showSearch ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'}`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={handleRefresh}
            className="glass w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="glass-strong rounded-2xl p-4 space-y-3 animate-slide-down">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Р’РІРµРґС–С‚СЊ РЅР°Р·РІСѓ РјС–СЃС‚Р°..."
              className="w-full h-12 pl-10 pr-10 glass rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 border border-border/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center tap-scale"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {searching && <p className="text-xs text-muted-foreground text-center py-2">РЁСѓРєР°С”РјРѕ...</p>}
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {searchResults.map((city, i) => (
                <button
                  key={i}
                  onClick={() => selectCity(city)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors tap-scale text-left"
                >
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{city.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[city.admin1, city.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">РњС–СЃС‚ РЅРµ Р·РЅР°Р№РґРµРЅРѕ</p>
          )}
        </div>
      )}

      {weather && advice && (
        <>
          <div className="glass-strong rounded-3xl p-6 animate-scale-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-7xl font-bold font-display text-gold leading-none">{weather.temp}В°</span>
                  <span className="text-2xl text-muted-foreground mb-2">C</span>
                </div>
                <p className="text-lg font-medium text-foreground mt-1">{weather.description}</p>
                <p className="text-sm text-muted-foreground">Р’С–РґС‡СѓРІР°С”С‚СЊСЃСЏ СЏРє {weather.feels_like}В°</p>
              </div>
              <div className="text-gold/80 drop-shadow-[0_0_20px_hsla(42,85%,58%,0.5)]">
                {getWeatherIcon(weather.code, true)}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-border/40">
              {[
                { icon: <Droplets className="w-4 h-4" />, val: `${weather.humidity}%`, label: 'Р’РѕР»РѕРіС–СЃС‚СЊ' },
                { icon: <Wind className="w-4 h-4" />, val: `${weather.wind_speed}РєРј/Рі`, label: 'Р’С–С‚РµСЂ' },
                { icon: <Eye className="w-4 h-4" />, val: `${weather.visibility}РєРј`, label: 'Р’РёРґРёРј.' },
                { icon: <Thermometer className="w-4 h-4" />, val: `${weather.feels_like}В°`, label: 'Р’С–РґС‡СѓРІ.' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center text-primary mb-1">{s.icon}</div>
                  <p className="text-sm font-bold">{s.val}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">РЎСЊРѕРіРѕРґРЅС– РїРѕ РіРѕРґРёРЅР°С…</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {weather.hourly.map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[52px]">
                  <span className="text-[11px] text-muted-foreground font-medium">{h.time}</span>
                  <div className="text-primary">{getWeatherIcon(h.code)}</div>
                  <span className="text-sm font-bold">{h.temp}В°</span>
                  {h.precipitation_probability > 0 && (
                    <span className="text-[10px] text-blue-400 font-medium">{h.precipitation_probability}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Р—Р°РІС‚СЂР°</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-gold/80">{getWeatherIcon(weather.tomorrow.code)}</div>
                <div>
                  <p className="text-sm font-semibold">{weather.tomorrow.description}</p>
                  {weather.tomorrow.precipitation_probability > 0 && (
                    <p className="text-xs text-blue-400">Р”РѕС‰: {weather.tomorrow.precipitation_probability}%</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-base font-bold flex-shrink-0">
                <span className="text-foreground">{weather.tomorrow.temp_max}В°</span>
                <span className="text-muted-foreground">{weather.tomorrow.temp_min}В°</span>
              </div>
            </div>
          </div>

          {commuteAdvice && (
            <div className="glass-strong rounded-2xl p-4 animate-slide-up border border-gold/30" style={{ animationDelay: '0.13s' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
                  <span className="text-base">рџљ¶вЂЌв™ЂпёЏ</span>
                </div>
                <h2 className="font-bold text-base text-gold-shimmer font-display">РўРІС–Р№ РјС–СЃСЊРєРёР№ РІРёС…С–Рґ СЃСЊРѕРіРѕРґРЅС–</h2>
              </div>
              <div className="space-y-2 mb-3">
                <p className="text-sm font-medium">{commuteAdvice.morningOutdoor}</p>
                <p className="text-sm font-medium">{commuteAdvice.eveningOutdoor}</p>
              </div>
              <div className="border-t border-border/40 pt-3 space-y-2">
                <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">Як зібратися шарами</p>
                {commuteAdvice.layering.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                <p className={`text-sm font-bold ${commuteAdvice.umbrellaNote.includes('не потрібна') ? 'text-green-500' : 'text-accent'}`}>
                  {commuteAdvice.umbrellaNote}
                </p>
                {commuteAdvice.umbrellaDetail.map((detail, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-1">{detail}</p>
                ))}
              </div>
            </div>
          )}

          <div
            className={`rounded-2xl p-4 flex items-center gap-3 animate-slide-up ${advice.umbrella ? 'bg-accent/15 border border-accent/30' : 'bg-green-500/10 border border-green-500/20'}`}
            style={{ animationDelay: '0.15s' }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${advice.umbrella ? 'bg-accent/20' : 'bg-green-500/20'}`}>
              <Umbrella className={`w-5 h-5 ${advice.umbrella ? 'text-accent' : 'text-green-500'}`} />
            </div>
            <p className="text-sm font-medium">{advice.umbrellaText}</p>
          </div>

          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Shirt className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-bold text-base">Що вдягнути</h2>
            </div>
            <div className="space-y-2">
              {advice.clothes.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <span className="text-base">рџ‘џ</span>
              </div>
              <h2 className="font-bold text-base">Взуття</h2>
            </div>
            <div className="space-y-2">
              {advice.shoes.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.27s' }}>
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Деталі образу</h2>
            <div className="space-y-2">
              {advice.extras.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.29s' }}>
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Краще оминути</h2>
            <div className="space-y-2">
              {advice.avoid.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-4 text-center animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <p className="text-base font-bold text-gold-shimmer font-display">{advice.summary}</p>
          </div>
        </>
      )}
    </div>
  );
}
