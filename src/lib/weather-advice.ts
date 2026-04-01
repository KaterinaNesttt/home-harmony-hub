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
  hourly: AdviceHourlyEntry[];
}

export interface Advice {
  clothes: string[];
  shoes: string[];
  extras: string[];
  avoid: string[];
  umbrella: boolean;
  umbrellaText: string;
  summary: string;
}

export interface CommuteAdvice {
  morningOutdoor: string;
  eveningOutdoor: string;
  layering: string[];
  umbrellaNote: string;
  umbrellaDetail: string[];
}

const PROFILE = {
  minimalDresses: true,
  sundressesSummerOnly: true,
  avoidHeels: true,
} as const;

const MORNING_WINDOW = ['07:00', '08:00'] as const;
const EVENING_WINDOW = ['17:00', '18:00'] as const;

type SegmentLabel = 'morning' | 'evening';

interface SegmentSnapshot {
  label: SegmentLabel;
  temp: number;
  feelsLike: number;
  precip: number;
  code: number;
  isRain: boolean;
  isSnow: boolean;
}

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function pickWorstCode(codes: number[]): number {
  if (codes.some(code => code >= 600 && code < 700)) return 600;
  if (codes.some(code => code >= 200 && code < 600)) return 500;
  if (codes.some(code => code >= 700 && code < 800)) return 741;
  if (codes.some(code => code > 800)) return 801;
  return codes[0] ?? 800;
}

function buildSegment(
  label: SegmentLabel,
  hourly: AdviceHourlyEntry[],
  targets: readonly string[],
  fallback: Pick<AdviceWeatherInput, 'temp' | 'feels_like' | 'code'>
): SegmentSnapshot {
  const entries = hourly.filter(entry => targets.includes(entry.time));
  const temp = entries.length ? average(entries.map(entry => entry.temp)) : fallback.temp;
  const feelsLike = entries.length
    ? average(entries.map(entry => entry.apparent_temp ?? entry.temp))
    : fallback.feels_like;
  const precip = entries.length ? Math.max(...entries.map(entry => entry.precipitation_probability ?? 0)) : 0;
  const code = entries.length ? pickWorstCode(entries.map(entry => entry.code)) : fallback.code;
  const isSnow = code >= 600 && code < 700;
  const isRain = !isSnow && ((code >= 200 && code < 600) || precip >= 35);
  return { label, temp, feelsLike, precip, code, isRain, isSnow };
}

function describeSegment(segment: SegmentSnapshot, windSpeed: number): string {
  const parts = [
    segment.label === 'morning'
      ? `Ранковий вихід: ${segment.temp}°C`
      : `Дорога додому: ${segment.temp}°C`,
    `відчувається як ${segment.feelsLike}°C`,
  ];

  if (segment.isSnow) parts.push('очікується сніг');
  else if (segment.isRain) parts.push(`ризик дощу ${segment.precip}%`);
  else parts.push('без істотних опадів');

  if (windSpeed >= 24) parts.push(`сильний вітер ${windSpeed} км/год`);
  else if (windSpeed >= 14) parts.push(`відчутний вітер ${windSpeed} км/год`);

  return parts.join(' • ');
}

function getComfortBand(feelsLike: number) {
  if (feelsLike <= -8) return 'deep-winter';
  if (feelsLike <= -1) return 'winter';
  if (feelsLike <= 6) return 'cold';
  if (feelsLike <= 12) return 'cool';
  if (feelsLike <= 18) return 'mild';
  if (feelsLike <= 24) return 'warm';
  if (feelsLike <= 29) return 'hot';
  return 'heat';
}

function pushUnique(target: string[], ...items: string[]) {
  for (const item of items) {
    if (item && !target.includes(item)) target.push(item);
  }
}

