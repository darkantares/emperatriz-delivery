import { useState, useEffect } from "react";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";

export function useVerificationCode(
  deliveries: DeliveryItemAdapter[],
  ids: string[],
  isDelivered: boolean,
) {
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [codeVerificationStatus, setCodeVerificationStatus] = useState<
    "pending" | "valid" | "invalid"
  >("pending");
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isCodeLocked, setIsCodeLocked] = useState<boolean>(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number>(0);

  const assignmentVerificationCode = deliveries
    .find((delivery) => ids.includes(delivery.id))
    ?.deliveryVerificationCode;

  const handleVerificationCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
    setVerificationCode(cleaned);

    if (isDelivered && cleaned.length === 4) {
      const isValid = cleaned === assignmentVerificationCode;
      setCodeVerificationStatus(isValid ? "valid" : "invalid");

      if (!isValid) {
        setFailedAttempts((prev) => {
          const newAttempts = prev + 1;
          if (newAttempts >= 3) {
            setIsCodeLocked(true);
            setLockTimeRemaining(15);
          }
          return newAttempts;
        });
      }
    } else if (cleaned.length === 0) {
      setCodeVerificationStatus("pending");
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isCodeLocked && lockTimeRemaining > 0) {
      timer = setTimeout(() => {
        setLockTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isCodeLocked && lockTimeRemaining === 0) {
      setIsCodeLocked(false);
      setFailedAttempts(0);
      setVerificationCode("");
      setCodeVerificationStatus("pending");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isCodeLocked, lockTimeRemaining]);

  const resetVerificationCode = () => {
    setVerificationCode("");
    setCodeVerificationStatus("pending");
    setFailedAttempts(0);
    setIsCodeLocked(false);
    setLockTimeRemaining(0);
  };

  return {
    verificationCode,
    codeVerificationStatus,
    isCodeLocked,
    lockTimeRemaining,
    failedAttempts,
    assignmentVerificationCode,
    handleVerificationCodeChange,
    resetVerificationCode,
  };
}
