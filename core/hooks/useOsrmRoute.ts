import { useState, useCallback } from 'react';
import { getOsrmRoute, OsrmRouteParams, OsrmRouteResult } from '@/core/actions/osrm.actions';

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
            const result = await getOsrmRoute(params);
            setData(result);
        } catch (err: any) {
            const errorMessage = err.message || 'Error desconocido al obtener la ruta';
            console.error('[useOsrmRoute] Error fetching route:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, error, fetchRoute };
};
