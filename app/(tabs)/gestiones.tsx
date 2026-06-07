import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View as RNView,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { Ionicons } from '@expo/vector-icons';
import { api, extractDataFromResponse } from '@/services/api';
import { useToast } from 'react-native-toast-notifications';

interface FacturaCXP {
  id: number;
  invoice_number: string;
  provider: {
    id: number;
    title: string;
    bank?: { title: string };
    bankAccountType?: { title: string };
    bank_account_number?: string;
  };
  issue_date: string;
  due_date: string;
  base_amount: number;
  tax_amount: number;
  total_amount: number;
  outstanding_balance: number;
  invoice_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  concept?: string;
}

interface ProveedorRow {
  proveedorId: number;
  provider: string;
  saldoPendiente: number;
  documentos: number;
  bankInfo: string;
}

type FilterValue = 'todas' | 'vencidas' | 'por_vencer' | 'vigentes';

function aggregateByProveedor(data: FacturaCXP[]): ProveedorRow[] {
  const map = new Map<number, ProveedorRow>();

  for (const inv of data) {
    const id = inv.provider?.id;
    if (!id) continue;

    const current = map.get(id) || {
      proveedorId: id,
      provider: inv.provider?.title || 'N/D',
      saldoPendiente: 0,
      documentos: 0,
      bankInfo: `${inv.provider?.bank?.title || 'N/D'} - ${inv.provider?.bankAccountType?.title || 'N/D'} - ${inv.provider?.bank_account_number || 'N/D'}`,
    };

    current.saldoPendiente += Number(inv.outstanding_balance) || 0;
    current.documentos += 1;
    map.set(id, current);
  }

  return Array.from(map.values()).sort((a, b) => b.saldoPendiente - a.saldoPendiente);
}

