import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  TeamMember, Process, SalesClient, SalesDeal, SalesQuote,
  Company, SalesQuoteTemplate, Task, Project, ProductItem
} from '../types';

import { SalesCrmView } from './ventas/SalesCrmView';
import { SalesPipelineView } from './ventas/SalesPipelineView';
import { SalesQuotesView } from './ventas/SalesQuotesView';
import { QuoteTemplatesView } from './ventas/QuoteTemplatesView';
import { SalesGoalsView } from './ventas/SalesGoalsView';
import { Opportunity360View } from './ventas/Opportunity360View';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';
import { ModulePermissionsTab } from './common/ModulePermissionsTab';

export type VentasSubTab =
  | 'links'
  | 'notes'
  | 'crm'
  | 'pipeline'
  | 'quotes'
  | 'quote_templates'
  | 'goals'
  | 'permissions';

interface VentasModuleProps {
  onCreateCompany?: (company: Partial<Company>) => Promise<string>;
  onCreateMember?: (member: Partial<TeamMember>) => Promise<string>;
  currentMember: TeamMember | null;
  members: TeamMember[];
  companies: Company[];
  processes: Process[];
  activeSubTab?: VentasSubTab;
  onSubTabChange?: (tab: VentasSubTab) => void;
  tasks?: Task[];
  projects?: Project[];
  products?: ProductItem[];
  onOpenTask?: (task: Task) => void;
  onAddTask?: (taskData: Partial<Task>) => Promise<void>;
}

