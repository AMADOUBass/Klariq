'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FileText, Plus, Search, Loader2, X, MoreHorizontal, Mail, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInvoices, usePostInvoice, useSendInvoice, useDeleteInvoice } from '@/hooks/use-invoices';
import { Link } from '@/i18n/navigation';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoicing/invoice-pdf';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function InvoicesPage() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const { data: invoices, isLoading, error } = useInvoices();
  const postInvoice = usePostInvoice();
  const sendInvoice = useSendInvoice();
  const deleteInvoice = useDeleteInvoice();
  
  const [company, setCompany] = React.useState<any>(null);
  const [isClient, setIsClient] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    setIsClient(true);
    import('@/lib/api-client').then(({ apiFetch }) => {
      apiFetch('/accounting/company').then(setCompany).catch(console.error);
    });
  }, []);

  const handlePost = async (id: string) => {
    try {
      await postInvoice.mutateAsync(id);
      toast.success(locale === 'fr' ? 'Facture publiée' : 'Invoice posted');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const handleSend = async (id: string) => {
    try {
      await sendInvoice.mutateAsync(id);
      toast.success(locale === 'fr' ? 'Email envoyé' : 'Email sent');
    } catch (err: any) {
      toast.error(err.message || 'Error sending email');
    }
  };

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(locale === 'fr' ? `Supprimer la facture "${number}" ?` : `Delete invoice "${number}"?`)) return;
    try {
      await deleteInvoice.mutateAsync(id);
      toast.success(locale === 'fr' ? 'Facture supprimée' : 'Invoice deleted');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      DRAFT: { label: locale === 'fr' ? 'Brouillon' : 'Draft', color: 'text-ink-3', bg: 'bg-white/[0.05] border-white/10' },
      SENT: { label: locale === 'fr' ? 'Publiée' : 'Posted', color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
      PAID: { label: locale === 'fr' ? 'Payée' : 'Paid', color: 'text-pos', bg: 'bg-pos/10 border-pos/20' },
      VOID: { label: locale === 'fr' ? 'Annulée' : 'Void', color: 'text-neg', bg: 'bg-neg/10 border-neg/20' },
    };
    const it = map[status] || map['DRAFT']!;
    return (
      <span className={cn("font-mono text-[9px] px-2 py-0.5 rounded-md border tracking-widest", it.color, it.bg)}>
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

  const filteredInvoices = invoices?.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <FileText size={20} />
            </div>
            {t('invoicing')}
          </h1>
          <p className="text-ink-3 text-sm mt-1">
            {locale === 'fr' 
              ? 'Suivez vos revenus et gérez vos factures clients.' 
              : 'Track your revenue and manage customer invoices.'}
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
          <Link href="/dashboard/invoices/new">
            <Button size="sm" leftIcon={<Plus size={16} />}>
              {locale === 'fr' ? 'Nouvelle facture' : 'New Invoice'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-accent bg-white/[0.01]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-ink-4 mb-2 font-bold">{locale === 'fr' ? 'À encaisser' : 'To collect'}</div>
          <div className="text-2xl font-bold text-white font-num">{fmtMoney(12450.00)}</div>
        </Card>
        <Card className="p-6 border-l-4 border-l-pos bg-white/[0.01]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-ink-4 mb-2 font-bold">{locale === 'fr' ? 'Reçu (30j)' : 'Received (30d)'}</div>
          <div className="text-2xl font-bold text-white font-num">{fmtMoney(45200.50)}</div>
        </Card>
        <Card className="p-6 border-l-4 border-l-neg bg-white/[0.01]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-ink-4 mb-2 font-bold">{locale === 'fr' ? 'En retard' : 'Overdue'}</div>
          <div className="text-2xl font-bold text-white font-num">{fmtMoney(2100.00)}</div>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="min-h-[400px] flex flex-col overflow-hidden">
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
              <p className="text-sm text-ink-3 max-w-xs mx-auto">Impossible de récupérer les factures.</p>
            </div>
          </div>
        ) : filteredInvoices?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.02] flex items-center justify-center text-ink-4 border border-white/[0.05] shadow-inner">
              <FileText size={40} />
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <h3 className="text-xl font-medium text-white">
                {locale === 'fr' ? 'Aucune facture' : 'No invoices yet'}
              </h3>
              <p className="text-ink-3 text-sm">
                {locale === 'fr' 
                  ? 'Créez votre première facture pour commencer à facturer vos clients.' 
                  : 'Create your first invoice to start billing your customers.'}
              </p>
            </div>
            <Link href="/dashboard/invoices/new">
              <Button variant="outline">{locale === 'fr' ? 'Nouvelle facture' : 'New invoice'}</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest">Facture</th>
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest">Client</th>
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest">Échéance</th>
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest text-right">Montant</th>
                  <th className="px-6 py-4 text-[11px] font-medium text-ink-4 uppercase tracking-widest text-center">Statut</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredInvoices?.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/[0.015] transition-all group">
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-semibold text-white group-hover:text-accent transition-colors">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-[10px] text-ink-5 font-mono mt-0.5 uppercase">ID: {invoice.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[14px] text-ink-2 font-medium">{invoice.contact.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] text-ink-3">
                        {new Date(invoice.dueDate).toLocaleDateString(locale === 'fr' ? 'fr-CA' : 'en-CA')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-[16px] font-bold text-white font-num tracking-tight">{fmtMoney(invoice.totalAmount)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {invoice.status === 'DRAFT' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 py-0 px-3 border-accent/30 text-accent hover:bg-accent/10"
                            onClick={() => handlePost(invoice.id)}
                            isLoading={postInvoice.isPending}
                            leftIcon={<CheckCircle2 size={14} />}
                          >
                            {locale === 'fr' ? 'Publier' : 'Post'}
                          </Button>
                        )}
                        {invoice.status !== 'DRAFT' && isClient && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-ink-3 hover:text-accent"
                            onClick={() => handleSend(invoice.id)}
                            isLoading={sendInvoice.isPending}
                          >
                            <Mail size={16} />
                          </Button>
                        )}
                        {isClient && (
                          <PDFDownloadLink 
                            document={<InvoicePDF invoice={invoice} company={company || { name: 'Klariq' }} />} 
                            fileName={`${invoice.invoiceNumber}.pdf`}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-ink-4 hover:text-white transition"
                          >
                            {({ loading }) => (
                              loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />
                            )}
                          </PDFDownloadLink>
                        )}
                        {invoice.status === 'DRAFT' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-neg/70 hover:text-neg"
                            onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                            isLoading={deleteInvoice.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal size={18} />
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
    </div>
  );
}