function formatCurrency(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function GestionesContent() {
  const toast = useToast();

  const [invoices, setInvoices] = useState<FacturaCXP[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [totalPendiente, setTotalPendiente] = useState(0);
  const [totalVencidas, setTotalVencidas] = useState(0);
  const [totalPorVencer, setTotalPorVencer] = useState(0);
  const [totalVigentes, setTotalVigentes] = useState(0);

  const [allProveedores, setAllProveedores] = useState<ProveedorRow[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterValue>('todas');

  const [expandedProviderId, setExpandedProviderId] = useState<number | null>(null);

  const [creditNoteDialogVisible, setCreditNoteDialogVisible] = useState(false);
  const [selectedProviderForCN, setSelectedProviderForCN] = useState<ProveedorRow | null>(null);
  const [creditNoteAmount, setCreditNoteAmount] = useState('');
  const [creditNoteDescription, setCreditNoteDescription] = useState('');

  const [payAllDialogVisible, setPayAllDialogVisible] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      const result = await api.get<FacturaCXP[]>('cxp-invoices');
      const data = extractDataFromResponse<FacturaCXP[]>(result) || [];
      setInvoices(data);
      computeStats(data);
      computeAllProveedores(data);
    } catch (err) {
      console.log('Error loading invoices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const computeStats = (data: FacturaCXP[]) => {
    const today = new Date();
    let vencidas = 0;
    let porVencer = 0;
    let vigentes = 0;
    let total = 0;

    for (const inv of data) {
      const balance = Number(inv.outstanding_balance) || 0;
      total += balance;
      const dueDate = new Date(inv.due_date);

      if (inv.invoice_status === 'overdue' || (inv.invoice_status === 'pending' && dueDate < today)) {
        vencidas += balance;
      } else if (inv.invoice_status === 'pending') {
        const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        days <= 15 ? (porVencer += balance) : (vigentes += balance);
      }
    }

    setTotalPendiente(total);
    setTotalVencidas(vencidas);
    setTotalPorVencer(porVencer);
    setTotalVigentes(vigentes);
  };

  const computeAllProveedores = (data: FacturaCXP[]) => {
    setAllProveedores(aggregateByProveedor(data));
  };

  const getProviderInvoices = (providerId: number): FacturaCXP[] => {
    return invoices
      .filter(inv => inv.provider?.id === providerId)
      .sort((a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime());
  };

  const toggleExpand = (providerId: number) => {
    setExpandedProviderId(prev => (prev === providerId ? null : providerId));
  };

  const payDebt = async (providerData: ProveedorRow) => {
    const pendingInvoices = invoices.filter(
      inv => inv.provider?.id === providerData.proveedorId && inv.invoice_status === 'pending'
    );

    if (pendingInvoices.length === 0) {
      toast.show(`El proveedor ${providerData.provider} no tiene facturas pendientes`, { type: 'info', duration: 3000 });
      return;
    }

    setIsSaving(true);
    try {
      if (pendingInvoices.length === 1) {
        const invoiceId = pendingInvoices[0].id;
        const result = await api.patch(`cxp-invoices/${invoiceId}/pay`, {});
        if (!result.error) {
          toast.show(`Se ha pagado la factura del proveedor ${providerData.provider}`, { type: 'success', duration: 3000 });
        }
      } else {
        const invoiceIds = pendingInvoices.map(inv => inv.id);
        const result = await api.post('cxp-invoices/bulk-pay', invoiceIds);
        if (!result.error) {
          toast.show(`Se han pagado ${invoiceIds.length} facturas de ${providerData.provider}`, { type: 'success', duration: 3000 });
        }
      }
      loadInvoices();
    } catch (err) {
      toast.show('Error al pagar la deuda', { type: 'danger', duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  const showPayAllDialog = () => setPayAllDialogVisible(true);

  const executePayAllDebts = async () => {
    const pendingIds = invoices.reduce<number[]>((acc, inv) => {
      if (inv.invoice_status === 'pending') acc.push(inv.id);
      return acc;
    }, []);

    if (pendingIds.length === 0) {
      toast.show('No hay facturas pendientes para pagar', { type: 'info', duration: 3000 });
      return;
    }

    setIsSaving(true);
    try {
      const result = await api.post('cxp-invoices/bulk-pay', pendingIds);
      if (!result.error) {
        toast.show(`Se han pagado ${pendingIds.length} facturas`, { type: 'success', duration: 3000 });
        loadInvoices();
      }
    } catch (err) {
      toast.show('Error al pagar las deudas', { type: 'danger', duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmPayAll = () => {
    setPayAllDialogVisible(false);
    executePayAllDebts();
  };

  const openCreditNoteDialog = (providerData: ProveedorRow) => {
    setSelectedProviderForCN(providerData);
    setCreditNoteAmount('');
    setCreditNoteDescription('');
    setCreditNoteDialogVisible(true);
  };

  const hideCreditNoteDialog = () => {
    setCreditNoteDialogVisible(false);
    setSelectedProviderForCN(null);
    setCreditNoteAmount('');
    setCreditNoteDescription('');
  };

  const submitCreditNote = async () => {
    if (!selectedProviderForCN || !creditNoteAmount || Number(creditNoteAmount) <= 0) {
      toast.show('Por favor ingrese un monto válido', { type: 'warning', duration: 3000 });
      return;
    }

    const pendingInvoice = invoices.find(
      inv => inv.provider?.id === selectedProviderForCN.proveedorId && inv.invoice_status === 'pending'
    );

    if (!pendingInvoice) {
      toast.show(`No se encontró una factura pendiente para ${selectedProviderForCN.provider}`, { type: 'warning', duration: 3000 });
      hideCreditNoteDialog();
      return;
    }

    setIsSaving(true);
    try {
      const result = await api.post(`cxp-credit-notes/for-invoice/${pendingInvoice.id}`, {
        amount: Number(creditNoteAmount),
        description: creditNoteDescription || `Nota de crédito para proveedor ${selectedProviderForCN.provider}`,
      });
      if (!result.error) {
        toast.show(`Nota de crédito creada por ${Number(creditNoteAmount).toFixed(2)} para ${selectedProviderForCN.provider}`, { type: 'success', duration: 3000 });
        hideCreditNoteDialog();
        loadInvoices();
      }
    } catch (err) {
      toast.show('Error al crear nota de crédito', { type: 'danger', duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  const getPendingCount = () => invoices.filter(inv => inv.invoice_status === 'pending').length;

  if (loading) {
    return (
      <RNView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CustomColors.secondary} />
      </RNView>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CustomColors.secondary} />}
      >
        {/* Summary Cards */}
        <RNView style={styles.cardsGrid}>
          <RNView style={styles.card}>
            <Text style={styles.cardLabel}>Total por pagar</Text>
            <Text style={styles.cardValue}>{formatCurrency(totalPendiente)}</Text>
          </RNView>
          <RNView style={[styles.card, styles.cardOverdue]}>
            <Text style={styles.cardLabel}>Vencidas</Text>
            <Text style={[styles.cardValue, { color: '#ef4444' }]}>{formatCurrency(totalVencidas)}</Text>
          </RNView>
          <RNView style={[styles.card, styles.cardDueSoon]}>
            <Text style={styles.cardLabel}>Por vencer</Text>
            <Text style={[styles.cardValue, { color: '#f59e0b' }]}>{formatCurrency(totalPorVencer)}</Text>
          </RNView>
          <RNView style={[styles.card, styles.cardCurrent]}>
            <Text style={styles.cardLabel}>Vigentes</Text>
            <Text style={[styles.cardValue, { color: '#10b981' }]}>{formatCurrency(totalVigentes)}</Text>
          </RNView>
        </RNView>

        {/* Pay All Button */}
        <RNView style={styles.actionBar}>
          <Pressable
            style={[styles.payAllButton, isSaving && { opacity: 0.6 }]}
            onPress={showPayAllDialog}
            disabled={isSaving}
          >
            <Ionicons name="cash-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.payAllButtonText}>Pagar deudas</Text>
          </Pressable>
        </RNView>

        {/* Providers Section */}
        <Text style={styles.sectionTitle}>Todos los proveedores por pagar</Text>

        {allProveedores.length === 0 ? (
          <RNView style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={CustomColors.neutralLight} />
            <Text style={styles.emptyText}>No hay facturas pendientes</Text>
          </RNView>
        ) : (
          allProveedores.map((row) => {
            const isExpanded = expandedProviderId === row.proveedorId;
            const providerInvoices = getProviderInvoices(row.proveedorId);

            return (
              <RNView key={row.proveedorId} style={styles.providerCard}>
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.providerHeader]} onPress={() => toggleExpand(row.proveedorId)}>
                  <RNView style={styles.providerInfo}>
                    <RNView style={styles.providerNameRow}>
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={CustomColors.neutralLight}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.providerName}>{row.provider}</Text>
                    </RNView>
                    <Text style={styles.bankInfo}>{row.bankInfo}</Text>
                  </RNView>
                  <RNView style={styles.providerMeta}>
                    <Text style={styles.providerBalance}>{formatCurrency(row.saldoPendiente)}</Text>
                    <Text style={styles.providerDocs}>{row.documentos} docs</Text>
                  </RNView>
                </Pressable>

                {isExpanded && (
                  <RNView style={styles.invoiceSubTable}>
                    {providerInvoices.length === 0 ? (
                      <Text style={styles.emptySubText}>No hay documentos para este proveedor.</Text>
                    ) : (
                      providerInvoices.map((inv) => (
                        <RNView key={inv.id} style={styles.invoiceRow}>
                          <RNView style={styles.invoiceRowHeader}>
                            <Text style={styles.invoiceNumber}>#{inv.invoice_number}</Text>
                            <RNView style={[styles.statusBadge, {
                              backgroundColor: inv.invoice_status === 'paid' ? '#10b98120' : inv.invoice_status === 'overdue' ? '#ef444420' : '#f59e0b20',
                            }]}>
                              <Text style={[styles.statusText, {
                                color: inv.invoice_status === 'paid' ? '#10b981' : inv.invoice_status === 'overdue' ? '#ef4444' : '#f59e0b',
                              }]}>
                                {inv.invoice_status === 'pending' ? 'Pendiente' : inv.invoice_status === 'paid' ? 'Pagada' : inv.invoice_status === 'overdue' ? 'Vencida' : 'Cancelada'}
                              </Text>
                            </RNView>
                          </RNView>
                          <RNView style={styles.invoiceDetails}>
                            <Text style={styles.invoiceDetailText}>Concepto: {inv.concept || '-'}</Text>
                            <Text style={styles.invoiceDetailText}>Emisión: {formatDate(inv.issue_date)}</Text>
                            <Text style={styles.invoiceDetailText}>Vencimiento: {formatDate(inv.due_date)}</Text>
                          </RNView>
                          <RNView style={styles.invoiceAmounts}>
                            <Text style={styles.invoiceAmountLabel}>Saldo pendiente:</Text>
                            <Text style={styles.invoiceAmountValue}>{formatCurrency(inv.outstanding_balance)}</Text>
                            <Text style={styles.invoiceAmountLabel}>Total:</Text>
                            <Text style={styles.invoiceAmountValue}>{formatCurrency(inv.total_amount)}</Text>
                          </RNView>
                        </RNView>
                      ))
                    )}
                  </RNView>
                )}

                <RNView style={styles.providerActions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => payDebt(row)}
                    disabled={isSaving}
                  >
                    <Ionicons name="card-outline" size={16} color={CustomColors.success} />
                    <Text style={[styles.actionButtonText, { color: CustomColors.success }]}>Pagar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => openCreditNoteDialog(row)}
                    disabled={isSaving}
                  >
                    <Ionicons name="document-text-outline" size={16} color={CustomColors.secondary} />
                    <Text style={[styles.actionButtonText, { color: CustomColors.secondary }]}>N. Crédito</Text>
                  </Pressable>
                </RNView>
              </RNView>
            );
          })
        )}

        <RNView style={{ height: 40 }} />
      </ScrollView>

      {/* Credit Note Dialog */}
      <Modal visible={creditNoteDialogVisible} transparent animationType="fade">
        <RNView style={styles.modalOverlay}>
          <RNView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Nota de Crédito</Text>

            {selectedProviderForCN && (
              <RNView style={styles.modalProviderInfo}>
                <Text style={styles.modalProviderName}>{selectedProviderForCN.provider}</Text>
                <Text style={styles.modalProviderBalance}>Saldo pendiente: {formatCurrency(selectedProviderForCN.saldoPendiente)}</Text>
              </RNView>
            )}

            <Text style={styles.inputLabel}>Monto *</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={CustomColors.neutralLight}
              value={creditNoteAmount}
              onChangeText={setCreditNoteAmount}
            />

            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ingrese una descripción (opcional)"
              placeholderTextColor={CustomColors.neutralLight}
              value={creditNoteDescription}
              onChangeText={setCreditNoteDescription}
              multiline
              maxLength={500}
            />

            <RNView style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={hideCreditNoteDialog}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (!creditNoteAmount || Number(creditNoteAmount) <= 0) && { opacity: 0.5 }]}
                onPress={submitCreditNote}
                disabled={!creditNoteAmount || Number(creditNoteAmount) <= 0 || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Crear Nota de Crédito</Text>
                )}
              </Pressable>
            </RNView>
          </RNView>
        </RNView>
      </Modal>

      {/* Pay All Confirmation Dialog */}
      <Modal visible={payAllDialogVisible} transparent animationType="fade">
        <RNView style={styles.modalOverlay}>
          <RNView style={styles.modalContent}>
            <RNView style={styles.warningIconContainer}>
              <Ionicons name="warning-outline" size={40} color="#f59e0b" />
            </RNView>
            <Text style={styles.modalTitle}>¿Está seguro de que desea pagar todas las deudas?</Text>
            <Text style={styles.modalDescription}>
              Esta acción marcará como pagadas todas las facturas pendientes de todos los proveedores. Esta operación no se puede deshacer.
            </Text>
            <RNView style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                <Text style={{ fontWeight: 'bold' }}>Facturas pendientes:</Text> {getPendingCount()}{'\n'}
                <Text style={{ fontWeight: 'bold' }}>Total a pagar:</Text> {formatCurrency(totalPendiente)}
              </Text>
            </RNView>
            <RNView style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setPayAllDialogVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtnDanger} onPress={confirmPayAll} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Sí, pagar todas las deudas</Text>
                )}
              </Pressable>
            </RNView>
          </RNView>
        </RNView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scrollContent: {
    padding: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  card: {
    width: '48%',
    backgroundColor: CustomColors.backgroundMedium,
    borderRadius: 12,
    padding: 14,
    boxShadow: '0px 2px 3px rgba(0,0,0,0.2)',
  },
  cardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  cardDueSoon: {
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  cardCurrent: {
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  cardLabel: {
    fontSize: 12,
    color: CustomColors.neutralLight,
    marginBottom: 4,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: CustomColors.textLight,
  },
  actionBar: {
    marginBottom: 16,
  },
  payAllButton: {
    backgroundColor: CustomColors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.3)',
  },
  payAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: CustomColors.backgroundDark,
    borderWidth: 1,
    borderColor: CustomColors.divider,
  },
  filterPillActive: {
    backgroundColor: CustomColors.primary,
    borderColor: CustomColors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: CustomColors.neutralLight,
  },
  filterPillTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CustomColors.textLight,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: CustomColors.backgroundMedium,
    borderRadius: 12,
  },
  emptyText: {
    color: CustomColors.neutralLight,
    fontSize: 14,
    marginTop: 12,
  },
  providerCard: {
    backgroundColor: CustomColors.backgroundMedium,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.2)',
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  providerInfo: {
    flex: 1,
    marginRight: 12,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: CustomColors.textLight,
    textTransform: 'capitalize',
  },
  bankInfo: {
    fontSize: 11,
    color: CustomColors.neutralLight,
    marginTop: 4,
  },
  providerMeta: {
    alignItems: 'flex-end',
  },
  providerBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: CustomColors.secondary,
  },
  providerDocs: {
    fontSize: 11,
    color: CustomColors.neutralLight,
    marginTop: 2,
  },
  invoiceSubTable: {
    backgroundColor: CustomColors.backgroundDark,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: CustomColors.divider,
  },
  invoiceRow: {
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  invoiceRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: CustomColors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceDetails: {
    marginBottom: 8,
  },
  invoiceDetailText: {
    fontSize: 12,
    color: CustomColors.neutralLight,
    marginBottom: 2,
  },
  invoiceAmounts: {
    borderTopWidth: 1,
    borderTopColor: CustomColors.divider,
    paddingTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  invoiceAmountLabel: {
    fontSize: 12,
    color: CustomColors.neutralLight,
    width: '45%',
  },
  invoiceAmountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: CustomColors.textLight,
    width: '45%',
    textAlign: 'right',
  },
  emptySubText: {
    color: CustomColors.neutralLight,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  providerActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: CustomColors.divider,
    padding: 10,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: CustomColors.backgroundDark,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: CustomColors.backgroundMedium,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: CustomColors.textLight,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 13,
    color: CustomColors.neutralLight,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalProviderInfo: {
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalProviderName: {
    fontSize: 15,
    fontWeight: '700',
    color: CustomColors.textLight,
    textTransform: 'capitalize',
  },
  modalProviderBalance: {
    fontSize: 12,
    color: CustomColors.neutralLight,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: CustomColors.neutralLight,
    marginBottom: 6,
  },
  input: {
    backgroundColor: CustomColors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: CustomColors.textLight,
    borderWidth: 1,
    borderColor: CustomColors.divider,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CustomColors.divider,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: CustomColors.neutralLight,
  },
  modalConfirmBtn: {
    backgroundColor: CustomColors.success,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalConfirmBtnDanger: {
    backgroundColor: CustomColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  warningIconContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryBox: {
    backgroundColor: '#f59e0b15',
    borderWidth: 1,
    borderColor: '#f59e0b40',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    color: '#f59e0b',
    lineHeight: 20,
  },
});
