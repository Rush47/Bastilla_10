export interface SamsungNoteItem {
  id: string;
  title: string;
  content: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  importedAt: string;
  sourceApp: 'Samsung Notes (Exported File)';
  previewSnippet: string;
  pageCount?: number;
}

export type SamsungNotesStatus = 'nie skonfigurowano' | 'gotowy do importu' | 'połączono' | 'błąd';

const STORAGE_KEY = 'bastillaos_samsung_notes_cache_v1';

export function loadSavedSamsungNotes(): SamsungNoteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

export function saveSamsungNotes(notes: SamsungNoteItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.warn('Failed to cache notes in localStorage:', e);
  }
}

export function clearSamsungNotes(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_e) {}
}

export async function parseSamsungNoteFile(file: File): Promise<SamsungNoteItem> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const now = new Date().toISOString();

  let textContent = '';
  let preview = '';

  if (extension === 'txt' || extension === 'md' || extension === 'text') {
    textContent = await file.text();
    preview = textContent.slice(0, 300);
  } else if (extension === 'json') {
    const rawText = await file.text();
    try {
      const parsed = JSON.parse(rawText);
      textContent = JSON.stringify(parsed, null, 2);
      preview = parsed.title || parsed.text || parsed.note || rawText.slice(0, 300);
    } catch (_e) {
      textContent = rawText;
      preview = rawText.slice(0, 300);
    }
  } else if (extension === 'pdf') {
    textContent = `[Dokument PDF Samsung Notes: ${file.name}]\nRozmiar: ${(file.size / 1024).toFixed(1)} KB.\nPlik zawiera wyeksportowaną notatkę PDF z aplikacji Samsung Notes.`;
    preview = `Dokument PDF (${(file.size / 1024).toFixed(1)} KB)`;
  } else if (extension === 'sdoc' || extension === 'snb' || extension === 'memo') {
    // Binary Samsung Notes proprietary container
    textContent = `[Pakiet binarny Samsung Notes: .${extension}]\nPlik: ${file.name}\nRozmiar: ${(file.size / 1024).toFixed(1)} KB.\nFormat wewnętrzny Samsung Notes.`;
    preview = `Archiwum natywne .${extension} (${(file.size / 1024).toFixed(1)} KB)`;
  } else {
    // Generic fallback
    try {
      const raw = await file.text();
      textContent = raw.slice(0, 10000);
      preview = textContent.slice(0, 300);
    } catch (_e) {
      textContent = `[Plik binarny: ${file.name}]`;
      preview = `Plik ${file.name}`;
    }
  }

  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

  return {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: cleanTitle,
    content: textContent,
    fileName: file.name,
    fileType: extension.toUpperCase() || 'NOTE',
    fileSize: file.size,
    importedAt: now,
    sourceApp: 'Samsung Notes (Exported File)',
    previewSnippet: preview.trim() || 'Brak tekstu podglądu',
  };
}
