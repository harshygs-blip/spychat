import React, { useState, useRef } from 'react';
import { ShoppingBag, Plus, Trash2, Image, Tag, DollarSign, Check, X } from 'lucide-react';
import { User, CatalogItem } from '../../types';
import { AuthService } from '../../services/auth';

interface ProductCatalogProps {
  currentUser: User;
  onUpdate: (updated: User) => void;
  onClose?: () => void;
  onSendProductToChat?: (item: CatalogItem) => void;
}

export const ProductCatalogModal: React.FC<ProductCatalogProps> = ({
  currentUser,
  onUpdate,
  onClose,
  onSendProductToChat
}) => {
  const catalog = currentUser.business_automation?.catalog || [
    {
      id: 'cat_1',
      title: 'SPYCHAT VIP Encrypted Node',
      price: '$49/mo',
      description: 'Dedicated private TURN relay with ultra-low latency & 4K calling.',
      created_at: new Date().toISOString()
    }
  ];

  const [items, setItems] = useState<CatalogItem[]>(catalog);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImageUrls((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddItem = async () => {
    if (!title.trim() || !price.trim()) return;

    const newItem: CatalogItem = {
      id: 'prod_' + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      price: price.trim(),
      description: description.trim(),
      image_url: imageUrls.length > 0 ? imageUrls[0] : undefined,
      created_at: new Date().toISOString()
    };

    const updatedCatalog = [newItem, ...items];
    setItems(updatedCatalog);
    setTitle('');
    setPrice('');
    setDescription('');
    setImageUrls([]);
    setShowAddForm(false);

    // Save to profile
    try {
      setLoading(true);
      const updated = await AuthService.updateProfile({
        business_automation: {
          ...(currentUser.business_automation as any),
          catalog: updatedCatalog
        }
      });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const updatedCatalog = items.filter(i => i.id !== id);
    setItems(updatedCatalog);

    try {
      const updated = await AuthService.updateProfile({
        business_automation: {
          ...(currentUser.business_automation as any),
          catalog: updatedCatalog
        }
      });
      onUpdate(updated);
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleImageSelected}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div className="glass" style={{
          padding: '16px',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
            }}>
              <ShoppingBag size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>Product Catalog</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Display items/services & share directly in chat
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '10px' }}
          >
            {showAddForm ? <X size={16} /> : <><Plus size={16} /> Add Product</>}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="glass" style={{
            padding: '16px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '1px solid var(--accent-cyan)'
          }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
              Create New Catalog Item
            </span>

            <input
              type="text"
              placeholder="Product / Service Title"
              className="spychat-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              type="text"
              placeholder="Price (e.g. ₹999, $49)"
              className="spychat-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <textarea
              rows={2}
              placeholder="Description & details..."
              className="spychat-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'none' }}
            />

            {/* Uploaded Photos Preview Gallery */}
            {imageUrls.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                {imageUrls.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt="Thumbnail"
                      style={{ width: '54px', height: '54px', borderRadius: '10px', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: imageUrls.length > 0 ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Image size={15} />
                <span>{imageUrls.length > 0 ? `✓ ${imageUrls.length} Photos Attached` : '+ Upload Photos (No limit)'}</span>
              </button>

              <button
                onClick={handleAddItem}
                disabled={!title.trim() || !price.trim() || loading}
                className="btn-success"
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
              >
                {loading ? 'Saving...' : 'Publish Item'}
              </button>
            </div>
          </div>
        )}

        {/* Product Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((prod) => (
            <div
              key={prod.id}
              className="glass"
              style={{
                padding: '14px',
                borderRadius: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                {prod.image_url ? (
                  <img
                    src={prod.image_url}
                    alt={prod.title}
                    style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'rgba(6, 182, 212, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)'
                  }}>
                    <Tag size={24} />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{prod.title}</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                    {prod.price}
                  </div>
                  {prod.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prod.description}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onSendProductToChat && (
                  <button
                    onClick={() => onSendProductToChat(prod)}
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
                  >
                    Share in Chat
                  </button>
                )}

                <button
                  onClick={() => handleDeleteItem(prod.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    padding: '6px'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
