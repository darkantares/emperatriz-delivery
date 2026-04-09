import {
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ScrollView,
  View as RNView,
  Dimensions,
} from "react-native";
import { View } from "@/components/Themed";
import { socketService, SocketEventType } from "@/services/websocketService";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef, useState } from "react";
import { CustomColors } from "@/constants/CustomColors";
import { useDelivery } from "@/context/DeliveryContext";
import { useRouteContext } from "@/contexts/RouteContext";
import { AssignmentType } from "@/utils/enum";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import GroupStatusUpdateModal from "@/components/status-update/GroupStatusUpdateModal";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import EarningsCard from "@/components/ganancias/EarningsCard";
import TopRoute from "@/components/ganancias/TopRoute";
import RecentDeliveries from "@/components/ganancias/RecentDeliveries";
import PayoutHistory from "@/components/ganancias/PayoutHistory";
import StatsCharts from "@/components/ganancias/StatsCharts";
import { DeliveryItemList } from "@/components/delivery-items/DeliveryItemList";
import { useGanancias } from "@/core/hooks/useGanancias";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = ["Entregas", "Ganancias", "Pagos", "Estadísticas"] as const;
type Tab = (typeof TABS)[number];

// ─── Segmented Control ──────────────────────────────────────────────────────
const SegmentedTabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) => {
  return (
    <RNView style={tabStyles.container}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            tabStyles.tab,
            activeTab === tab && tabStyles.tabActive,
          ]}
          onPress={() => onTabChange(tab)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              tabStyles.tabText,
              activeTab === tab && tabStyles.activeTabText,
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </RNView>
  );
};

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 12,
    marginHorizontal: 2,
    padding: 3,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CustomColors.divider,
  },
  indicator: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 9,
    backgroundColor: CustomColors.primary,
  },
  tabActive: {
    backgroundColor: CustomColors.primary,
    borderRadius: 9,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: CustomColors.textLight,
    opacity: 0.5,
    textAlign: "center",
  },
  activeTabText: {
    color: "#FFFFFF",
    opacity: 1,
  },
});


