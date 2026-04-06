export interface AdviceHourlyEntry {
  time: string;
  temp: number;
  apparent_temp?: number;
  code: number;
  precipitation_probability: number;
}

export interface AdviceWeatherInput {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  code: number;
  precipitation_probability?: number;
  uv_index?: number;
  hourly: AdviceHourlyEntry[];
}

export interface Advice {
  clothes: string[];
  shoes: string[];
  accessories: string[];
  avoid: string[];
  umbrella: boolean;
  umbrellaText: string;
  summary: string;
  morningHint: string;
}

const MORNING_HOURS = ['07:00', '08:00'];
const EVENING_HOURS = ['17:00', '18:00'];
const DAY_HOURS = ['12:00', '13:00'];
const NIGHT_HOURS = ['00:00', '01:00'];

function uniquePush(target: string[], ...items: Array<string | false | null | undefined>) {
  for (const item of items) {
    if (item && !target.includes(item)) target.push(item);
  }
}

function pickHourBlock(hourly: AdviceHourlyEntry[], times: string[], fallbackTemp: number) {
  const entries = hourly.filter((entry) => times.includes(entry.time));
  if (!entries.length) {
    return { min: fallbackTemp, max: fallbackTemp };
  }
  const temps = entries.map((entry) => entry.temp);
  return {
    min: Math.min(...temps),
    max: Math.max(...temps),
  };
}

function getMaxPrecipitation(weather: AdviceWeatherInput) {
  return Math.max(
    weather.precipitation_probability ?? 0,
    ...weather.hourly.map((entry) => entry.precipitation_probability ?? 0),
  );
}

function isDryWeather(weather: AdviceWeatherInput) {
  return getMaxPrecipitation(weather) <= 40 && weather.code < 200;
}

function isSummerMonth(date = new Date()) {
  const month = date.getMonth() + 1;
  return month >= 5 && month <= 8;
}

function getDayPeriod(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 6 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'day';
  if (hour >= 18 && hour <= 23) return 'evening';
  return 'night';
}

export function getMorningHint(weather: AdviceWeatherInput, date = new Date()) {
  const morning = pickHourBlock(weather.hourly, MORNING_HOURS, weather.temp);
  const day = pickHourBlock(weather.hourly, DAY_HOURS, weather.temp);
  const evening = pickHourBlock(weather.hourly, EVENING_HOURS, weather.temp);
  const night = pickHourBlock(weather.hourly, NIGHT_HOURS, weather.temp);
  const period = getDayPeriod(date);

  if (period === 'morning') {
    return `Вранці ${morning.min >= 0 ? '+' : ''}${morning.min}°C, вдень до ${day.max >= 0 ? '+' : ''}${day.max}°C — беріть шар, який легко зняти.`;
  }
  if (period === 'day') {
    return `Вдень близько ${day.max >= 0 ? '+' : ''}${day.max}°C, увечері ${evening.min >= 0 ? '+' : ''}${evening.min}°C — зручний другий шар буде доречним.`;
  }
  if (period === 'evening') {
    return `Увечері ${evening.max >= 0 ? '+' : ''}${evening.max}°C, вночі до ${night.min >= 0 ? '+' : ''}${night.min}°C — краще взяти тепліший верхній шар.`;
  }
  return `Вночі ${night.min >= 0 ? '+' : ''}${night.min}°C, зранку ${morning.max >= 0 ? '+' : ''}${morning.max}°C — обирайте комфортні теплі шари.`;
}

