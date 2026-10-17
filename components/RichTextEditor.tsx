'use client';
import { useEffect, useRef } from 'react';

export default function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
    // solo al montar / cuando cambia desde fuera por duplicar etc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const btn: React.CSSProperties = {
    border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
  };

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <button type="button" style={btn} onClick={() => exec('bold')} title="Negrita"><b>B</b></button>
        <button type="button" style={btn} onClick={() => exec('italic')} title="Cursiva"><i>I</i></button>
        <button type="button" style={btn} onClick={() => exec('underline')} title="Subrayado"><u>U</u></button>
        <button type="button" style={btn} onClick={() => exec('insertUnorderedList')} title="Lista con puntos">• Lista</button>
        <button type="button" style={btn} onClick={() => exec('insertOrderedList')} title="Lista numerada">1. Lista</button>
        <button type="button" style={btn} onClick={() => exec('justifyLeft')} title="Alinear izquierda">⬅</button>
        <button type="button" style={btn} onClick={() => exec('justifyCenter')} title="Centrar">⬌</button>
        <button type="button" style={btn} onClick={() => exec('justifyRight')} title="Alinear derecha">➡</button>
        <select
          style={{ ...btn, fontWeight: 400 }}
          defaultValue=""
          onChange={(e) => { if (e.target.value) exec('fontSize', e.target.value); e.target.value = ''; }}
        >
          <option value="" disabled>Tamaño</option>
          <option value="2">Pequeño</option>
          <option value="3">Normal</option>
          <option value="4">Mediano</option>
          <option value="5">Grande</option>
          <option value="6">Muy grande</option>
        </select>
        <label style={{ ...btn, fontWeight: 400, display: 'flex', alignItems: 'center', gap: 6 }}>
          Color <input type="color" onChange={(e) => exec('foreColor', e.target.value)} style={{ width: 28, height: 22, border: 'none', padding: 0, cursor: 'pointer' }} />
        </label>
        <label style={{ ...btn, fontWeight: 400, display: 'flex', alignItems: 'center', gap: 6 }}>
          Fondo <input type="color" defaultValue="#fff59d" onChange={(e) => exec('hiliteColor', e.target.value)} style={{ width: 28, height: 22, border: 'none', padding: 0, cursor: 'pointer' }} />
        </label>
        <button type="button" style={btn} onClick={() => {
          const url = prompt('Enlace (https://…)');
          if (url) exec('createLink', url);
        }}>🔗 Enlace</button>
        <button type="button" style={btn} onClick={() => exec('removeFormat')}>Limpiar estilo</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        data-placeholder={placeholder || 'Escribe aquí los datos del plan: día, hora, lugar, qué hay que llevar, precio…'}
        style={{ minHeight: 150, padding: 14, fontSize: 16, lineHeight: 1.6, outline: 'none' }}
      />
      <style>{`[contenteditable][data-placeholder]:empty:before{content:attr(data-placeholder);color:#9ca3af;}`}</style>
    </div>
  );
}
