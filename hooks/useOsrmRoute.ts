import { useState, useCallback } from "react";
import {
  osrmService,
  OsrmRouteParams,
  OsrmRouteResult,
} from "@/services/osrmService";

interface UseOsrmRouteReturn {
  data: OsrmRouteResult | null;
  loading: boolean;
  error: string | null;
  fetchRoute: (params: OsrmRouteParams) => Promise<void>;
}

export const useOsrmRoute = (): UseOsrmRouteReturn => {
  const [data, setData] = useState<OsrmRouteResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async (params: OsrmRouteParams) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
    //   console.log("[useOsrmRoute] Fetching route with params:", params);

      const result = await osrmService.getRoute(params);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Error desconocido al obtener la ruta");
      }

    //   console.log("[useOsrmRoute] Route fetched successfully:", result.data);
      setData(result.data);
    } catch (err: any) {
      const errorMessage =
        err.message || "Error desconocido al obtener la ruta";
      console.error("[useOsrmRoute] Error fetching route:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchRoute,
  };
};
