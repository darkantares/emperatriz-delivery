import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/Themed";
import { styles } from "../tripMapStyles";

interface TripMapEmptyStateProps {
  message?: string;
}

const TripMapEmptyState: React.FC<TripMapEmptyStateProps> = React.memo(
  ({ message = "No hay datos de ruta optimizada para mostrar" }) => {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.noDataText}>{message}</Text>
        </View>
      </SafeAreaView>
    );
  },
);

TripMapEmptyState.displayName = "TripMapEmptyState";
export default TripMapEmptyState;
