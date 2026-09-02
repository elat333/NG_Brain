import React from 'react';
import { motion } from 'motion/react';
import { TeamMember, ProductItem, Company } from '../../types';
import { ProductosModule, ProductSubTab } from '../ProductosModule';

interface ProductsViewProps {
  currentMember: TeamMember | null | undefined;
  products: ProductItem[];
  companies: Company[];
  members: TeamMember[];
  activeSubTab: ProductSubTab;
  onSubTabChange: (tab: ProductSubTab) => void;
  accessLevel: 'ninguno' | 'lector' | 'colaborador' | 'lider' | 'administrador';
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  currentMember,
  products,
  companies,
  members,
  activeSubTab,
  onSubTabChange,
  accessLevel,
}) => {
  return (
    <motion.div
      key="productos"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto w-full"
    >
      <ProductosModule
        currentMember={currentMember}
        products={products}
        companies={companies}
        members={members}
        activeSubTab={activeSubTab}
        onSubTabChange={onSubTabChange}
        accessLevel={accessLevel}
      />
    </motion.div>
  );
};
