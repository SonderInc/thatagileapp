import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import HierarchyToggleEditor from '../../components/settings/HierarchyToggleEditor';

const ProductHierarchySettingsPage: React.FC = () => {
  const {
    selectedProductId,
    workItems,
    setViewMode,
    loadHierarchyConfig,
    getHierarchyConfigForProduct,
    setHierarchyConfig,
    canEditProductHierarchy,
    getTypeLabel,
  } = useStore();

  const product = selectedProductId ? workItems.find((i) => i.id === selectedProductId) : null;
  const config = selectedProductId ? getHierarchyConfigForProduct(selectedProductId) : null;

  useEffect(() => {
    if (selectedProductId) loadHierarchyConfig(selectedProductId);
  }, [selectedProductId, loadHierarchyConfig]);

  if (!selectedProductId || !product) {
    return (
      <div className="page-container">
        <button type="button" className="btn-secondary" onClick={() => setViewMode('backlog')}>
          Back to Backlog
        </button>
        <p style={{ marginTop: '16px', color: '#6b7280' }}>Select a product from the backlog to configure its hierarchy.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('backlog')}>
          Back to Backlog
        </button>
      </div>
      <h1 className="page-title">Hierarchy for {product.title}</h1>
      <p className="page-description" style={{ marginBottom: '24px' }}>
        Choose which work item types are enabled for this product and their display order.
      </p>
      <HierarchyToggleEditor
        productId={selectedProductId}
        config={config}
        canEdit={canEditProductHierarchy(selectedProductId)}
        onSave={async (next) => setHierarchyConfig(selectedProductId, next)}
        getTypeLabel={getTypeLabel}
      />
    </div>
  );
};

export default ProductHierarchySettingsPage;
