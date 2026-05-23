import { Coordinate } from "../types";

export function calculateDistance(
  coord1: Coordinate,
  coord2: Coordinate,
): number {
  if (!coord1 || coord1.latitude == null || coord1.longitude == null) {
    console.log("[calculateDistance] coord1 inválida", JSON.stringify(coord1));
    return Infinity;
  }
  if (!coord2 || coord2.latitude == null || coord2.longitude == null) {
    console.log("[calculateDistance] coord2 inválida", JSON.stringify(coord2));
    return Infinity;
  }
  const R = 6371e3;
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function simulateDeviation(coord: Coordinate): Coordinate {
  if (!coord) {
    console.log("[simulateDeviation] coord null");
    return coord;
  }
  if (Math.random() > 0.9) {
    const deviationAmount = 0.0005;
    return {
      latitude: coord.latitude + (Math.random() - 0.5) * deviationAmount,
      longitude: coord.longitude + (Math.random() - 0.5) * deviationAmount,
    };
  }
  return coord;
}
