import { useReducer, useEffect } from "react";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";

interface VerificationState {
  verificationCode: string;
  codeVerificationStatus: "pending" | "valid" | "invalid";
  failedAttempts: number;
  isCodeLocked: boolean;
  lockTimeRemaining: number;
}

type VerificationAction =
  | { type: "CODE_CHANGED"; code: string; isValid: boolean | null }
  | { type: "TICK" }
  | { type: "UNLOCK" }
  | { type: "RESET" };

const initialState: VerificationState = {
  verificationCode: "",
  codeVerificationStatus: "pending",
  failedAttempts: 0,
  isCodeLocked: false,
  lockTimeRemaining: 0,
};

function verificationReducer(
  state: VerificationState,
  action: VerificationAction,
): VerificationState {
  switch (action.type) {
    case "CODE_CHANGED": {
      const { code, isValid } = action;
      if (code.length === 0) {
        return { ...state, verificationCode: code, codeVerificationStatus: "pending" };
      }
      if (isValid === null) {
        return { ...state, verificationCode: code };
      }
      const newAttempts = isValid ? state.failedAttempts : state.failedAttempts + 1;
      const shouldLock = !isValid && newAttempts >= 3;
      return {
        ...state,
        verificationCode: code,
        codeVerificationStatus: isValid ? "valid" : "invalid",
        failedAttempts: newAttempts,
        isCodeLocked: shouldLock ? true : state.isCodeLocked,
        lockTimeRemaining: shouldLock ? 15 : state.lockTimeRemaining,
      };
    }
    case "TICK":
      if (state.lockTimeRemaining <= 1) {
        return {
          ...state,
          lockTimeRemaining: 0,
          isCodeLocked: false,
          failedAttempts: 0,
          verificationCode: "",
          codeVerificationStatus: "pending",
        };
      }
      return { ...state, lockTimeRemaining: state.lockTimeRemaining - 1 };
    case "UNLOCK":
      return {
        ...state,
        isCodeLocked: false,
        failedAttempts: 0,
        verificationCode: "",
        codeVerificationStatus: "pending",
        lockTimeRemaining: 0,
      };
    case "RESET":
      return initialState;
  }
}

export function useVerificationCode(
  deliveries: DeliveryItemAdapter[],
  ids: string[],
  isDelivered: boolean,
) {
  const [state, dispatch] = useReducer(verificationReducer, initialState);

  const assignmentVerificationCode = deliveries
    .find((delivery) => ids.includes(delivery.id))
    ?.deliveryVerificationCode;

  const handleVerificationCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
    if (isDelivered && cleaned.length === 4) {
      const isValid = cleaned === assignmentVerificationCode;
      dispatch({ type: "CODE_CHANGED", code: cleaned, isValid });
    } else {
      dispatch({ type: "CODE_CHANGED", code: cleaned, isValid: null });
    }
  };

  useEffect(() => {
    if (!state.isCodeLocked || state.lockTimeRemaining <= 0) return;
    const timer = setTimeout(() => {
      dispatch({ type: "TICK" });
    }, 1000);
    return () => clearTimeout(timer);
  }, [state.isCodeLocked, state.lockTimeRemaining]);

  const resetVerificationCode = () => dispatch({ type: "RESET" });

  return {
    verificationCode: state.verificationCode,
    codeVerificationStatus: state.codeVerificationStatus,
    isCodeLocked: state.isCodeLocked,
    lockTimeRemaining: state.lockTimeRemaining,
    failedAttempts: state.failedAttempts,
    assignmentVerificationCode,
    handleVerificationCodeChange,
    resetVerificationCode,
  };
}
