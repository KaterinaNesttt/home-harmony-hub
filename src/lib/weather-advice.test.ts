import { describe, expect, it } from 'vitest';
import { getAdvice, getMorningCommuteAdvice, type AdviceWeatherInput } from './weather-advice';

function makeWeather(overrides: Partial<AdviceWeatherInput> = {}): AdviceWeatherInput {
  return {
    temp: 5,
    feels_like: 2,
    humidity: 70,
    wind_speed: 12,
    code: 801,
    hourly: [],
    ...overrides,
  };
}

describe('weather advice', () => {
  it('forces winter jacket logic for freezing days', () => {
    const advice = getAdvice(makeWeather({
      temp: -6,
      feels_like: -10,
      code: 600,
      wind_speed: 18,
    }));

    expect(advice.clothes.some(item => item.includes('Зимова куртка'))).toBe(true);
    expect(advice.avoid.some(item => item.includes('Підбори'))).toBe(true);
    expect(advice.shoes.some(item => item.includes('черевики'))).toBe(true);
  });

  it('keeps hot weather recommendations practical and summer-only for sundresses', () => {
    const advice = getAdvice(makeWeather({
      temp: 31,
      feels_like: 33,
      code: 800,
      humidity: 40,
    }));

    expect(advice.clothes.some(item => item.includes('лляні') || item.includes('Лляні'))).toBe(true);
    expect(advice.clothes.some(item => item.includes('Сарафан'))).toBe(true);
    expect(advice.umbrella).toBe(false);
  });

  it('detects when an umbrella is needed mainly for the evening route', () => {
    const commute = getMorningCommuteAdvice(makeWeather({
      temp: 14,
      feels_like: 13,
      code: 801,
      wind_speed: 10,
      hourly: [
        { time: '07:00', temp: 12, apparent_temp: 11, code: 801, precipitation_probability: 5 },
        { time: '08:00', temp: 13, apparent_temp: 12, code: 801, precipitation_probability: 10 },
        { time: '17:00', temp: 11, apparent_temp: 9, code: 500, precipitation_probability: 70 },
        { time: '18:00', temp: 10, apparent_temp: 8, code: 500, precipitation_probability: 80 },
      ],
    }));

    expect(commute.umbrellaNote.includes('сумку') || commute.umbrellaNote.includes('парасолю')).toBe(true);
    expect(commute.eveningOutdoor.includes('дощ') || commute.eveningOutdoor.includes('ризик')).toBe(true);
    expect(commute.layering.length).toBeGreaterThan(2);
  });
});
