import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService, cartService, reviewService, reportService, conversationService, orderService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ProductDetail.css';

const formatPrice = (price) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

// Estrellas estáticas
const Stars = ({ rating }) => {
  const full = Math.round(rating || 0);
  return (
    <span className="pd-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= full ? '#C9A84C' : '#ddd', fontSize: 18 }}>★</span>
      ))}
    </span>
  );
};

// Selector interactivo de estrellas
const StarPicker = ({ value, onChange }) => (
  <span className="pd-star-picker">
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        onClick={() => onChange(i)}
        style={{
          cursor: 'pointer',
          color: i <= value ? '#C9A84C' : '#ddd',
          fontSize: 28,
          padding: '0 2px',
          transition: 'color 0.15s',
        }}
      >
        ★
      </span>
    ))}
  </span>
);

// Modal de reporte
const ReportModal = ({ target, targetId, onClose }) => {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSending(true);
    try {
      await reportService.create({ targetType: target, targetId, reason: reason.trim() });
      setDone(true);
    } catch {}
    setSending(false);
  };

  return (
    <div className="pd-modal-overlay" onClick={onClose}>
      <div className="pd-modal" onClick={e => e.stopPropagation()}>
        <div className="pd-modal-header">
          <h3>Reportar {target === 'product' ? 'producto' : 'usuario'}</h3>
          <button className="pd-modal-close" onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div className="pd-modal-success">
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <p>Reporte enviado. Lo revisaremos pronto.</p>
            <button className="btn btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="pd-modal-label">Motivo del reporte</label>
            <textarea
              className="input"
              placeholder="Describe el problema (contenido inapropiado, fraude, spam...)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              required
            />
            <div className="pd-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-danger" disabled={sending || !reason.trim()}>
                {sending ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Formulario para dejar reseña
const ReviewForm = ({ productId, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (rating === 0) { setError('Selecciona una calificación de 1 a 5 estrellas.'); return; }
    setSubmitting(true);
    try {
      await reviewService.createForProduct(productId, { rating, comment: comment.trim() });
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo publicar la reseña.');
    }
    setSubmitting(false);
  };

  return (
    <form className="pd-review-form" onSubmit={handleSubmit}>
      <h3 className="pd-review-form-title">Deja tu reseña</h3>

      <div className="pd-review-form-stars">
        <label>Calificación</label>
        <StarPicker value={rating} onChange={setRating} />
        {rating > 0 && (
          <span style={{ marginLeft: 8, color: '#C9A84C', fontWeight: 600 }}>{rating}/5</span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Comentario (opcional)</label>
        <textarea
          className="input"
          placeholder="Cuéntanos tu experiencia con este producto..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 8 }}>{error}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || rating === 0}
      >
        {submitting ? 'Publicando...' : '⭐ Publicar reseña'}
      </button>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct]             = useState(null);
  const [reviews, setReviews]             = useState([]);
  const [reviewsAvg, setReviewsAvg]       = useState(null);
  const [hasCompletedPurchase, setHasCompletedPurchase] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [quantity, setQuantity]           = useState(1);
  const [addedToCart, setAddedToCart]     = useState(false);
  const [showReport, setShowReport]       = useState(false);
  const [showUserReport, setShowUserReport] = useState(false);
  const [contacting, setContacting]       = useState(false);
  // Estado para producto oculto por admin
  const [hiddenByAdmin, setHiddenByAdmin] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Polling: cada 20 segundos verificar si el producto fue ocultado por admin
  // mientras el usuario lo estaba viendo
  useEffect(() => {
    if (!product) return;
    const interval = setInterval(async () => {
      try {
        await productService.getById(id);
        // Sigue disponible — no hacer nada
      } catch (err) {
        if (err.response?.status === 404) {
          // El producto fue eliminado u ocultado
          clearInterval(interval);
          setHiddenByAdmin(true);
        }
      }
    }, 20000); // cada 20 segundos
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Cuenta regresiva + redirección cuando el producto está oculto
  useEffect(() => {
    if (!hiddenByAdmin) return;
    setRedirectCountdown(3);
    const tick = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev <= 1) {
          clearInterval(tick);
          navigate('/listing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [hiddenByAdmin, navigate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prodRes, revRes] = await Promise.all([
        productService.getById(id),
        reviewService.getByProduct(id),
      ]);
      const p = prodRes.data.product;
      setProduct(p);
      setReviews(revRes.data.reviews || []);
      setReviewsAvg(revRes.data.average);

      // Verificar si el usuario tiene una compra completada de este producto
      // (requerido para dejar reseña — ambas partes deben haber confirmado)
      if (isAuthenticated && p && user?.id !== p.sellerId) {
        try {
          const ordersRes = await orderService.getMyOrders();
          const purchases = ordersRes.data.purchases || [];
          const completed = purchases.some(order =>
            order.status === 'completed' &&
            (order.items || []).some(item => item.productId === id)
          );
          setHasCompletedPurchase(completed);
        } catch {
          setHasCompletedPurchase(false);
        }
      }
    } catch (err) {
      // Producto oculto por admin: mostrar pantalla específica en lugar de redirigir a /
      if (err.response?.data?.hidden || err.response?.status === 404) {
        setHiddenByAdmin(true);
        setLoading(false);
        return;
      }
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      await cartService.add({ productId: product.id, quantity });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al agregar al carrito');
    }
  };

  const handleContact = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setContacting(true);
    try {
      const res = await conversationService.create({ productId: product.id, sellerId: product.sellerId });
      const convId = res.data.conversationId || res.data.conversation?.id || res.data.id;
      navigate(`/conversations/${convId}`);
    } catch {
      navigate('/conversations');
    }
    setContacting(false);
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;

  // Pantalla de producto no disponible (oculto por admin)
  if (hiddenByAdmin) {
    return (
      <div
        className="flex-center"
        style={{
          minHeight: '60vh',
          flexDirection: 'column',
          gap: 16,
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ fontSize: 64 }}>🚫</div>
        <h2 style={{ margin: 0 }}>Producto no disponible</h2>
        <p style={{ color: 'var(--muted)', maxWidth: 360 }}>
          Este producto ha sido retirado del catálogo por el administrador
          y ya no está disponible para su compra.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Redirigiendo al catálogo en <strong>{redirectCountdown}</strong> segundo{redirectCountdown !== 1 ? 's' : ''}...
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/listing')}>
          Ver otros productos
        </button>
      </div>
    );
  }

  if (!product) return null;

  const isOwner = user?.id === product.sellerId;
  const inStock = product.stock > 0;

  // El vendedor tiene rating público solo si el backend retorna un número (≥20 reseñas)
  const sellerRating = product.seller?.sellerRating ?? null;

  // ¿Ya dejó reseña el usuario actual?
  const alreadyReviewed = isAuthenticated && reviews.some(r => r.buyerId === user?.id);

  // Puede reseñar solo si: autenticado + no es dueño + no reseñó + tiene compra completed
  // (requiere confirmación de ambas partes: vendedor marcó entregada + comprador confirmó recepción)
  const canReview = isAuthenticated && !isOwner && !alreadyReviewed && hasCompletedPurchase;

  return (
    <div className="container pd-page">
      <div className="pd-breadcrumb">
        <span onClick={() => navigate('/')} className="pd-link">Inicio</span> ›{' '}
        <span onClick={() => navigate('/listing')} className="pd-link">Productos</span> ›{' '}
        <span>{product.name}</span>
      </div>

      <div className="pd-grid">
        {/* Imagen */}
        <div className="pd-image-col">
          <div className="pd-image">
            {product.image
              ? <img src={product.image} alt={product.name} />
              : <span className="pd-emoji">{product.emoji || '📦'}</span>
            }
          </div>
          <div className="pd-badges">
            <span className={`badge ${product.condition === 'new' ? 'badge-nuevo' : 'badge-usado'}`}>
              {product.condition === 'new' ? 'Nuevo' : 'Usado'}
            </span>
            {product.category && (
              <span className="badge" style={{ background: '#f4f6fb', color: 'var(--muted)' }}>{product.category}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pd-info-col">
          <h1 className="pd-title">{product.name}</h1>
          <div className="pd-price">{formatPrice(product.price)}</div>

          <div className="pd-stock">
            {inStock
              ? <span className="badge badge-nuevo">✅ {product.stock} disponible{product.stock !== 1 ? 's' : ''}</span>
              : <span className="badge badge-usado">❌ Agotado</span>
            }
          </div>

          <div className="pd-desc">
            <h3>Descripción</h3>
            <p>{product.description}</p>
          </div>

          {/* Info del vendedor */}
          {product.seller && (
            <>
              <div className="pd-seller">
                <div className="pd-seller-avatar">👤</div>
                <div>
                  <div className="pd-seller-name">{product.seller.name}</div>
                  <div className="pd-seller-email">{product.seller.email}</div>

                  {/* Rating del vendedor: solo si tiene ≥20 calificaciones */}
                  {sellerRating !== null ? (
                    <div className="pd-seller-rating">
                      <Stars rating={sellerRating} />
                      <span style={{ marginLeft: 6, fontWeight: 600, color: '#C9A84C' }}>
                        {sellerRating.toFixed(1)}
                      </span>
                      <span style={{ marginLeft: 4, color: 'var(--muted)', fontSize: 13 }}>
                        · calificación del vendedor
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      Sin calificación pública aún
                    </div>
                  )}
                </div>
              </div>
              {/* Botón reportar vendedor — fuera del contenedor del seller */}
              {isAuthenticated && !isOwner && (
                <button className="pd-report-link" onClick={() => setShowUserReport(true)}>
                  🚩 Reportar vendedor
                </button>
              )}
            </>
          )}

          {/* Acciones de compra */}
          {!isOwner && inStock && (
            <div className="pd-actions">
              <div className="pd-qty">
                <label>Cantidad</label>
                <div className="pd-qty-ctrl">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>+</button>
                </div>
              </div>
              <button
                className={`btn btn-primary btn-block ${addedToCart ? 'btn-success' : ''}`}
                onClick={handleAddToCart}
              >
                {addedToCart ? '✅ Agregado al carrito' : '🛒 Agregar al carrito'}
              </button>
              {product.sellerId && (
                <button
                  className="btn btn-secondary btn-block"
                  onClick={handleContact}
                  disabled={contacting}
                >
                  {contacting ? 'Abriendo chat...' : '💬 Contactar vendedor'}
                </button>
              )}
            </div>
          )}

          {isOwner && (
            <div className="pd-owner-actions">
              <button className="btn btn-secondary" onClick={() => navigate(`/edit-product/${product.id}`)}>
                ✏️ Editar producto
              </button>
            </div>
          )}

          {!isOwner && (
            <button className="pd-report-link" onClick={() => setShowReport(true)}>
              🚩 Reportar este producto
            </button>
          )}
        </div>
      </div>

      {/* ── Sección de Reseñas ────────────────────────────────────────────── */}
      <div className="pd-reviews">
        <div className="pd-reviews-header">
          <h2>Reseñas de este producto</h2>
          {reviews.length > 0 && reviewsAvg !== null && (
            <div className="pd-reviews-avg">
              <Stars rating={reviewsAvg} />
              <span className="pd-avg-num">{reviewsAvg.toFixed(1)}</span>
              <span className="pd-avg-total">({reviews.length} reseña{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}
          {reviews.length > 0 && reviewsAvg === null && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {reviews.length} reseña{reviews.length !== 1 ? 's' : ''} · promedio visible desde 20 calificaciones
            </span>
          )}
        </div>

        {/* Lista de reseñas */}
        {reviews.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
            Aún no hay reseñas para este producto. ¡Sé el primero!
          </p>
        ) : (
          <div className="pd-reviews-grid">
            {reviews.map(r => (
              <div key={r.id} className="pd-review-card">
                <div className="pd-review-top">
                  <div className="pd-review-avatar">
                    {(r.buyer?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="pd-review-name">{r.buyer?.name || 'Comprador'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Stars rating={r.rating} />
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {r.createdAt ? formatDate(r.createdAt) : ''}
                      </span>
                    </div>
                  </div>
                  <span className="pd-review-rating">{r.rating}/5</span>
                </div>
                {r.comment && <p className="pd-review-comment">{r.comment}</p>}
                {/* Marca si es la reseña del usuario actual */}
                {r.buyerId === user?.id && (
                  <span style={{ fontSize: 11, color: '#2C5FA8', fontWeight: 600 }}>← Tu reseña</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulario de reseña */}
        {!isAuthenticated && (
          <div className="pd-review-cta">
            <p>¿Compraste este producto?{' '}
              <span className="pd-link" onClick={() => navigate('/login')}>Inicia sesión</span>{' '}
              para dejar tu reseña.
            </p>
          </div>
        )}

        {isAuthenticated && isOwner && (
          <div className="pd-review-cta">
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              No puedes reseñar tus propios productos.
            </p>
          </div>
        )}

        {alreadyReviewed && (
          <div className="pd-review-cta">
            <p style={{ color: '#1A7A3A', fontSize: 13 }}>✅ Ya dejaste tu reseña para este producto.</p>
          </div>
        )}

        {/* Comprador autenticado pero sin compra completada */}
        {isAuthenticated && !isOwner && !alreadyReviewed && !hasCompletedPurchase && (
          <div className="pd-review-cta">
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              🔒 Para dejar una reseña necesitas haber comprado este producto y que
              tanto tú como el vendedor hayan confirmado la entrega
              (estado <strong>Completado</strong> en{' '}
              <span className="pd-link" onClick={() => navigate('/my-orders')}>Mis Compras</span>).
            </p>
          </div>
        )}

        {canReview && (
          <ReviewForm
            productId={id}
            onSubmitted={loadAll}
          />
        )}
      </div>

      {showReport && (
        <ReportModal
          target="product"
          targetId={product.id}
          onClose={() => setShowReport(false)}
        />
      )}
      {showUserReport && (
        <ReportModal
          target="user"
          targetId={product.sellerId}
          onClose={() => setShowUserReport(false)}
        />
      )}
    </div>
  );
};

export default ProductDetail;
