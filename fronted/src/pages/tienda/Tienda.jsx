import React, { useState } from 'react';
import toast from 'react-hot-toast';
import './Tienda.css';

const PAQUETES = [
  {
    id: 1,
    nombre: 'Arranque',
    icono: '💰',
    fichas: 5000,
    precio: 0.99,
    badge: null,
    color: '#4caf50',
  },
  {
    id: 2,
    nombre: 'Jugador',
    icono: '💎',
    fichas: 15000,
    precio: 2.49,
    badge: '+20% EXTRA',
    color: '#2196f3',
  },
  {
    id: 3,
    nombre: 'Pro',
    icono: '🏆',
    fichas: 40000,
    precio: 4.99,
    badge: '+35% EXTRA',
    color: '#ff9800',
  },
  {
    id: 4,
    nombre: 'Elite',
    icono: '👑',
    fichas: 100000,
    precio: 9.99,
    badge: 'MÁS POPULAR',
    color: '#9c27b0',
  },
  {
    id: 5,
    nombre: 'Leyenda',
    icono: '🌟',
    fichas: 300000,
    precio: 24.99,
    badge: 'MEJOR VALOR',
    color: '#daa520',
  },
  {
    id: 6,
    nombre: 'Rey',
    icono: '🎰',
    fichas: 1000000,
    precio: 74.99,
    badge: '2x FICHAS',
    color: '#e91e63',
  },
];

function Tienda({ user, onNavigate, onUpdateUser }) {
  const [comprando, setComprando] = useState(null);

  const handleComprar = async (paquete) => {
    setComprando(paquete.id);

    // Simulación de procesamiento de pago (aquí iría la integración real)
    await new Promise((res) => setTimeout(res, 1200));

    const nuevasFichas = Number(user?.chips || 0) + paquete.fichas;
    const usuarioActualizado = { ...user, chips: nuevasFichas };

    onUpdateUser(usuarioActualizado);

    toast.success(
      `🎉 ¡Compraste ${paquete.fichas.toLocaleString()} PK! Saldo: ${nuevasFichas.toLocaleString()} PK`,
      { duration: 4000 }
    );

    setComprando(null);
  };

  return (
    <div className="tienda-page">
      {/* Header */}
      <div className="tienda-header">
        <button className="btn-back" onClick={() => onNavigate('inicio')}>
          ← Volver
        </button>
        <div className="tienda-titulo">
          <h1>🛒 Tienda de Fichas</h1>
          <p className="tienda-subtitulo">Compra fichas PK con dinero ficticio</p>
        </div>
        <div className="saldo-actual">
          <span className="saldo-label">Tu saldo</span>
          <span className="saldo-valor">🪙 {Number(user?.chips || 0).toLocaleString()} PK</span>
        </div>
      </div>

      {/* Aviso fichas gratis diarias */}
      <div className="aviso-gratis">
        <span>🎁 ¿Te quedaste sin fichas?</span>
        <strong> Cada 24h recibes 1.000 PK gratis</strong> al iniciar sesión.
      </div>

      {/* Grid de paquetes */}
      <div className="paquetes-grid">
        {PAQUETES.map((paquete) => (
          <div
            key={paquete.id}
            className={`paquete-card ${paquete.badge === 'MÁS POPULAR' ? 'popular' : ''}`}
            style={{ '--card-color': paquete.color }}
          >
            {paquete.badge && (
              <div className="paquete-badge">{paquete.badge}</div>
            )}

            <div className="paquete-icono">{paquete.icono}</div>
            <div className="paquete-nombre">{paquete.nombre}</div>
            <div className="paquete-fichas">
              {paquete.fichas.toLocaleString()}
              <span className="pk-label"> PK</span>
            </div>

            <div className="paquete-precio">
              {paquete.precio.toFixed(2)}€
              <span className="moneda"> Euros ficticio</span>
            </div>

            <button
              className="btn-comprar"
              onClick={() => handleComprar(paquete)}
              disabled={comprando === paquete.id}
            >
              {comprando === paquete.id ? (
                <span className="comprando-spinner">⏳ Procesando...</span>
              ) : (
                '💳 Comprar'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Nota legal */}
      <div className="tienda-nota">
        ⚠️ Las fichas PK son moneda ficticia sin valor real. No se realizan cargos reales.
        Este es un juego de póker con fines de entretenimiento.
      </div>
    </div>
  );
}

export default Tienda;
