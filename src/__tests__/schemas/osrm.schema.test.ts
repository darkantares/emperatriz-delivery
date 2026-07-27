import { OkOsrmTripSchema, OkOsrmRouteSchema } from '../../api/schemas/osrm.schema';

describe('OSRM Schemas', () => {
  describe('OkOsrmTripSchema', () => {
    const validTrip = {
      code: 'Ok',
      trips: [
        {
          geometry: {
            coordinates: [[-69.9312, 18.4861], [-69.9400, 18.4900]],
            type: 'LineString',
          },
          legs: [
            {
              distance: 5500,
              duration: 1200,
              summary: 'Main Street',
              weight: 1200,
            },
          ],
          distance: 5500,
          duration: 1200,
          weight_name: 'custom',
          weight: 1200,
        },
      ],
      waypoints: [
        { waypoint_index: 0, location: [-69.9312, 18.4861] },
        { waypoint_index: 1, location: [-69.9400, 18.4900] },
      ],
    };

    it('should validate a correct OSRM trip result', () => {
      const result = OkOsrmTripSchema.safeParse({
        ok: true,
        value: validTrip,
      });
      expect(result.success).toBe(true);
    });

    it('should validate trip with multiple legs', () => {
      const multiLegTrip = {
        ...validTrip,
        trips: [
          {
            ...validTrip.trips[0],
            legs: [
              { distance: 3000, duration: 600, summary: 'Leg 1', weight: 600 },
              { distance: 2500, duration: 600, summary: 'Leg 2', weight: 600 },
            ],
          },
        ],
      };
      const result = OkOsrmTripSchema.safeParse({
        ok: true,
        value: multiLegTrip,
      });
      expect(result.success).toBe(true);
    });

    it('should validate trip with extra fields (loose schema)', () => {
      const result = OkOsrmTripSchema.safeParse({
        ok: true,
        value: { ...validTrip, extraField: 'custom' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject when code is missing', () => {
      const { code, ...tripWithoutCode } = validTrip;
      const result = OkOsrmTripSchema.safeParse({
        ok: true,
        value: tripWithoutCode,
      });
      expect(result.success).toBe(false);
    });

    it('should reject when trips is missing', () => {
      const { trips, ...tripWithoutTrips } = validTrip;
      const result = OkOsrmTripSchema.safeParse({
        ok: true,
        value: tripWithoutTrips,
      });
      expect(result.success).toBe(false);
    });

    it('should parse and return typed data', () => {
      const result = OkOsrmTripSchema.parse({
        ok: true,
        value: validTrip,
      });
      expect(result.ok).toBe(true);
      expect(result.value.code).toBe('Ok');
      expect(result.value.trips).toHaveLength(1);
      expect(result.value.waypoints).toHaveLength(2);
    });
  });

  describe('OkOsrmRouteSchema', () => {
    it('should validate a correct OSRM route result', () => {
      const result = OkOsrmRouteSchema.safeParse({
        ok: true,
        value: {
          code: 'Ok',
          routes: [{ distance: 5000, duration: 1000 }],
          waypoints: [{ lat: 18.4861, lng: -69.9312 }],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate empty routes', () => {
      const result = OkOsrmRouteSchema.safeParse({
        ok: true,
        value: {
          code: 'Ok',
          routes: [],
          waypoints: [],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should allow extra fields (loose schema)', () => {
      const result = OkOsrmRouteSchema.safeParse({
        ok: true,
        value: {
          code: 'Ok',
          routes: [],
          waypoints: [],
          extra: 'field',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
