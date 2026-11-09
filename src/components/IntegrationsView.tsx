import React from 'react';

type Service = { name: string; status: 'potwierdzone' | 'wymaga konfiguracji' | 'dostępne opcjonalnie'; details: string; url?: string };
const services: Service[] = [
  { name:'GitHub (ChatGPT)', status:'potwierdzone', details:'Połączenie ChatGPT z repozytorium BastillaOS zostało zweryfikowane. Nie oznacza to automatycznego połączenia kont w BastillaOS.' },
  { name:'Ollama (BastillaOS)', status:'wymaga konfiguracji', details:'Aplikacja zawiera obsługę lokalnych modeli; stan działającego serwera należy sprawdzić w diagnostyce.' },
  { name:'Google AI Studio / Gemini', status:'wymaga konfiguracji', details:'Projekt ma komponenty Gemini; połączenie produkcyjne i klucze należy zweryfikować na serwerze.' },
  { name:'ChatGPT / OpenAI API', status:'wymaga konfiguracji', details:'Wymaga osobnej konfiguracji API lub MCP. Subskrypcja ChatGPT nie zapewnia automatycznie kredytów API.' },
  { name:'Google Zdjęcia', status:'wymaga konfiguracji', details:'Import ręczny jest dostępny w module Zdjęcia i notatki. Bezpośredni Picker wymaga OAuth i backendu.', url:'https://photos.google.com/' },
  { name:'Samsung Notes', status:'wymaga konfiguracji', details:'Obsługiwany jest wybór wyeksportowanych plików PDF/TXT. Brak potwierdzonego publicznego API synchronizacji.' },
  { name:'Google Drive / Dokumenty / Arkusze / Prezentacje', status:'dostępne opcjonalnie', details:'Dostępny konektor ChatGPT, wymaga osobnego podłączenia; BastillaOS wymaga własnej integracji.', url:'https://chatgpt.com/plugins' },
  { name:'Gmail', status:'dostępne opcjonalnie', details:'Konektor ChatGPT dostępny do podłączenia.', url:'https://chatgpt.com/plugins' },
  { name:'Google Calendar', status:'dostępne opcjonalnie', details:'Konektor ChatGPT dostępny do podłączenia.', url:'https://chatgpt.com/plugins' },
  { name:'Google Contacts', status:'dostępne opcjonalnie', details:'Konektor ChatGPT dostępny do podłączenia.', url:'https://chatgpt.com/plugins' },
  { name:'Outlook Calendar / iCloud Calendar', status:'dostępne opcjonalnie', details:'Konektory dostępne w katalogu ChatGPT.', url:'https://chatgpt.com/plugins' },
  { name:'Todoist / TickTick', status:'dostępne opcjonalnie', details:'Aplikacje z katalogu ChatGPT do zadań i przypomnień.', url:'https://chatgpt.com/plugins' },
  { name:'Windsor.ai / narzędzia marketingowe', status:'dostępne opcjonalnie', details:'Zewnętrzne źródła danych po osobnym podłączeniu.', url:'https://chatgpt.com/plugins' },
];
export function IntegrationsView({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  return <section className="min-h-0 flex-1 overflow-y-auto bg-[#050b18] p-4 text-slate-100">
    <h1 className="text-xl font-semibold text-cyan-200">Integracje BastillaOS</h1>
    <p className="my-3 text-sm text-slate-400">Katalog możliwości i stanów zweryfikowanych podczas konfiguracji. Połączenia ChatGPT nie są automatycznie połączeniami BastillaOS. Lista możliwych aplikacji nie jest wyczerpująca.</p>
    <button type="button" onClick={onOpenLibrary} className="mb-5 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">Otwórz Zdjęcia i notatki</button>
    <div className="grid gap-3 md:grid-cols-2">
      {services.map(service => <article key={service.name} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{service.name}</h2>
          <span className="rounded bg-slate-800 px-2 py-1 text-xs text-cyan-200">{service.status}</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">{service.details}</p>
        {service.url && <a href={service.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-cyan-300 underline">Otwórz usługę</a>}
      </article>)}
    </div>
    <p className="mt-5 text-xs text-slate-500">Żadne konto nie jest autoryzowane przez samo otwarcie tej zakładki. Uprawnienia OAuth należy nadawać w oficjalnym oknie dostawcy.</p>
  </section>;
}
