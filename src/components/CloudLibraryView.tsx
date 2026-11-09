import React, { useState } from 'react';

type ImportedItem = { name: string; type: string; size: number; preview?: string };
const MAX_BYTES = 20 * 1024 * 1024;
const SUPPORTED = ['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/markdown'];
export function CloudLibraryView() {
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [error, setError] = useState('');
  const importFiles = (files: FileList | null) => {
    if (!files) return;
    setError('');
    const accepted: ImportedItem[] = [];
    for (const file of Array.from(files)) {
      if (!SUPPORTED.includes(file.type) || file.size > MAX_BYTES) {
        setError('Pominięto nieobsługiwany plik lub plik powyżej 20 MB.');
        continue;
      }
      accepted.push({ name: file.name, type: file.type, size: file.size });
    }
    setItems(previous => [...previous, ...accepted]);
  };
  return <section className="flex-1 space-y-5 overflow-auto p-4 text-slate-100">
    <header><h1 className="text-xl font-semibold text-cyan-200">Zdjęcia i notatki</h1>
      <p className="mt-2 text-sm text-slate-400">Bezpieczny import wybranych plików. Żadne dane nie są automatycznie wysyłane agentom AI ani na serwer.</p></header>
    <div className="grid gap-4 md:grid-cols-2">
      <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h2 className="font-semibold">Google Zdjęcia</h2>
        <p className="my-3 text-sm text-slate-400">Wybierz zdjęcia w Google Photos, pobierz je na urządzenie i zaimportuj poniżej. Bezpośredni Google Photos Picker wymaga konfiguracji OAuth po stronie serwera.</p>
        <a className="text-cyan-300 underline" href="https://photos.google.com/" target="_blank" rel="noopener noreferrer">Otwórz Google Zdjęcia</a>
      </article>
      <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h2 className="font-semibold">Samsung Notes</h2>
        <p className="my-3 text-sm text-slate-400">W Samsung Notes użyj Udostępnij / Zapisz jako plik (PDF lub TXT), a następnie wybierz plik poniżej. Automatyczna synchronizacja nie jest jeszcze dostępna.</p>
      </article>
    </div>
    <label className="block cursor-pointer rounded-xl border border-dashed border-cyan-500/50 p-5 text-center text-cyan-200">
      Wybierz zdjęcia lub eksportowane notatki
      <input className="mt-3 block w-full text-xs" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,.md" onChange={e => { importFiles(e.target.files); e.target.value=''; }} />
    </label>
    {error && <p role="alert" className="text-amber-300">{error}</p>}
    <p className="text-xs text-slate-400">Lista ma charakter lokalny i tymczasowy; pliki nie są przechowywane ani synchronizowane. Nie oznacza to połączenia z kontem Google lub Samsung.</p>
    <ul className="space-y-2">{items.map((item,i)=><li key={i} className="flex justify-between gap-3 rounded-lg bg-slate-900 p-3 text-sm"><span className="break-all">{item.name}</span><span className="shrink-0 text-slate-400">{(item.size/1024).toFixed(0)} KB</span></li>)}</ul>
    {items.length>0 && <button className="rounded-lg border border-slate-600 px-4 py-2 text-sm" onClick={()=>setItems([])}>Wyczyść listę</button>}
  </section>;
}
