interface NASAOrbitData {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  longitudeOfAscendingNode: number;
  argumentOfPeriapsis: number;
  meanAnomalyAtEpoch: number;
  orbitalPeriod: number;
  epoch: string; // Date-time of the data
}

interface NASAPhysicalData {
  radius: number;
  tiltAngle: number;
  siderealDay: number;
  axis?: [number, number, number];
}

export class NASADataFetcher {
  private readonly baseUrl = "https://ssd.jpl.nasa.gov/api/horizons.api";

  async fetchPlanetaryData(
    body: string,
    date: string
  ): Promise<{ orbit: NASAOrbitData; physical: NASAPhysicalData }> {
    const params = new URLSearchParams({
      format: "json",
      COMMAND: `'${body}'`, // e.g., '399' for Earth
      OBJ_DATA: "YES",
      MAKE_EPHEM: "YES",
      EPHEM_TYPE: "ELEMENTS",
      CENTER: "500@10", // Barycenter of the solar system
      START_TIME: date,
      STOP_TIME: date,
      STEP_SIZE: "1d",
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();
      return this.parseHorizonsData(data);
    } catch (error) {
      console.error(`Failed to fetch data for ${body}:`, error);
      throw error;
    }
  }

  private parseHorizonsData(data: any): { orbit: NASAOrbitData; physical: NASAPhysicalData } {
    // Example parsing, adjust based on actual Horizons API response
    return {
      orbit: {
        semiMajorAxis: data.result.semiMajorAxis * 1000, // Convert AU to km
        eccentricity: data.result.eccentricity,
        inclination: data.result.inclination,
        longitudeOfAscendingNode: data.result.longAscNode,
        argumentOfPeriapsis: data.result.argPeriapsis,
        meanAnomalyAtEpoch: data.result.meanAnomaly,
        orbitalPeriod: data.result.orbitalPeriod,
        epoch: data.result.epoch,
      },
      physical: {
        radius: data.result.radius,
        tiltAngle: data.result.tiltAngle,
        siderealDay: data.result.siderealDay,
        axis: data.result.axis || [0, 1, 0],
      },
    };
  }
}