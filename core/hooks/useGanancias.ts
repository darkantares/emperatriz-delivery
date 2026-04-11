import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getDriverEarnings,
  getDriverPaidInvoices,
  getDriverMonthlyStats,
  getDriverWeeklyStats,
  getDriverDeliveryStats,
  getDriverTopRoute,
  getDriverRecentDeliveries,
  DriverEarnings,
  PaidInvoice,
  MonthlyStatItem,
  WeeklyStatItem,
  DriverWeeklyStats,
  DriverTopRoute,
  RecentDeliveryItem,
} from '../actions/ganancias-actions';

export const useGanancias = () => {
  const [earnings, setEarnings] = useState<DriverEarnings | null>(null);
  const [paidInvoices, setPaidInvoices] = useState<PaidInvoice[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStatItem[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStatItem[]>([]);
  const [deliveryStats, setDeliveryStats] = useState<DriverWeeklyStats | null>(null);
  const [topRoute, setTopRoute] = useState<DriverTopRoute | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDeliveryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [
        earningsData,
        paidInvoicesData,
        monthlyData,
        weeklyData,
        deliveryStatsData,
        topRouteData,
        recentDeliveriesData,
      ] = await Promise.all([
        getDriverEarnings(),
        getDriverPaidInvoices(),
        getDriverMonthlyStats(),
        getDriverWeeklyStats(),
        getDriverDeliveryStats(),
        getDriverTopRoute(),
        getDriverRecentDeliveries(),
      ]);

      setEarnings(earningsData);
      setPaidInvoices(paidInvoicesData);
      setMonthlyStats(monthlyData);
      setWeeklyStats(weeklyData);
      setDeliveryStats(deliveryStatsData);
      setTopRoute(topRouteData);
      setRecentDeliveries(recentDeliveriesData);
    } catch (err: any) {
      console.error('useGanancias fetch error', err);
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setError(null);
      setEarnings(null);
      setPaidInvoices([]);
      setMonthlyStats([]);
      setWeeklyStats([]);
      setDeliveryStats(null);
      setTopRoute(null);
      setRecentDeliveries([]);
      return;
    }

    fetchData();
  }, [fetchData, isAuthenticated]);

  return {
    earnings,
    paidInvoices,
    monthlyStats,
    weeklyStats,
    deliveryStats,
    topRoute,
    recentDeliveries,
    isLoading,
    error,
    refresh: fetchData,
  };
};
