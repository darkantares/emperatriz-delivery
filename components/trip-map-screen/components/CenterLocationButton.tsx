import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { styles } from "../tripMapStyles";
import { Coordinate } from "../types";

interface CenterLocationButtonProps {
  currentPosition: Coordinate | null;
  onCenter: () => void;
}

const CenterLocationButton: React.FC<CenterLocationButtonProps> = React.memo(
  ({ currentPosition, onCenter }) => {
    return (
      <TouchableOpacity
        style={[
          styles.centerButton,
          !currentPosition && { opacity: 0.4 },
        ]}
        onPress={onCenter}
      >
        <Text style={styles.centerButtonText}>📍</Text>
      </TouchableOpacity>
    );
  },
);

CenterLocationButton.displayName = "CenterLocationButton";
export default CenterLocationButton;
