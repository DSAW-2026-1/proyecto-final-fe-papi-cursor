import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService, orderService } from '../services/api';
import './Cart.css';

const formatPrice = (p) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p);

const Cart = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);

  const loadCart = useCallback(async () => {
    try {
      const res = await cartService.get();
      setItems(res.data.cart?.items || res.data.items || []);
      // Mostrar aviso si el backend eliminó productos no disponibles
      if (res.data.removedCount > 0) {
        setRemovedCount(res.data.removedCount);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  const updateQty = async (itemId, qty) => {
    if (qty < 1) return;
    setUpdatingId(itemId);
    try {
      await cartService.update(itemId, { quantity: qty });
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: qty } : i));
    } catch {}
    setUpdatingId(null);
  };

  const removeItem = async (itemId) => {
    setUpdatingId(itemId);
    try {
      await cartService.remove(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch {}
    setUpdatingId(null);
  };

  const handleCheckout = async () => {
    if (!window.confirm('¿Confirmar la compra?')) return;
    setCheckingOut(true);
    try {
      await orderService.create();
      setItems([]);
      navigate('/my-orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al procesar la compra');
    }
    setCheckingOut(false);
  };

  const subtotal = items.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="cart-title">Mi Carrito</h1>

        {removedCount > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            ⚠️ {removedCount} producto{removedCount > 1 ? 's' : ''} {removedCount > 1 ? 'fueron eliminados' : 'fue eliminado'} de tu carrito porque {removedCount > 1 ? 'ya no están disponibles' : 'ya no está disponible'}.
          </div>
        )}

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h3>Tu carrito está vacío</h3>
            <p>Explora productos y agrega los que te interesen.</p>
            <button className="btn btn-primary" onClick={() => navigate('/listing')}>
              Explorar productos
            </button>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {items.map(item => {
                const product = item.product || {};
                const busy = updatingId === item.id;
                return (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-img" onClick={() => navigate(`/product/${product.id}`)}>
                      {product.image
                        ? <img src={product.image} alt={product.name} />
                        : <span className="cart-emoji">{product.emoji || '📦'}</span>
                      }
                    </div>
                    <div className="cart-item-info">
                      <h3 className="cart-item-name" onClick={() => navigate(`/product/${product.id}`)}>
                        {product.name || product.title}
                      </h3>
                      {product.seller && (
                        <p className="cart-item-seller">Vendido por {product.seller.name}</p>
                      )}
                      <div className="cart-item-price">{formatPrice(product.price)}</div>
                    </div>
                    <div className="cart-item-actions">
                      <div className="cart-qty">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} disabled={busy || item.quantity <= 1}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} disabled={busy || item.quantity >= (product.stock || 99)}>+</button>
                      </div>
                      <div className="cart-item-subtotal">{formatPrice(product.price * item.quantity)}</div>
                      <button className="cart-remove" onClick={() => removeItem(item.id)} disabled={busy} title="Eliminar">
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <h2 className="cart-summary-title">Resumen</h2>
              <div className="cart-summary-row">
                <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="cart-summary-row cart-total">
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <button
                className="btn btn-primary btn-block"
                onClick={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? 'Procesando...' : '✅ Finalizar compra'}
              </button>
              <button className="btn btn-secondary btn-block" onClick={() => navigate('/listing')}>
                Seguir comprando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
