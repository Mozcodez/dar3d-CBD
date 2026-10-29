const LAT = -6.8;
const LON = 39.28;
const DEG = Math.PI / 180;

export interface SunPosition {
  altitude: number;
  altitudeDeg: number;
  azimuth: number;
  azimuthDeg: number;
  nightFactor: number;
  phase: 'night' | 'twilight' | 'golden' | 'day';
}

function solarCoordinates(date: Date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const meanLongitude = ((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360 + 360) % 360;
  const meanAnomaly = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * DEG;
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const equationCenter = (1.914602 - t * (0.004817 + 0.000014 * t)) * Math.sin(meanAnomaly)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * meanAnomaly)
    + 0.000289 * Math.sin(3 * meanAnomaly);
  const omega = (125.04 - 1934.136 * t) * DEG;
  const apparentLongitude = (meanLongitude + equationCenter - 0.00569 - 0.00478 * Math.sin(omega)) * DEG;
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = (meanObliquity + 0.00256 * Math.cos(omega)) * DEG;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(apparentLongitude));
  const y = Math.tan(obliquity / 2) ** 2;
  const l0 = meanLongitude * DEG;
  const equationOfTime = 4 * (y * Math.sin(2 * l0) - 2 * eccentricity * Math.sin(meanAnomaly)
    + 4 * eccentricity * y * Math.sin(meanAnomaly) * Math.cos(2 * l0)
    - 0.5 * y * y * Math.sin(4 * l0) - 1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly)) / DEG;
  return { declination, equationOfTime };
}

export function getSunPosition(date: Date): SunPosition {
  const { declination, equationOfTime } = solarCoordinates(date);
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarMinutes = ((utcMinutes + equationOfTime + 4 * LON) % 1440 + 1440) % 1440;
  const hourAngle = (trueSolarMinutes / 4 - 180) * DEG;
  const lat = LAT * DEG;
  const altitude = Math.asin(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle));
  const azimuth = ((Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat)) / DEG + 180) % 360 + 360) % 360;
  const altitudeDeg = altitude / DEG;
  const nightFactor = Math.max(0, Math.min(1, (6 - altitudeDeg) / 12));
  const phase = altitudeDeg < -6 ? 'night' : altitudeDeg < 0 ? 'twilight' : altitudeDeg < 10 ? 'golden' : 'day';
  return { altitude, altitudeDeg, azimuth: azimuth * DEG, azimuthDeg: azimuth, nightFactor, phase };
}

export function getSunTimes(date: Date) {
  const base = new Date(date);
  base.setUTCHours(0, 0, 0, 0);
  const crosses = (target: number, rising: boolean) => {
    let previous = getSunPosition(base).altitudeDeg - target;
    for (let minute = 1; minute <= 1440; minute += 1) {
      const sample = new Date(base.getTime() + minute * 60000);
      const current = getSunPosition(sample).altitudeDeg - target;
      if ((rising && previous < 0 && current >= 0) || (!rising && previous >= 0 && current < 0)) {
        const exact = new Date(sample.getTime() - current / (current - previous) * 60000);
        return exact;
      }
      previous = current;
    }
    return null;
  };
  return {
    sunrise: crosses(-0.833, true),
    goldenHour: crosses(6, false),
    sunset: crosses(-0.833, false),
    dusk: crosses(-6, false),
  };
}

export function formatEAT(date: Date) {
  return new Intl.DateTimeFormat('en-TZ', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}
