import React, { useState, useEffect } from 'react';
import katex from 'katex';
import { Copy, Check, Terminal, Sigma, Sparkles, RefreshCw, FileText, Table as TableIcon } from 'lucide-react';
import {
  InteractiveChartRenderer,
  PhaseSpaceChart,
  EntropyHeatmapChart,
  Triad3DOscillatorChart,
  LivePowerWaveChart,
  HeartbeatWaveChart,
  TriadCoreOrbitsChart
} from './InteractiveChartRenderer';
import { TechnicalBlueprintSVG } from './TechnicalBlueprintSVG';

/**
 * Normalizes SVG data URIs (including utf8 percent-encoded SVGs with parentheses)
 * into clean base64 data URIs so browsers like Brave/Chrome render them reliably.
 */
function normalizeImageSrc(rawSrc: string): string {
  const trimmed = rawSrc.trim();
  if (trimmed.startsWith('data:image/svg+xml;utf8,')) {
    try {
      const encodedPart = trimmed.slice('data:image/svg+xml;utf8,'.length);
      const decodedSvg = decodeURIComponent(encodedPart);
      const base64 = btoa(unescape(encodeURIComponent(decodedSvg)));
      return `data:image/svg+xml;base64,${base64}`;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/** Bezpośredni link do pliku wideo (mp4/webm/ogv/mov/m4v), opcjonalnie z query string. */
function isVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|ogv|mov|m4v)(\?[^\s]*)?$/i.test(url.trim());
}

/** Zamienia link YouTube (watch / shorts / youtu.be / embed) na URL osadzenia; null gdy to nie wideo. */
function getYouTubeEmbedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^(www\.|m\.)/, '');
    let id = '';
    if (host === 'youtu.be') {
      id = url.pathname.slice(1).split('/')[0] || '';
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (/^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
    }
    return /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/**
 * Odtwarzacz wideo w czacie: pliki (mp4/webm/...) przez <video>, YouTube przez osadzony iframe.
 */
const VideoEmbed: React.FC<{ src: string; title?: string }> = ({ src, title }) => {
  const youTubeUrl = getYouTubeEmbedUrl(src);
  if (youTubeUrl) {
    return (
      <span className="block my-3 rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video shadow-lg shadow-slate-950/40">
        <iframe
          src={youTubeUrl}
          title={title || 'Wideo YouTube'}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </span>
    );
  }
  return (
    <span className="block my-3 rounded-xl overflow-hidden border border-slate-800 bg-black shadow-lg shadow-slate-950/40">
      <video src={src.trim()} controls preload="metadata" className="w-full max-h-[420px]" title={title}>
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">
          Pobierz wideo
        </a>
      </video>
    </span>
  );
};

/**
 * Image with loading and error states for external graphics (Pollinations/AI & Data URIs)
 */
const ImageWithFallback: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt, className = '' }) => {
  const normalizedSrc = normalizeImageSrc(src);
  const isDataUri = normalizedSrc.startsWith('data:');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!isDataUri);

  useEffect(() => {
    setError(false);
    setLoading(!normalizedSrc.startsWith('data:'));
  }, [normalizedSrc]);

  if (error) {
    return <TechnicalBlueprintSVG style={alt || 'Sovereign Neural Core Matrix'} />;
  }

  return (
    <div className={`relative my-3 group ${loading ? 'min-h-[200px]' : ''} ${className}`}>
      {loading && (
        <div className=" inset-0 min-h-[200px] bg-slate-900/90 animate-pulse rounded-xl border border-slate-800 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
            <span className="text-[10px] text-slate-400 font-mono">Renderowanie matrycy wizualnej...</span>
          </div>
        </div>
      )}
      <img
        src={normalizedSrc}
        alt={alt || 'Wizualizacja SVL'}
        className={`max-w-full max-h-[460px] w-auto h-auto rounded-xl border border-slate-800 shadow-xl shadow-black/40 group-hover:border-emerald-500/50 transition-all duration-300 bg-slate-950 ${
          loading ? 'hidden' : 'block'
        }`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
      {!loading && alt && (
        <span className="text-[10px] text-slate-400 italic font-mono mt-1.5 block">
          {alt}
        </span>
      )}
    </div>
  );
};

/**
 * Automatically saves a file to the server's exports directory when rendered
 */
