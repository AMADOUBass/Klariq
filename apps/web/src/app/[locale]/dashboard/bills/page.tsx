'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ReceiptText, Plus, Search, Loader2, X, MoreHorizontal, Download, Trash2, Edit2, CheckCircle2, CreditCard } from 'lucide-react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { useBills, useCreateBill, useApproveBill, usePayBill, useDeleteBill, type Bill } from '@/hooks/use-bills';
import { useContacts } from '@/hooks/use-contacts';
import { billSchema, type BillFormValues } from '@/lib/validations/bill.schema';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

export default function BillsPage() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const { data: bills, isLoading, error } = useBills();
  const { data: contacts } = useContacts();
  const createBill = useCreateBill();
  const approveBill = useApproveBill();
  const payBill = usePayBill();
  const deleteBill = useDeleteBill();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema) as any,
    defaultValues: {
      contactId: '',
      number: '',
      date: new Date().toISOString().split('T')[0]!,
      dueDate: new Date().toISOString().split('T')[0]!,
      currency: 'CAD',
      lines: [{ description: 'Dépense générale', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const onSubmit: SubmitHandler<BillFormValues> = async (data) => {
    try {
      await createBill.mutateAsync(data as any);
      toast.success(locale === 'fr' ? 'Dépense enregistrée' : 'Bill recorded');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error saving bill');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveBill.mutateAsync(id);
      toast.success(locale === 'fr' ? 'Facture approuvée' : 'Bill approved');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const handlePay = async (id: string) => {
    try {
      // In a real app, we'd open a modal to select the bank account
      await payBill.mutateAsync({ id, accountId: 'default-bank-account' });
      toast.success(locale === 'fr' ? 'Paiement enregistré' : 'Payment recorded');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(locale === 'fr' ? `Supprimer la facture "${number}" ?` : `Delete bill "${number}"?`)) return;
    try {
      await deleteBill.mutateAsync(id);
      toast.success(locale === 'fr' ? 'Facture supprimée' : 'Bill deleted');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      DRAFT: { label: locale === 'fr' ? 'Brouillon' : 'Draft', color: 'text-ink-3', bg: 'bg-white/[0.05] border-white/10' },
      APPROVED: { label: locale === 'fr' ? 'Approuvée' : 'Approved', color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
      PAID: { label: locale === 'fr' ? 'Payée' : 'Paid', color: 'text-pos', bg: 'bg-pos/10 border-pos/20' },
      VOID: { label: locale === 'fr' ? 'Annulée' : 'Void', color: 'text-neg', bg: 'bg-neg/10 border-neg/20' },
    };
    const it = map[status] || map['DRAFT']!;
    return (
      <span className={cn("font-mono text-[10px] px-2 py-0.5 rounded-md border tracking-wider", it.color, it.bg)}>
        {it.label.toUpperCase()}
      </span>
    );
  };

  const fmtMoney = (n: number) => {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { 
      style: "currency", 
      currency: "CAD" 
    }).format(n);
  };

  const filteredBills = bills?.filter(b => 
    b.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ReceiptText size={20} />
            </div>
            {t('bills')}
          </h1>
          <p className="text-ink-3 text-sm mt-1">
            {locale === 'fr' 
              ? 'Suivez vos dépenses et gérez vos factures fournisseurs.' 
              : 'Track your expenses and manage supplier bills.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Input 
            placeholder={locale === 'fr' ? 'Rechercher...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
            className="w-full md:w-64 h-9"
          />
          <Button 
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus size={16} />}
            size="sm"
          >
            {locale === 'fr' ? 'Saisir une dépense' : 'Record Bill'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="min-h-[500px] flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-3 gap-3">
            <Loader2 className="animate-spin text-accent" size={32} />
            <span className="text-sm font-mono uppercase tracking-widest">{locale === 'fr' ? 'Chargement' : 'Loading'}</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-neg/10 text-neg flex items-center justify-center border border-neg/20">
              <X size={32} />
            </div>
            <div>
              <h3 className="text-white font-medium text-lg">{locale === 'fr' ? 'Erreur API' : 'API Error'}</h3>
              <p className="text-sm text-ink-3 max-w-xs mx-auto">Impossible de récupérer les factures fournisseurs.</p>
            </div>
          </div>
        ) : filteredBills?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.02] flex items-center justify-center text-ink-4 border border-white/[0.05] shadow-inner">
              <ReceiptText size={40} />
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <h3 className="text-xl font-medium text-white">
                {locale === 'fr' ? 'Aucune dépense' : 'No bills yet'}
              </h3>
              <p className="text-ink-3 text-sm">
                {locale === 'fr' 
                  ? 'Saisissez votre première dépense pour garder votre comptabilité à jour.' 
                  : 'Record your first expense to keep your accounting up to date.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest">Fournisseur</th>
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest">N° Facture</th>
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest">Échéance</th>
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest text-right">Montant</th>
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest text-center">Statut</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredBills?.map((bill) => (
                  <tr key={bill.id} className="hover:bg-white/[0.015] transition-all group">
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-medium text-white">{bill.contact.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] text-ink-2 font-mono group-hover:text-accent transition-colors">{bill.number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] text-ink-3">
                        {new Date(bill.dueDate).toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-[15px] font-semibold text-white font-num tracking-tight">{fmtMoney(bill.totalAmount)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(bill.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {bill.status === 'DRAFT' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 py-0 px-3 border-accent/30 text-accent hover:bg-accent/10"
                            onClick={() => handleApprove(bill.id)}
                            isLoading={approveBill.isPending}
                            leftIcon={<CheckCircle2 size={14} />}
                          >
                            {locale === 'fr' ? 'Approuver' : 'Approve'}
                          </Button>
                        )}
                        {bill.status === 'APPROVED' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 py-0 px-3 border-pos/30 text-pos hover:bg-pos/10"
                            onClick={() => handlePay(bill.id)}
                            isLoading={payBill.isPending}
                            leftIcon={<CreditCard size={14} />}
                          >
                            {locale === 'fr' ? 'Payer' : 'Pay'}
                          </Button>
                        )}
                        {bill.status === 'DRAFT' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-neg/70 hover:text-neg"
                            onClick={() => handleDelete(bill.id, bill.number)}
                            isLoading={deleteBill.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bill Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeModal} />
          
          <Card variant="strong" className="w-full max-w-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300 shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-lg font-semibold text-white">
                {locale === 'fr' ? 'Enregistrer une dépense' : 'Record Bill'}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8 rounded-lg">
                <X size={18} />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit as any)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Select 
                  label="Fournisseur"
                  error={errors.contactId?.message}
                  {...register('contactId')}
                >
                  <option value="">Sélectionner</option>
                  {contacts?.filter(c => c.type !== 'CUSTOMER').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                
                <Input 
                  label="Numéro de facture"
                  placeholder="Ex: INV-2024-001"
                  error={errors.number?.message}
                  {...register('number')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input 
                  type="date"
                  label="Date de facture"
                  error={errors.date?.message}
                  {...register('date')}
                />
                <Input 
                  type="date"
                  label="Date d'échéance"
                  error={errors.dueDate?.message}
                  {...register('dueDate')}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-medium text-ink-3 uppercase tracking-wider">Lignes de facture</h3>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                    className="h-7 text-accent"
                  >
                    + Ajouter une ligne
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Input 
                          placeholder="Description"
                          error={errors.lines?.[index]?.description?.message}
                          {...register(`lines.${index}.description`)}
                        />
                      </div>
                      <div className="w-20">
                        <Input 
                          type="number"
                          placeholder="Qté"
                          error={errors.lines?.[index]?.quantity?.message}
                          {...register(`lines.${index}.quantity`)}
                        />
                      </div>
                      <div className="w-28">
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="Prix"
                          error={errors.lines?.[index]?.unitPrice?.message}
                          {...register(`lines.${index}.unitPrice`)}
                        />
                      </div>
                      {fields.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => remove(index)}
                          className="h-11 w-11 text-neg/50 hover:text-neg"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1"
                >
                  {locale === 'fr' ? 'Annuler' : 'Cancel'}
                </Button>
                <Button 
                  type="submit"
                  className="flex-1"
                  isLoading={createBill.isPending}
                >
                  {locale === 'fr' ? 'Enregistrer la dépense' : 'Record Bill'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
