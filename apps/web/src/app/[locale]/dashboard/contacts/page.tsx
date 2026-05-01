'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Users, Search, Plus, Mail, Phone, MapPin, Loader2, X, Trash2, Edit2 } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, type Contact } from '@/hooks/use-contacts';
import { contactSchema, type ContactFormValues } from '@/lib/validations/contact.schema';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

export default function ContactsPage() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const { data: contacts, isLoading, error } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      type: 'CUSTOMER',
    },
  });

  React.useEffect(() => {
    if (editingContact) {
      reset({
        name: editingContact.name,
        email: editingContact.email || '',
        phone: editingContact.phone || '',
        address: editingContact.address || '',
        type: editingContact.type,
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        type: 'CUSTOMER',
      });
    }
  }, [editingContact, reset]);

  const filteredContacts = contacts?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit: SubmitHandler<ContactFormValues> = async (data) => {
    try {
      if (editingContact) {
        await updateContact.mutateAsync({ id: editingContact.id, dto: data as any });
        toast.success(locale === 'fr' ? 'Contact mis à jour' : 'Contact updated');
      } else {
        await createContact.mutateAsync(data as any);
        toast.success(locale === 'fr' ? 'Contact créé' : 'Contact created');
      }
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Error saving contact');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(locale === 'fr' ? `Supprimer "${name}" ?` : `Delete "${name}"?`)) return;
    try {
      await deleteContact.mutateAsync(id);
      toast.success(locale === 'fr' ? 'Contact supprimé' : 'Contact deleted');
    } catch (err: any) {
      toast.error(err.message || 'Error deleting contact');
    }
  };

  const openModal = (contact?: Contact) => {
    if (contact) setEditingContact(contact);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Users size={20} />
            </div>
            {t('clients')}
          </h1>
          <p className="text-ink-3 text-sm mt-1">
            {locale === 'fr' 
              ? 'Gérez vos clients et fournisseurs en un seul endroit.' 
              : 'Manage your customers and suppliers in one place.'}
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
            onClick={() => openModal()}
            leftIcon={<Plus size={16} />}
            size="sm"
          >
            {locale === 'fr' ? 'Nouveau' : 'New'}
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
              <h3 className="text-white font-medium text-lg">{locale === 'fr' ? 'Erreur de chargement' : 'Loading error'}</h3>
              <p className="text-sm text-ink-3 max-w-xs mx-auto">{error instanceof Error ? error.message : 'API Error'}</p>
            </div>
          </div>
        ) : filteredContacts?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.02] flex items-center justify-center text-ink-4 border border-white/[0.05] shadow-inner">
              <Users size={40} />
            </div>
            <div className="max-w-xs mx-auto space-y-2">
              <h3 className="text-xl font-medium text-white">
                {searchQuery ? (locale === 'fr' ? 'Aucun résultat' : 'No results found') : (locale === 'fr' ? 'Aucun contact' : 'No contacts yet')}
              </h3>
              <p className="text-ink-3 text-sm">
                {searchQuery 
                  ? (locale === 'fr' ? `Aucun contact ne correspond à "${searchQuery}"` : `No contact matches "${searchQuery}"`)
                  : (locale === 'fr' ? 'Commencez par ajouter votre premier client ou fournisseur.' : 'Start by adding your first customer or supplier.')}
              </p>
            </div>
            {!searchQuery && (
              <Button variant="outline" onClick={() => openModal()}>
                {locale === 'fr' ? 'Ajouter un contact' : 'Add a contact'}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredContacts?.map((contact) => (
              <div key={contact.id} className="p-6 flex items-center gap-5 hover:bg-white/[0.02] transition-all group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/[0.08] to-transparent flex items-center justify-center border border-white/[0.1] text-ink-2 group-hover:text-accent transition-all group-hover:scale-105 duration-300 shadow-lg">
                  <Users size={22} />
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-[16px] font-semibold text-white truncate leading-none">{contact.name}</h4>
                    <span className={cn(
                      "font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-widest leading-none",
                      contact.type === 'CUSTOMER' ? "text-accent border-accent/30 bg-accent/5" : 
                      contact.type === 'SUPPLIER' ? "text-purple-400 border-purple-400/30 bg-purple-400/5" : "text-pos border-pos/30 bg-pos/5"
                    )}>
                      {contact.type}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-ink-3 text-[12px]">
                        <Mail size={13} className="text-ink-5" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-ink-3 text-[12px]">
                        <Phone size={13} className="text-ink-5" />
                        {contact.phone}
                      </div>
                    )}
                    {contact.address && (
                      <div className="flex items-center gap-2 text-ink-3 text-[12px]">
                        <MapPin size={13} className="text-ink-5" />
                        <span className="truncate max-w-[240px]">{contact.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg"
                    onClick={() => openModal(contact)}
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-neg/70 hover:text-neg"
                    onClick={() => handleDelete(contact.id, contact.name)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={closeModal} />
          
          <Card variant="strong" className="w-full max-w-lg relative overflow-hidden animate-in fade-in zoom-in-95 duration-300 shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-lg font-semibold text-white">
                {editingContact 
                  ? (locale === 'fr' ? 'Modifier le contact' : 'Edit Contact') 
                  : (locale === 'fr' ? 'Nouveau Contact' : 'New Contact')}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8 rounded-lg">
                <X size={18} />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit as any)} className="p-6 space-y-6">
              <Input 
                label={locale === 'fr' ? 'Nom complet' : 'Full Name'}
                placeholder="Ex: Lumen Photonics Inc."
                error={errors.name?.message}
                {...register('name')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Select 
                  label="Type"
                  error={errors.type?.message}
                  {...register('type')}
                >
                  <option value="CUSTOMER">{locale === 'fr' ? 'Client' : 'Customer'}</option>
                  <option value="SUPPLIER">{locale === 'fr' ? 'Fournisseur' : 'Supplier'}</option>
                  <option value="BOTH">{locale === 'fr' ? 'Les deux' : 'Both'}</option>
                </Select>
                
                <Input 
                  label="Email"
                  placeholder="contact@exemple.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input 
                  label={locale === 'fr' ? 'Téléphone' : 'Phone'}
                  placeholder="+1 (514) 000-0000"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                
                <Input 
                  label={locale === 'fr' ? 'Adresse' : 'Address'}
                  placeholder="123 Rue, Ville, QC"
                  error={errors.address?.message}
                  {...register('address')}
                />
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
                  isLoading={createContact.isPending || updateContact.isPending}
                >
                  {editingContact 
                    ? (locale === 'fr' ? 'Enregistrer' : 'Save Changes') 
                    : (locale === 'fr' ? 'Créer le contact' : 'Create Contact')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
