'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { GleraForm, GleraResponse } from '../../../lib/types';
import { getForm, listResponses, deleteResponse, deleteForm } from '../../../lib/store';
import { adminPassword } from '../../../lib/firebase';
import { GLERA_LOGO } from '../../../lib/logo';

function csvEscape(v: any): string {
  const s = String(v ?? '');
  if (/[;"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export default function AdminDetail() {
  const params = useParams();
  const id = String(params?.id || '');
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [form, setForm] = useState<GleraForm | null>(null);
  const [responses, setResponses] = useState<GleraResponse[]>([]);
  const [filter, setFilter] = useState<'all' | 'si' | 'no'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem('glera_admin_auth') === '1') setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed || !id) return;
    (async () => {
      setLoading(true);
      const f = await getForm(id);
      setForm(f);
      setResponses(await listResponses(id));
      setLoading(false);
    })();
  }, [authed, id]);

  const filtered = useMemo(() => {
    return responses.filter(r => {
      if (filter !== 'all' && r.attends !== filter) return false;
      if (search && !(`${r.childName} ${r.childSurname}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [responses, filter, search]);

  const si = responses.filter(r => r.attends === 'si').length;
  const no = responses.filter(r => r.attends === 'no').length;

  function exportCSV() {
    if (!form) return;
    const qHeaders = form.questions.map(q => q.label);
    const header = ['Fecha', 'Nombre', 'Apellidos', 'Se apunta', 'Observaciones', ...qHeaders];
    const rows = filtered.map(r => [
      new Date(r.createdAt).toLocaleString('es-ES'),
      r.childName, r.childSurname, r.attends === 'si' ? 'Sí' : 'No', r.observation,
      ...form.questions.map(q => {
        const v = r.answers[q.id];
        if (Array.isArray(v)) return v.join(', ');
        return v ?? '';
      }),
    ]);
    const csv = [header, ...rows].map(row => row.map(csvEscape).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title.replace(/[^a-z0-9]+/gi, '-')}-respuestas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteResp(r: GleraResponse) {
    if (!confirm(`¿Borrar la respuesta de ${r.childName} ${r.childSurname}?`)) return;
    await deleteResponse(r.id);
    setResponses(prev => prev.filter(x => x.id !== r.id));
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 440, margin: '60px auto', padding: 20 }}>
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <img src={GLERA_LOGO} alt="Asociación Juvenil Glera" style={{ height: 56, width: 'auto', marginBottom: 8 }} />
          <h1>Admin · Glera</h1>
          <form onSubmit={e => { e.preventDefault(); if (pass === adminPassword()) { sessionStorage.setItem('glera_admin_auth', '1'); setAuthed(true); } else alert('Contraseña incorrecta'); }} style={{ display: 'grid', gap: 12 }}>
            <input className="field" type="password" placeholder="Contraseña del admin" value={pass} onChange={e => setPass(e.target.value)} autoFocus />
            <button className="btn btn-primary">Entrar</button>
          </form>
        </div>
      </main>
    );
  }

  if (loading) return <main style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>Cargando…</main>;
  if (!form) return <main style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}><p>Formulario no encontrado.</p><a href="/">← Volver</a></main>;

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <a href="/" style={{ textDecoration: 'none' }}>← Todos los formularios</a>
      {form.headerImage && <img src={form.headerImage} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 16, marginTop: 14 }} />}
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>{form.title}</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>{form.planDate}{form.planDate && form.planPlace ? ' · ' : ''}{form.planPlace}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, margin: '18px 0' }}>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 28, fontWeight: 800 }}>{responses.length}</div><div style={{ color: '#64748b' }}>Han rellenado</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 28, fontWeight: 800, color: '#0d9488' }}>{si} ✅</div><div style={{ color: '#64748b' }}>Se apuntan</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 28, fontWeight: 800, color: '#b91c1c' }}>{no}</div><div style={{ color: '#64748b' }}>No se apuntan</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 28, fontWeight: 800 }}>{responses.length ? Math.round((si / responses.length) * 100) : 0}%</div><div style={{ color: '#64748b' }}>Se apuntan</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button className="btn btn-ghost" onClick={() => setFilter('all')} style={{ background: filter === 'all' ? '#0d9488' : undefined, color: filter === 'all' ? '#fff' : undefined }}>Todos ({responses.length})</button>
        <button className="btn btn-ghost" onClick={() => setFilter('si')} style={{ background: filter === 'si' ? '#0d9488' : undefined, color: filter === 'si' ? '#fff' : undefined }}>Se apuntan ({si})</button>
        <button className="btn btn-ghost" onClick={() => setFilter('no')} style={{ background: filter === 'no' ? '#0d9488' : undefined, color: filter === 'no' ? '#fff' : undefined }}>No se apuntan ({no})</button>
        <input className="field" style={{ maxWidth: 280 }} placeholder="Buscar por nombre…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={exportCSV}>⬇ Exportar CSV</button>
        <a href={`/f/${form.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ textDecoration: 'none' }}>Ver formulario ↗</a>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Aún no hay respuestas con este filtro. Comparte el formulario por WhatsApp desde la página principal.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Hijo</th>
                <th style={{ padding: 12 }}>Se apunta</th>
                <th style={{ padding: 12 }}>Observaciones</th>
                {form.questions.map(q => <th key={q.id} style={{ padding: 12 }}>{q.label}</th>)}
                <th style={{ padding: 12 }}>Fecha</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.childName} {r.childSurname}</td>
                  <td style={{ padding: 12 }}>{r.attends === 'si' ? '✅ Sí' : '❌ No'}</td>
                  <td style={{ padding: 12, maxWidth: 220 }}>{r.observation || '—'}</td>
                  {form.questions.map(q => {
                    const v = r.answers[q.id];
                    return <td key={q.id} style={{ padding: 12 }}>{Array.isArray(v) ? v.join(', ') : (v ?? '—')}</td>;
                  })}
                  <td style={{ padding: 12, fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: 12 }}><button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => handleDeleteResp(r)}>Borrar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
