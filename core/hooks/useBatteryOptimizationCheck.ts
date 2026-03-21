import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

const BATTERY_OPT_ALERT_SHOWN_KEY = '@battery_optimization_alert_shown_v1';

const MANUFACTURER_HINTS: Record<string, string> = {
  xiaomi: 'Tu dispositivo puede restringir apps en segundo plano.',
  huawei: 'Tu dispositivo puede restringir apps en segundo plano.',
  samsung: 'Tu dispositivo puede restringir apps en segundo plano.',
  oppo: 'Tu dispositivo puede restringir apps en segundo plano.',
  vivo: 'Tu dispositivo puede restringir apps en segundo plano.',
  realme: 'Tu dispositivo puede restringir apps en segundo plano.',
};

function getManufacturerHint(): string {
  const manufacturer = (Device.manufacturer || Device.brand || '').toLowerCase();
  return MANUFACTURER_HINTS[manufacturer] || '';
}

async function isBatteryOptimizationEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const batteryOptModule = await import('react-native-battery-optimization-check');
    return await batteryOptModule.BatteryOptEnabled();
  } catch (error) {
    console.log('[BatteryOptimization] Could not check battery optimization:', error);
    return false;
  }
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await IntentLauncher.startActivityAsync(
      'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
    );
    return;
  } catch (error) {
    console.log('[BatteryOptimization] Failed to open optimization settings:', error);
  }

  try {
    const packageName = Constants.expoConfig?.android?.package;
    if (packageName) {
      await IntentLauncher.startActivityAsync(
        'android.settings.APPLICATION_DETAILS_SETTINGS',
        {
          data: `package:${packageName}`,
        },
      );
      return;
    }
  } catch (error) {
    console.log('[BatteryOptimization] Failed to open app details settings:', error);
  }

  try {
    await Linking.openSettings();
  } catch (error) {
    console.log('[BatteryOptimization] Failed to open settings fallback:', error);
  }
}

export function useBatteryOptimizationCheck() {
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const runCheck = async () => {
      try {
        const hasShownAlert = await AsyncStorage.getItem(BATTERY_OPT_ALERT_SHOWN_KEY);
        if (hasShownAlert === '1') return;

        const isOptimizationEnabled = await isBatteryOptimizationEnabled();
        if (!isOptimizationEnabled) return;

        await AsyncStorage.setItem(BATTERY_OPT_ALERT_SHOWN_KEY, '1');

        const manufacturerHint = getManufacturerHint();
        const message = manufacturerHint
          ? `Esto puede retrasar las notificaciones. Te recomendamos desactivarla para un mejor funcionamiento.\n\n${manufacturerHint}`
          : 'Esto puede retrasar las notificaciones. Te recomendamos desactivarla para un mejor funcionamiento.';

        Alert.alert('Optimización de batería detectada', message, [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Ir a configuración',
            onPress: () => {
              openBatteryOptimizationSettings();
            },
          },
        ]);
      } catch (error) {
        console.log('[BatteryOptimization] Error while checking optimization:', error);
      }
    };

    runCheck();
  }, []);
}
