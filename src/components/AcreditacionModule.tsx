import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  AcreditationAlly, 
  AcreditationCertification, 
  Company, 
  Industry,
  ProductItem,
  TeamMember 
} from '../types';
import { PersonalLinksView } from './common/PersonalLinksView';
import { PersonalNotesView } from './common/PersonalNotesView';
import { AcreditacionAlliesView } from './acreditacion/AcreditacionAlliesView';
import { AcreditacionCertificationsView } from './acreditacion/AcreditacionCertificationsView';

interface AcreditacionModuleProps {
  currentMember: TeamMember | null;
  members: TeamMember[];
  companies: Company[];
  industries?: Industry[];
  products?: ProductItem[];
  activeSubTab?: 'links' | 'notes' | 'allies' | 'certifications';
  onSubTabChange?: (tab: 'links' | 'notes' | 'allies' | 'certifications') => void;
}

export const AcreditacionModule: React.FC<AcreditacionModuleProps> = ({
  currentMember,
  members,
  companies,
  industries = [],
  products: initialProducts,
  activeSubTab = 'links',
}) => {
  // State for Allies & Certifications
  const [allies, setAllies] = useState<AcreditationAlly[]>([]);
  const [certifications, setCertifications] = useState<AcreditationCertification[]>([]);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts || []);
  const [loadingAllies, setLoadingAllies] = useState<boolean>(true);
  const [loadingCerts, setLoadingCerts] = useState<boolean>(true);

  // Firestore subscriptions for Acreditacion module collections
  useEffect(() => {
    const unsubAllies = onSnapshot(
      collection(db, 'acreditation_allies'),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...doc.data() } as AcreditationAlly));
        setAllies(data);
        setLoadingAllies(false);
      },
      (error) => {
        console.error('Error fetching acreditacion_allies:', error);
        setLoadingAllies(false);
      }
    );

    const unsubCerts = onSnapshot(
      collection(db, 'acreditation_certifications'),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...doc.data() } as AcreditationCertification));
        setCertifications(data);
        setLoadingCerts(false);
      },
      (error) => {
        console.error('Error fetching acreditacion_certifications:', error);
        setLoadingCerts(false);
      }
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...doc.data() } as ProductItem));
        setProducts(data);
      },
      (error) => {
        console.error('Error fetching products in AcreditacionModule:', error);
      }
    );

    return () => {
      unsubAllies();
      unsubCerts();
      unsubProducts();
    };
  }, []);

  return (
    <div className="w-full">
      {/* Sub-view Content Rendering */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'links' && (
          <motion.div
            key="acreditacion-links"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <PersonalLinksView
              moduleName="Acreditación"
              currentMember={currentMember}
              members={members}
              accentColor="indigo"
            />
          </motion.div>
        )}

        {activeSubTab === 'notes' && (
          <motion.div
            key="acreditacion-notes"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <PersonalNotesView
              moduleName="Acreditación"
              currentMember={currentMember}
              members={members}
              accentColor="indigo"
            />
          </motion.div>
        )}

        {activeSubTab === 'allies' && (
          <motion.div
            key="acreditacion-allies"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <AcreditacionAlliesView
              allies={allies}
              companies={companies}
              industries={industries}
              members={members}
              currentMember={currentMember}
              loading={loadingAllies}
            />
          </motion.div>
        )}

        {activeSubTab === 'certifications' && (
          <motion.div
            key="acreditacion-certifications"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <AcreditacionCertificationsView
              certifications={certifications}
              allies={allies}
              companies={companies}
              products={products}
              currentMember={currentMember}
              loading={loadingCerts}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