function TabOneScreenContent() {
  const [activeTab, setActiveTab] = useState<Tab>("Entregas");
  // compute header title based on current tab
  const headerTitle =
    activeTab === "Ganancias"
      ? "Mis ganancias"
      : activeTab === "Entregas"
      ? "Entregas"
      : activeTab === "Pagos"
      ? "Historial de pagos"
      : "Estadísticas";  

  const {
    allDeliveries,
    deliveries,
    loading,
    refreshing,
    onRefresh,
    fetchDeliveries,
    handleDeliveryUpdated,
    handleDeliveryAssigned,
    handleDeliveryReordered,
    handleDriversGroupAssigned,
  } = useDelivery();

  const { tripLoading, startRoutes } = useRouteContext();

  const {
    earnings,
    paidInvoices,
    monthlyStats,
    weeklyStats,
    deliveryStats,
    topRoute,
    recentDeliveries,
    isLoading: gananciaLoading,
    refresh: refreshGanancias,
  } = useGanancias();
 
  const [groupStatusModalVisible, setGroupStatusModalVisible] = useState(false);
  const [groupStatusModalParams, setGroupStatusModalParams] = useState<{
    ids: string[];
    assignmentType: AssignmentType;
    groupTitle: string;
    currentStatus: string;
    totalAmount: number;
  } | null>(null);

  const handleDeliveryItemPress = (delivery: DeliveryItemAdapter) => {
    setGroupStatusModalParams({
      ids: [delivery.id],
      assignmentType: delivery.type,
      groupTitle: `${delivery.type === AssignmentType.PICKUP ? "Recogida" : "Entrega"}: ${delivery.client}`,
      currentStatus: delivery.deliveryStatus?.title || "",
      totalAmount: Number(delivery.deliveryCost + delivery.amountToBeCharged),
    });
    setGroupStatusModalVisible(true);
  };

  const handlersRef = useRef({
    onDriverAssigned: (data: any) => { handleDeliveryAssigned(data); },
    onDriversGroupAssigned: (data: any) => { handleDriversGroupAssigned(data); },
    onDeliveryReordered: (data: any) => { handleDeliveryReordered(data); },
    onDeliveryUpdated: (data: any) => { handleDeliveryUpdated(data); },
  });

  useEffect(() => {
    handlersRef.current = {
      onDriverAssigned: (data: any) => { handleDeliveryAssigned(data); },
      onDriversGroupAssigned: (data: any) => { handleDriversGroupAssigned(data); },
      onDeliveryReordered: (data: any) => { handleDeliveryReordered(data); },
      onDeliveryUpdated: (data: any) => { handleDeliveryUpdated(data); },
    };
  }, [handleDeliveryAssigned, handleDriversGroupAssigned, handleDeliveryReordered, handleDeliveryUpdated]);

  useEffect(() => {
    socketService.connect();

    const onDriverAssigned = (data: any) => handlersRef.current.onDriverAssigned(data);
    const onDeliveryReordered = (data: any) => handlersRef.current.onDeliveryReordered(data);
    const onDeliveryUpdated = (data: any) => handlersRef.current.onDeliveryUpdated(data);
    const onDriversGroupAssigned = (data: any) => handlersRef.current.onDriversGroupAssigned(data);

    socketService.on(SocketEventType.DRIVER_ASSIGNED, onDriverAssigned);
    socketService.on(SocketEventType.DELIVERY_REORDERED, onDeliveryReordered);
    socketService.on(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, onDeliveryUpdated);
    socketService.on(SocketEventType.DRIVERS_GROUP_ASSIGNED, onDriversGroupAssigned);

    return () => {
      socketService.off(SocketEventType.DRIVER_ASSIGNED, onDriverAssigned);
      socketService.off(SocketEventType.DELIVERY_REORDERED, onDeliveryReordered);
      socketService.off(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, onDeliveryUpdated);
      socketService.off(SocketEventType.DRIVERS_GROUP_ASSIGNED, onDriversGroupAssigned);
    };
  }, []);

  const handleStartRoutes = async () => {
    try {
      await startRoutes(allDeliveries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido al calcular la ruta optimizada.';
      Alert.alert("Error", errorMessage, [{ text: "Entendido" }]);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          {/* Header */}
          <RNView style={styles.header}>
            <RNView style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              {/* <RNView style={styles.liveRow}>
                <RNView style={styles.liveDot} />
                <Text style={styles.liveText}>En tiempo real</Text>
              </RNView> */}
            </RNView>
            <TouchableOpacity style={styles.refreshButton} onPress={() => { fetchDeliveries(); refreshGanancias(); }}>
              <Ionicons name="refresh-outline" size={20} color={CustomColors.textLight} />
            </TouchableOpacity>
          </RNView>

          <SegmentedTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "Entregas" ? (
            <DeliveryItemList
              data={deliveries}
              loading={loading}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onItemPress={handleDeliveryItemPress}
              contentContainerStyle={{ paddingBottom: 120 }}
              style={{ flex: 1 }}
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {activeTab === "Ganancias" && (
                <>
                  <EarningsCard earnings={earnings} deliveries={deliveryStats} isLoading={gananciaLoading} />
                  <TopRoute route={topRoute} isLoading={gananciaLoading} />
                  <RecentDeliveries items={recentDeliveries} isLoading={gananciaLoading} />
                </>
              )}
              {activeTab === "Pagos" && <PayoutHistory items={paidInvoices} isLoading={gananciaLoading} />}
              {activeTab === "Estadísticas" && <StatsCharts monthlyStats={monthlyStats} weeklyStats={weeklyStats} isLoading={gananciaLoading} />}

              <RNView style={{ height: 120 }} />
            </ScrollView>
          )}

          {groupStatusModalParams && (
            <GroupStatusUpdateModal
              visible={groupStatusModalVisible}
              onClose={() => setGroupStatusModalVisible(false)}
              onSuccess={(newStatus) => {
                setGroupStatusModalVisible(false);
                fetchDeliveries();
                Alert.alert("Estado actualizado", `Nuevo estado: ${newStatus}`);
              }}
              ids={groupStatusModalParams.ids}
              assignmentType={groupStatusModalParams.assignmentType}
              groupTitle={groupStatusModalParams.groupTitle}
              currentStatus={groupStatusModalParams.currentStatus}
              totalAmount={groupStatusModalParams.totalAmount}
            />
          )}

          {/* Iniciar Rutas button — only if we have at least one delivery */}
          {deliveries && deliveries.length > 0 && (
            <RNView style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.startRoutesButton, tripLoading && styles.startRoutesButtonDisabled]}
                onPress={handleStartRoutes}
                disabled={tripLoading}
              >
                <Ionicons
                  name="map-outline"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.startRoutesButtonText}>
                  {tripLoading ? "Calculando ruta..." : "Iniciar Rutas"}
                </Text>
              </TouchableOpacity>
            </RNView>
          )}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

export default function TabOneScreen() {
  return <TabOneScreenContent />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: CustomColors.textLight,
    letterSpacing: -0.5,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
  },
  liveText: {
    fontSize: 11,
    color: CustomColors.textLight,
    opacity: 0.5,
    letterSpacing: 0.3,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: CustomColors.backgroundDark,
    borderWidth: 1,
    borderColor: CustomColors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingTop: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 12,
    // backgroundColor: CustomColors.backgroundDarkest,
    // borderTopWidth: 1,
    // borderTopColor: CustomColors.divider,
  },
  startRoutesButton: {
    backgroundColor: CustomColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 5,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  startRoutesButtonDisabled: {
    backgroundColor: CustomColors.divider,
    opacity: 0.6,
  },
  startRoutesButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
