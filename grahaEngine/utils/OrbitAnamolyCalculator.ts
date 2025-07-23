// OrbitUtils.ts

import { Dayjs } from "dayjs";
import { OrbitComponent } from "../engine/ecs/components/OrbitComponent";
import { vec3 } from "gl-matrix";

const SECONDS_PER_DAY = 86400;
const JD_J2000 = 2451545.0;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export class OrbitAnomalyCalculator {
  /** Returns mean anomaly (in degrees) at a given time (in seconds since simStart) */
  static meanAnomalyAtTime(time: number, orbit: OrbitComponent): number {
    const n = (360 / orbit.orbitalPeriod!); // deg/sec
    const dt = time - orbit.epochTime;
    const M = orbit.meanAnomalyAtEpoch + n * dt;
    return ((M % 360) + 360) % 360; // normalize to [0, 360)
  }

  /** Returns true anomaly (in degrees) at a given time (in seconds since simStart) */
  static trueAnomalyAtTime(time: number, orbit: OrbitComponent): number {
    const M_deg = this.meanAnomalyAtTime(time, orbit);
    const M = M_deg * DEG2RAD;
    const e = orbit.eccentricity!;
    const E = this.solveKepler(M, e);
    const theta = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
    return ((theta * RAD2DEG) + 360) % 360;
  }

  /** Converts true anomaly to normalized orbit progress [0, 1] */
  static orbitProgress(thetaDeg: number): number {
    return (thetaDeg % 360) / 360;
  }

  /** Calculates epochTime in seconds offset from J2000 epoch */
  static calculateEpochTime(simStart: Dayjs, epochJD: number = JD_J2000): number {
    const simJD = 2440587.5 + simStart.valueOf() / (1000 * 60 * 60 * 24);
    const deltaDays = simJD - epochJD;
    return -deltaDays * SECONDS_PER_DAY;
  }

  /** Solves Kepler’s Equation for Eccentric Anomaly E (radians) */
  static solveKepler(M: number, e: number): number {
    let E = M;
    let delta = 1;
    const tolerance = 1e-6;
    let iteration = 0;

    while (Math.abs(delta) > tolerance && iteration++ < 10) {
      delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= delta;
    }

    return E;
  }

  /** Returns 3D Cartesian position in orbital plane */
  static keplerToCartesian({
    semiMajorAxis,
    eccentricity,
    inclination,
    ascendingNode,
    argumentOfPeriapsis,
    meanAnomaly,
  }: {
    semiMajorAxis: number;
    eccentricity: number;
    inclination: number;         // degrees
    ascendingNode: number;       // degrees
    argumentOfPeriapsis: number; // degrees
    meanAnomaly: number;         // degrees
  }): vec3 {
    const a = semiMajorAxis;
    const e = eccentricity;
    const i = inclination * DEG2RAD;
    const Ω = ascendingNode * DEG2RAD;
    const ω = argumentOfPeriapsis * DEG2RAD;
    const M = meanAnomaly * DEG2RAD;

    const E = OrbitAnomalyCalculator.solveKepler(M, e);
    const x_prime = a * (Math.cos(E) - e);
    const y_prime = a * Math.sqrt(1 - e * e) * Math.sin(E);

    const cosΩ = Math.cos(Ω), sinΩ = Math.sin(Ω);
    const cosω = Math.cos(ω), sinω = Math.sin(ω);
    const cosi = Math.cos(i), sini = Math.sin(i);

    const x =
      x_prime * (cosΩ * cosω - sinΩ * sinω * cosi) -
      y_prime * (cosΩ * sinω + sinΩ * cosω * cosi);
    const y =
      x_prime * (sinΩ * cosω + cosΩ * sinω * cosi) -
      y_prime * (sinΩ * sinω - cosΩ * cosω * cosi);
    const z = x_prime * (sinω * sini) + y_prime * (cosω * sini);

    return vec3.fromValues(x, y, z);
  }
}
