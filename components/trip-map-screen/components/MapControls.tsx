import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { IDeliveryStatus } from "@/interfaces/delivery/deliveryStatus";
import { styles } from "../tripMapStyles";

interface MapControlsProps {
  currentGroupStatus: string | null;
  hasAssignments: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

const MapControls: React.FC<MapControlsProps> = React.memo(
  ({ currentGroupStatus, hasAssignments, isDisabled, onPress }) => {
    const isInProgress =
      currentGroupStatus === IDeliveryStatus.IN_PROGRESS;

    return (
      <TouchableOpacity
        style={[
          styles.controlButton,
          isInProgress ? styles.inProgressButton : styles.startButton,
          !hasAssignments && { opacity: 0.5 },
        ]}
        onPress={onPress}
        disabled={isDisabled}
      >
        <Text style={styles.controlButtonText}>
          {isInProgress ? "En Progreso..." : "🚗 Iniciar Viaje"}
        </Text>
      </TouchableOpacity>
    );
  },
);

MapControls.displayName = "MapControls";
export default MapControls;
