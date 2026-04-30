import * as SecureStore from 'expo-secure-store';

const KEY = 'password_recovery_state';
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export type PasswordRecoveryStep = 'request' | 'login_with_temp';

export interface PasswordRecoveryState {
    active: boolean;
    email: string | null;
    startedAt: number | null;
    step: PasswordRecoveryStep;
}

export const saveRecoveryState = async (state: PasswordRecoveryState): Promise<void> => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(state));
};

export const getRecoveryState = async (): Promise<PasswordRecoveryState | null> => {
    const data = await SecureStore.getItemAsync(KEY);
    if (!data) return null;
    const state: PasswordRecoveryState = JSON.parse(data);
    if (!state.active) return null;
    if (state.startedAt && Date.now() - state.startedAt > EXPIRY_MS) {
        await clearRecoveryState();
        return null;
    }
    return state;
};

export const clearRecoveryState = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(KEY);
};
