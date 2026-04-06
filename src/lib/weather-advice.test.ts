import { describe, expect, it } from 'vitest';
import { getAdvice, getMorningHint, type AdviceWeatherInput } from './weather-advice';

function makeWeather(overrides: Partial<AdviceWeatherInput> = {}): AdviceWeatherInput {
  return {
    temp: 5,
    feels_like: 3,
    humidity: 70,
    wind_speed: 6,
    code: 801,
    precipitation_probability: 10,
    uv_index: 2,
    hourly: [],
    ...overrides,
  };
}

describe('weather advice', () => {
  it('forces coat recommendation for 15-19°C', () => {
    const advice = getAdvice(makeWeather({ temp: 17, feels_like: 16 }));
    expect(advice.clothes.some((item) => item.includes('Пальто'))).toBe(true);
  });

  it('forces winter jacket and winter accessories below zero', () => {
    const advice = getAdvice(makeWeather({ temp: -4, feels_like: -8, precipitation_probability: 60 }));
    expect(advice.clothes.some((item) => item.includes('Зимова куртка') || item.includes('пуховик'))).toBe(true);
    expect(advice.accessories.some((item) => item.includes('Шапка'))).toBe(true);
    expect(advice.umbrella).toBe(true);
  });

  it('never recommends heels and limits sundresses to summer heat wording', () => {
    const advice = getAdvice(makeWeather({ temp: 26, feels_like: 27, uv_index: 7 }));
    expect(advice.avoid.some((item) => item.includes('підборах'))).toBe(true);
    expect(advice.avoid.some((item) => item.includes('Сарафан'))).toBe(true);
    expect(advice.accessories.some((item) => item.includes('Сонцезахисні окуляри'))).toBe(true);
  });

  it('builds a morning hint from commute hours', () => {
    const hint = getMorningHint(makeWeather({
      temp: 12,
      hourly: [
        { time: '07:00', temp: 8, apparent_temp: 7, code: 801, precipitation_probability: 0 },
        { time: '08:00', temp: 9, apparent_temp: 8, code: 801, precipitation_probability: 0 },
        { time: '17:00', temp: 14, apparent_temp: 13, code: 801, precipitation_probability: 0 },
        { time: '18:00', temp: 13, apparent_temp: 12, code: 801, precipitation_probability: 0 },
      ],
    }), new Date('2026-04-01T07:30:00'));
    expect(hint).toContain('+8');
    expect(hint).toContain('+12');
  });
});
