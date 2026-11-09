import React, { useEffect, useState } from 'react';
import { RefreshCw, Copy, Check, Plug, AlertTriangle } from 'lucide-react';

interface Setup {
  publicUrlConfigured: boolean;
  tokenConfigured: boolean;
  providerConfigured: boolean;
  schemaUrl: string | null;
  providers: string[];
  agents: string[];
  readyForExternalTest: boolean;
}

export function GPTActionsView() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const refresh = async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/gpt-actions/setup', { signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Diagnostyka API: HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.agents)) throw new Error('Serwer zwrócił nieprawidłową diagnostykę. Odśwież aplikację po wdrożeniu.');
      setSetup(data);
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Nie można połączyć się z serwerem.');
    } finally { if (!signal?.aborted) setLoading(false); }
  };
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);
  const copy = async () => {
    if (!setup?.schemaUrl) return;
    try { await navigator.clipboard.writeText(setup.schemaUrl); setCopied(true); }
    catch { setError('Nie udało się skopiować. Zaznacz i skopiuj adres poniżej.'); }
  };
  const preview = /^ais-(dev|pre)-.*\.run\.app$/i.test(window.location.hostname);
  return (
    <section className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-cyan-100"><Plug className="h-5 w-5" />Połączenie ChatGPT</h1>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Sprawdź konfigurację</button>
        </header>
        <p className="text-sm leading-relaxed text-slate-300">GPT Actions przekazuje zadania do Arii, Alexa, Astyrii i Aureliusa przez REST API. Agenci mogą analizować zadania i proponować kod.</p>
        {preview && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-sm text-amber-100">To podgląd AI Studio. Jego adres wymaga ciasteczek Google i nie nadaje się do połączenia GPT Actions. Użyj adresu opublikowanej aplikacji.</p>}
        {error && <p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-200">{error}</p>}
        {loading && !setup && <p role="status">Sprawdzanie serwera…</p>}
        {setup && <>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 font-semibold">Konfiguracja serwera</h2>
            <ul className="space-y-3 text-sm">
              {[[setup.publicUrlConfigured, 'Publiczny adres HTTPS'], [setup.tokenConfigured, 'Token API (minimum 32 znaki)'], [setup.providerConfigured, 'Skonfigurowany dostawca AI']].map(([ok, label]) => <li key={String(label)} className="flex items-center gap-2">{ok ? <Check className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />}<span>{label}: <strong>{ok ? 'ustawiono' : 'brak'}</strong></span></li>)}
            </ul>
            <p className="mt-4 text-sm text-slate-300">{setup.readyForExternalTest ? 'Konfiguracja gotowa do testu w edytorze GPT.' : 'Uzupełnij brakujące ustawienia w sekretach serwera i uruchom aplikację ponownie.'}</p>
            <p className="mt-2 text-xs text-slate-400">Ten ekran nie potwierdza połączenia z ChatGPT ani odpowiedzi modelu. Potwierdzi je dopiero udany test Action.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 font-semibold">Dodaj do własnego GPT</h2>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-300">
              <li>Ustaw na serwerze <code>GPT_ACTIONS_PUBLIC_URL</code> na adres opublikowanej aplikacji, bez ścieżki.</li>
              <li>Dodaj losowy <code>GPT_ACTIONS_TOKEN</code> jako sekret serwera. Nie wpisuj go do wiadomości na czacie.</li>
              <li>W edytorze własnego GPT wybierz Actions → Import from URL i wklej adres schematu.</li>
              <li>Wybierz API Key → Bearer i wpisz ten sam token. Następnie przetestuj <code>getBastillaAIStatus</code> i <code>askBastillaAgent</code>.</li>
            </ol>
            {setup.schemaUrl && <div className="mt-4 space-y-2"><label className="block text-xs text-slate-400" htmlFor="actions-schema-url">Adres schematu OpenAPI</label><input id="actions-schema-url" readOnly value={setup.schemaUrl} className="min-h-11 w-full rounded border border-slate-700 bg-slate-950 px-3 text-sm" /><button type="button" onClick={() => void copy()} className="flex min-h-11 items-center gap-2 rounded-lg bg-cyan-900 px-3 text-sm"><Copy className="h-4 w-4" />{copied ? 'Skopiowano' : 'Kopiuj adres'}</button></div>}
          </div>
          <p className="text-sm text-slate-400">Agenci: {setup.agents.join(', ')}. Dostawcy: {setup.providers.join(', ') || 'brak'}. Integracja działa w osobnym własnym GPT i nie dodaje automatycznie narzędzia do wcześniejszych rozmów.</p>
        </>}
      </div>
    </section>
  );
}