export function getMorningCommuteAdvice(weather: AdviceWeatherInput): CommuteAdvice {
  const morning = buildSegment('morning', weather.hourly, MORNING_WINDOW, weather);
  const evening = buildSegment('evening', weather.hourly, EVENING_WINDOW, weather);
  const worstFeelsLike = Math.min(morning.feelsLike, evening.feelsLike);
  const wettestPrecip = Math.max(morning.precip, evening.precip);
  const strongWind = weather.wind_speed >= 24;
  const windy = weather.wind_speed >= 14;
  const layering: string[] = [];

  switch (getComfortBand(worstFeelsLike)) {
    case 'deep-winter':
      pushUnique(
        layering,
        'База: термобілизна верх і низ.',
        'Середній шар: гольф і щільний светр або тепла кофта.',
        'Верхній шар: зимова куртка.',
        'Низ: щільні джинси або утеплені штани.',
        'Аксесуари: шапка, шарф, рукавички, теплі шкарпетки.'
      );
      break;
    case 'winter':
      pushUnique(
        layering,
        'База: термоверх або щільний лонгслів.',
        'Середній шар: гольф, светр чи кофта.',
        'Верхній шар: зимова куртка; тепле пальто лише якщо воно справді зимове.',
        'Низ: джинси, за потреби з термошаром.',
        'Аксесуари: шарф і теплі шкарпетки, шапку краще мати з собою.'
      );
      break;
    case 'cold':
      pushUnique(
        layering,
        'База: футболка або тонкий лонгслів.',
        'Середній шар: кофта, светр або гольф.',
        'Верхній шар: тепла демісезонна куртка або зимова куртка.',
        'Низ: джинси чи щільні штани.',
        'Додатково: щільні шкарпетки та легкий шарф.'
      );
      break;
    case 'cool':
      pushUnique(
        layering,
        'База: футболка.',
        'Середній шар: кофта, кардиган або тонкий светр.',
        'Верхній шар: куртка, тренч з теплим шаром під низ або легке пальто.',
        'Низ: джинси чи інші закриті штани.',
        'На вечір не завадить тонкий шарф.'
      );
      break;
    case 'mild':
      pushUnique(
        layering,
        'База: футболка або тонкий лонгслів.',
        'Другий шар: легка кофта, кардиган або сорочка.',
        'Верхній шар: легка куртка лише якщо чутливість до холоду висока або вітряно.',
        'Низ: джинси, чиноси або інші прямі штани.'
      );
      break;
    case 'warm':
      pushUnique(
        layering,
        'База: футболка або легкий топ.',
        'Другий шар: тонка кофта в сумці на випадок прохолоднішого вечора.',
        'Низ: легкі штани, джинси або спідниця міді.'
      );
      break;
    case 'hot':
    case 'heat':
      pushUnique(
        layering,
        'База: легка футболка, майка або дихаюча сорочка.',
        'Низ: лляні штани, легкі широкі брюки або шорти відповідної довжини.',
        PROFILE.sundressesSummerOnly ? 'Сарафан доречний лише в стабільну літню спеку; це опція, а не базовий сценарій.' : ''
      );
      break;
  }

  if (windy) {
    pushUnique(
      layering,
      strongWind
        ? 'Через сильний вітер верхній шар має щільно закривати шию і корпус.'
        : 'Через вітер краще закрити шию та не виходити лише в одному тонкому шарі.'
    );
  }

  if (morning.isSnow || evening.isSnow) {
    pushUnique(layering, 'За снігу обирай верх з капюшоном і підошву з хорошим зчепленням.');
  } else if (morning.isRain || evening.isRain || wettestPrecip >= 35) {
    pushUnique(layering, 'Якщо є ризик дощу, краще водовідштовхувальна куртка або верх, який не промокає миттєво.');
  }

  const delta = evening.feelsLike - morning.feelsLike;
  if (delta >= 6) {
    pushUnique(layering, `Увечері буде відчутно тепліше приблизно на ${Math.abs(delta)}°: другий шар має легко зніматися.`);
  } else if (delta <= -6) {
    pushUnique(layering, `Увечері стане холодніше приблизно на ${Math.abs(delta)}°: не вдягайся лише під ранкове відчуття.`);
  } else {
    pushUnique(layering, 'Комплект можна зібрати один на весь день без різкої зміни шарів.');
  }

  let umbrellaNote = 'Парасоля не потрібна.';
  const umbrellaDetail: string[] = [];

  if (morning.isRain && evening.isRain) {
    umbrellaNote = 'Парасоля потрібна і на вихід, і на повернення.';
    pushUnique(
      umbrellaDetail,
      `Зранку ризик дощу ${morning.precip}%.`,
      `Увечері ризик дощу ${evening.precip}%.`,
      'Найкраще взяти компактну складану парасолю зранку.'
    );
  } else if (morning.isRain) {
    umbrellaNote = 'Парасолю треба взяти зранку: мокрий старт дня того не вартий.';
    pushUnique(
      umbrellaDetail,
      `На ранок ризик дощу ${morning.precip}%.`,
      evening.precip >= 25 ? `Увечері теж є шанс опадів ${evening.precip}%, тож парасоля точно не зайва.` : 'На вечір істотних опадів не видно.'
    );
  } else if (evening.isRain) {
    umbrellaNote = 'Зранку може бути сухо, але парасолю краще покласти в сумку на вечір.';
    pushUnique(umbrellaDetail, 'Ранок без критичних опадів.', `На вечір ризик дощу ${evening.precip}%.`);
  } else if (weather.humidity >= 88 && wettestPrecip >= 20) {
    umbrellaNote = 'Парасоля опційна, але вологість висока і дрібний дощ можливий.';
    pushUnique(
      umbrellaDetail,
      `Вологість ${weather.humidity}%.`,
      'Якщо сумка дозволяє, краще взяти маленьку парасолю про всяк випадок.'
    );
  }

  return {
    morningOutdoor: describeSegment(morning, weather.wind_speed),
    eveningOutdoor: describeSegment(evening, weather.wind_speed),
    layering,
    umbrellaNote,
    umbrellaDetail,
  };
}

