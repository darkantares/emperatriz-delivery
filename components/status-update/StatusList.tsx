import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CustomColors } from "@/constants/CustomColors";
import { getStatusColor } from "@/interfaces/delivery/deliveryStatus";

type Status = { id: number; title: string };

type Props = {
  availableStatuses: Status[];
  selectedStatus: string | null;
  onSelectStatus: (title: string) => void;
  loadingStatuses: boolean;
  styles: any;
};

export function StatusList({
  availableStatuses,
  selectedStatus,
  onSelectStatus,
  loadingStatuses,
  styles,
}: Props) {
  if (loadingStatuses) {
    return (
      <View style={styles.statusList}>
        {[...Array(4)].map((_, idx) => (
          <View key={`skeleton-${idx}`} style={styles.skeletonItem}>
            <View style={styles.skeletonRadio} />
            <View style={styles.skeletonText} />
            <View style={styles.skeletonIndicator} />
          </View>
        ))}
      </View>
    );
  }

  if (!availableStatuses.length) {
    return (
      <View style={styles.noStatusesContainer}>
        <Text style={styles.noStatusesText}>
          No hay estados disponibles para progresión. Este es un estado final.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.statusList}>
      {availableStatuses.map((item) => {
        const isSelected = selectedStatus === item.title;
        const statusColor = getStatusColor(item.title);
        return (
          <TouchableOpacity
            key={item.id.toString()}
            style={[
              styles.statusItem,
              isSelected && { borderColor: statusColor, borderWidth: 2 },
            ]}
            onPress={() => onSelectStatus(item.title)}
          >
            <View
              style={[styles.radioButton, isSelected && { borderColor: statusColor }]}
            >
              {isSelected && (
                <View
                  style={[styles.radioButtonSelected, { backgroundColor: statusColor }]}
                />
              )}
            </View>
            <Text
              style={[
                styles.statusText,
                { color: isSelected ? statusColor : CustomColors.textLight },
              ]}
            >
              {item.title}
            </Text>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
