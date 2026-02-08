import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import HierarchyToggleEditor from '../../components/settings/HierarchyToggleEditor';

interface ProductHierarchySettingsPageProps {
  embedInCompanySettings?: boolean;
  overrideProductId?: string;
}

const ProductHierarchySettingsPage: React.FC<ProductHierarchySettingsPageProps> = ({
  embedInCompanySettings = false,
  overrideProductId,
}) => {
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

  const productId = overrideProductId ?? selectedProductId;
  const product = productId ? workItems.find((i) => i.id === productId) : null;
  const config = productId ? getHierarchyConfigForProduct(productId) : null;

  useEffect(() => {
    if (productId) loadHierarchyConfig(productId);
  }, [productId, loadHierarchyConfig]);

  if (!productId || !product) {
    return (
      <div className="page-container">
        {!embedInCompanySettings && (
          <button type="button" className="btn-secondary" onClick={() => setViewMode('backlog')}>
            Back to Backlog
          </button>
        )}
        <p style={{ marginTop: embedInCompanySettings ? 0 : '16px', color: '#6b7280' }}>
          {embedInCompanySettings ? 'Select a product below to configure its hierarchy.' : 'Select a product from the backlog to configure its hierarchy.'}
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {!embedInCompanySettings && (
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => setViewMode('backlog')}>
            Back to Backlog
          </button>
        </div>
      )}
      {!embedInCompanySettings && <h1 className="page-title">Hierarchy for {product.title}</h1>}
      {embedInCompanySettings && <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Hierarchy for {product.title}</h2>}
      <p className="page-description" style={{ marginBottom: '24px' }}>
        Choose which work item types are enabled for this product and their display order.
      </p>
      <HierarchyToggleEditor
        productId={productId}
        config={config}
        canEdit={canEditProductHierarchy(productId)}
        onSave={async (next) => setHierarchyConfig(productId, next)}
        getTypeLabel={getTypeLabel}
      />
    </div>
  );
};

export default ProductHierarchySettingsPage;
