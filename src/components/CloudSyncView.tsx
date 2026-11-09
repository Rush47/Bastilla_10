import React, { useMemo, useState } from 'react';
import { Image, FileText, ShieldCheck } from 'lucide-react';

type Item = { name: string; type: 'photo' | 'note'; size: number; preview?: string };
const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/markdown', 'application/pdf']);
export const CloudSyncView: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState('');
  const photos = useMemo(() => items.filter(item => item.type === 'photo'), [items]);
  const notes = useMemo(() => items.filter(item => item.type === 'note'), [items]);
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted: Item[] = [];
    let rejected = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.toLowerCase().split('.').pop();
      const type = file.type || (ext === 'md' ? 'text/markdown' : '');
      if (!ALLOWED.has(type) || file.size > MAX_SIZE || file.size === 0) { rejected++; continue; }
      accepted.push({ name: file.name, type: type.startsWith('image/') ? 'photo' : 'note', size: file.size });
    }
    setItems(prev => [...prev, ...accepted].slice(0, 100));
    setMessage(`Zaimportowano metadane: ${accepted.length}. Odrzucono: ${rejected}. Pliki nie są wysyłane na serwer.`);
  };
  return (
    <section className="flex-1 space-y-5 overflow-y-auto p-4 text-slate-100 lg:p-8">
      <header><h1 className="text-xl font-semibold text-cyan-200">Bastilla Cloud Sync</h1>
        <p className="mt-2 text-sm text-slate-400">Zdjęcia Google i Samsung Notes — lokalny import, bez dostępu do kont i bez automatycznej synchronizacji.</p></header>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <Image className="mb-3 text-cyan-300" aria-hidden="true" />
          <h2 className="font-semibold">Zdjęcia Google</h2>
          <p className="my-3 text-sm text-slate-400">Wybierz zdjęcia pobrane z Google Photos. Obsługiwane: JPG, PNG, WebP.</p>
          <label className="inline-block cursor-pointer rounded-lg bg-cyan-800 px-4 py-2 text-sm hover:bg-cyan-700">Wybierz zdjęcia
            <input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
          </label>
          <p className="mt-3 text-xs text-slate-500">Wybrane zdjęcia: {photos.length}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <FileText className="mb-3 text-cyan-300" aria-hidden="true" />
          <h2 className="font-semibold">Samsung Notes</h2>
          <p className="my-3 text-sm text-slate-400">Eksportuj notatkę w aplikacji Samsung Notes jako PDF lub tekst, a następnie wybierz plik.</p>
          <label className="inline-block cursor-pointer rounded-lg bg-cyan-800 px-4 py-2 text-sm hover:bg-cyan-700">Wybierz notatki
            <input className="sr-only" type="file" multiple accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
          </label>
          <p className="mt-3 text-xs text-slate-500">Wybrane notatki: {notes.length}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <div className="flex items-center gap-2 text-sm text-cyan-200"><ShieldCheck size={18} /> Prywatność</div>
        <p className="mt-2 text-xs text-slate-400">Ten etap zapisuje tylko nazwy i rozmiary w pamięci bieżącej karty. Nie przechowuje treści, nie przesyła plików i nie udostępnia ich agentom AI. Limit: 20 MB na plik, 100 pozycji.</p>
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
        {items.length > 0 && <><ul className="mt-3 max-h-52 space-y-1 overflow-auto text-xs">{items.map((item, i) => <li key={i} className="truncate">{item.type === 'photo' ? '📷' : '📝'} {item.name} ({Math.ceil(item.size / 1024)} KB)</li>)}</ul>
          <button className="mt-3 rounded-lg border border-slate-600 px-3 py-2 text-xs" onClick={() => { setItems([]); setMessage('Wyczyszczono listę.'); }}>Wyczyść listę</button></>}
      </div>
    </section>
  );
};
