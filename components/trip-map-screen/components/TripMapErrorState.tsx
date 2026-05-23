import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/Themed";
import { styles } from "../tripMapStyles";

interface TripMapErrorStateProps {
  message: string;
}

const TripMapErrorState: React.FC<TripMapErrorStateProps> = React.memo(
  ({ message }) => {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{message}</Text>
        </View>
      </SafeAreaView>
    );
  },
);

TripMapErrorState.displayName = "TripMapErrorState";
export default TripMapErrorState;