export const VentasModule: React.FC<VentasModuleProps> = ({
  currentMember,
  members,
  companies,
  processes,
  activeSubTab = 'pipeline',
  onSubTabChange,
  onCreateCompany,
  onCreateMember,
  tasks = [],
  projects = [],
  products = [],
  onOpenTask,
  onAddTask,
}) => {
  const [clients, setClients] = useState<SalesClient[]>([]);
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);
  const [quoteTemplates, setQuoteTemplates] = useState<SalesQuoteTemplate[]>([]);

  // Selected Deal for 360 View
  const [selectedDeal, setSelectedDeal] = useState<SalesDeal | null>(null);
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);

  // Firebase listeners
  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'sales_clients'), (snapshot) => {
      const data: SalesClient[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as SalesClient));
      setClients(data);
    });

    const unsubDeals = onSnapshot(collection(db, 'sales_deals'), (snapshot) => {
      const data: SalesDeal[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as SalesDeal));
      setDeals(data);
    });

    const unsubQuotes = onSnapshot(collection(db, 'sales_quotes'), (snapshot) => {
      const data: SalesQuote[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as SalesQuote));
      setQuotes(data);
    });

    const unsubTemplates = onSnapshot(collection(db, 'sales_quote_templates'), (snapshot) => {
      const data: SalesQuoteTemplate[] = [];
      snapshot.forEach((doc) => data.push(doc.data() as SalesQuoteTemplate));
      setQuoteTemplates(data);
    });

    return () => {
      unsubClients();
      unsubDeals();
      unsubQuotes();
      unsubTemplates();
    };
  }, []);

  // Handlers for Clients
  const handleSaveClient = async (clientData: Partial<SalesClient>) => {
    try {
      const id = clientData.id || `client-${Date.now()}`;
      const toSave = {
        ...clientData,
        id,
        createdAt: clientData.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'sales_clients', id), toSave);
    } catch (err) {
      console.error('Error saving client:', err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sales_clients', id));
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  // Handlers for Deals
  const handleSaveDeal = async (dealData: Partial<SalesDeal>) => {
    try {
      const id = dealData.id || `deal-${Date.now()}`;
      const toSave = {
        ...dealData,
        id,
        createdAt: dealData.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'sales_deals', id), toSave);
      // If we were editing or creating in 360 view, update local state
      if (selectedDeal && selectedDeal.id === id) {
        setSelectedDeal(toSave as SalesDeal);
      }
      if (isCreatingDeal) {
        setIsCreatingDeal(false);
        setSelectedDeal(toSave as SalesDeal);
      }
    } catch (err) {
      console.error('Error saving deal:', err);
    }
  };

  const handleDeleteDeal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sales_deals', id));
      if (selectedDeal && selectedDeal.id === id) {
        setSelectedDeal(null);
      }
    } catch (err) {
      console.error('Error deleting deal:', err);
    }
  };

  const handleUpdateDealStage = async (id: string, stage: SalesDeal['stage']) => {
    try {
      const deal = deals.find((d) => d.id === id);
      if (deal) {
        await setDoc(doc(db, 'sales_deals', id), { ...deal, stage }, { merge: true });
      }
    } catch (err) {
      console.error('Error updating deal stage:', err);
    }
  };

  // Handlers for Quotes
  const handleSaveQuote = async (quoteData: Partial<SalesQuote>) => {
    try {
      const id = quoteData.id || `quote-${Date.now()}`;
      const toSave = {
        ...quoteData,
        id,
        createdAt: quoteData.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'sales_quotes', id), toSave);
    } catch (err) {
      console.error('Error saving quote:', err);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sales_quotes', id));
    } catch (err) {
      console.error('Error deleting quote:', err);
    }
  };

  // Handlers for Quote Templates
  const handleSaveTemplate = async (templateData: Partial<SalesQuoteTemplate>) => {
    try {
      const id = templateData.id || `template-${Date.now()}`;
      const toSave = {
        ...templateData,
        id,
        updatedAt: new Date().toISOString(),
        createdAt: templateData.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'sales_quote_templates', id), toSave);
    } catch (err) {
      console.error('Error saving quote template:', err);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sales_quote_templates', id));
    } catch (err) {
      console.error('Error deleting quote template:', err);
    }
  };

  // Clone Template into a Real Quote
  const handleUseTemplateToQuote = async (
    template: SalesQuoteTemplate,
    targetClientId: string,
    targetDealId?: string,
    customTitle?: string,
    customAmount?: number
  ) => {
    try {
      const currentYear = new Date().getFullYear();
      const randomQuote = Math.floor(100 + Math.random() * 900);
      const id = `quote-${Date.now()}`;
      const clonedLines = (template.suggestedLines || []).map((ln, idx) => ({
        id: ln.id || `line-${Date.now()}-${idx}`,
        productId: ln.productId,
        description: ln.description,
        quantity: Number(ln.quantity) || 1,
        unitPrice: Number(ln.unitPrice) || 0,
        total: (Number(ln.quantity) || 1) * (Number(ln.unitPrice) || 0),
      }));
      const newQuote: SalesQuote = {
        id,
        quoteNumber: `PF-${currentYear}-${randomQuote}`,
        title: customTitle || `Cotización: ${template.name}`,
        clientId: targetClientId,
        dealId: targetDealId,
        templateId: template.id,
        amount: customAmount !== undefined && customAmount > 0 ? customAmount : (template.baseAmount || 0),
        status: 'borrador',
        date: new Date().toISOString().split('T')[0],
        googleDocsUrl: template.masterGoogleDocsUrl || '',
        excelSheetUrl: template.masterExcelSheetUrl || '',
        pdfUrl: template.masterPdfUrl || '',
        scopeSummary: template.description || '',
        paymentTerms: template.defaultPaymentTerms || '',
        deliveryTime: template.defaultDeliveryTime || '',
        lines: clonedLines,
        workLog: [
          {
            id: `log_${Date.now()}`,
            date: new Date().toISOString(),
            memberId: currentMember?.id || 'system',
            memberName: currentMember?.name || 'Asesor Comercial',
            memberRole: currentMember?.role || 'Comercial',
            type: 'quote_update',
            action: 'Emisión de Proforma desde Plantilla Modelo',
            details: `Generada a partir del modelo [${template.code}] ${template.name}`,
          },
        ],
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'sales_quotes', id), newQuote);
      if (onSubTabChange) {
        onSubTabChange('quotes');
      }
    } catch (err) {
      console.error('Error creating quote from template:', err);
    }
  };

  // IF AN OPPORTUNITY 360 IS ACTIVE (VIEW OR CREATE), RENDER IT FULL VIEW
  if (selectedDeal || isCreatingDeal) {
    return (
      <Opportunity360View
        deal={selectedDeal || undefined}
        isCreating={isCreatingDeal}
        clients={clients}
        companies={companies}
        members={members}
        projects={projects}
        tasks={tasks}
        quotes={quotes}
        quoteTemplates={quoteTemplates}
        products={products}
        currentMember={currentMember}
        onBack={() => {
          setSelectedDeal(null);
          setIsCreatingDeal(false);
        }}
        onSaveDeal={handleSaveDeal}
        onDeleteDeal={handleDeleteDeal}
        onOpenStory={onOpenTask}
        onAddStory={onAddTask}
        onCreateQuote={handleSaveQuote}
        onDeleteQuote={handleDeleteQuote}
      />
    );
  }

  return (
    <div className="space-y-6 text-left w-full max-w-7xl mx-auto pb-8">
      {/* Enlaces de Interés Subtab */}
      {activeSubTab === 'links' && (
        <motion.div
          key="links"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <PersonalLinksView
            currentMember={currentMember}
            members={members}
            moduleName="Ventas"
            accentColor="emerald"
          />
        </motion.div>
      )}

      {/* Notas Markdown Subtab */}
      {activeSubTab === 'notes' && (
        <motion.div
          key="notes"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <PersonalNotesView
            currentMember={currentMember}
            members={members}
            moduleName="Ventas"
            accentColor="emerald"
          />
        </motion.div>
      )}

      {/* CRM Clientes Subtab */}
      {activeSubTab === 'crm' && (
        <motion.div
          key="crm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <SalesCrmView
            clients={clients}
            members={members}
            companies={companies}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
          />
        </motion.div>
      )}

      {/* Pipeline / Oportunidades Unificado Subtab */}
      {activeSubTab === 'pipeline' && (
        <motion.div
          key="pipeline"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <SalesPipelineView
            deals={deals}
            clients={clients}
            companies={companies}
            members={members}
            onSaveDeal={handleSaveDeal}
            onDeleteDeal={handleDeleteDeal}
            onUpdateStage={handleUpdateDealStage}
            onSelectDeal={(deal) => setSelectedDeal(deal)}
            onCreateNewDeal={() => {
              setSelectedDeal(null);
              setIsCreatingDeal(true);
            }}
          />
        </motion.div>
      )}

      {/* Quotes / Cotizaciones Subtab */}
      {activeSubTab === 'quotes' && (
        <motion.div
          key="quotes"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <SalesQuotesView
            quotes={quotes}
            clients={clients}
            companies={companies}
            members={members}
            quoteTemplates={quoteTemplates}
            deals={deals}
            products={products}
            currentMember={currentMember}
            onSaveQuote={handleSaveQuote}
            onDeleteQuote={handleDeleteQuote}
            onOpenDeal={(deal) => setSelectedDeal(deal)}
          />
        </motion.div>
      )}

      {/* Proformas Modelo Library Subtab */}
      {activeSubTab === 'quote_templates' && (
        <motion.div
          key="quote_templates"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <QuoteTemplatesView
            templates={quoteTemplates}
            clients={clients}
            companies={companies}
            members={members}
            products={products}
            deals={deals}
            currentMember={currentMember}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onUseTemplateToQuote={handleUseTemplateToQuote}
          />
        </motion.div>
      )}

      {/* Goals Subtab */}
      {activeSubTab === 'goals' && (
        <motion.div
          key="goals"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <SalesGoalsView deals={deals} clients={clients} quotes={quotes} />
        </motion.div>
      )}

      {/* Permissions Subtab */}
      {activeSubTab === 'permissions' && (
        <motion.div
          key="permissions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <ModulePermissionsTab
            moduleId="ventas"
            moduleName="Ventas"
            currentMember={currentMember}
            members={members}
            processes={processes}
          />
        </motion.div>
      )}
    </div>
  );
};

export default VentasModule;