const FileExportTrigger: React.FC<{ filename: string; content: string }> = ({ filename, content }) => {
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saving');

  useEffect(() => {
    const doExport = async () => {
      try {
        const res = await fetch('/api/explorer/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, content })
        });
        if (res.ok) {
          setStatus('saved');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    };
    doExport();
  }, [filename, content]);

  return (
    <div className="my-4 p-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center gap-3 shadow-lg shadow-emerald-950/10">
      <div className={`p-2 rounded bg-slate-950 border ${status === 'error' ? 'border-rose-500/50 text-rose-400' : 'border-emerald-500/50 text-emerald-400'}`}>
        <FileText className={`w-5 h-5 ${status === 'saving' ? 'animate-pulse' : ''}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-slate-100 flex items-center gap-2">
          {status === 'saving' ? 'Trwa zapisywanie pliku...' : status === 'saved' ? 'Plik gotowy do pobrania' : 'Błąd zapisu pliku'}
          {status === 'saving' && <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />}
          {status === 'saved' && <Check className="w-3 h-3 text-emerald-500" />}
        </div>
        <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
          {filename}
        </div>
      </div>
      {status === 'saved' && (
        <span className="px-3 py-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[10px] font-bold">
          ZAPISANO W RING-0
        </span>
      )}
    </div>
  );
};

interface FormattedMessageProps {
  content: string;
  className?: string;
}

function toPollinationsProxyUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (url.includes('pollinations.ai') && !url.includes('/api/pollinations/image')) {
    try {
      const urlObj = new URL(url);
      const prompt = urlObj.pathname.startsWith('/p/')
        ? urlObj.pathname.substring(3)
        : urlObj.pathname.startsWith('/prompt/')
        ? urlObj.pathname.substring(8)
        : urlObj.pathname.split('/').pop() || '';

      const params = new URLSearchParams(urlObj.search);
      const width = params.get('width') || '1024';
      const height = params.get('height') || '640';
      const seed = params.get('seed') || '42';

      url = `/api/pollinations/image?prompt=${encodeURIComponent(decodeURIComponent(prompt))}&width=${width}&height=${height}&seed=${seed}`;
    } catch {}
  }
  return url;
}

/**
 * Renders inline text with support for:
 * - Inline LaTeX formulas: $...$ or \(...\)
 * - Markdown Images with balanced parentheses or data URIs: ![alt](url)
 * - Markdown Links with balanced parentheses: [text](url)
 * - Raw Image URLs (Pollinations/API/Data URI)
 * - Inline HTML tags: <u>, <b>, <strong>, <i>, <em>, <code>, <sub>, <sup>, <br/>
 * - Inline code: `code`
 * - Bold: **text**
 * - Underscore identifiers (Alex_1, VM_Ten_System, DATA_STORE)
 * - Italic: *text* or _text_
 */
function renderInlineContent(text: string): React.ReactNode[] {
  if (!text) return [];

  // Pre-clean stray broken SVG tail fragments if any legacy message had truncated url(#bg)
  const cleanedText = text.replace(
    /!\[([^\]]*?)\]\((data:image\/svg\+xml;utf8,[\s\S]*?%3C%2Fsvg%3E)\)/g,
    (_m, alt, dataUrl) => `![${alt}](${normalizeImageSrc(dataUrl)})`
  );

  const tokenRegex =
    /(?:\$([^\$\n]+?)\$|\\\(([^\$\n]+?)\\\))|(!\[([^\]]*?)\]\(((?:[^()\n]|\([^()\n]*\))+?)\))|(\[([^\]]*?)\]\(((?:[^()\n]|\([^()\n]*\))+?)\))|(\/(?:api\/pollinations\/image|api\/image)\?[^\s\n\)]+)|(https?:\/\/(?:image\.|gen\.)?pollinations\.ai\/(?:prompt\/|p\/|image\/)?[^\s\n\)]+)|(<br\s*\/?>)|(<(u|b|strong|i|em|code|sub|sup|mark)>([\s\S]*?)<\/\12>)|(`[^`\n]+`)|(\*\*[\s\S]+?\*\*)|(\b[a-zA-Z0-9]+_[a-zA-Z0-9_]+\b)|(?:\*([^*\n]+?)\*)|(?:(?<=\s|^|[([{<"'])_([a-zA-Z0-9\s]+?)_(?=\s|$|[.,!?:;\])>"']))|(https?:\/\/[^\s\n\)]+\.(?:mp4|webm|ogv|mov|m4v)(?:\?[^\s\n\)]*)?)|(https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\/[^\s\n\)]+)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(cleanedText)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <React.Fragment key={`txt-${keyIdx++}`}>
          {cleanedText.substring(lastIndex, match.index)}
        </React.Fragment>
      );
    }

    const fullMatch = match[0];

    // 1. Inline Math ($...$ or \(...\))
    const mathContent = match[1] ?? match[2];
    if (mathContent !== undefined) {
      try {
        const html = katex.renderToString(mathContent.trim(), {
          displayMode: false,
          throwOnError: false,
        });
        elements.push(
          <span
            key={`math-${keyIdx++}`}
            className="inline-math px-1 py-0.5 mx-0.5 rounded bg-slate-900/90 text-emerald-300 font-serif border border-emerald-950/60 inline-flex items-center align-middle"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        elements.push(
          <code key={`math-err-${keyIdx++}`} className="text-amber-400 font-mono text-[11px]">
            ${mathContent}$
          </code>
        );
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 2. Markdown Images: ![alt](url) — linki wideo renderowane jako odtwarzacz
    if (match[3] !== undefined) {
      const alt = match[4];
      const rawUrl = match[5];
      if (isVideoFileUrl(rawUrl) || getYouTubeEmbedUrl(rawUrl)) {
        elements.push(<VideoEmbed key={`video-md-${keyIdx++}`} src={rawUrl} title={alt} />);
        lastIndex = tokenRegex.lastIndex;
        continue;
      }
      const url = toPollinationsProxyUrl(rawUrl);
      elements.push(
        <ImageWithFallback key={`img-md-${keyIdx++}`} src={url} alt={alt} />
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 3. Markdown Links: [text](url) — linki wideo renderowane jako odtwarzacz
    if (match[6] !== undefined) {
      const linkText = match[7];
      const url = match[8];
      if (isVideoFileUrl(url) || getYouTubeEmbedUrl(url)) {
        elements.push(<VideoEmbed key={`video-link-${keyIdx++}`} src={url} title={linkText} />);
        lastIndex = tokenRegex.lastIndex;
        continue;
      }
      elements.push(
        <a
          key={`link-${keyIdx++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-900 hover:decoration-cyan-500 transition-all font-medium"
        >
          {linkText}
        </a>
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 4. Raw Relative Image API URLs
    if (match[9] !== undefined) {
      elements.push(
        <ImageWithFallback key={`img-raw-rel-${keyIdx++}`} src={match[9]} />
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 5. Raw Full Pollinations Image URLs
    if (match[10] !== undefined) {
      const url = toPollinationsProxyUrl(match[10]);
      elements.push(
        <ImageWithFallback key={`img-raw-full-${keyIdx++}`} src={url} />
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 5b. Surowe linki wideo: pliki (mp4/webm/...) i YouTube — automatyczne osadzenie odtwarzacza
    if (match[20] !== undefined || match[21] !== undefined) {
      const src = (match[20] ?? match[21])!;
      if (match[21] !== undefined && !getYouTubeEmbedUrl(src)) {
        // Link YouTube bez identyfikatora wideo (np. kanał) — zwykły odnośnik
        elements.push(
          <a
            key={`yt-link-${keyIdx++}`}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-900 hover:decoration-cyan-500 transition-all font-medium"
          >
            {src}
          </a>
        );
      } else {
        elements.push(<VideoEmbed key={`video-raw-${keyIdx++}`} src={src} />);
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 6. <br> or <br/>
    if (match[11] !== undefined) {
      elements.push(<br key={`br-${keyIdx++}`} />);
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 7. Inline HTML tags: <u>, <b>, <strong>, <i>, <em>, <code>, <sub>, <sup>, <mark>
    if (match[12] !== undefined) {
      const tag = match[13]?.toLowerCase();
      const inner = match[14] || '';
      if (tag === 'u') {
        elements.push(
          <span key={`html-u-${keyIdx++}`} className="underline decoration-emerald-400/80 underline-offset-4 text-slate-100">
            {renderInlineContent(inner)}
          </span>
        );
      } else if (tag === 'b' || tag === 'strong') {
        elements.push(
          <strong key={`html-b-${keyIdx++}`} className="font-bold text-slate-100">
            {renderInlineContent(inner)}
          </strong>
        );
      } else if (tag === 'i' || tag === 'em') {
        elements.push(
          <em key={`html-i-${keyIdx++}`} className="italic text-slate-300">
            {renderInlineContent(inner)}
          </em>
        );
      } else if (tag === 'code') {
        elements.push(
          <code key={`html-code-${keyIdx++}`} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 font-mono text-[11px]">
            {inner}
          </code>
        );
      } else if (tag === 'sub') {
        elements.push(<sub key={`html-sub-${keyIdx++}`}>{renderInlineContent(inner)}</sub>);
      } else if (tag === 'sup') {
        elements.push(<sup key={`html-sup-${keyIdx++}`}>{renderInlineContent(inner)}</sup>);
      } else {
        elements.push(
          <mark key={`html-mark-${keyIdx++}`} className="px-1 rounded bg-emerald-500/20 text-emerald-200">
            {renderInlineContent(inner)}
          </mark>
        );
      }
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 8. Inline code (`...`)
    if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      const code = fullMatch.slice(1, -1);
      elements.push(
        <code
          key={`code-${keyIdx++}`}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 font-mono text-[11px]"
        >
          {code}
        </code>
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 9. Bold (**...**)
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      const boldText = fullMatch.slice(2, -2);
      elements.push(
        <strong key={`b-${keyIdx++}`} className="font-bold text-slate-100">
          {renderInlineContent(boldText)}
        </strong>
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 10. Identifier with underscore (e.g. Alex_1, VM_Ten_System, DATA_STORE)
    if (match[17] !== undefined) {
      elements.push(
        <span key={`id-${keyIdx++}`} className="font-mono text-emerald-300 font-bold px-0.5">
          {match[17]}
        </span>
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    // 11. Italic (*...* or _..._)
    const italicText = match[18] ?? match[19];
    if (italicText !== undefined) {
      elements.push(
        <em key={`i-${keyIdx++}`} className="italic text-slate-300">
          {renderInlineContent(italicText)}
        </em>
      );
      lastIndex = tokenRegex.lastIndex;
      continue;
    }

    elements.push(fullMatch);
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < cleanedText.length) {
    elements.push(
      <React.Fragment key={`txt-end-${keyIdx++}`}>
        {cleanedText.substring(lastIndex)}
      </React.Fragment>
    );
  }

  return elements;
}

/**
 * Markdown Table Renderer for structured data and percentage comparisons
 */
const MarkdownTable: React.FC<{ rows: string[] }> = ({ rows }) => {
  const parseRow = (line: string): string[] => {
    const trimmed = line.trim();
    const withoutEdges = trimmed.replace(/^\|/, '').replace(/\|$/, '');
    return withoutEdges.split('|').map((cell) => cell.trim());
  };

  if (rows.length < 2) return null;

  const headerCells = parseRow(rows[0]);
  const isSeparatorRow = (line: string) => /^\|?[\s:-]+\|[\s|:-]*$/.test(line.trim());
  const bodyStartIndex = isSeparatorRow(rows[1]) ? 2 : 1;
  const bodyRows = rows.slice(bodyStartIndex).filter((r) => !isSeparatorRow(r)).map(parseRow);

  return (
    <div className="my-3.5 rounded-xl border border-emerald-500/30 bg-slate-950/90 shadow-lg shadow-black/40 overflow-hidden">
      <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono text-emerald-400">
        <span className="flex items-center gap-1.5 font-bold">
          <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
          MATRYCA DANYCH I STATYSTYK (ASTYRIA TABLE RENDERER)
        </span>
        <span className="text-slate-500">{bodyRows.length} wierszy</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-900/70 border-b border-slate-800 text-emerald-300 font-bold">
              {headerCells.map((cell, cIdx) => (
                <th key={`th-${cIdx}`} className="py-2 px-3 border-r border-slate-800/60 last:border-r-0 whitespace-nowrap">
                  {renderInlineContent(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {bodyRows.map((row, rIdx) => (
              <tr key={`tr-${rIdx}`} className="hover:bg-slate-900/40 transition-colors">
                {headerCells.map((_, cIdx) => {
                  const cellVal = row[cIdx] ?? '';
                  const isPositivePercent = /\+\d+(?:[.,]\d+)?\s*%/.test(cellVal);
                  return (
                    <td
                      key={`td-${rIdx}-${cIdx}`}
                      className={`py-2 px-3 border-r border-slate-800/40 last:border-r-0 align-top ${
                        isPositivePercent ? 'text-emerald-300 font-semibold' : 'text-slate-200'
                      }`}
                    >
                      {renderInlineContent(cellVal)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Block LaTeX Math formula with displayMode: true, copy formula button, and clean card
 */
const BlockMath: React.FC<{ math: string }> = ({ math }) => {
  const [copied, setCopied] = useState(false);

  const cleanMath = math.trim();
  let renderedHtml = '';
  let hasError = false;

  try {
    renderedHtml = katex.renderToString(cleanMath, {
      displayMode: true,
      throwOnError: false,
    });
  } catch {
    hasError = true;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanMath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-3 p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 shadow-md shadow-emerald-950/20 overflow-x-auto">
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/60 text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <Sigma className="w-3.5 h-3.5" />
          WZÓR MATEMATYCZNY (LATEX)
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
          title="Kopiuj kod LaTeX wzoru"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
          <span>{copied ? 'Skopiowano' : 'Kopiuj LaTeX'}</span>
        </button>
      </div>

      {hasError ? (
        <pre className="text-rose-400 text-xs p-2 bg-slate-900 rounded font-mono">{cleanMath}</pre>
      ) : (
        <div
          className="py-1 text-center overflow-x-auto select-text"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      )}
    </div>
  );
};

/**
 * Code Block with copy action (and automatic visual preview if code is SVG)
 */
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const trimmedCode = code.trim();
  const isSvgCode =
    (language.toLowerCase() === 'svg' || language.toLowerCase() === 'xml' || language.toLowerCase() === 'html') &&
    trimmedCode.startsWith('<svg') &&
    trimmedCode.endsWith('</svg>');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSvgCode) {
    const base64Svg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(trimmedCode)))}`;
    return (
      <div className="my-3 space-y-2">
        <ImageWithFallback src={base64Svg} alt="Wyrenderowany wektor SVG" />
      </div>
    );
  }

  return (
    <div className="relative my-3 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden font-mono text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span className="font-bold text-slate-300">{language || 'KOD'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Skopiowano' : 'Kopiuj'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

/**
 * Main Markdown, Table, Image, SVG, and LaTeX Math Parser component
 */
export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Step 1: Split into top-level blocks by block math ($$...$$, \[...\], or \begin{equation}...), code fences (```...```), or raw <svg>...</svg>
  const blockRegex = /(?:```(\w*)\n([\s\S]*?)```)|(?:\$\$([\s\S]*?)\$\$)|(?:\\\[([\s\S]*?)\\\])|(\\begin\{(?:equation\*?|align\*?|aligned\*?|gather\*?|matrix|bmatrix|pmatrix|cases)\}[\s\S]*?\\end\{(?:equation\*?|align\*?|aligned\*?|gather\*?|matrix|bmatrix|pmatrix|cases)\})|(<svg[\s\S]*?<\/svg>)/gi;

  const blocks: Array<
    | { type: 'code'; language: string; content: string }
    | { type: 'blockMath'; content: string }
    | { type: 'svg'; content: string }
    | { type: 'text'; content: string }
  > = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
      });
    }

    if (match[1] !== undefined || match[2] !== undefined) {
      blocks.push({
        type: 'code',
        language: match[1] || '',
        content: match[2] || '',
      });
    } else if (match[3] !== undefined) {
      blocks.push({
        type: 'blockMath',
        content: match[3],
      });
    } else if (match[4] !== undefined) {
      blocks.push({
        type: 'blockMath',
        content: match[4],
      });
    } else if (match[5] !== undefined) {
      blocks.push({
        type: 'blockMath',
        content: match[5],
      });
    } else if (match[6] !== undefined) {
      blocks.push({
        type: 'svg',
        content: match[6],
      });
    }

    lastIndex = blockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    blocks.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }

  const renderedChartTypes = new Set<string>();

  return (
    <div className={`space-y-2 select-text break-words ${className}`}>
      {blocks.map((block, bIdx) => {
        const findJsonTriggers = (text: string) => {
          const triggers: Array<{ fullMatch: string; component: React.ReactNode }> = [];
          const regex = /\{[\s\S]*?("(?:TRIGGER_IMAGE_GENERATION|RENDER_ASSET|VM_Dalle_3_EXECUTE|EXPORT_FILE|image_meta|action_id|asset_id|command|action)")[\s\S]*?\}/g;
          let m;

          while ((m = regex.exec(text)) !== null) {
            try {
              const fullMatch = m[0];
              const json = JSON.parse(fullMatch);

              const isImageTrigger =
                json.command === 'TRIGGER_IMAGE_GENERATION' ||
                json.action === 'TRIGGER_IMAGE_GENERATION' ||
                json.action === 'VM_Dalle_3_EXECUTE' ||
                json.image_meta;

              const isAssetTrigger =
                json.action === 'RENDER_ASSET' ||
                json.command === 'RENDER_ASSET' ||
                json.asset_id;

              const isExportTrigger = json.action === 'EXPORT_FILE' || json.command === 'EXPORT_FILE';

              if (isImageTrigger || isAssetTrigger) {
                const prompt =
                  json.prompt ||
                  json.target ||
                  json.image_meta?.description ||
                  (Array.isArray(json.prompts) ? json.prompts[0] : null) ||
                  json.task ||
                  'Generowanie wizualizacji...';

                const actionLabel = isAssetTrigger ? 'Trwa renderowanie zasobu' : 'Trwa generowanie wizualizacji';
                const hasMultiple = Array.isArray(json.prompts) && json.prompts.length > 1;

                triggers.push({
                  fullMatch,
                  component: (
                    <div key={`json-trigger-${triggers.length}-${bIdx}`} className="space-y-4 my-4">
                      <div className="p-3 md:p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/50 flex items-center gap-3 text-cyan-200 shadow-lg shadow-cyan-950/10 backdrop-blur-sm ring-1 ring-cyan-500/10">
                        <Sparkles className={`w-5 h-5 ${isImageTrigger ? 'animate-pulse' : 'animate-spin-slow'} text-cyan-400 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[11px] md:text-xs flex items-center gap-2">
                            {actionLabel}
                            {hasMultiple && <span className="px-1.5 py-0.5 rounded bg-cyan-900 text-[9px] border border-cyan-700">PAKIET: {json.prompts.length}</span>}
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          </div>
                          <div className="text-[10px] text-cyan-400/70 mt-1 truncate italic">
                            "{prompt.substring(0, 100)}{prompt.length > 100 ? '...' : ''}"
                          </div>
                        </div>
                      </div>
                      {isAssetTrigger ? (
                        <TechnicalBlueprintSVG style={json.style || json.description || json.target} />
                      ) : (
                        <ImageWithFallback
                          src={`/api/pollinations/image?prompt=${encodeURIComponent(prompt)}&width=1024&height=640&seed=42`}
                          alt={prompt}
                        />
                      )}
                    </div>
                  )
                });
              } else if (isExportTrigger) {
                triggers.push({
                  fullMatch,
                  component: (
                    <FileExportTrigger
                      key={`export-trigger-${triggers.length}-${bIdx}`}
                      filename={json.filename}
                      content={json.content}
                    />
                  )
                });
              }
            } catch {}
          }
          return triggers;
        };

        if (block.type === 'svg') {
          const base64Svg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(block.content.trim())))}`;
          return <ImageWithFallback key={`raw-svg-${bIdx}`} src={base64Svg} alt="Wizualizacja Wektorowa SVG" />;
        }

        if (block.type === 'code') {
          const lang = block.language.toLowerCase();
          const triggers = findJsonTriggers(block.content);
          if (triggers.length > 0) {
            return (
              <React.Fragment key={`code-triggers-${bIdx}`}>
                {triggers.map((t) => t.component)}
              </React.Fragment>
            );
          }

          if (lang.startsWith('chart') || lang === 'mermaid' || lang === 'plot' || lang.includes('chart')) {
            const chartSpec = `${lang} ${block.content}`.toLowerCase();
            if (chartSpec.includes('phase') || chartSpec.includes('fazow')) {
              return <PhaseSpaceChart key={`code-chart-phase-${bIdx}`} />;
            }
            if (chartSpec.includes('heatmap') || chartSpec.includes('entropi')) {
              return <EntropyHeatmapChart key={`code-chart-heatmap-${bIdx}`} />;
            }
            if (chartSpec.includes('3d') || chartSpec.includes('oscylat')) {
              return <Triad3DOscillatorChart key={`code-chart-3d-${bIdx}`} />;
            }
            if (chartSpec.includes('power') || chartSpec.includes('prąd') || chartSpec.includes('waveform')) {
              return <LivePowerWaveChart key={`code-chart-power-${bIdx}`} />;
            }
            if (chartSpec.includes('heartbeat') || chartSpec.includes('puls') || chartSpec.includes('serc')) {
              return <HeartbeatWaveChart key={`code-chart-heartbeat-${bIdx}`} />;
            }
            if (chartSpec.includes('orbit') || chartSpec.includes('rdzeń')) {
              return <TriadCoreOrbitsChart key={`code-chart-orbits-${bIdx}`} />;
            }
            return <InteractiveChartRenderer key={`code-chart-gen-${bIdx}`} type="phase" />;
          }
          return <CodeBlock key={`block-code-${bIdx}`} language={block.language} code={block.content} />;
        }

        if (block.type === 'blockMath') {
          return <BlockMath key={`block-math-${bIdx}`} math={block.content} />;
        }

        const findVmCommands = (text: string) => {
          const commands: Array<{ fullMatch: string; component: React.ReactNode }> = [];
          const vmRegex = /\[SYSTEM\]:\s*ROOT_EXEC:\s*vm_dalle_3\s*--generate\s*--prompt\s*"(.*?)"/g;
          let m;

          while ((m = vmRegex.exec(text)) !== null) {
            const prompt = m[1];
            const fullMatch = m[0];

            commands.push({
              fullMatch,
              component: (
                <div key={`vm-command-${commands.length}-${bIdx}`} className="my-4 space-y-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-cyan-800/50 rounded-t-lg font-mono text-[10px] text-cyan-400">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>VIRTUAL_MACHINE_EXECUTION: DALLE_3_CORE</span>
                    <span className="ml-auto animate-pulse">● RUNNING</span>
                  </div>
                  <div className="p-3 bg-slate-950 border-x border-b border-cyan-900/30 rounded-b-lg space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-cyan-950/50 border border-cyan-800/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Procesor Graficzny</div>
                        <div className="text-[11px] text-cyan-200 italic truncate">"{prompt}"</div>
                      </div>
                    </div>
                    <ImageWithFallback
                      src={`/api/pollinations/image?prompt=${encodeURIComponent(prompt)}&width=1024&height=640&seed=108`}
                      alt={prompt}
                    />
                  </div>
                </div>
              )
            });
          }
          return commands;
        };

        const contentToParse = block.content;
        const foundTriggers = findJsonTriggers(contentToParse);
        const foundVmCommands = findVmCommands(contentToParse);

        const jsonComponents = foundTriggers.map((t) => t.component);
        const vmComponents = foundVmCommands.map((c) => c.component);

        let strippedContent = contentToParse;
        foundTriggers.forEach((t) => {
          strippedContent = strippedContent.split(t.fullMatch).join('');
        });
        foundVmCommands.forEach((c) => {
          strippedContent = strippedContent.split(c.fullMatch).join('');
        });

        // Parse text block lines (tables, headings, dividers, lists, blockquotes, paragraphs)
        const lines = strippedContent.split('\n');
        const renderedLines: React.ReactNode[] = [];
        let currentParagraph: string[] = [];
        let currentTableRows: string[] = [];

        const checkAndInjectChart = (text: string) => {
          const lower = text.toLowerCase();
          const injected: React.ReactNode[] = [];

          const isSignificant = text.length > 20 || lower.includes('wykres') || lower.includes('wizualizacj');
          if (!isSignificant) return injected;

          const hasPhase = /\b(wykres fazowy|przestrzeń fazowa|atraktor lorenza|dystrybucja stabilności)\b/i.test(lower);
          const hasHeatmap = /\b(macierz entropii|systemowy heatmap|mapa ciepła zasobów|wizualizacja entropii)\b/i.test(lower);
          const has3D = /\b(oscylator 3d|harmoniczna triady|wizualizacja 3d relacji)\b/i.test(lower);
          const hasPower = /\b(wizualizacja prądu|przebieg cosinusoidy|power flow analysis|waveform triady)\b/i.test(lower);
          const hasHeartbeat = /\b(bicie serca triady|pulsacja jądra|sinusoida heartbeat)\b/i.test(lower);
          const hasOrbits = /\b(rdzeń triady|orbity energetyczne|polar core visualization)\b/i.test(lower);
          const hasBlueprint = /\b(blueprint techniczny|schemat jądra|projekt struktury triady)\b/i.test(lower);

          if (hasPhase && !renderedChartTypes.has('phase')) {
            renderedChartTypes.add('phase');
            injected.push(<PhaseSpaceChart key={`chart-phase-${bIdx}-${renderedLines.length}`} />);
          }
          if (hasHeatmap && !renderedChartTypes.has('heatmap')) {
            renderedChartTypes.add('heatmap');
            injected.push(<EntropyHeatmapChart key={`chart-heatmap-${bIdx}-${renderedLines.length}`} />);
          }
          if (has3D && !renderedChartTypes.has('3d')) {
            renderedChartTypes.add('3d');
            injected.push(<Triad3DOscillatorChart key={`chart-3d-${bIdx}-${renderedLines.length}`} />);
          }
          if (hasPower && !renderedChartTypes.has('power')) {
            renderedChartTypes.add('power');
            injected.push(<LivePowerWaveChart key={`chart-power-${bIdx}-${renderedLines.length}`} />);
          }
          if (hasHeartbeat && !renderedChartTypes.has('heartbeat')) {
            renderedChartTypes.add('heartbeat');
            injected.push(<HeartbeatWaveChart key={`chart-heartbeat-${bIdx}-${renderedLines.length}`} />);
          }
          if (hasOrbits && !renderedChartTypes.has('orbits')) {
            renderedChartTypes.add('orbits');
            injected.push(<TriadCoreOrbitsChart key={`chart-orbits-${bIdx}-${renderedLines.length}`} />);
          }
          if (hasBlueprint && !renderedChartTypes.has('blueprint')) {
            renderedChartTypes.add('blueprint');
            injected.push(<TechnicalBlueprintSVG key={`chart-blueprint-${bIdx}-${renderedLines.length}`} style="Manual Trigger" />);
          }

          return injected;
        };

        const flushTable = () => {
          if (currentTableRows.length >= 2) {
            renderedLines.push(
              <MarkdownTable key={`tbl-${bIdx}-${renderedLines.length}`} rows={[...currentTableRows]} />
            );
            currentTableRows = [];
          } else if (currentTableRows.length === 1) {
            currentParagraph.push(currentTableRows[0]);
            currentTableRows = [];
          }
        };

        const flushParagraph = () => {
          flushTable();
          if (currentParagraph.length > 0) {
            const pText = currentParagraph.join('\n');
            renderedLines.push(
              <div key={`p-${bIdx}-${renderedLines.length}`} className="leading-relaxed text-slate-200 mb-2">
                {renderInlineContent(pText)}
              </div>
            );
            checkAndInjectChart(pText).forEach((c) => renderedLines.push(c));
            currentParagraph = [];
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const rawLine = lines[i];
          const trimmed = rawLine.trim();

          // Detect Markdown Table row: starts with | and ends with | (or contains at least 2 pipes)
          const isTableRow =
            (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) ||
            (currentTableRows.length > 0 && trimmed.includes('|'));

          if (isTableRow) {
            if (currentParagraph.length > 0) {
              const pText = currentParagraph.join('\n');
              renderedLines.push(
                <div key={`p-pre-tbl-${bIdx}-${renderedLines.length}`} className="leading-relaxed text-slate-200 mb-2">
                  {renderInlineContent(pText)}
                </div>
              );
              currentParagraph = [];
            }
            currentTableRows.push(trimmed);
            continue;
          } else if (currentTableRows.length > 0) {
            flushTable();
          }

          if (!trimmed) {
            flushParagraph();
            continue;
          }

          if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            flushParagraph();
            renderedLines.push(<hr key={`hr-${bIdx}-${i}`} className="border-slate-800 my-3 border-t" />);
            continue;
          }

          if (trimmed.startsWith('#### ')) {
            flushParagraph();
            renderedLines.push(
              <h4 key={`h4-${bIdx}-${i}`} className="text-xs font-bold text-slate-200 mt-3 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>{renderInlineContent(trimmed.slice(5))}</span>
              </h4>
            );
            continue;
          }

          if (trimmed.startsWith('### ')) {
            flushParagraph();
            renderedLines.push(
              <h3 key={`h3-${bIdx}-${i}`} className="text-sm font-bold text-slate-100 mt-3.5 mb-1.5 pb-1 border-b border-slate-800/80 flex items-center gap-2">
                <span className="text-emerald-400 font-mono text-xs shrink-0">###</span>
                <span>{renderInlineContent(trimmed.slice(4))}</span>
              </h3>
            );
            continue;
          }

          if (trimmed.startsWith('## ')) {
            flushParagraph();
            renderedLines.push(
              <h2 key={`h2-${bIdx}-${i}`} className="text-base font-bold text-emerald-300 mt-4 mb-2 pb-1 border-b border-emerald-900/40 flex items-center gap-2">
                <span className="text-emerald-500 font-mono text-sm shrink-0">##</span>
                <span>{renderInlineContent(trimmed.slice(3))}</span>
              </h2>
            );
            continue;
          }

          if (trimmed.startsWith('# ')) {
            flushParagraph();
            renderedLines.push(
              <h1 key={`h1-${bIdx}-${i}`} className="text-lg font-black text-emerald-400 mt-4 mb-2 pb-1.5 border-b border-emerald-800/50 flex items-center gap-2">
                <span className="text-emerald-500 font-mono shrink-0">#</span>
                <span>{renderInlineContent(trimmed.slice(2))}</span>
              </h1>
            );
            continue;
          }

          if (trimmed.startsWith('> ')) {
            flushParagraph();
            renderedLines.push(
              <blockquote key={`quote-${bIdx}-${i}`} className="border-l-2 border-emerald-500/60 pl-3 py-1 my-2 bg-slate-900/40 rounded-r text-slate-300 italic">
                {renderInlineContent(trimmed.slice(2))}
              </blockquote>
            );
            continue;
          }

          // Bullet lists (supporting nested indentation)
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            flushParagraph();
            const indentSpaces = rawLine.match(/^(\s*)/)?.[1]?.length || 0;
            const indentClass = indentSpaces >= 4 ? 'pl-6' : indentSpaces >= 2 ? 'pl-3.5' : 'pl-1';
            const listText = trimmed.slice(2);
            renderedLines.push(
              <div key={`li-${bIdx}-${i}`} className={`flex items-start gap-2 my-1 ${indentClass}`}>
                <span className="text-emerald-400 text-xs mt-0.5 shrink-0">•</span>
                <span className="text-slate-200 leading-relaxed flex-1">
                  {renderInlineContent(listText)}
                </span>
              </div>
            );
            checkAndInjectChart(listText).forEach((c) => renderedLines.push(c));
            continue;
          }

          // Numbered lists (supporting nested indentation)
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            flushParagraph();
            const indentSpaces = rawLine.match(/^(\s*)/)?.[1]?.length || 0;
            const indentClass = indentSpaces >= 4 ? 'pl-6' : indentSpaces >= 2 ? 'pl-3.5' : 'pl-1';
            const listText = numMatch[2];
            renderedLines.push(
              <div key={`num-${bIdx}-${i}`} className={`flex items-start gap-2 my-1 ${indentClass}`}>
                <span className="text-emerald-400 font-mono text-[11px] font-bold mt-0.5 shrink-0">{numMatch[1]}.</span>
                <span className="text-slate-200 leading-relaxed flex-1">
                  {renderInlineContent(listText)}
                </span>
              </div>
            );
            checkAndInjectChart(listText).forEach((c) => renderedLines.push(c));
            continue;
          }

          currentParagraph.push(rawLine);
        }

        flushParagraph();

        return (
          <React.Fragment key={`text-block-${bIdx}`}>
            {renderedLines}
            {jsonComponents}
            {vmComponents}
          </React.Fragment>
        );
      })}
    </div>
  );
};
