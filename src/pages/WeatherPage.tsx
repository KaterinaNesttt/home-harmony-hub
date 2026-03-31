import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets,
  Eye, Thermometer, Shirt, Umbrella, RefreshCw, MapPin, Search, X
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
  hourly: HourlyEntry[];
  tomorrow: TomorrowData;
}

interface HourlyEntry {
  time: string;
  temp: number;
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

const WC_DESCRIPTIONS: Record<number, string> = {
  0:'Ясно', 1:'Переважно ясно', 2:'Мінлива хмарність', 3:'Похмуро',
  45:'Туман', 48:'Паморозний туман',
  51:'Мряка', 53:'Мряка помірна', 55:'Мряка сильна',
  61:'Дощ слабкий', 63:'Дощ помірний', 65:'Дощ сильний',
  71:'Сніг слабкий', 73:'Сніг помірний', 75:'Сніг сильний',
  77:'Снігова крупа', 80:'Злива слабка', 81:'Злива помірна', 82:'Злива сильна',
  85:'Снігові зливи', 86:'Снігові зливи сильні',
  95:'Гроза', 96:'Гроза з градом', 99:'Гроза з сильним градом',
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

// ── Clothing advice — female profile ────────────────────────────────────────
// Wardrobe: термобілизна, кофта, светр, гольф, футболка, джинси, жилетка тепла,
//           теплі носки — плюс верхній одяг: куртка зимова/осіння, пальто, вітровка
// Morning commute mode (weekdays 06:50–08:00):
//   • Вихід з дому: 7:30–8:00, дорога ~15 хв (на вулиці ~15 хв вранці)
//   • Повернення додому: 17:30 (на вулиці ~15 хв ввечері)
// ─────────────────────────────────────────────────────────────────────────────

function isMorningCommuteTime(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false; // weekends — off
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;
  return totalMin >= 6 * 60 + 50 && totalMin <= 8 * 60; // 06:50–08:00
}

interface CommuteAdvice {
  morningOutdoor: string;
  eveningOutdoor: string;
  layering: string[];
  umbrellaNote: string;
  umbrellaDetail: string[];
}

function getMorningCommuteAdvice(weather: WeatherData): CommuteAdvice {
  const { temp, feels_like, humidity, wind_speed, code, hourly } = weather;
  const isSnow = code >= 600 && code < 700;
  const isWind = wind_speed > 10;
  const isStrongWind = wind_speed > 20;

  // Знайти погоду на 7:00–8:00 (ранок) і 17:00–18:00 (вечір)
  const morningEntry = hourly.find(h => h.time === '07:00') ||
                       hourly.find(h => h.time === '08:00') || null;
  const eveningEntry = hourly.find(h => h.time === '17:00') ||
                       hourly.find(h => h.time === '18:00') || null;

  const morningTemp = morningEntry ? morningEntry.temp : temp;
  const eveningTemp = eveningEntry ? eveningEntry.temp : temp;
  const morningCode = morningEntry ? morningEntry.code : code;
  const eveningCode = eveningEntry ? eveningEntry.code : code;
  const morningPrecip = morningEntry?.precipitation_probability ?? 0;
  const eveningPrecip = eveningEntry?.precipitation_probability ?? 0;

  const morningRain = (morningCode >= 200 && morningCode < 600) || morningPrecip > 40;
  const eveningRain = (eveningCode >= 200 && eveningCode < 600) || eveningPrecip > 40;
  const morningSnow = morningCode >= 600 && morningCode < 700;
  const eveningSnow = eveningCode >= 600 && eveningCode < 700;

  // ── Рядки про температуру на вулиці ──
  const morningOutdoor =
    `🌅 Вихід (~7:30–8:00): ${morningTemp}°C, відчувається як ${feels_like}°C` +
    (morningSnow ? ' ❄️ — сніг!' : morningRain ? ` 🌧️ — дощ (~${morningPrecip}%)` : ' — без опадів') +
    (isStrongWind ? ` | 💨 сильний вітер ${wind_speed} км/г` : isWind ? ` | 🌬️ вітер ${wind_speed} км/г` : '');

  const eveningOutdoor =
    `🌆 Повернення (~17:30): ${eveningTemp}°C` +
    (eveningSnow ? ' ❄️ — сніг!' : eveningRain ? ` 🌧️ — дощ (~${eveningPrecip}%)` : ' — без опадів');

  // ── Шари одягу ──
  const layering: string[] = [];

  // — Нижній шар (термобілизна) —
  if (morningTemp < -5) {
    layering.push('🩱 Термобілизна (верх + низ) — при такому морозі без неї нікуди, 15 хвилин на морозі відчуються дуже гостро');
  } else if (morningTemp < 2) {
    layering.push('🩱 Термобілизна (верх + низ) — обов\'язково, навіть 15 хв на морозі промерзнеш без неї');
  } else if (morningTemp < 7) {
    layering.push('🩱 Термобілизна верх — рекомендовано, хоч дорога коротка, але ранковий холод відчутний');
  }

  // — Середній шар (гольф / светр / кофта / футболка) —
  if (morningTemp < -5) {
    layering.push('🎽 Гольф поверх термобілизни — щільно облягає, зберігає тепло без зайвого об\'єму');
    layering.push('🧶 Светр або кофта поверх гольфу — три шари тепла для суворої зими');
  } else if (morningTemp < 2) {
    layering.push('🎽 Гольф — ідеально під куртку, не продувається, тримає тепло');
    layering.push('🧶 Кофта або светр поверх гольфу — повний зимовий комплект');
  } else if (morningTemp < 7) {
    layering.push('🎽 Гольф або светр — головний шар тепла на коротку прогулянку');
    layering.push('🧥 Кофта — як додатковий шар або замість гольфу, якщо він один');
  } else if (morningTemp < 12) {
    layering.push('🧥 Кофта або светр — цілком достатньо під куртку');
    layering.push('👕 Футболка під низ — щоб не було спекотно в приміщенні');
  } else if (morningTemp < 17) {
    layering.push('👕 Футболка + кофта — вранці прохолодно, але кофту можна зняти в приміщенні');
  } else {
    layering.push('👕 Футболка — цілком достатньо для такої температури');
  }

  // — Жилетка —
  if (morningTemp < 0) {
    layering.push('🦺 Тепла жилетка під куртку — гріє тулуб, не сковує руки при ходьбі');
  } else if (morningTemp < 8) {
    layering.push('🦺 Тепла жилетка — чудово як додатковий шар під або поверх куртки');
  } else if (morningTemp < 14 && isWind) {
    layering.push('🦺 Жилетка тепла поверх кофти — захистить від вітру під час ходьби');
  }

  // — Верхній одяг —
  if (morningTemp < -5) {
    layering.push('🧥 Зимова куртка — найтепліша, яка є, навіть 15 хвилин при -5° відчуваються');
  } else if (morningTemp < 2) {
    layering.push('🧥 Зимова куртка — без варіантів при такому морозі');
  } else if (morningTemp < 8) {
    layering.push('🧥 Зимова куртка або дуже тепле пальто');
  } else if (morningTemp < 14) {
    layering.push('🧥 Осіннє пальто або куртка — для 15-хвилинної прогулянки саме те');
  } else if (morningTemp < 20) {
    layering.push('🧥 Легка куртка або вітровка — вранці ще прохолодно');
  } else {
    layering.push('☀️ Верхній одяг не потрібен — тепло навіть на вулиці');
  }

  // — Джинси / низ —
  if (morningTemp < -5) {
    layering.push('👖 Термобілизна (низ) + джинси — без термо-низу нижня частина тіла замерзне за 5 хвилин');
  } else if (morningTemp < 2) {
    layering.push('👖 Джинси + термобілизна знизу — ноги в теплі попри морозний ранок');
  } else {
    layering.push('👖 Джинси — добре тримають тепло при коротких прогулянках');
  }

  // — Носки —
  if (morningTemp < 5) {
    layering.push('🧦 Теплі носки — обов\'язково! Ноги мерзнуть першими, а день довгий');
  } else if (morningTemp < 12) {
    layering.push('🧦 Теплі носки — весь день у теплі, навіть якщо туфлі не зимові');
  } else {
    layering.push('🧦 Звичайні носки — достатньо для такої температури');
  }

  // — Аксесуари —
  if (morningTemp < -5) {
    layering.push('🧣 Шарф + шапка + рукавички — все три обов\'язково! 15 хвилин без шапки при такому морозі дуже відчутні');
  } else if (morningTemp < 2) {
    layering.push('🧣 Шарф і шапка — обов\'язково, вуха і шия мерзнуть дуже швидко');
    layering.push('🧤 Рукавички — без них пальці замерзнуть ще до зупинки');
  } else if (morningTemp < 8) {
    layering.push('🧣 Шарф — захистить шию від ранкового холоду');
    layering.push('🧤 Рукавички — ввечері може бути холодніше, краще мати при собі');
  } else if (morningTemp < 13) {
    layering.push('🧣 Легкий шарф або хустка — від ранкового вітру');
  }

  // — Різниця температур вранці і ввечері —
  const tempDelta = eveningTemp - morningTemp;
  if (tempDelta > 7) {
    layering.push(`🌡️ Ввечері (+17:30) буде на ${Math.abs(Math.round(tempDelta))}° тепліше — можна зняти верхній шар або жилетку`);
  } else if (tempDelta < -6) {
    layering.push(`🌡️ Ввечері (+17:30) буде на ${Math.abs(Math.round(tempDelta))}° холодніше — візьми рукавички у сумку!`);
  } else if (Math.abs(tempDelta) <= 3) {
    layering.push(`🌡️ Температура вранці і ввечері майже однакова — одяг підійде на весь день`);
  }

  // — Вітер —
  if (isStrongWind) {
    layering.push(`💨 Сильний вітер ${wind_speed} км/г — підніми комір, замотай шарф, жилетка або щільна куртка критично важливі`);
  } else if (isWind) {
    layering.push(`🌬️ Вітер ${wind_speed} км/г — відчуватиметься холодніше, закрий шию`);
  }

  // ── Парасоля — детальна секція ──
  let umbrellaNote: string;
  const umbrellaDetail: string[] = [];

  if (morningRain && eveningRain) {
    umbrellaNote = '☔ Парасоля потрібна і вранці, і ввечері — обов\'язково візьми з дому!';
    umbrellaDetail.push(`🌅 Вранці (~7:30–8:00): дощ ${morningPrecip}% — парасоля потрібна на виході`);
    umbrellaDetail.push(`🌆 Ввечері (~17:30): дощ ${eveningPrecip}% — будеш мокра без неї на зворотньому шляху`);
    umbrellaDetail.push('💡 Порада: компактна складна парасоля — зручно в сумці весь день');
  } else if (morningRain && !eveningRain) {
    umbrellaNote = '🌂 Вранці дощ — візьми парасолю з дому, ввечері має прояснитись';
    umbrellaDetail.push(`🌅 Вранці (~7:30–8:00): дощ ${morningPrecip}% — парасоля потрібна`);
    umbrellaDetail.push(`🌆 Ввечері (~17:30): ${eveningPrecip > 20 ? `слабка ймовірність ${eveningPrecip}% — краще залиши при собі` : 'без опадів — можна залишити в сумці'}`);
    umbrellaDetail.push('💡 Порада: навіть якщо вранці невеликий дощ — краще взяти, ніж промокнути за 15 хв');
  } else if (!morningRain && eveningRain) {
    umbrellaNote = '🌦️ Вранці сухо, але ввечері можливий дощ — візьми парасолю';
    umbrellaDetail.push(`🌅 Вранці (~7:30–8:00): ${morningPrecip > 20 ? `невелика ймовірність ${morningPrecip}%` : 'без опадів — йди спокійно'}`);
    umbrellaDetail.push(`🌆 Ввечері (~17:30): дощ ${eveningPrecip}% — на зворотньому шляху можна промокнути`);
    umbrellaDetail.push('💡 Порада: поклади компактну парасолю в сумку зранку — пригодиться ввечері');
  } else if (morningSnow || eveningSnow) {
    umbrellaNote = '❄️ Сніг — парасоля не дуже допомагає, але захистить від мокрого снігу';
    umbrellaDetail.push(morningSnow ? '🌅 Вранці: сніг — хутряна шапка і капюшон важливіші за парасолю' : '🌅 Вранці: без снігу');
    umbrellaDetail.push(eveningSnow ? '🌆 Ввечері: сніг — парасоля від мокрого снігу пригодиться' : '🌆 Ввечері: без снігу');
  } else if (humidity > 80) {
    umbrellaNote = '🌫️ Висока вологість — парасоля не завадить, може бути мряка';
    umbrellaDetail.push(`💧 Вологість ${humidity}% — відчувається як дощ навіть без нього`);
    umbrellaDetail.push('💡 Порада: легка парасоля або водовідштовхувальна куртка');
  } else if (morningPrecip > 25 || eveningPrecip > 25) {
    umbrellaNote = '🌂 Невелика ймовірність дощу — краще взяти парасолю про всяк випадок';
    umbrellaDetail.push(`🌅 Вранці: ймовірність дощу ${morningPrecip}%`);
    umbrellaDetail.push(`🌆 Ввечері: ймовірність дощу ${eveningPrecip}%`);
    umbrellaDetail.push('💡 Порада: компактна складна — не займає місця, але може врятувати');
  } else {
    umbrellaNote = '✨ Парасоля не потрібна — без опадів і вранці, і ввечері';
    umbrellaDetail.push('🌅 Вранці: сухо — йди без парасолі');
    umbrellaDetail.push('🌆 Ввечері: сухо — повернешся без сюрпризів');
  }

  return { morningOutdoor, eveningOutdoor, layering, umbrellaNote, umbrellaDetail };
}

function getAdvice(weather: WeatherData): Advice {
  const { temp, code, wind_speed, humidity } = weather;
  const isRain = code >= 200 && code < 600;
  const isSnow = code >= 600 && code < 700;
  const isWind = wind_speed > 10;
  const isWinter = temp < 0;
  const isCold  = temp >= 0 && temp < 8;
  const isCool  = temp >= 8 && temp < 16;
  const isWarm  = temp >= 16 && temp < 25;
  const isHot   = temp >= 25;

  const clothes: string[] = [];
  const shoes: string[] = [];

  if (isWinter) {
    clothes.push('🩱 Термобілизна (верх + низ) — без неї на морозі нікуди');
    clothes.push('🎽 Гольф поверх термобілизни — щільний теплий шар');
    clothes.push('🧶 Светр або кофта поверх гольфу — три шари гарантують тепло');
    clothes.push('🦺 Тепла жилетка під куртку — гріє тулуб, не сковує руки');
    clothes.push('🧥 Зимова куртка — без варіантів при мінусовій температурі');
    clothes.push('🧣 Шарф + шапка + рукавички — весь комплект обов\'язковий');
    clothes.push('👖 Джинси + термобілизна (низ) — ноги в теплі весь день');
    clothes.push('🧦 Теплі носки — ноги мерзнуть першими');
    shoes.push('🥾 Тракторні черевики — зчеплення зі слизькою поверхнею');
    shoes.push('👟 Зимові кросівки на хутрі — як альтернатива');
  } else if (isCold) {
    clothes.push('🩱 Термобілизна — рятує при тривалому перебуванні на вулиці');
    clothes.push('🎽 Гольф або светр — основний шар тепла під куртку');
    clothes.push('🧥 Кофта — як додатковий шар або під пальто');
    clothes.push('🦺 Тепла жилетка — гріє тулуб і добре комбінується з будь-яким верхом');
    clothes.push('🧥 Зимова куртка або тепле пальто');
    clothes.push('🧣 Шарф і шапка — шия і голова в теплі');
    clothes.push('🧤 Рукавички — пальці мерзнуть навіть при нульовій температурі');
    clothes.push('👖 Джинси — добре тримають тепло');
    clothes.push('🧦 Теплі носки — весь день у комфорті');
    if (isWind) clothes.push('💨 Підніми комір або замотай шарф — вітер при холоді дуже відчутний!');
    shoes.push('🥾 Тракторні черевики або утеплені чоботи');
    shoes.push('👟 Утеплені кросівки — якщо сухо і без снігу');
  } else if (isCool) {
    clothes.push('👕 Футболка — базовий шар під одяг');
    clothes.push('🧥 Кофта або светр поверх — основний шар тепла');
    clothes.push('🎽 Гольф — як альтернатива светру, якщо вітряно');
    clothes.push('🧥 Осіннє пальто або куртка');
    if (isWind) {
      clothes.push('🦺 Тепла жилетка — відмінний захист від вітру при ходьбі');
      clothes.push('🧣 Шарф або хустка на шию — від прохолодного вітру');
    }
    if (isRain) clothes.push('🌧️ Водовідштовхувальна куртка або парасоля — дощ при такій температурі неприємний');
    clothes.push('👖 Джинси — універсальний вибір для прохолодної погоди');
    clothes.push('🧦 Теплі носки — ногам буде затишно весь день');
    shoes.push('👟 Кросівки закриті — захищають від вологи');
    shoes.push('🥾 Черевики — особливо якщо дощ або слизько');
  } else if (isWarm) {
    clothes.push('👕 Футболка — основа образу');
    clothes.push('🧥 Кофта або легкий светр — знадобиться ввечері або в кондиційованому приміщенні');
    clothes.push('👖 Джинси або легкі штани — комфортний вибір');
    if (isWind || isRain) clothes.push('🧥 Легка куртка або вітровка — від раптового похолодання');
    else clothes.push('☀️ Верхній одяг не обов\'язковий — але кофта у сумці не завадить');
    shoes.push('👟 Кросівки — ідеальний варіант для теплої погоди');
    shoes.push('🥾 Черевики — якщо є ймовірність дощу');
  } else {
    // isHot — 25+ °C
    clothes.push('👕 Легка футболка — чим легша, тим краще');
    clothes.push('🩳 Шорти або легкі джинси — джинси краще зі світлих тканин');
    clothes.push('🕶️ Сонцезахисні окуляри — захист для очей обов\'язковий');
    clothes.push('🧴 Сонцезахисний крем — обов\'язково на відкриті ділянки шкіри!');
    clothes.push('🧥 Легка кофта — для кондиційованих приміщень або вечора');
    shoes.push('👟 Легкі кросівки або мокасини — нога дихає');
    shoes.push('🩴 Шльопанці (тільки для пляжу або дому)');
  }

  if (isSnow) {
    clothes.unshift('❄️ Сніг! Одягайся по-зимовому — мокрий сніг гірший за суху зиму');
    shoes.unshift('🥾 Тракторні черевики — не слизьке взуття критично при снігу!');
  }

  const umbrella = isRain || humidity > 80;
  const umbrellaText = isRain
    ? '☔ Парасоля обов\'язкова — очікуються опади!'
    : humidity > 80
      ? '🌂 Вологість понад 80% — може бути мряка, парасоля не завадить'
      : '✨ Парасоля не потрібна — гарна погода';

  let summary = 'Звичайний день — одягайся комфортно і стильно';
  if (isWinter && isSnow) summary = 'Зимова казка — але не замерзни! Термобілизна + гольф + зимова куртка + тракторні черевики.';
  else if (isWinter)      summary = 'Мороз! Термобілизна + гольф/светр + жилетка + зимова куртка = тепло весь день.';
  else if (isCold)        summary = 'Холодно — термобілизна, теплі носки, жилетка і щільне взуття врятують день.';
  else if (isCool && isRain) summary = 'Осінній дощ — пальто/куртка, закриті кросівки і парасоля!';
  else if (isCool)        summary = 'Класична осінь — кофта або светр під пальто і теплі носки: стильно і комфортно.';
  else if (isWarm && !isRain) summary = 'Чудова погода для прогулянки — футболка, кофта у сумці і улюблені кросівки!';
  else if (isHot)         summary = 'Спека! Легка футболка, сонцезахисний крем і не забудь воду.';

  return { clothes, shoes, umbrella, umbrellaText, summary };
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
      `&hourly=temperature_2m,weather_code,precipitation_probability` +
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
  const dailyData  = await dailyRes.json();

  let city = cityName || 'Ваше місто';
  if (!cityName) {
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const geo = await geoRes.json();
      city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || city;
    } catch {}
  }

  const wc = current.current.weather_code;

  // Build hourly list — current hour onward, up to 24 entries
  const currentHour = now.getHours();
  const hourly: HourlyEntry[] = (hourlyData.hourly?.time || [])
    .map((t: string, i: number) => {
      const h = new Date(t).getHours();
      return {
        time: `${h.toString().padStart(2, '0')}:00`,
        temp: Math.round(hourlyData.hourly.temperature_2m[i]),
        code: codeMap(hourlyData.hourly.weather_code[i]),
        description: WC_DESCRIPTIONS[hourlyData.hourly.weather_code[i]] || '',
        precipitation_probability: hourlyData.hourly.precipitation_probability[i] ?? 0,
      };
    })
    .filter((_: HourlyEntry, i: number) => i >= currentHour);

  // Tomorrow
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
    description: WC_DESCRIPTIONS[wc] || 'Невідомо',
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
          .catch(() => { setError('Помилка завантаження'); setLoading(false); });
        return;
      } catch {}
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude)
            .then(w => { setWeather(w); setLoading(false); })
            .catch(() => { setError('Помилка завантаження'); setLoading(false); });
        },
        () => {
          fetchWeatherByCoords(48.51, 32.26, 'Кропивницький')
            .then(w => { setWeather(w); setLoading(false); })
            .catch(() => { setError('Помилка завантаження'); setLoading(false); });
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeatherByCoords(48.51, 32.26, 'Кропивницький')
        .then(w => { setWeather(w); setLoading(false); })
        .catch(() => { setError('Помилка завантаження'); setLoading(false); });
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
      setError('Не вдалося завантажити погоду');
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
        <p className="text-muted-foreground">Завантажуємо погоду...</p>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
        <p className="text-destructive">{error}</p>
        <button onClick={() => { setError(null); setLoading(true); }} className="btn-gold px-6 py-3 rounded-2xl font-bold tap-scale">
          Спробувати знову
        </button>
      </div>
    );
  }

  const advice = weather ? getAdvice(weather) : null;
  const morningMode = isMorningCommuteTime();
  const commuteAdvice = (weather && morningMode) ? getMorningCommuteAdvice(weather) : null;

  return (
    <div className="space-y-5 animate-fade-in pb-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Погода</h1>
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

      {/* City search panel */}
      {showSearch && (
        <div className="glass-strong rounded-2xl p-4 space-y-3 animate-slide-down">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Введіть назву міста..."
              className="w-full h-12 pl-10 pr-10 glass rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 border border-border/50 transition-all"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center tap-scale">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {searching && <p className="text-xs text-muted-foreground text-center py-2">Шукаємо...</p>}
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {searchResults.map((city, i) => (
                <button key={i} onClick={() => selectCity(city)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors tap-scale text-left">
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
            <p className="text-xs text-muted-foreground text-center py-2">Міст не знайдено</p>
          )}
        </div>
      )}

      {weather && advice && (
        <>
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
            <div className="grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-border/40">
              {[
                { icon: <Droplets className="w-4 h-4" />, val: `${weather.humidity}%`,         label: 'Вологість' },
                { icon: <Wind      className="w-4 h-4" />, val: `${weather.wind_speed}км/г`,   label: 'Вітер' },
                { icon: <Eye       className="w-4 h-4" />, val: `${weather.visibility}км`,      label: 'Видим.' },
                { icon: <Thermometer className="w-4 h-4"/>, val: `${weather.feels_like}°`,     label: 'Відчув.' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="flex justify-center text-primary mb-1">{s.icon}</div>
                  <p className="text-sm font-bold">{s.val}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly forecast — today */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Сьогодні по годинах</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {weather.hourly.map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[52px]">
                  <span className="text-[11px] text-muted-foreground font-medium">{h.time}</span>
                  <div className="text-primary">{getWeatherIcon(h.code)}</div>
                  <span className="text-sm font-bold">{h.temp}°</span>
                  {h.precipitation_probability > 0 && (
                    <span className="text-[10px] text-blue-400 font-medium">{h.precipitation_probability}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tomorrow */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Завтра</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-gold/80">{getWeatherIcon(weather.tomorrow.code)}</div>
                <div>
                  <p className="text-sm font-semibold">{weather.tomorrow.description}</p>
                  {weather.tomorrow.precipitation_probability > 0 && (
                    <p className="text-xs text-blue-400">Дощ: {weather.tomorrow.precipitation_probability}%</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-base font-bold flex-shrink-0">
                <span className="text-foreground">{weather.tomorrow.temp_max}°</span>
                <span className="text-muted-foreground">{weather.tomorrow.temp_min}°</span>
              </div>
            </div>
          </div>

          {/* Morning commute block — weekdays 06:50–08:00 */}
          {commuteAdvice && (
            <div className="glass-strong rounded-2xl p-4 animate-slide-up border border-gold/30" style={{ animationDelay: '0.13s' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
                  <span className="text-base">🚶‍♀️</span>
                </div>
                <h2 className="font-bold text-base text-gold-shimmer font-display">Твій маршрут сьогодні</h2>
              </div>
              <div className="space-y-2 mb-3">
                <p className="text-sm font-medium">{commuteAdvice.morningOutdoor}</p>
                <p className="text-sm font-medium">{commuteAdvice.eveningOutdoor}</p>
              </div>
              <div className="border-t border-border/40 pt-3 space-y-2">
                <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">Що вдягнути шарами</p>
                {commuteAdvice.layering.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />{l}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                <p className={`text-sm font-bold ${commuteAdvice.umbrellaNote.startsWith('✨') ? 'text-green-500' : 'text-accent'}`}>
                  {commuteAdvice.umbrellaNote}
                </p>
                {commuteAdvice.umbrellaDetail.map((d, i) => (
                  <p key={i} className="text-xs text-muted-foreground pl-1">{d}</p>
                ))}
              </div>
            </div>
          )}

          {/* Umbrella */}
          <div className={`rounded-2xl p-4 flex items-center gap-3 animate-slide-up ${advice.umbrella ? 'bg-accent/15 border border-accent/30' : 'bg-green-500/10 border border-green-500/20'}`}
            style={{ animationDelay: '0.15s' }}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${advice.umbrella ? 'bg-accent/20' : 'bg-green-500/20'}`}>
              <Umbrella className={`w-5 h-5 ${advice.umbrella ? 'text-accent' : 'text-green-500'}`} />
            </div>
            <div>
              <p className="text-sm font-medium">{advice.umbrellaText}</p>
            </div>
          </div>

          {/* Clothing */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Shirt className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-bold text-base">Що вдягнути</h2>
            </div>
            <div className="space-y-2">
              {advice.clothes.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />{c}
                </div>
              ))}
            </div>
          </div>

          {/* Shoes */}
          <div className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <span className="text-base">👟</span>
              </div>
              <h2 className="font-bold text-base">Яке взуття</h2>
            </div>
            <div className="space-y-2">
              {advice.shoes.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />{s}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="glass-strong rounded-2xl p-4 text-center animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <p className="text-base font-bold text-gold-shimmer font-display">{advice.summary}</p>
          </div>
        </>
      )}
    </div>
  );
}
