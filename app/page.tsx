'use client';
import { useEffect, useState } from 'react';
import { GleraForm } from '../lib/types';
import { listForms } from '../lib/store';
import { GLERA_LOGO } from '../lib/logo';

export default function HomePage() {
  const [forms, setForms] = useState<GleraForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const all = await listForms();
        setForms(all.filter(f => f.status === 'open'));
      } catch (e: any) {
        console.error(e);
        setError('No se pudieron cargar los planes. Inténtalo de nuevo en un momento.');
      }
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 620, margin: '0 auto', padding: '28px 16px 48px' }}>
      <header style={{ textAlign: 'center', marginBottom: 26 }}>
        <img src={GLERA_LOGO} alt="Asociación Juvenil Glera" style={{ height: 110, width: 'auto', maxWidth: '90%' }} />
        <h1 style={{ margin: '14px 0 8px', fontSize: 34, lineHeight: 1.15 }}>Formularios Glera</h1>
        <p style={{ color: '#64748b', fontSize: 17, lineHeight: 1.5, margin: '0 0 6px' }}>
          ¡Hola! 👋 Aquí puedes apuntar a tu hijo a los planes de fin de semana de la Asociación Juvenil Glera.
        </p>
        <p style={{ color: '#64748b', fontSize: 17, lineHeight: 1.5, margin: 0 }}>
          Elige el plan y rellena el formulario: tardas un minuto.
        </p>
      </header>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#64748b' }}>Cargando planes…</p>
      ) : error ? (
        <div className="card" style={{ padding: 22, textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>⚠️ {error}</div>
      ) : forms.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>📋</div>
          <h2 style={{ margin: '10px 0 6px' }}>Ahora mismo no hay planes abiertos</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Cuando haya un plan nuevo aparecerá aquí. ¡Vuelve pronto!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {forms.map(f => (
            <a key={f.id} href={`/f/${f.id}`} className="plan-btn" style={{ textDecoration: 'none', color: 'inherit' }}>
              {f.headerImage && <img src={f.headerImage} alt="" style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block' }} />}
              <div style={{ padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</div>
                {(f.kind || 'hijos') === 'familias' && (
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>👨‍👩‍👧 Formulario para familias</div>
                )}
                {f.planDate && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ background: '#f0fdfa', border: '1px solid #99f6e4', color: '#0f766e', borderRadius: 999, padding: '6px 12px', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>📅 {f.planDate}</span>
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <footer style={{ textAlign: 'center', marginTop: 34 }}>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 8px' }}>Asociación Juvenil Glera</p>
        <a href="/admin" style={{ color: '#94a3b8', fontSize: 13 }}>Acceso administración</a>
      </footer>
    </main>
  );
}
