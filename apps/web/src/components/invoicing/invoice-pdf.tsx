import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register a nice font if possible, otherwise use standard Helvetica
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2', fontWeight: 600 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  brand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4078ff',
  },
  invoiceTitle: {
    fontSize: 20,
    textAlign: 'right',
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  column: {
    width: '45%',
  },
  label: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDesc: { width: '50%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  
  totalsSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsContainer: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#111827',
    marginTop: 8,
    paddingTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 8,
  }
});

interface Props {
  invoice: any;
  company: {
    name: string;
    legalName?: string | null;
    address?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
    taxNumberGst?: string | null;
    taxNumberQst?: string | null;
  };
  title?: string;
}

export const InvoicePDF = ({ invoice, company, title = 'Facture' }: Props) => {
  const currency = invoice.currency || 'CAD';
  const fmt = (n: number) => new Intl.NumberFormat('fr-CA', { 
    style: 'currency', 
    currency: currency 
  }).format(n);

  return (
    <Document>
      <Page size="A4" style={styles.page as any}>
        {/* Header */}
        <View style={styles.header as any}>
          <View style={{ flex: 1 }}>
            {company.logoUrl ? (
              <Image src={company.logoUrl} style={{ width: 120, marginBottom: 10 }} />
            ) : (
              <Text style={styles.brand as any}>{company.name.toUpperCase()}</Text>
            )}
            <View style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>
              <Text>{company.legalName || company.name}</Text>
              {company.address && <Text>{company.address}</Text>}
              {company.phone && <Text>{company.phone}</Text>}
            </View>
          </View>
          <View style={{ flex: 1, textAlign: 'right' }}>
            <Text style={styles.invoiceTitle as any}>{title}</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', marginTop: 4 }}># {invoice.invoiceNumber || invoice.number}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section as any}>
          <View style={styles.column as any}>
            <Text style={styles.label as any}>Facturer à</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{invoice.contact?.name || '...'}</Text>
          </View>
          <View style={[styles.column as any, { textAlign: 'right' }]}>
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.label as any}>Date d'émission</Text>
              <Text>{invoice.issueDate || invoice.date ? new Date(invoice.issueDate || invoice.date).toLocaleDateString('fr-CA') : '...'}</Text>
            </View>
            <View>
              <Text style={styles.label as any}>Échéance</Text>
              <Text>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-CA') : '...'}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table as any}>
          <View style={styles.tableHeader as any}>
            <Text style={styles.colDesc as any}>Description</Text>
            <Text style={styles.colQty as any}>Qté</Text>
            <Text style={styles.colPrice as any}>Prix unit.</Text>
            <Text style={styles.colTotal as any}>Total</Text>
          </View>

          {invoice.items?.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow as any}>
              <Text style={styles.colDesc as any}>{item.description}</Text>
              <Text style={styles.colQty as any}>{item.quantity}</Text>
              <Text style={styles.colPrice as any}>{fmt(item.unitPrice)}</Text>
              <Text style={styles.colTotal as any}>{fmt(item.quantity * item.unitPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection as any}>
          <View style={styles.totalsContainer as any}>
            <View style={styles.totalRow as any}>
              <Text>Sous-total</Text>
              <Text>{fmt(invoice.subtotal || 0)}</Text>
            </View>
            <View style={styles.totalRow as any}>
              <Text>TPS (5%)</Text>
              <Text>{fmt(invoice.items?.reduce((acc: number, it: any) => acc + (it.taxCategory === 'GST_QST' || it.taxCategory === 'GST_ONLY' ? it.quantity * it.unitPrice * 0.05 : 0), 0) || 0)}</Text>
            </View>
            <View style={styles.totalRow as any}>
              <Text>TVQ (9,975%)</Text>
              <Text>{fmt(invoice.items?.reduce((acc: number, it: any) => acc + (it.taxCategory === 'GST_QST' ? it.quantity * it.unitPrice * 0.09975 : 0), 0) || 0)}</Text>
            </View>
            <View style={[styles.totalRow as any, styles.grandTotal as any]}>
              <Text>Total ({currency})</Text>
              <Text>{fmt(invoice.totalAmount || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer as any}>
          <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'center', gap: 15 }}>
            {company.taxNumberGst && <Text>TPS : {company.taxNumberGst}</Text>}
            {company.taxNumberQst && <Text>TVQ : {company.taxNumberQst}</Text>}
          </View>
          <Text>Merci pour votre confiance !</Text>
          <Text style={{ marginTop: 4 }}>Généré par Klariq - La comptabilité moderne.</Text>
        </View>
      </Page>
    </Document>
  );
};