export function getAdvice(weather: AdviceWeatherInput): Advice {
  const clothes: string[] = [];
  const shoes: string[] = [];
  const accessories: string[] = [];
  const avoid: string[] = [];

  const temp = weather.temp;
  const precip = getMaxPrecipitation(weather);
  const dry = isDryWeather(weather);
  const uv = weather.uv_index ?? 0;

  if (temp >= 20 && precip <= 40) {
    uniquePush(clothes, 'Без верхнього одягу; за потреби візьми легку накидку.');
    if (weather.wind_speed > 7) {
      uniquePush(clothes, 'Легка накидка або сорочка зверху через вітер.');
    }
  } else if (temp >= 15 && temp <= 19) {
    uniquePush(clothes, 'Пальто — базовий верхній шар на поточну погоду.');
  } else if (temp >= 10 && temp <= 14) {
    uniquePush(clothes, 'Демісезонна куртка або пальто.');
  } else if (temp >= 4 && temp <= 6) {
    uniquePush(clothes, 'Тепла куртка.');
    uniquePush(accessories, 'Шарф.');
  } else if (temp >= 0 && temp <= 3) {
    uniquePush(clothes, 'Зимова куртка.');
    uniquePush(accessories, 'Шарф.', 'Рукавиці.');
  } else if (temp < 0) {
    uniquePush(clothes, 'Зимова куртка або пуховик.');
    uniquePush(accessories, 'Шапка.', 'Шарф.', 'Рукавиці.', 'Термобілизна.');
  }

  if (precip > 40 && temp >= 15) {
    uniquePush(clothes, 'Через опади верхній шар обов’язковий навіть у м’яку погоду.');
  }

  if (temp >= 22) {
    uniquePush(clothes, 'Легкі штани, шорти або джинси.');
  } else if (temp >= 10) {
    uniquePush(clothes, 'Джинси або штани.');
  } else {
    uniquePush(clothes, 'Щільні штани або джинси.');
    uniquePush(accessories, 'Термобілизна, якщо мерзнеш зранку.');
  }

  if (temp >= 20 && dry) {
    uniquePush(shoes, 'Кросівки, балетки, мокасини або сандалі без підборів.');
  } else if (temp >= 10) {
    uniquePush(shoes, 'Кросівки, лофери або черевики на плоскій підошві.');
  } else if (temp >= 5) {
    uniquePush(shoes, 'Утеплені черевики або кросівки з шкарпетками.');
  } else {
    uniquePush(shoes, 'Зимові чоботи або утеплені черевики.');
  }

  if (precip > 40) {
    uniquePush(accessories, 'Парасолька обов’язково.');
  }
  if (weather.wind_speed > 10) {
    uniquePush(accessories, 'Шарф або хустка через вітер.');
  }
  if (uv > 5) {
    uniquePush(accessories, 'Сонцезахисні окуляри.');
  }
  if (temp < 0) {
    uniquePush(accessories, 'Шапка та рукавиці.');
  }

  uniquePush(
    avoid,
    'Сукні та плаття не рекомендовані як базовий сценарій.',
    temp > 25 ? 'Сукня можлива лише під спеціальний захід, не як повсякденна рекомендація.' : null,
    isSummerMonth() && temp > 22 ? 'Сарафан можливий лише влітку та лише в стабільне тепло.' : 'Сарафани зараз не рекомендовані.',
    'Взуття на підборах не рекомендується.',
  );

  if (temp < 3) {
    uniquePush(avoid, 'При цій температурі пальто не рекомендую: тільки куртка або пуховик.');
  }

  const umbrella = precip > 40;
  const umbrellaText = umbrella ? 'Парасолька потрібна: шанс опадів вище 40%.' : 'Парасолька не обов’язкова.';

  let summary = 'Комфортний міський образ: практичні шари, зручне взуття та мінімум зайвого.';
  if (temp >= 15 && temp <= 19) {
    summary = 'Прохолодний день, рекомендую пальто та зручне взуття без підборів.';
  } else if (temp < 0) {
    summary = 'Зимовий сценарій: потрібен теплий багатошаровий образ і повний набір зимових аксесуарів.';
  } else if (temp < 10) {
    summary = 'Прохолодно, тому ставка на теплу куртку, щільний низ і закрите взуття.';
  } else if (temp >= 20) {
    summary = 'Можна зібрати легкий міський образ, але залишити акцент на практичності та стабільному взутті.';
  }

  return {
    clothes,
    shoes,
    accessories,
    avoid,
    umbrella,
    umbrellaText,
    summary,
    morningHint: getMorningHint(weather),
  };
}
