import React, { useState, useEffect, useRef } from 'react';
import {
  connectGooglePhotos,
  disconnectGooglePhotos,
  checkGooglePhotosStatus,
  fetchGooglePhotosList,
  initPhotosAuthListener,
  getInMemoryAccessToken,
  GooglePhotoItem,
  IntegrationStatus
} from '../services/googlePhotosService';
import {
  parseSamsungNoteFile,
  loadSavedSamsungNotes,
  saveSamsungNotes,
  clearSamsungNotes,
  SamsungNoteItem,
  SamsungNotesStatus
} from '../services/samsungNotesService';

interface IntegrationsPhotosNotesSectionProps {
  onInsertIntoTask?: (text: string) => void;
  onSendToChat?: (agent: string, message: string) => void;
}

export const IntegrationsPhotosNotesSection: React.FC<IntegrationsPhotosNotesSectionProps> = ({
  onInsertIntoTask,
  onSendToChat
}) => {
  // --- Google Photos State ---
  const [photosStatus, setPhotosStatus] = useState<IntegrationStatus>('nie skonfigurowano');
  const [photosStatusMsg, setPhotosStatusMsg] = useState<string>('Brak aktywnego połączenia OAuth 2.0.');
  const [photosUserEmail, setPhotosUserEmail] = useState<string | null>(null);
  const [isPhotosLoading, setIsPhotosLoading] = useState<boolean>(false);
  const [photosList, setPhotosList] = useState<GooglePhotoItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GooglePhotoItem | null>(null);

  // --- Samsung Notes State ---
  const [notesStatus, setNotesStatus] = useState<SamsungNotesStatus>('nie skonfigurowano');
  const [notesList, setNotesList] = useState<SamsungNoteItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<SamsungNoteItem | null>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>('');
  const [notesStatusMsg, setNotesStatusMsg] = useState<string>('Brak zaimportowanych notatek.');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize auth listener and saved notes
  useEffect(() => {
    const unsub = initPhotosAuthListener(async (user, token) => {
      if (user && token) {
        setPhotosStatus('połączono');
        setPhotosUserEmail(user.email || null);
        setPhotosStatusMsg(`Autoryzowano jako ${user.email || 'użytkownik Google'}.`);
      } else if (!token && photosStatus === 'połączono') {
        setPhotosStatus('nie skonfigurowano');
        setPhotosUserEmail(null);
        setPhotosStatusMsg('Rozłączono sesję OAuth.');
      }
    });

    const saved = loadSavedSamsungNotes();
    setNotesList(saved);
    if (saved.length > 0) {
      setNotesStatus('połączono');
      setNotesStatusMsg(`Zapisano ${saved.length} notatek w lokalnym magazynie BastillaOS.`);
    } else {
      setNotesStatus('nie skonfigurowano');
      setNotesStatusMsg('Brak zaimportowanych notatek. Gotowy do importu plików PDF/TXT/JSON.');
    }

    return () => unsub();
  }, []);

  // --- Google Photos Actions ---
  const handleConnectPhotos = async () => {
    setIsPhotosLoading(true);
    setPhotosStatus('oczekuje na autoryzację');
    setPhotosStatusMsg('Oczekiwanie na zgodę w oknie Google OAuth 2.0...');
    try {
      const res = await connectGooglePhotos();
      setPhotosStatus('połączono');
      setPhotosUserEmail(res.user.email || null);
      setPhotosStatusMsg(`Pomyślnie połączono z kontem ${res.user.email || ''}.`);
      
      // Auto fetch preview photos
      try {
        const photosRes = await fetchGooglePhotosList(12);
        setPhotosList(photosRes.items || []);
      } catch (err: any) {
        console.warn('Photos fetch note:', err.message);
      }
    } catch (err: any) {
      setPhotosStatus('błąd');
      setPhotosStatusMsg(`Błąd autoryzacji OAuth: ${err.message || 'Anulowano lub odrzucono'}`);
    } finally {
      setIsPhotosLoading(false);
    }
  };

  const handleDisconnectPhotos = async () => {
    setIsPhotosLoading(true);
    try {
      await disconnectGooglePhotos();
      setPhotosStatus('nie skonfigurowano');
      setPhotosUserEmail(null);
      setPhotosList([]);
      setSelectedPhoto(null);
      setPhotosStatusMsg('Rozłączono pomyślnie. Token usunięto z pamięci RAM.');
    } catch (err: any) {
      setPhotosStatusMsg(`Błąd rozłączania: ${err.message}`);
    } finally {
      setIsPhotosLoading(false);
    }
  };

  const handleCheckPhotosStatus = async () => {
    setIsPhotosLoading(true);
    try {
      const result = await checkGooglePhotosStatus();
      setPhotosStatus(result.status);
      setPhotosStatusMsg(result.message);
      if (result.userEmail) setPhotosUserEmail(result.userEmail);
    } catch (err: any) {
      setPhotosStatus('błąd');
      setPhotosStatusMsg(`Błąd sprawdzania statusu: ${err.message}`);
    } finally {
      setIsPhotosLoading(false);
    }
  };

  const handleFetchPhotos = async () => {
    setIsPhotosLoading(true);
    try {
      const res = await fetchGooglePhotosList(24);
      setPhotosList(res.items || []);
      if (!res.items || res.items.length === 0) {
        setPhotosStatusMsg('Brak zdjęć lub biblioteka jest pusta w wybranym zakresie.');
      } else {
        setPhotosStatusMsg(`Pobrano ${res.items.length} pozycji z Google Photos.`);
      }
    } catch (err: any) {
      setPhotosStatusMsg(`Błąd pobierania zdjęć: ${err.message}`);
    } finally {
      setIsPhotosLoading(false);
    }
  };

  // --- Samsung Notes Actions ---
  const handleImportNotesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newItems: SamsungNoteItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const item = await parseSamsungNoteFile(files[i]);
        newItems.push(item);
      }

      const updated = [...newItems, ...notesList];
      setNotesList(updated);
      saveSamsungNotes(updated);
      setNotesStatus('połączono');
      setNotesStatusMsg(`Zaimportowano pomyślnie ${newItems.length} plik(ów) z Samsung Notes.`);
    } catch (err: any) {
      setNotesStatus('błąd');
      setNotesStatusMsg(`Błąd importu pliku: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCheckNotesStatus = () => {
    const saved = loadSavedSamsungNotes();
    setNotesList(saved);
    if (saved.length > 0) {
      setNotesStatus('połączono');
      setNotesStatusMsg(`Magazyn aktywny: ${saved.length} notatek w pamięci lokalnej.`);
    } else {
      setNotesStatus('nie skonfigurowano');
      setNotesStatusMsg('Magazyn pusty. Wybierz pliki PDF/TXT/JSON z aplikacji Samsung Notes.');
    }
  };

  const handleClearNotes = () => {
    if (confirm('Czy na pewno chcesz usunąć wszystkie zaimportowane notatki z BastillaOS?')) {
      clearSamsungNotes();
      setNotesList([]);
      setSelectedNote(null);
      setNotesStatus('nie skonfigurowano');
      setNotesStatusMsg('Wyczyszczono magazyn notatek.');
    }
  };

  const getStatusBadge = (status: IntegrationStatus | SamsungNotesStatus) => {
    switch (status) {
      case 'połączono':
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            POŁĄCZONO
          </span>
        );
      case 'oczekuje na autoryzację':
        return (
          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/60 font-mono text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-spin"></span>
            OCZEKUJE NA AUTORYZACJĘ
          </span>
        );
      case 'błąd':
        return (
          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/60 font-mono text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            BŁĄD
          </span>
        );
      case 'gotowy do importu':
        return (
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono text-[10px] font-bold">
            GOTOWY DO IMPORTU
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono text-[10px] font-bold">
            NIE SKONFIGUROWANO
          </span>
        );
    }
  };

  const filteredNotes = notesList.filter((note) => {
    if (!noteSearchQuery.trim()) return true;
    const q = noteSearchQuery.toLowerCase();
    return note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Sekcja Google Photos */}
      <div className="bg-slate-900/80 border border-blue-500/40 p-5 rounded-2xl shadow-xl backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-blue-500 flex items-center justify-center text-white shadow-md">
              <i className="fa-solid fa-camera-retro text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Google Photos
                <span className="text-[10px] text-cyan-400 font-normal">OAuth 2.0 & Picker API</span>
              </h2>
              <p className="text-xs text-slate-400">
                Bezpieczne połączenie z biblioteką zdjęć Google Photos z uprawnieniami tylko do odczytu.
              </p>
            </div>
          </div>
          <div>{getStatusBadge(photosStatus)}</div>
        </div>

        {/* Informacje o statusie */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <i className={`fa-solid ${photosStatus === 'połączono' ? 'fa-check text-emerald-400' : photosStatus === 'błąd' ? 'fa-triangle-exclamation text-rose-400' : 'fa-circle-info text-blue-400'}`}></i>
            <span className="text-slate-300">{photosStatusMsg}</span>
          </div>
          {photosUserEmail && (
            <span className="text-cyan-300 font-mono text-[11px] bg-blue-950/80 px-2.5 py-1 rounded border border-blue-800/60 truncate">
              {photosUserEmail}
            </span>
          )}
        </div>

        {/* Przyciski operacyjne */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {photosStatus !== 'połączono' ? (
            <button
              onClick={handleConnectPhotos}
              disabled={isPhotosLoading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-slate-950 font-bold rounded-lg text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <i className="fa-solid fa-link"></i>
              <span>Połącz z Google Photos</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleFetchPhotos}
                disabled={isPhotosLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <i className="fa-solid fa-images"></i>
                <span>Wybierz zdjęcia (Photos Picker)</span>
              </button>
              <button
                onClick={handleDisconnectPhotos}
                disabled={isPhotosLoading}
                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold rounded-lg text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <i className="fa-solid fa-link-slash"></i>
                <span>Rozłącz</span>
              </button>
            </>
          )}

          <button
            onClick={handleCheckPhotosStatus}
            disabled={isPhotosLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold rounded-lg text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <i className={`fa-solid fa-arrows-rotate ${isPhotosLoading ? 'animate-spin' : ''}`}></i>
            <span>Sprawdź status</span>
          </button>
        </div>

        {/* Galeria zdjęć po autoryzacji */}
        {photosList.length > 0 && (
          <div className="mt-4 pt-3 border-t border-blue-900/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">Wybór elementów z Google Photos ({photosList.length}):</span>
              <span className="text-[10px] text-slate-500">Kliknij miniaturę, aby zobaczyć szczegóły</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-blue-900/30">
              {photosList.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className={`group relative rounded-lg overflow-hidden border cursor-pointer transition aspect-square bg-slate-900 flex flex-col justify-end p-1.5 ${
                    selectedPhoto?.id === photo.id ? 'border-cyan-400 ring-2 ring-cyan-500/50' : 'border-slate-800 hover:border-blue-500'
                  }`}
                >
                  <img
                    src={`${photo.baseUrl}=w300-h300`}
                    alt={photo.filename}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
                    loading="lazy"
                  />
                  <div className="relative z-10 bg-slate-950/80 rounded px-1 py-0.5 text-[9px] text-slate-200 truncate">
                    {photo.filename}
                  </div>
                </div>
              ))}
            </div>

            {selectedPhoto && (
              <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={`${selectedPhoto.baseUrl}=w100-h100`}
                    alt={selectedPhoto.filename}
                    className="w-12 h-12 rounded object-cover border border-slate-700"
                  />
                  <div className="truncate text-xs">
                    <div className="font-bold text-slate-100 truncate">{selectedPhoto.filename}</div>
                    <div className="text-[10px] text-slate-400">Typ: {selectedPhoto.mimeType || 'obraz'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onInsertIntoTask && (
                    <button
                      onClick={() => onInsertIntoTask(`[Zdjęcie Google Photos]: ${selectedPhoto.filename}\nURL: ${selectedPhoto.baseUrl}`)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
                    >
                      Wklej do zadania ChatGPT
                    </button>
                  )}
                  {onSendToChat && (
                    <button
                      onClick={() => onSendToChat('Astyria', `Przesyłam zdjęcie z Google Photos: ${selectedPhoto.filename} (${selectedPhoto.baseUrl})`)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
                    >
                      Wyślij do Astyrii
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sekcja Samsung Notes */}
      <div className="bg-slate-900/80 border border-blue-500/40 p-5 rounded-2xl shadow-xl backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <i className="fa-solid fa-note-sticky text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Samsung Notes
                <span className="text-[10px] text-amber-400 font-normal">Import Plików (PDF / TXT / JSON / SDOC)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Lokalny import notatek wyeksportowanych z aplikacji Samsung Notes bez konieczności zewnętrznego API.
              </p>
            </div>
          </div>
          <div>{getStatusBadge(notesStatus)}</div>
        </div>

        {/* Informacje o statusie */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <i className={`fa-solid ${notesList.length > 0 ? 'fa-book text-emerald-400' : 'fa-info-circle text-amber-400'}`}></i>
            <span className="text-slate-300">{notesStatusMsg}</span>
          </div>
          <span className="text-amber-300 font-mono text-[11px] bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/60">
            Liczba notatek: {notesList.length}
          </span>
        </div>

        {/* Przyciski operacyjne */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportNotesFile}
            multiple
            accept=".txt,.pdf,.json,.md,.sdoc,.snb,.memo,text/plain,application/pdf,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-bold rounded-lg text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-import"></i>
            <span>Importuj plik notatek</span>
          </button>

          <button
            onClick={handleCheckNotesStatus}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold rounded-lg text-xs transition flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-arrows-rotate"></i>
            <span>Sprawdź status magazynu</span>
          </button>

          {notesList.length > 0 && (
            <button
              onClick={handleClearNotes}
              className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold rounded-lg text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-trash-can"></i>
              <span>Wyczyść magazyn</span>
            </button>
          )}
        </div>

        {/* Lista zaimportowanych notatek */}
        {notesList.length > 0 && (
          <div className="mt-4 pt-3 border-t border-blue-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-xs text-slate-200">Zaimportowane notatki ({filteredNotes.length}):</span>
              <input
                type="text"
                placeholder="Szukaj w notatkach..."
                value={noteSearchQuery}
                onChange={(e) => setNoteSearchQuery(e.target.value)}
                className="bg-slate-950 border border-blue-900/60 rounded px-2.5 py-1 text-xs text-slate-100 outline-none focus:border-amber-500 w-full sm:w-56"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer bg-slate-950/70 ${
                    selectedNote?.id === note.id ? 'border-amber-400 bg-amber-950/20 shadow-md' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-100 text-xs truncate flex items-center gap-1.5">
                      <i className="fa-solid fa-file-lines text-amber-400 text-[10px]"></i>
                      {note.title}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800 font-mono">
                      {note.fileType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {note.previewSnippet}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{(note.fileSize / 1024).toFixed(1)} KB</span>
                    <span>{new Date(note.importedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Podgląd wybranej notatki */}
            {selectedNote && (
              <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-300 text-xs flex items-center gap-2">
                    <i className="fa-solid fa-file-signature"></i>
                    <span>{selectedNote.title} ({selectedNote.fileName})</span>
                  </div>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 rounded-lg text-xs text-slate-200 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {selectedNote.content}
                </pre>
                <div className="flex flex-wrap items-center gap-2">
                  {onInsertIntoTask && (
                    <button
                      onClick={() => onInsertIntoTask(`[Notatka Samsung Notes]: ${selectedNote.title}\n\n${selectedNote.content}`)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
                    >
                      Wklej do zadania ChatGPT
                    </button>
                  )}
                  {onSendToChat && (
                    <button
                      onClick={() => onSendToChat('Astyria', `Przekazuję notatkę Samsung Notes:\n${selectedNote.title}\n\n${selectedNote.content}`)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
                    >
                      Wyślij do Astyrii
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
