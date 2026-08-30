import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TeamMember, Process, SalesClient, SalesDeal, SalesQuote, Company } from '../types';

import { SalesCrmView } from './ventas/SalesCrmView';
import { SalesPipelineView } from './ventas/SalesPipelineView';
import { SalesQuotesView } from './ventas/SalesQuotesView';
import { SalesGoalsView } from './ventas/SalesGoalsView';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';

export type VentasSubTab = 'links' | 'notes' | 'crm' | 'pipeline' | 'quotes' | 'goals';

interface VentasModuleProps {
  onCreateCompany?: (company: Partial<Company>) => Promise<string>;
  onCreateMember?: (member: Partial<TeamMember>) => Promise<string>;
  currentMember: TeamMember | null;
  members: TeamMember[];
  companies: Company[];
  processes: Process[];
  activeSubTab?: VentasSubTab;
  onSubTabChange?: (tab: VentasSubTab) => void;
}

export const VentasModule: React.FC<VentasModuleProps> = ({
  currentMember,
  members,
  companies,
  processes,
  activeSubTab = 'crm',
  onSubTabChange,
  onCreateCompany,
  onCreateMember
}) => {
  const [clients, setClients] = useState<SalesClient[]>([]);
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [quotes, setQuotes] = useState<SalesQuote[]>([]);

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

    return () => {
      unsubClients();
      unsubDeals();
      unsubQuotes();
    };
  }, []);

  // Handlers for Clients
  const handleSaveClient = async (clientData: Partial<SalesClient>) => {
    try {
      const id = clientData.id || `client-${Date.now()}`;
      const toSave = {
        ...clientData,
        id,
        createdAt: clientData.createdAt || new Date().toISOString()
      };
      await setDoc(doc(db, 'sales_clients', id), toSave);
    } catch (err) {
      console.error("Error saving client:", err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sales_clients', id));
    } catch (err) {
      console.error("Error deleting client:", err);
    }
  };

  // Handlers for Deals
  const handleSaveDeal = async (dealData: Partial<SalesDeal>) => {
    try {
      const id = dealData.id || `deal-${Date.now()}`;
      const toSave = {
        ...dealData,
        id,
        createdAt: dealData.createdAt || new Date().toISOString()
      };
      await setDoc(doc(db, 'sales_deals', id), toSave);
    } catch (err) {
      console.error("Error saving deal:", err);
    }
  };

  const handleDeleteDeal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sales_deals', id));
    } catch (err) {
      console.error("Error deleting deal:", err);
    }
  };

  const handleUpdateDealStage = async (id: string, stage: SalesDeal['stage']) => {
    try {
      const deal = deals.find(d => d.id === id);
      if (deal) {
        await setDoc(doc(db, 'sales_deals', id), { ...deal, stage }, { merge: true });
      }
    } catch (err) {
      console.error("Error updating deal stage:", err);
    }
  };

  // Handlers for Quotes
  const handleSaveQuote = async (quoteData: Partial<SalesQuote>) => {
    try {
      const id = quoteData.id || `quote-${Date.now()}`;
      const toSave = {
        ...quoteData,
        id,
        createdAt: quoteData.createdAt || new Date().toISOString()
      };
      await setDoc(doc(db, 'sales_quotes', id), toSave);
    } catch (err) {
      console.error("Error saving quote:", err);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sales_quotes', id));
    } catch (err) {
      console.error("Error deleting quote:", err);
    }
  };

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

      {/* CRM Subtab */}
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

      {/* Pipeline Subtab */}
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
          />
        </motion.div>
      )}

      {/* Quotes Subtab */}
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
            onSaveQuote={handleSaveQuote}
            onDeleteQuote={handleDeleteQuote}
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
          <SalesGoalsView 
            deals={deals}
            clients={clients}
            quotes={quotes}
          />
        </motion.div>
      )}
    </div>
  );
};

export default VentasModule;
