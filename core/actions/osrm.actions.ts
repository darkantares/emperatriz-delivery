import { apiAction } from '@/core/api/apiAction';
import { BackendUrls } from '@/utils/enum';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface OsrmRouteParams {
    origin: Coordinates;
    destination: Coordinates;
    steps?: boolean;
    geometries?: string;
    overview?: string;
    alternatives?: boolean;
    continue_straight?: boolean;
}

export interface OsrmRouteResult {
    code: string;
    routes: any[];
    waypoints: any[];
}

export interface OsrmTripParams {
    coordinates: Coordinates[];
    source?: string;
    destination?: string;
    roundtrip?: boolean;
    geometries?: string;
    overview?: string;
}

export interface OsrmTripResult {
    code: string;
    trips: OsrmTrip[];
    waypoints: OsrmWaypoint[];
}

export interface OsrmTrip {
    geometry: OsrmGeometry;
    legs: OsrmLeg[];
    distance: number;
    duration: number;
    weight_name: string;
    weight: number;
}

export interface OsrmGeometry {
    coordinates: number[][];
    type: string;
}

export interface OsrmLeg {
    steps: any[];
    distance: number;
    duration: number;
    summary: string;
    weight: number;
}

export interface OsrmWaypoint {
    waypoint_index: number;
    trips_index: number;
    location: number[];
    name: string;
    distance: number;
    hint: string;
}

export const getOsrmRoute = (params: OsrmRouteParams): Promise<OsrmRouteResult> => {
    const coordinatesParam = `${params.origin.longitude},${params.origin.latitude};${params.destination.longitude},${params.destination.latitude}`;

    const queryParams = new URLSearchParams({
        coordinates: coordinatesParam,
        steps: params.steps !== undefined ? String(params.steps) : 'true',
    });

    if (params.geometries) queryParams.append('geometries', params.geometries);
    if (params.overview) queryParams.append('overview', params.overview);
    if (params.alternatives !== undefined) queryParams.append('alternatives', String(params.alternatives));
    if (params.continue_straight !== undefined) queryParams.append('continue_straight', String(params.continue_straight));

    return apiAction.get<OsrmRouteResult>(`${BackendUrls.OsrmRoute}?${queryParams.toString()}`);
};

export const getOsrmTrip = (params: OsrmTripParams): Promise<OsrmTripResult> => {
    const coordinatesParam = params.coordinates
        .map(coord => `${coord.longitude},${coord.latitude}`)
        .join(';');

    const queryParams = new URLSearchParams({ coordinates: coordinatesParam });

    if (params.source) queryParams.append('source', params.source);
    if (params.destination) queryParams.append('destination', params.destination);
    if (params.roundtrip !== undefined) queryParams.append('roundtrip', String(params.roundtrip));
    if (params.geometries) queryParams.append('geometries', params.geometries);
    if (params.overview) queryParams.append('overview', params.overview);

    return apiAction.get<OsrmTripResult>(`${BackendUrls.OsrmTrip}?${queryParams.toString()}`);
};
