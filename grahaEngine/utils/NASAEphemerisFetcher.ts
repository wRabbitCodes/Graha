interface NASAOrbitData {
  semiMajorAxis: number; // km
  eccentricity: number;
  inclination: number; // degrees
  longitudeOfAscendingNode: number;
  argumentOfPeriapsis: number;
  meanAnomalyAtEpoch: number;
  orbitalPeriod: number; // days
  epoch: string;
}

interface NASAPhysicalData {
  radius: number; // optional, not from API directly
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
      COMMAND: `'${body}'`,
      OBJ_DATA: "YES",
      MAKE_EPHEM: "YES",
      EPHEM_TYPE: "ELEMENTS",
      CENTER: "500@0", // Solar system barycenter
      START_TIME: date,
      STOP_TIME: date,
      STEP_SIZE: "1 d",
      OUT_UNITS: "KM-D",
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();
      return this.parseHorizonsData(data.result);
    } catch (error) {
      console.error(`Failed to fetch data for ${body}:`, error);
      throw error;
    }
  }

  private parseHorizonsData(resultStr: string): { orbit: NASAOrbitData; physical: NASAPhysicalData } {
    const lines = resultStr.split("\n");
    const start = lines.findIndex(line => line.includes("EPOCH")) + 1;
    const dataLine = lines[start]?.trim();
    if (!dataLine) throw new Error("Could not parse data from Horizons");

    const [
      epoch,
      sma, // semi-major axis [km]
      ecc,
      inc,
      node,
      argPeri,
      meanAnomaly,
      period
    ] = dataLine.split(/\s+/);

    return {
      orbit: {
        semiMajorAxis: parseFloat(sma),
        eccentricity: parseFloat(ecc),
        inclination: parseFloat(inc),
        longitudeOfAscendingNode: parseFloat(node),
        argumentOfPeriapsis: parseFloat(argPeri),
        meanAnomalyAtEpoch: parseFloat(meanAnomaly),
        orbitalPeriod: parseFloat(period),
        epoch,
      },
      physical: {
        radius: 0,              // Not available from ELEMENTS query
        tiltAngle: 0,           // You can hardcode these or look up elsewhere
        siderealDay: 0,
        axis: [0, 1, 0],
      },
    };
  }
}
