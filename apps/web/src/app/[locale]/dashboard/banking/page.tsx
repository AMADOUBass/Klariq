'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Landmark, 
  Upload, 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ArrowRightLeft,
  ChevronRight,
  FileSpreadsheet,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBankStatements, useBankTransactions, useImportStatement } from '@/hooks/use-banking';
import { useAccounts } from '@/hooks/use-accounts';
import { toast } from 'sonner';

export default function BankingPage() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const { data: statements, isLoading: loadingStatements } = useBankStatements();
  const { data: accounts } = useAccounts();
  
  const [selectedStatementId, setSelectedStatementId] = React.useState<string | undefined>(undefined);
  const [targetAccountId, setTargetAccountId] = React.useState<string>('');
  
  const { data: transactions, isLoading: loadingTransactions } = useBankTransactions(selectedStatementId);
  const importMutation = useImportStatement();
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter for bank-like accounts (ASSET type)
  const bankAccounts = accounts?.filter(a => a.type === 'ASSET') || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!targetAccountId) {
      toast.error(locale === 'fr' ? 'Veuillez sélectionner un compte bancaire' : 'Please select a bank account');
      return;
    }

    try {
      const result = await importMutation.mutateAsync({ accountId: targetAccountId, file });
      toast.success(
        locale === 'fr' 
          ? `${result.imported} transactions importées, ${result.matched} rapprochées.`
          : `${result.imported} transactions imported, ${result.matched} auto-matched.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Error importing file');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fmtMoney = (n: number) => {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { 
      style: "currency", 
      currency: "CAD" 
    }).format(n);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Landmark className="text-accent" size={24} />
            {t('banking')}
          </h1>
          <p className="text-ink-3 text-sm mt-1">
            {locale === 'fr' 
              ? 'Importez vos relevés et rapprochez vos transactions.' 
              : 'Import statements and reconcile your transactions.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={targetAccountId}
            onChange={(e) => setTargetAccountId(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white text-[13px] outline-none focus:border-accent/50 transition"
          >
            <option value="" disabled className="bg-[#0a0a0a]">
              {locale === 'fr' ? 'Sélectionner un compte...' : 'Select account...'}
            </option>
            {bankAccounts.map(a => (
              <option key={a.id} value={a.id} className="bg-[#0a0a0a]">
                {a.code} - {a.name}
              </option>
            ))}
          </select>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".csv"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="h-9 px-4 rounded-lg bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition shadow-sm shadow-accent/20 flex items-center gap-2"
          >
            {importMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {locale === 'fr' ? 'Importer CSV' : 'Import CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Statements History */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[11px] uppercase tracking-widest text-ink-4 font-semibold px-1 flex items-center gap-2">
            <History size={14} />
            {locale === 'fr' ? 'Historique' : 'History'}
          </h3>
          
          <div className="space-y-2">
            <button 
              onClick={() => setSelectedStatementId(undefined)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-[13px] transition border",
                !selectedStatementId 
                  ? "bg-white/[0.05] border-white/[0.1] text-white" 
                  : "border-transparent text-ink-3 hover:bg-white/[0.02] hover:text-ink-1"
              )}
            >
              {locale === 'fr' ? 'Toutes les transactions' : 'All transactions'}
            </button>
            
            {loadingStatements ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="animate-spin text-ink-4" size={20} />
              </div>
            ) : statements?.map(s => (
              <button 
                key={s.id}
                onClick={() => setSelectedStatementId(s.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-[13px] transition border group",
                  selectedStatementId === s.id 
                    ? "bg-white/[0.05] border-white/[0.1] text-white" 
                    : "border-transparent text-ink-3 hover:bg-white/[0.02] hover:text-ink-1"
                )}
              >
                <div className="truncate font-medium">{s.filename}</div>
                <div className="text-[10px] text-ink-4 mt-0.5 flex items-center justify-between">
                  <span>{new Date(s.importDate).toLocaleDateString()}</span>
                  <span>{s._count.transactions} tx</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Transactions List */}
        <div className="lg:col-span-3">
          <div className="glass rounded-xl overflow-hidden min-h-[500px] flex flex-col">
            {loadingTransactions ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-3 gap-3">
                <Loader2 className="animate-spin" size={32} />
                <span className="text-sm font-mono uppercase tracking-widest">
                  {locale === 'fr' ? 'Chargement' : 'Loading'}
                </span>
              </div>
            ) : transactions?.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-6 text-ink-4 border border-white/[0.06]">
                  <FileSpreadsheet size={32} />
                </div>
                <h3 className="text-lg font-medium text-white">
                  {locale === 'fr' ? 'Aucune transaction' : 'No transactions'}
                </h3>
                <p className="text-ink-3 text-sm mt-2 max-w-[320px]">
                  {locale === 'fr' 
                    ? 'Importez votre premier relevé bancaire pour commencer la réconciliation.' 
                    : 'Import your first bank statement to start reconciliation.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="hairline-b bg-white/[0.01]">
                      <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest w-24">
                        {locale === 'fr' ? 'Date' : 'Date'}
                      </th>
                      <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest">
                        {locale === 'fr' ? 'Description' : 'Description'}
                      </th>
                      <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest text-right w-32">
                        {locale === 'fr' ? 'Montant' : 'Amount'}
                      </th>
                      <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest text-center w-32">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {transactions?.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.015] transition group">
                        <td className="px-6 py-4 text-[12px] text-ink-3">
                          {new Date(tx.date).toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[13px] font-medium text-white line-clamp-1">
                            {tx.description}
                          </div>
                          {tx.reference && (
                            <div className="text-[11px] text-ink-4 font-mono mt-0.5">Ref: {tx.reference}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={cn(
                            "text-[14px] font-semibold font-num",
                            tx.amount < 0 ? "text-white" : "text-pos"
                          )}>
                            {fmtMoney(tx.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {tx.isMatched ? (
                            <div className="flex items-center justify-center gap-1.5 text-pos bg-pos-soft px-2 py-1 rounded-md border border-pos/10 mx-auto w-fit">
                              <CheckCircle2 size={12} />
                              <span className="text-[10px] font-bold uppercase tracking-tight">
                                {tx.matchedEntityType === 'INVOICE' ? (locale === 'fr' ? 'Facture' : 'Invoice') : (locale === 'fr' ? 'Facture Fourn.' : 'Bill')}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 text-ink-4 bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.05] mx-auto w-fit">
                              <AlertCircle size={12} />
                              <span className="text-[10px] font-bold uppercase tracking-tight">
                                {locale === 'fr' ? 'À traiter' : 'Pending'}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
