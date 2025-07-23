import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';

// Interface to match your JSON structure
interface OrbitData {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  longitudeOfAscendingNode: number;
  argumentOfPeriapsis: number;
  meanAnomalyAtEpoch: number;
  orbitalPeriod: number;
}

interface CelestialBody {
  type: 'PLANET' | 'MOON';
  name: string;
  radius: number;
  tiltAngle: number;
  siderealDay: number;
  axis?: [number, number, number];
  parent?: string;
  orbitData: OrbitData;
}

interface EphemerisData {
  epoch: string;
  bodies: CelestialBody[];
}

// Physical properties (from NASA planetary fact sheets and your data)
const PHYSICAL_PROPERTIES: Record<string, { radius: number; tiltAngle: number; siderealDay: number; axis?: [number, number, number] }> = {
  Mercury: { radius: 2439.7, tiltAngle: 0.034, siderealDay: 1407.6 },
  Venus: { radius: 6051.8, tiltAngle: 177.36, siderealDay: -5832.5, axis: [0, -1, 0] },
  Earth: { radius: 6371.0, tiltAngle: 23.44, siderealDay: 23.934 },
  Moon: { radius: 1737.4, tiltAngle: 5.145, siderealDay: 655.7 },
  Mars: { radius: 3389.5, tiltAngle: 25.19, siderealDay: 24.622 },
  Jupiter: { radius: 69911, tiltAngle: 3.13, siderealDay: 9.925 },
  Saturn: { radius: 58232, tiltAngle: 26.73, siderealDay: 10.656 },
  Uranus: { radius: 25362, tiltAngle: 97.77, siderealDay: -17.24 },
};

// JPL Horizons body IDs
const HORIZONS_IDS: Record<string, string> = {
  Mercury: '199',
  Venus: '299',
  Earth: '399',
  Moon: '301',
  Mars: '499',
  Jupiter: '599',
  Saturn: '699',
  Uranus: '799',
};

// Function to fetch ephemerides from JPL Horizons
async function fetchEphemerides(epoch: Dayjs): Promise<EphemerisData> {
  const epochStr = epoch.format('YYYY-MM-DD HH:mm:ss');
  const bodies: CelestialBody[] = [];

  for (const [name, id] of Object.entries(HORIZONS_IDS)) {
    try {
      const isMoon = name === 'Moon';
      const center = isMoon ? '399' : '500@10'; // Earth for Moon, Sun for planets
      const response = await axios.get('https://ssd.jpl.nasa.gov/api/horizons.api', {
        params: {
          format: 'json',
          COMMAND: `'${id}'`,
          OBJ_DATA: 'YES',
          MAKE_EPHEM: 'YES',
          EPHEM_TYPE: 'ELEMENTS',
          CENTER: center,
          START_TIME: epochStr,
          STOP_TIME: epochStr,
          STEP_SIZE: '1',
          QUANTITIES: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20',
        },
      });

      const data = response.data.result;
      // Parse Horizons output (simplified parsing for key elements)
      const semiMajorAxis = parseFloat(data.match(/A\s*=\s*([\d.E+-]+)/)?.[1] || 0) * 1e6; // AU to km
      const eccentricity = parseFloat(data.match(/EC\s*=\s*([\d.E+-]+)/)?.[1] || 0);
      const inclination = parseFloat(data.match(/IN\s*=\s*([\d.E+-]+)/)?.[1] || 0);
      const longitudeOfAscendingNode = parseFloat(data.match(/OM\s*=\s*([\d.E+-]+)/)?.[1] || 0);
      const argumentOfPeriapsis = parseFloat(data.match(/W\s*=\s*([\d.E+-]+)/)?.[1] || 0);
      const meanAnomalyAtEpoch = parseFloat(data.match(/MA\s*=\s*([\d.E+-]+)/)?.[1] || 0);
      const orbitalPeriod = parseFloat(data.match(/PER\s*=\s*([\d.E+-]+)/)?.[1] || 0);

      const body: CelestialBody = {
        type: isMoon ? 'MOON' : 'PLANET',
        name,
        radius: PHYSICAL_PROPERTIES[name].radius,
        tiltAngle: PHYSICAL_PROPERTIES[name].tiltAngle,
        siderealDay: PHYSICAL_PROPERTIES[name].siderealDay,
        ...(PHYSICAL_PROPERTIES[name].axis && { axis: PHYSICAL_PROPERTIES[name].axis }),
        ...(isMoon && { parent: 'Earth' }),
        orbitData: {
          semiMajorAxis,
          eccentricity,
          inclination,
          longitudeOfAscendingNode,
          argumentOfPeriapsis,
          meanAnomalyAtEpoch,
          orbitalPeriod,
        },
      };

      bodies.push(body);
    } catch (error) {
      console.error(`Failed to fetch data for ${name}:`, error);
    }
  }

  return {
    epoch: epochStr,
    bodies,
  };
}

// Example usage
async function main() {
  const newEpoch = dayjs('2025-07-22T00:00:00Z');
  const ephemerisData = await fetchEphemerides(newEpoch);
  console.log(JSON.stringify(ephemerisData, null, 2));
}

main().catch(console.error);