import React from 'react';
import { useStore } from '../store/useStore';
import { WorkItem } from '../types';
import { Package, Plus } from 'lucide-react';

const Landing: React.FC = () => {
  const {
    getWorkItemsByType,
    setSelectedProductId,
    setViewMode,
    canAddProduct,
    getCurrentCompany,
    getTypeLabel,
  } = useStore();
  const tenant = getCurrentCompany();
  const products = getWorkItemsByType('product');

  const handleProductClick = (product: WorkItem) => {
    setSelectedProductId(product.id);
    setViewMode('backlog');
  };

  const handleGoToBacklog = () => {
    setSelectedProductId(null);
    setViewMode('backlog');
  };

  const handleAddProduct = () => {
    setViewMode('add-product');
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Company section: current tenant logo + vision */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#111827' }}>
          Company
        </h1>
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {tenant?.logoUrl && (
            <img
              src={tenant.logoUrl}
              alt={`${tenant.name} logo`}
              style={{
                width: '160px',
                height: '160px',
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {tenant?.name && (
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                {tenant.name}
              </p>
            )}
            {tenant?.vision && (
              <p style={{ margin: tenant?.name ? '8px 0 0 0' : 0, fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                {tenant.vision}
              </p>
            )}
            {tenant && !tenant.logoUrl && !tenant.vision && (
              <p style={{ margin: tenant?.name ? '8px 0 0 0' : 0, fontSize: '14px', color: '#9ca3af' }}>
                Add a logo and vision in Company profile.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Products section */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#111827' }}>
            Products
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Select a product to open its backlog. Each product has its own backlog of epics, features, and work items.
          </p>
        </div>
        {canAddProduct() && (
          <button
            type="button"
            onClick={handleAddProduct}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={20} />
            Add Product
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        {products.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '48px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              color: '#6b7280',
            }}
          >
            <p style={{ margin: 0, fontSize: '16px', marginBottom: '16px' }}>
              No products yet. Add a product to get started.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {canAddProduct() && (
                <button
                  type="button"
                  onClick={handleAddProduct}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Plus size={20} />
                  Add Product
                </button>
              )}
              <button
                type="button"
                onClick={handleGoToBacklog}
                style={{
                  padding: '12px 24px',
                  backgroundColor: canAddProduct() ? '#ffffff' : '#3b82f6',
                  color: canAddProduct() ? '#374151' : '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Go to {getTypeLabel('product')} Backlog
              </button>
            </div>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              role="button"
              tabIndex={0}
              onClick={() => handleProductClick(product)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProductClick(product);
                }
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Package size={22} color="#3b82f6" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      fontWeight: '600',
                      marginBottom: '4px',
                    }}
                  >
                    {getTypeLabel(product.type)}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827', lineHeight: '1.3' }}>
                    {product.title}
                  </h3>
                </div>
              </div>
              {product.description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#6b7280',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {product.description}
                </p>
              )}
              <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#3b82f6', fontWeight: '500' }}>
                Open backlog →
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Landing;
