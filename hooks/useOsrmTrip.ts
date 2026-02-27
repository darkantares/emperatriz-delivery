import { useState, useCallback } from "react";
import {
  osrmService,
  OsrmTripParams,
  OsrmTripResult,
} from "@/services/osrmService";

interface UseOsrmTripReturn {
  data: OsrmTripResult | null;
  loading: boolean;
  error: string | null;
  fetchTrip: (params: OsrmTripParams) => Promise<void>;
  setTripData: (tripData: OsrmTripResult | null) => void;
}

export const useOsrmTrip = (): UseOsrmTripReturn => {
  const [data, setData] = useState<OsrmTripResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const setTripData = useCallback((tripData: OsrmTripResult | null) => {
    setError(null);
    setData(tripData);
  }, []);

  const fetchTrip = useCallback(async (params: OsrmTripParams) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      console.log("[useOsrmTrip] Fetching trip with params:", params);

      const result = await osrmService.getTrip(params);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Error desconocido al obtener el trip");
      }

      console.log("[useOsrmTrip] Trip fetched successfully:", result.data);
      setData(result.data);
    } catch (err: any) {
      const errorMessage =
        err.message || "Error desconocido al obtener el trip";
      console.error("[useOsrmTrip] Error fetching trip:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchTrip,
    setTripData,
  };
};
