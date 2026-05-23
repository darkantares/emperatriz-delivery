import React from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/Themed";
import { CustomColors } from "@/constants/CustomColors";
import { styles } from "../tripMapStyles";

interface TripMapLoadingStateProps {
  message?: string;
}

const TripMapLoadingState: React.FC<TripMapLoadingStateProps> = React.memo(
  ({ message = "Cargando ruta optimizada..." }) => {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={CustomColors.secondary} />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </SafeAreaView>
    );
  },
);

TripMapLoadingState.displayName = "TripMapLoadingState";
export default TripMapLoadingState;
