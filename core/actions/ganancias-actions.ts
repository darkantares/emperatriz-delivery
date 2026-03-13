import { apiAction } from '@/core/api/apiAction';
import { BackendUrls } from '@/utils/enum';

// ─── CXP Invoice types (same endpoints as vendedor) ──────────────────────────

export interface DriverEarnings {
  weekTotal: number;
  monthTotal: number;
  invoiceCount: number;
}

export interface PaidInvoice {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
}

export interface MonthlyStatItem {
  month: string;
  value: number;
}

export interface WeeklyStatItem {
  day: string;
  value: number;
}

// ─── Delivery assignment types ────────────────────────────────────────────────

/** Number of completed deliveries this week */
export type DriverWeeklyStats = number;

export interface DriverTopRoute {
  routeName: string;
  deliveryCount: number;
  totalEarnings: number;
}

export interface RecentDeliveryItem {
  id: number;
  contact: string;
  zone: string;
//   earning: number;
  completedAt: string;
}

// ─── Action functions ─────────────────────────────────────────────────────────

export const getDriverEarnings = async (): Promise<DriverEarnings> => {
  try {
    return await apiAction.get<DriverEarnings>(`${BackendUrls.CxpInvoices}/seller/earnings`);
  } catch (error) {
    throw new Error('Unable to load driver earnings');
  }
};

export const getDriverPaidInvoices = async (): Promise<PaidInvoice[]> => {
  try {
    return await apiAction.get<PaidInvoice[]>(`${BackendUrls.CxpInvoices}/seller/paid-invoices`);
  } catch (error) {
    throw new Error('Unable to load driver paid invoices');
  }
};

export const getDriverMonthlyStats = async (): Promise<MonthlyStatItem[]> => {
  try {
    return await apiAction.get<MonthlyStatItem[]>(`${BackendUrls.CxpInvoices}/seller/monthly-stats`);
  } catch (error) {
    throw new Error('Unable to load driver monthly stats');
  }
};

export const getDriverWeeklyStats = async (): Promise<WeeklyStatItem[]> => {
  try {
    return await apiAction.get<WeeklyStatItem[]>(`${BackendUrls.CxpInvoices}/seller/weekly-stats`);
  } catch (error) {
    throw new Error('Unable to load driver weekly stats');
  }
};

export const getDriverDeliveryStats = async (): Promise<number> => {
  try {
    return await apiAction.get<number>(`${BackendUrls.DeliveryAssignments}/driver/stats`);
  } catch (error) {
    throw new Error('Unable to load driver delivery stats');
  }
};

export const getDriverTopRoute = async (): Promise<DriverTopRoute | null> => {
  try {
    return await apiAction.get<DriverTopRoute | null>(`${BackendUrls.DeliveryAssignments}/driver/top-route`);
  } catch (error) {
    throw new Error('Unable to load driver top route');
  }
};

export const getDriverRecentDeliveries = async (): Promise<RecentDeliveryItem[]> => {
  try {
    return await apiAction.get<RecentDeliveryItem[]>(`${BackendUrls.DeliveryAssignments}/driver/recent-deliveries`);
  } catch (error) {
    throw new Error('Unable to load driver recent deliveries');
  }
};
