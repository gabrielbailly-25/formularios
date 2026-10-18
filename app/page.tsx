'use client';
import { useEffect, useMemo, useState } from 'react';
import { GleraForm, Question, QuestionType, uid } from '../lib/types';
import { listForms, saveForm, deleteForm, listResponses } from '../lib/store';
import { adminPassword } from '../lib/firebase';
import { pushSupported, pushPermission, enableAdminPush, listenForegroundPush, clearAppBadge } from '../lib/push';
import RichTextEditor from '../components/RichTextEditor';
import { GLERA_LOGO } from '../lib/logo';

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'yesno', label: 'Sí / No' },
  { value: 'radio', label: 'Una opción' },
  { value: 'checkbox', label: 'Varias opciones' },
  { value: 'select', label: 'Desplegable' },
];

function emptyForm(): GleraForm {
  return {
    id: uid(),
    title: '',
    headerImage: '',
    descriptionHtml: '',
    questions: [],
    status: 'open',
    createdAt: Date.now(),
    planDate: '',
    planPlace: '',
  };
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [passError, setPassError] = useState('');
  const [forms, setForms] = useState<GleraForm[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; si: number; no: number }>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GleraForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  const [loadError, setLoadError] = useState('');
  const [pushState, setPushState] = useState<'unknown' | 'off' | 'on' | 'working' | 'unsupported'>('unknown');
  const [pushMsg, setPushMsg] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('glera_admin_auth') === '1') setAuthed(true);
  }, []);

  // Al entrar el admin: limpia la insignia y prepara notificaciones
  useEffect(() => {
    if (!authed) return;
    clearAppBadge();
    const perm = pushPermission();
    if (perm === 'granted') setPushState('on');
    else if (perm === 'unsupported') setPushState('unsupported');
    else setPushState('off');
    const stop = listenForegroundPush(() => { refresh(); });
    return stop;
  }, [authed]);

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      const list = await listForms();
      setForms(list);
      const c: Record<string, { total: number; si: number; no: number }> = {};
      for (const f of list) {
        const res = await listResponses(f.id);
        c[f.id] = { total: res.length, si: res.filter(r => r.attends === 'si').length, no: res.filter(r => r.attends === 'no').length };
      }
      setCounts(c);
    } catch (e: any) {
      console.error(e);
      setLoadError('No se pudieron cargar los datos: ' + (e?.message || 'error de conexión') + '. Revisa las reglas y el índice de Firestore.');
    }
    setLoading(false);
  }

  useEffect(() => { if (authed) refresh(); }, [authed]);

  const totalResp = useMemo(() => Object.values(counts).reduce((a, b) => a + b.total, 0), [counts]);
  const totalSi = useMemo(() => Object.values(counts).reduce((a, b) => a + b.si, 0), [counts]);

  function login(e: React.FormEvent) {
    e.preventDefault();
    if (pass === adminPassword()) {
      sessionStorage.setItem('glera_admin_auth', '1');
      setAuthed(true);
    } else {
      setPassError('Contraseña incorrecta. Prueba de nuevo.');
    }
  }

  function handleImageFile(file: File | undefined) {
    if (!file || !editing) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Comprime a máx 1200px para que quepa en Firestore / sea ligera
        const max = 1200;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setEditing({ ...editing, headerImage: dataUrl });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function addQuestion() {
    if (!editing) return;
    const q: Question = { id: uid(), label: '', type: 'text', required: false, options: ['Opción 1', 'Opción 2'] };
    setEditing({ ...editing, questions: [...editing.questions, q] });
  }
  function updateQuestion(id: string, patch: Partial<Question>) {
    if (!editing) return;
    setEditing({ ...editing, questions: editing.questions.map(q => q.id === id ? { ...q, ...patch } : q) });
  }
  function removeQuestion(id: string) {
    if (!editing) return;
    setEditing({ ...editing, questions: editing.questions.filter(q => q.id !== id) });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.title.trim()) { alert('Pon un título al formulario.'); return; }
    setSaving(true);
    await saveForm({ ...editing, title: editing.title.trim() });
    setSaving(false);
    setEditing(null);
    await refresh();
  }

  async function handleDuplicate(f: GleraForm) {
    const copy: GleraForm = { ...f, id: uid(), title: f.title + ' (copia)', createdAt: Date.now(), status: 'open' };
    await saveForm(copy);
    await refresh();
  }
  async function toggleStatus(f: GleraForm) {
    await saveForm({ ...f, status: f.status === 'open' ? 'closed' : 'open' });
    await refresh();
  }
  async function handleDelete(f: GleraForm) {
    if (!confirm(`¿Borrar “${f.title}” y todas sus respuestas?`)) return;
    await deleteForm(f.id);
    await refresh();
  }

  function publicUrl(id: string) {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/f/${id}`;
  }
  function copyLink(id: string) {
    navigator.clipboard.writeText(publicUrl(id)).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000); });
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 480, margin: '60px auto', padding: 20 }}>
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <img src={GLERA_LOGO} alt="Asociación Juvenil Glera" style={{ height: 56, width: 'auto' }} />
          <h1 style={{ margin: '8px 0 4px' }}>Glera · Admin</h1>
          <p style={{ color: '#64748b', marginTop: 0 }}>Formularios de planes de fin de semana.<br />Solo el administrador puede entrar aquí.</p>
          <form onSubmit={login} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            <input className="field" type="password" placeholder="Contraseña del admin" value={pass} onChange={e => setPass(e.target.value)} autoFocus />
            {passError && <div style={{ color: '#b91c1c', fontSize: 14 }}>{passError}</div>}
            <button className="btn btn-primary" type="submit">Entrar</button>
          </form>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Las familias no necesitan contraseña: abren el enlace del formulario desde WhatsApp.</p>
        </div>
      </main>
    );
  }

  if (editing) {
    return (
      <main style={{ maxWidth: 820, margin: '0 auto', padding: 20 }}>
        <button className="btn btn-ghost" onClick={() => setEditing(null)}>← Volver</button>
        <h1 style={{ fontSize: 26 }}>{editing.createdAt && forms.some(f => f.id === editing.id) ? 'Editar formulario' : 'Nuevo formulario'}</h1>
        <form onSubmit={handleSave} style={{ display: 'grid', gap: 18 }}>
          <div className="card" style={{ padding: 20, display: 'grid', gap: 14 }}>
            <div>
              <label className="label">Título *</label>
              <input className="field" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Ej. Excursión al parque del Ebro — sábado 25" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Fecha / día del plan</label>
                <input className="field" value={editing.planDate || ''} onChange={e => setEditing({ ...editing, planDate: e.target.value })} placeholder="Ej. Sábado 25 de octubre, 18:00–20:30" />
              </div>
              <div>
                <label className="label">Lugar</label>
                <input className="field" value={editing.planPlace || ''} onChange={e => setEditing({ ...editing, planPlace: e.target.value })} placeholder="Ej. Parque del Ebro" />
              </div>
            </div>
            <div>
              <label className="label">Imagen de cabecera</label>
              {editing.headerImage && <img src={editing.headerImage} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 10 }} />}
              <input type="file" accept="image/*" onChange={e => handleImageFile(e.target.files?.[0])} />
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>O pega una URL de imagen:</div>
              <input className="field" style={{ marginTop: 6 }} value={editing.headerImage.startsWith('data:') ? '' : editing.headerImage} onChange={e => setEditing({ ...editing, headerImage: e.target.value })} placeholder="https://…" />
              {editing.headerImage && <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => setEditing({ ...editing, headerImage: '' })}>Quitar imagen</button>}
            </div>
            <div>
              <label className="label">Datos del plan (editable con estilos)</label>
              <RichTextEditor value={editing.descriptionHtml} onChange={html => setEditing({ ...editing, descriptionHtml: html })} />
              <p style={{ fontSize: 13, color: '#64748b' }}>Aquí va lo que verán las familias: día, hora, lugar, qué llevar, precio, etc. Puedes poner negrita, colores, listas y enlaces.</p>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Preguntas</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 0 }}>Todos los formularios ya incluyen: nombre del hijo, apellidos, ¿se apunta? y observaciones. Aquí añade las preguntas extra que necesites.</p>
            {editing.questions.map((q, i) => (
              <div key={q.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Pregunta {i + 1}</strong>
                  <button type="button" className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => removeQuestion(q.id)}>Eliminar</button>
                </div>
                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  <input className="field" value={q.label} onChange={e => updateQuestion(q.id, { label: e.target.value })} placeholder="Ej. ¿Necesita transporte? ¿Alergias?" />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select className="field" style={{ maxWidth: 220 }} value={q.type} onChange={e => updateQuestion(q.id, { type: e.target.value as QuestionType })}>
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
                      <input type="checkbox" checked={q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} /> Obligatoria
                    </label>
                  </div>
                  {(q.type === 'radio' || q.type === 'checkbox' || q.type === 'select') && (
                    <div>
                      <div className="label">Opciones</div>
                      {q.options.map((opt, oi) => (
                        <div key={oi} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <input className="field" value={opt} onChange={e => {
                            const next = [...q.options]; next[oi] = e.target.value; updateQuestion(q.id, { options: next });
                          }} />
                          <button type="button" className="btn btn-ghost" onClick={() => updateQuestion(q.id, { options: q.options.filter((_, j) => j !== oi) })}>✕</button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-ghost" onClick={() => updateQuestion(q.id, { options: [...q.options, `Opción ${q.options.length + 1}`] })}>+ Añadir opción</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={addQuestion}>+ Añadir pregunta</button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar formulario'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={GLERA_LOGO} alt="Asociación Juvenil Glera" style={{ height: 30, width: 'auto', flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: 20, whiteSpace: 'nowrap' }}>Glera · Formularios</h1>
          </div>
          <p style={{ color: '#64748b', margin: '8px 0 0', fontSize: 14 }}>Planes de fin de semana — crea, comparte por WhatsApp y ve quién se apunta.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pushState === 'off' && (
            <button className="btn btn-ghost" onClick={async () => {
              setPushState('working'); setPushMsg('');
              try {
                await enableAdminPush();
                setPushState('on');
                setPushMsg('Notificaciones activadas: te avisaremos por cada respuesta. ✓');
              } catch (e: any) {
                setPushState('off');
                setPushMsg(e?.message || 'No se pudieron activar.');
              }
            }}>🔔 Activar notificaciones</button>
          )}
          {pushState === 'on' && (
            <span className="btn btn-ghost" style={{ cursor: 'default' }} title="Recibirás un aviso en este dispositivo por cada familia que rellene un formulario">🔔 Activadas</span>
          )}
          {pushState === 'working' && <span style={{ alignSelf: 'center', color: '#64748b', fontSize: 14 }}>Activando…</span>}
          <button className="btn btn-primary" onClick={() => setEditing(emptyForm())}>+ Nuevo formulario</button>
          <button className="btn btn-ghost" onClick={() => { sessionStorage.removeItem('glera_admin_auth'); setAuthed(false); }}>Salir</button>
        </div>
      </header>
      {pushMsg && <p style={{ fontSize: 13, color: pushState === 'on' ? '#0f766e' : '#b91c1c', margin: '8px 0 0' }}>{pushMsg}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, margin: '20px 0' }}>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 28, fontWeight: 800 }}>{forms.length}</div><div style={{ color: '#64748b', fontSize: 14 }}>Formularios</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 28, fontWeight: 800 }}>{totalResp}</div><div style={{ color: '#64748b', fontSize: 14 }}>Respuestas totales</div></div>
        <div className="card" style={{ padding: 16 }}><div style={{ fontSize: 28, fontWeight: 800, color: '#0d9488' }}>{totalSi}</div><div style={{ color: '#64748b', fontSize: 14 }}>Apuntados en total</div></div>
      </div>

      {loading ? <p>Cargando…</p> : loadError ? (
        <div className="card" style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>⚠️ {loadError}</div>
      ) : forms.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>📋</div>
          <h2>Aún no hay formularios</h2>
          <p style={{ color: '#64748b' }}>Crea el primero para el próximo plan de fin de semana y compártelo en el grupo de WhatsApp.</p>
          <button className="btn btn-primary" onClick={() => setEditing(emptyForm())}>+ Crear primer formulario</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {forms.map(f => {
            const c = counts[f.id] || { total: 0, si: 0, no: 0 };
            return (
              <article key={f.id} className="card" style={{ overflow: 'hidden' }}>
                {f.headerImage && <img src={f.headerImage} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', display: 'block' }} />}
                <div style={{ padding: '14px 18px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{f.title}</h2>
                    <span className={`badge ${f.status === 'open' ? 'badge-open' : 'badge-closed'}`}>{f.status === 'open' ? 'Abierto' : 'Cerrado'}</span>
                  </div>
                  {(f.planDate || f.planPlace) && (
                    <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>{f.planDate}{f.planDate && f.planPlace ? ' · ' : ''}{f.planPlace}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="stat"><strong>{c.total}</strong> respuestas</span>
                    <span className="stat stat-ok"><strong>{c.si}</strong> se apuntan</span>
                    <span className="stat stat-ko"><strong>{c.no}</strong> no se apuntan</span>
                  </div>
                </div>
                <div className="actions-bar">
                  <a href={`/admin/${f.id}`} className="btn btn-primary btn-xs" style={{ textDecoration: 'none' }}>Ver respuestas</a>
                  <a href={`/f/${f.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs" style={{ textDecoration: 'none' }} title="Abrir la vista que ven las familias">Vista familia ↗</a>
                  <button className="btn btn-ghost btn-xs" onClick={() => copyLink(f.id)} title="Copiar el enlace público del formulario">{copied === f.id ? '¡Copiado!' : 'Copiar enlace'}</button>
                  <span className="actions-sep" />
                  <button className="btn btn-ghost btn-xs" onClick={() => setEditing(f)}>Editar</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => handleDuplicate(f)}>Duplicar</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => toggleStatus(f)}>{f.status === 'open' ? 'Cerrar' : 'Reabrir'}</button>
                  <button className="btn btn-danger btn-xs" onClick={() => handleDelete(f)}>Borrar</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
