import * as Updates from 'expo-updates';

export interface OTAUpdateResult {
  updated: boolean;
  error?: Error;
}

/**
 * Checks for an available OTA update and applies it if found.
 * In __DEV__ mode this is a no-op.
 */
export async function checkAndApplyUpdate(): Promise<OTAUpdateResult> {
  if (__DEV__) {
    return { updated: false };
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      return { updated: false };
    }

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return { updated: true };
  } catch (error) {
    return { updated: false, error: error as Error };
  }
}

/**
 * Returns true when the running version is older than the required minimum.
 */
export function checkMinimumVersionRequired(
  currentVersion: string,
  minimumVersion: string,
): boolean {
  return isVersionOlderThan(currentVersion, minimumVersion);
}

function isVersionOlderThan(current: string, minimum: string): boolean {
  const toNumbers = (v: string) => v.split('.').map(Number);
  const cur = toNumbers(current);
  const min = toNumbers(minimum);

  for (let i = 0; i < Math.max(cur.length, min.length); i++) {
    const c = cur[i] ?? 0;
    const m = min[i] ?? 0;
    if (c < m) return true;
    if (c > m) return false;
  }
  return false;
}
