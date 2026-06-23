import { useEffect, useRef, useState } from 'react';
import { checkAndApplyUpdate, checkMinimumVersionRequired } from '@/services/otaUpdates.service';
import Constants from 'expo-constants';
import { API_URL, getApiUrl } from '@/services/api';
import { ApiEndpoints } from '@/utils/api-endpoints';

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'updated' | 'error';

interface OTAUpdatesState {
  status: UpdateStatus;
  isForceUpdateRequired: boolean;
  error: Error | null;
  retry: () => void;
}

async function fetchMinVersionRequired(): Promise<string> {
  const res = await fetch(getApiUrl(ApiEndpoints.AppVersion));
  const data = await res.json();
  return data.minVersion;
}

export function useOTAUpdates(): OTAUpdatesState {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [isForceUpdateRequired, setIsForceUpdateRequired] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isRunning = useRef(false);

  const runUpdateCheck = async () => {
    if (isRunning.current) return;
    isRunning.current = true;
    setError(null);

    try {
      setStatus('checking');

      const currentVersion: string =
        (Constants.expoConfig?.version ?? '1.0.0') as string;
      const minVersion = await fetchMinVersionRequired();

      if (checkMinimumVersionRequired(currentVersion, minVersion)) {
        setIsForceUpdateRequired(true);
        setStatus('downloading');

        const result = await checkAndApplyUpdate();
        if (result.error) {
          setError(result.error);
          setStatus('error');
        }
        // If updated === true, reloadAsync was called and app restarts automatically
      } else {
        // Silently check and apply update in the background
        setStatus('downloading');
        const result = await checkAndApplyUpdate();
        if (result.error) {
          // Non-blocking: don't surface the error to the user
          console.warn('[OTA] Background update check failed:', result.error.message);
        }
        setStatus('idle');
      }
    } catch (e) {
      setError(e as Error);
      setStatus('error');
    } finally {
      isRunning.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const originalSetStatus = setStatus;
    const originalSetError = setError;
    const originalSetForce = setIsForceUpdateRequired;

    const run = async () => {
      if (isRunning.current || cancelled) return;
      isRunning.current = true;
      originalSetError(null);

      try {
        originalSetStatus('checking');

        const currentVersion: string =
          (Constants.expoConfig?.version ?? '1.0.0') as string;
        const minVersion = await fetchMinVersionRequired();

        if (cancelled) return;

        if (checkMinimumVersionRequired(currentVersion, minVersion)) {
          originalSetForce(true);
          originalSetStatus('downloading');

          const result = await checkAndApplyUpdate();
          if (cancelled) return;
          if (result.error) {
            originalSetError(result.error);
            originalSetStatus('error');
          }
        } else {
          originalSetStatus('downloading');
          const result = await checkAndApplyUpdate();
          if (cancelled) return;
          if (result.error) {
            console.warn('[OTA] Background update check failed:', result.error.message);
          }
          originalSetStatus('idle');
        }
      } catch (e) {
        if (!cancelled) {
          originalSetError(e as Error);
          originalSetStatus('error');
        }
      } finally {
        isRunning.current = false;
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return {
    status,
    isForceUpdateRequired,
    error,
    retry: runUpdateCheck,
  };
}
