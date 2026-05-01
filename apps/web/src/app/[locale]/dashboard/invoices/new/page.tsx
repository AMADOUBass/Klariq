'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  User, 
  Calendar,
  Eye,
  X,
  CreditCard
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useContacts } from '@/hooks/use-contacts';
import { useCreateInvoice } from '@/hooks/use-invoices';
import { invoiceSchema, type InvoiceFormValues } from '@/lib/validations/invoice.schema';
import { toast } from 'sonner';
import { PDFViewer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoicing/invoice-pdf';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

export default function NewInvoicePage() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const { data: contacts } = useContacts();
  const createInvoice = useCreateInvoice();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    import('@/lib/api-client').then(({ apiFetch }) => {
      apiFetch('/accounting/company').then(setCompany).catch(console.error);
    });
  }, []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      contactId: '',
      number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0]!,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
      currency: 'CAD',
      lines: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const watchLines = watch('lines');
  const watchCurrency = watch('currency');

  const totals = React.useMemo(() => {
    let subtotal = 0;
    watchLines.forEach(line => {
      subtotal += (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
    });
    // Simplified tax for preview
    const gst = subtotal * 0.05;
    const qst = subtotal * 0.09975;
    return {
      subtotal,
      gst,
      qst,
      total: subtotal + gst + qst
    };
  }, [watchLines]);

  const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
    try {
      await createInvoice.mutateAsync(data as any);
      toast.success(locale === 'fr' ? 'Facture créée' : 'Invoice created');
      router.push('/dashboard/invoices');
    } catch (err: any) {
      toast.error(err.message || 'Error saving invoice');
    }
  };

  const fmtMoney = (n: number) => {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', { 
      style: "currency", 
      currency: watchCurrency 
    }).format(n);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <Link 
          href="/dashboard/invoices" 
          className="flex items-center gap-2 text-ink-4 hover:text-white transition text-[13px] w-fit group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          {locale === 'fr' ? 'Retour aux factures' : 'Back to invoices'}
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {locale === 'fr' ? 'Nouvelle Facture' : 'New Invoice'}
          </h1>
          <div className="flex items-center gap-3">
            {isClient && (
              <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)} leftIcon={<Eye size={16} />}>
                {locale === 'fr' ? 'Aperçu' : 'Preview'}
              </Button>
            )}
            <Button 
              onClick={handleSubmit(onSubmit as any)}
              isLoading={createInvoice.isPending}
              leftIcon={<Save size={16} />}
              size="sm"
            >
              {locale === 'fr' ? 'Enregistrer' : 'Save Draft'}
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <Card className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Select 
            label="Client"
            error={errors.contactId?.message}
            {...register('contactId')}
          >
            <option value="">{locale === 'fr' ? 'Sélectionner un client' : 'Select a customer'}</option>
            {contacts?.filter(c => c.type !== 'SUPPLIER').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <Input 
            label="N° Facture"
            error={errors.number?.message}
            {...register('number')}
          />

          <Select 
            label="Devise"
            {...register('currency')}
          >
            <option value="CAD">CAD - Dollar Canadien</option>
            <option value="USD">USD - Dollar US</option>
            <option value="EUR">EUR - Euro</option>
          </Select>

          <Input 
            type="date"
            label="Date d'émission"
            error={errors.date?.message}
            {...register('date')}
          />

          <Input 
            type="date"
            label="Échéance"
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">Articles & Services</h3>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
              className="text-accent h-8"
            >
              <Plus size={14} className="mr-1" /> {locale === 'fr' ? 'Ajouter une ligne' : 'Add line'}
            </Button>
          </div>
          
          <div className="divide-y divide-white/[0.06]">
            {fields.map((field, index) => (
              <div key={field.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center group animate-in slide-in-from-left-2 duration-300">
                <div className="flex-1 w-full">
                  <Input 
                    placeholder="Description du produit ou service..."
                    error={errors.lines?.[index]?.description?.message}
                    {...register(`lines.${index}.description`)}
                    className="border-transparent bg-transparent focus:bg-white/[0.02] focus:border-white/10"
                  />
                </div>
                
                <div className="w-full md:w-24">
                  <Input 
                    type="number"
                    placeholder="Qté"
                    error={errors.lines?.[index]?.quantity?.message}
                    {...register(`lines.${index}.quantity`)}
                    className="text-center"
                  />
                </div>

                <div className="w-full md:w-32">
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="Prix"
                    error={errors.lines?.[index]?.unitPrice?.message}
                    {...register(`lines.${index}.unitPrice`)}
                    className="text-right font-num"
                  />
                </div>

                <div className="w-full md:w-32 text-right font-num text-[15px] font-semibold text-white px-2">
                  {fmtMoney((Number(watchLines[index]?.quantity) || 0) * (Number(watchLines[index]?.unitPrice) || 0))}
                </div>

                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="text-ink-4 hover:text-neg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <Card className="flex-1 w-full p-6 space-y-4">
            <h3 className="text-[12px] font-bold text-ink-3 uppercase tracking-widest">Notes & Conditions</h3>
            <textarea 
              rows={4}
              placeholder="Merci pour votre confiance ! Conditions de paiement : net 30 jours."
              {...register('notes')}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-[13px] text-white focus:outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all"
            />
          </Card>

          <Card variant="strong" className="w-full md:w-80 p-6 space-y-4 bg-white/[0.02]">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-4">Sous-total</span>
                <span className="text-white font-medium font-num">{fmtMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-4">TPS (5%)</span>
                <span className="text-white font-medium font-num">{fmtMoney(totals.gst)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-4">TVQ (9,975%)</span>
                <span className="text-white font-medium font-num">{fmtMoney(totals.qst)}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
              <div className="text-[11px] uppercase tracking-widest text-accent font-bold">Total</div>
              <div className="text-2xl font-bold text-white font-num leading-none">{fmtMoney(totals.total)}</div>
            </div>
          </Card>
        </div>
      </form>

      {/* PDF Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsPreviewOpen(false)} />
          <Card variant="strong" className="w-full max-w-5xl h-[90vh] relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-lg font-semibold text-white">Aperçu de la facture</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <div className="flex-1 bg-[#1a1a1a]">
              {isClient && (
                <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                  <InvoicePDF 
                    invoice={{
                      invoiceNumber: watch('number') || '',
                      contact: { name: contacts?.find(c => c.id === watch('contactId'))?.name || 'Client' },
                      issueDate: watch('date') || '',
                      dueDate: watch('dueDate') || '',
                      items: watchLines || [],
                      subtotal: totals.subtotal,
                      totalAmount: totals.total
                    }} 
                    company={company || { name: 'Klariq' }} 
                  />
                </PDFViewer>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
