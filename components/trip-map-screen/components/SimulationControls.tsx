import React from "react";
import { Pressable, Text } from "react-native";
import { styles } from "../tripMapStyles";

interface SimulationControlsProps {
  isManualSimulation: boolean;
  onToggle: () => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = React.memo(
  ({ isManualSimulation, onToggle }) => {
    return (
      <Pressable
        style={[
          styles.simulationButton,
          isManualSimulation && styles.simulationButtonActive,
        ]}
        onPress={onToggle}
      >
        <Text style={styles.simulationButtonText}>
          {isManualSimulation ? "⏸" : "▶️"}
        </Text>
      </Pressable>
    );
  },
);

SimulationControls.displayName = "SimulationControls";
export default SimulationControls;
