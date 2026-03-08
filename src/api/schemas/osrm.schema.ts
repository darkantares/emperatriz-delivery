import { z } from 'zod';
import { OkResultOf } from './global.schema';

const CoordSchema = z.array(z.number());

const OsrmGeometrySchema = z.object({
    coordinates: z.array(CoordSchema),
    type: z.string(),
}).loose();

const OsrmLegSchema = z.object({
    distance: z.number(),
    duration: z.number(),
    summary: z.string(),
    weight: z.number(),
}).loose();

const OsrmTripSchema = z.object({
    geometry: OsrmGeometrySchema,
    legs: z.array(OsrmLegSchema),
    distance: z.number(),
    duration: z.number(),
    weight_name: z.string(),
    weight: z.number(),
}).loose();

const OsrmWaypointSchema = z.object({
    waypoint_index: z.number(),
    location: z.array(z.number()),
}).loose();

export const OsrmTripResultSchema = z.object({
    code: z.string(),
    trips: z.array(OsrmTripSchema),
    waypoints: z.array(OsrmWaypointSchema),
}).loose();

export const OsrmRouteResultSchema = z.object({
    code: z.string(),
    routes: z.array(z.unknown()),
    waypoints: z.array(z.unknown()),
}).loose();

export const OkOsrmTripSchema = OkResultOf(OsrmTripResultSchema);
export const OkOsrmRouteSchema = OkResultOf(OsrmRouteResultSchema);
