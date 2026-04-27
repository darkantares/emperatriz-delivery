import { useEffect, useRef, useState } from 'react';
import { checkAndApplyUpdate, checkMinimumVersionRequired } from '@/services/otaUpdates.service';
import Constants from 'expo-constants';
import { API_URL } from '@/services/api';

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'updated' | 'error';

interface OTAUpdatesState {
  status: UpdateStatus;
  isForceUpdateRequired: boolean;
  error: Error | null;
  retry: () => void;
}

async function fetchMinVersionRequired(): Promise<string> {
  const res = await fetch(`${API_URL}/app-version`);
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
    runUpdateCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    isForceUpdateRequired,
    error,
    retry: runUpdateCheck,
  };
}
