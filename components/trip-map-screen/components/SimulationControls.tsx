import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { styles } from "../tripMapStyles";

interface SimulationControlsProps {
  isManualSimulation: boolean;
  onToggle: () => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = React.memo(
  ({ isManualSimulation, onToggle }) => {
    return (
      <TouchableOpacity
        style={[
          styles.simulationButton,
          isManualSimulation && styles.simulationButtonActive,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.simulationButtonText}>
          {isManualSimulation ? "⏸" : "▶️"}
        </Text>
      </TouchableOpacity>
    );
  },
);

SimulationControls.displayName = "SimulationControls";
export default SimulationControls;