export function getAdvice(weather: AdviceWeatherInput): Advice {
  const effectiveTemp = Math.round((weather.temp + weather.feels_like) / 2);
  const comfortBand = getComfortBand(weather.feels_like);
  const isRain = (weather.code >= 200 && weather.code < 600) || weather.hourly.some(item => item.precipitation_probability >= 45);
  const isSnow = weather.code >= 600 && weather.code < 700;
  const windy = weather.wind_speed >= 14;
  const strongWind = weather.wind_speed >= 24;

  const clothes: string[] = [];
  const shoes: string[] = [];
  const extras: string[] = [];
  const avoid: string[] = [];

  switch (comfortBand) {
    case 'deep-winter':
      pushUnique(
        clothes,
        'Термобілизна верх і низ.',
        'Гольф або щільний базовий лонгслів.',
        'Теплий светр чи обʼємна кофта другим шаром.',
        'Зимова куртка.',
        'Щільні джинси або утеплені прямі штани.'
      );
      pushUnique(
        shoes,
        'Утеплені черевики або зимові кросівки з рельєфною підошвою.',
        'Якщо мокро чи слизько, пріоритет саме черевикам.'
      );
      pushUnique(
        extras,
        'Шапка, шарф, рукавички, теплі шкарпетки.',
        'Капюшон бажаний навіть якщо є шапка.'
      );
      break;
    case 'winter':
      pushUnique(
        clothes,
        'Термоверх або лонгслів, якщо мерзнеш швидко.',
        'Гольф, кофта або светр.',
        'Зимова куртка; тепле пальто лише як альтернатива в суху погоду.',
        'Джинси або щільні брюки.'
      );
      pushUnique(
        shoes,
        'Закрите утеплене взуття без підборів.',
        'Кросівки тільки якщо вони щільні, сухо і немає слизьких ділянок.'
      );
      pushUnique(
        extras,
        'Теплі шкарпетки та шарф.',
        'Шапка бажана на ранок і вечір.'
      );
      break;
    case 'cold':
      pushUnique(
        clothes,
        'Футболка або тонкий лонгслів як база.',
        'Светр, кофта чи гольф.',
        'Тепла куртка або комфортне пальто.',
        'Джинси, щільні брюки або інші закриті штани.'
      );
      pushUnique(
        shoes,
        'Закриті кросівки або черевики на плоскій підошві.',
        'У дощ чи сльоту краще черевики.'
      );
      pushUnique(
        extras,
        'Щільні шкарпетки.',
        'Легкий шарф, якщо є вітер.'
      );
      break;
    case 'cool':
      pushUnique(
        clothes,
        'Футболка або базовий топ.',
        'Кардиган, кофта або тонкий светр.',
        'Легка куртка, тренч або демісезонне пальто.',
        'Джинси, прямі брюки або щільна спідниця міді з колготками.'
      );
      pushUnique(
        shoes,
        'Кросівки, лофери на плоскій підошві або акуратні черевики.',
        'Взуття має бути закритим, якщо сиро або вітряно.'
      );
      pushUnique(
        extras,
        'Тонка хустка або шарф на шию.',
        'Другий шар варто обирати таким, щоб його можна було зняти в приміщенні.'
      );
      break;
    case 'mild':
      pushUnique(
        clothes,
        'Футболка, топ або тонкий лонгслів.',
        'Легка кофта, сорочка чи кардиган на випадок прохолоди.',
        'Джинси, прямі брюки, чиноси або спідниця міді.'
      );
      pushUnique(
        shoes,
        'Кросівки, мокасини, лофери чи балетки на плоскій підошві.',
        'Якщо день активний, кросівки найпрактичніші.'
      );
      pushUnique(extras, 'Легкий шар у сумку на вечір або кондиціоновані приміщення.');
      break;
    case 'warm':
      pushUnique(
        clothes,
        'Футболка, топ або легка сорочка.',
        'Легкі штани, джинси, спідниця міді або мʼякі брюки.',
        'Другий шар потрібен лише як запасний варіант.'
      );
      pushUnique(
        shoes,
        'Легкі кросівки, мокасини, сандалі на плоскій підошві.',
        'Якщо планується багато ходьби, краще кросівки або мʼякі сандалі.'
      );
      pushUnique(extras, 'Окуляри від сонця в ясну погоду.');
      break;
    case 'hot':
    case 'heat':
      pushUnique(
        clothes,
        'Легка футболка, майка або сорочка з дихаючої тканини.',
        'Лляні чи бавовняні широкі штани, легкі шорти або спідниця міді.',
        PROFILE.sundressesSummerOnly ? 'Сарафан доречний тільки в справді літню стабільну спеку.' : ''
      );
      pushUnique(
        shoes,
        'Сандалі, текстильні кросівки або мʼякі лофери без підборів.',
        'Для довгих переходів краще легкі кросівки, ніж повністю відкрите взуття.'
      );
      pushUnique(
        extras,
        'Сонцезахисні окуляри.',
        'Крем SPF на відкриті ділянки шкіри.',
        'Пляшка води, якщо день активний.'
      );
      break;
  }

  if (windy) {
    pushUnique(
      clothes,
      strongWind
        ? 'Через сильний вітер верхній шар має щільно закривати корпус і шию.'
        : 'Через вітер краще не виходити лише в одному тонкому шарі.'
    );
  }

  if (isRain) {
    pushUnique(
      clothes,
      'Якщо є дощ, верхній шар має нормально переносити вологу.',
      effectiveTemp <= 18
        ? 'На прохолодний дощ краще закрита куртка, а не лише трикотаж.'
        : 'На теплий дощ вистачить легкої водостійкої куртки або сорочки-оверсорочки.'
    );
    pushUnique(
      shoes,
      'У дощ краще закрите взуття, яке не промокає відразу.',
      'Світлі тканинні кросівки без захисту краще залишити вдома.'
    );
    pushUnique(extras, 'Компактна парасоля.');
  }

  if (isSnow) {
    pushUnique(
      extras,
      'Капюшон або шапка обовʼязкові.',
      'Теплі шкарпетки та рукавички бажані навіть на короткий вихід.'
    );
  }

  if (PROFILE.minimalDresses) {
    pushUnique(
      avoid,
      'Сукні не варто робити базою образу на кожен день; краще штани, джинси, спідниця міді або трикотажний комплект.'
    );
  }

  if (PROFILE.avoidHeels) {
    pushUnique(
      avoid,
      'Підбори не рекомендовані: для міста, дощу, вітру й слизької поверхні стабільніше взуття на плоскій або низькій платформі.'
    );
  }

  if (effectiveTemp <= 10) {
    pushUnique(avoid, 'Тонкі відкриті щиколотки й надто короткий верх без другого шару краще відкласти.');
  }

  if (isRain || isSnow) {
    pushUnique(avoid, 'Взуття, яке слизьке або швидко намокає, сьогодні невдале.');
  }

  const umbrella = isRain || weather.humidity >= 88;
  const umbrellaText = isRain
    ? 'Парасоля бажана: по прогнозу є дощ або дуже високий шанс опадів.'
    : weather.humidity >= 88
      ? 'Парасоля опційна: вологість дуже висока, можлива мряка.'
      : 'Парасоля не потрібна.';

  let summary = 'Комфортний міський образ на день: пріоритет на шари, практичне взуття й речі, які легко комбінуються.';
  if (comfortBand === 'deep-winter' || comfortBand === 'winter') {
    summary = 'День під зимову збірку: тепло треба набирати шарами, а верхнім одягом має бути саме зимова куртка.';
  } else if (comfortBand === 'cold' || comfortBand === 'cool') {
    summary = 'День для демісезонного комплекту: база + теплий другий шар + закрите взуття працюють краще за один товстий шар.';
  } else if (comfortBand === 'warm') {
    summary = 'Можна тримати образ легким, але мати запасний шар на вітер, вечір або приміщення.';
  } else if (comfortBand === 'hot' || comfortBand === 'heat') {
    summary = 'Пріоритет на легкі тканини, вільний крій і взуття без перегріву стопи.';
  }

  return {
    clothes,
    shoes,
    extras,
    avoid,
    umbrella,
    umbrellaText,
    summary,
  };
}
