// OrbitUtils.ts

import { OrbitComponent } from "../engine/ecs/components/OrbitComponent";

const SECONDS_PER_DAY = 86400;
const JD_J2000 = 2451545.0;

export class OrbitUtils {
  /** Solve Kepler's Equation: M = E - e*sin(E) */
  static solveKepler(M: number, e: number): number {
    let E = M;
    for (let i = 0; i < 10; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

  /** Returns mean anomaly at a given time based on epoch */
  static meanAnomalyAtTime(time: number, orbit: OrbitComponent): number {
    const n = (2 * Math.PI) / orbit.orbitalPeriod!;
    const dt = time - orbit.epochTime;
    return (orbit.meanAnomalyAtEpoch + n * dt) % (2 * Math.PI);
  }

  /** Returns true anomaly (theta) at a given time */
  static trueAnomalyAtTime(time: number, orbit: OrbitComponent): number {
    const M = this.meanAnomalyAtTime(time, orbit);
    const E = this.solveKepler(M, orbit.eccentricity!);
    const theta = 2 * Math.atan2(
      Math.sqrt(1 + orbit.eccentricity!) * Math.sin(E / 2),
      Math.sqrt(1 - orbit.eccentricity!) * Math.cos(E / 2)
    );
    return (theta + 2 * Math.PI) % (2 * Math.PI); // Ensure in [0, 2π]
  }

  /** Converts true anomaly to normalized orbit progress [0, 1] */
  static orbitProgress(theta: number): number {
    return theta / (2 * Math.PI);
  }

  /** Calculates epochTime for given simulation start date in UTC (e.g., 2025-06-30) */
  static calculateEpochTime(simStartDateUTC: string, epochJD: number = JD_J2000): number {
    const date = new Date(simStartDateUTC);
    const simJD = 2440587.5 + date.getTime() / (1000 * 60 * 60 * 24);
    const deltaDays = simJD - epochJD;
    return -deltaDays * SECONDS_PER_DAY;
  }
} 
