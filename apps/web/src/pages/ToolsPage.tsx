import { useEffect, useMemo, useState } from 'react';
import {
  TOOLS,
  formatJson,
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
  timestampToDate,
  testRegex,
  parseColor,
  type ToolDefinition,
} from '@starvault/core';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@starvault/ui';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import QRCode from 'qrcode';
import {
  Braces,
  Binary,
  Link,
  Clock,
  Search,
  Palette,
  FileText,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  braces: Braces,
  binary: Binary,
  link: Link,
  clock: Clock,
  search: Search,
  palette: Palette,
  'file-text': FileText,
  'qr-code': QrCode,
};

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<string>(TOOLS[0].id);

  return (
    <div className="flex h-full gap-4">
      <aside className="w-56 space-y-2">
        {TOOLS.map(tool => (
          <ToolButton key={tool.id} tool={tool} active={activeTool === tool.id} onClick={() => setActiveTool(tool.id)} />
        ))}
      </aside>
      <div className="flex-1 min-w-0">
        <ToolContent toolId={activeTool} />
      </div>
    </div>
  );
}

function ToolButton({
  tool,
  active,
  onClick,
}: {
  tool: ToolDefinition;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = ICONS[tool.icon] ?? Braces;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-accent text-white' : 'hover:bg-bg-tertiary text-text-primary'
      }`}
    >
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex h-4 items-center leading-none">{tool.name}</span>
    </button>
  );
}

function ToolContent({ toolId }: { toolId: string }) {
  switch (toolId) {
    case 'json-formatter':
      return <JsonFormatter />;
    case 'base64':
      return <Base64Tool />;
    case 'url-codec':
      return <UrlTool />;
    case 'timestamp':
      return <TimestampTool />;
    case 'regex':
      return <RegexTool />;
    case 'color':
      return <ColorTool />;
    case 'markdown':
      return <MarkdownTool />;
    case 'qrcode':
      return <QrCodeTool />;
    default:
      return null;
  }
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
}

function JsonFormatter() {
  const [input, setInput] = useState('');
  const result = useMemo(() => formatJson(input), [input]);
  const { copied, copy } = useCopy();

  return (
    <ToolCard title="JSON 格式化">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        <textarea
          className="w-full h-96 rounded-lg border border-border bg-bg-primary p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="粘贴 JSON..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => copy(result.formatted)} disabled={!result.valid || copied} className="gap-1.5">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </span>
              <span className="flex h-4 items-center leading-none">复制格式化</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => copy(result.compact)} disabled={!result.valid || copied}>
              复制压缩
            </Button>
          </div>
          {result.error && <p className="text-sm text-danger">{result.error}</p>}
          <pre
            className={`flex-1 rounded-lg border border-border p-3 text-xs font-mono overflow-auto ${
              result.valid ? 'text-text-secondary' : 'text-danger'
            }`}
          >
            {result.valid ? result.formatted : result.error}
          </pre>
        </div>
      </div>
    </ToolCard>
  );
}

function Base64Tool() {
  const [input, setInput] = useState('');
  const encoded = useMemo(() => base64Encode(input), [input]);
  const decoded = useMemo(() => base64Decode(input), [input]);
  const { copied: copiedEnc, copy: copyEnc } = useCopy();
  const { copied: copiedDec, copy: copyDec } = useCopy();

  return (
    <ToolCard title="Base64 编解码">
      <div className="space-y-4">
        <textarea
          className="w-full h-40 rounded-lg border border-border bg-bg-primary p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="输入文本..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResultBox label="编码结果" value={encoded} onCopy={() => copyEnc(encoded)} copied={copiedEnc} />
          <ResultBox label="解码结果" value={decoded} onCopy={() => copyDec(decoded)} copied={copiedDec} />
        </div>
      </div>
    </ToolCard>
  );
}

function UrlTool() {
  const [input, setInput] = useState('');
  const encoded = useMemo(() => urlEncode(input), [input]);
  const decoded = useMemo(() => urlDecode(input), [input]);
  const { copied: copiedEnc, copy: copyEnc } = useCopy();
  const { copied: copiedDec, copy: copyDec } = useCopy();

  return (
    <ToolCard title="URL 编解码">
      <div className="space-y-4">
        <textarea
          className="w-full h-40 rounded-lg border border-border bg-bg-primary p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="输入文本..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResultBox label="编码结果" value={encoded} onCopy={() => copyEnc(encoded)} copied={copiedEnc} />
          <ResultBox label="解码结果" value={decoded} onCopy={() => copyDec(decoded)} copied={copiedDec} />
        </div>
      </div>
    </ToolCard>
  );
}

function TimestampTool() {
  const [input, setInput] = useState('');
  const date = useMemo(() => {
    const ts = Number(input);
    if (!input || Number.isNaN(ts)) return '';
    return timestampToDate(ts);
  }, [input]);

  return (
    <ToolCard title="时间戳转换">
      <div className="space-y-4">
        <input
          type="number"
          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="输入时间戳（秒或毫秒）..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        {date && <ResultBox label="ISO 8601" value={date} onCopy={() => navigator.clipboard.writeText(date)} copied={false} />}
      </div>
    </ToolCard>
  );
}

function RegexTool() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('');
  const result = useMemo(() => testRegex(pattern, flags, text), [pattern, flags, text]);

  return (
    <ToolCard title="正则测试">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="正则表达式"
            value={pattern}
            onChange={e => setPattern(e.target.value)}
          />
          <input
            className="w-24 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="flags"
            value={flags}
            onChange={e => setFlags(e.target.value)}
          />
        </div>
        <textarea
          className="w-full h-48 rounded-lg border border-border bg-bg-primary p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="待匹配文本..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        {result.error && <p className="text-sm text-danger">{result.error}</p>}
        <div className="space-y-2">
          {result.matches.map((m, i) => (
            <div key={i} className="rounded-lg border border-border p-2 text-sm">
              <Badge>匹配 {i + 1}</Badge>
              <span className="ml-2 font-mono">{m.text}</span>
              {m.groups && m.groups.length > 0 && (
                <span className="ml-2 text-text-secondary">groups: {m.groups.join(', ')}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </ToolCard>
  );
}

function ColorTool() {
  const [input, setInput] = useState('');
  const color = useMemo(() => parseColor(input), [input]);

  return (
    <ToolCard title="颜色转换">
      <div className="space-y-4">
        <input
          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="#3b82f6 或 rgb(59, 130, 246)"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        {color && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4 flex items-center justify-center" style={{ backgroundColor: color.hex }}>
              <span className="text-white text-xs" style={{ mixBlendMode: 'difference' }}>
                {color.hex}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <ResultBox label="HEX" value={color.hex} onCopy={() => navigator.clipboard.writeText(color.hex)} copied={false} />
              <ResultBox label="RGB" value={color.rgb} onCopy={() => navigator.clipboard.writeText(color.rgb)} copied={false} />
              <ResultBox label="HSL" value={color.hsl} onCopy={() => navigator.clipboard.writeText(color.hsl)} copied={false} />
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  );
}

function MarkdownTool() {
  const [input, setInput] = useState('# Hello\n\n**bold** and *italic*');

  return (
    <ToolCard title="Markdown 预览">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        <textarea
          className="w-full h-96 rounded-lg border border-border bg-bg-primary p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="h-96 rounded-lg border border-border p-4 overflow-auto prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{input}</ReactMarkdown>
        </div>
      </div>
    </ToolCard>
  );
}

function QrCodeTool() {
  const [text, setText] = useState('https://github.com/TaotaoByte/StarVault');
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!text) {
      setDataUrl('');
      return;
    }
    QRCode.toDataURL(text, { width: 240, margin: 2 })
      .then(url => setDataUrl(url))
      .catch(() => setDataUrl(''));
  }, [text]);

  return (
    <ToolCard title="二维码生成">
      <div className="space-y-4">
        <textarea
          className="w-full h-32 rounded-lg border border-border bg-bg-primary p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="输入文本或 URL..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        {dataUrl && (
          <div className="rounded-lg border border-border p-4 inline-block">
            <img src={dataUrl} alt="QR Code" className="w-60 h-60" />
          </div>
        )}
      </div>
    </ToolCard>
  );
}

function ToolCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

function ResultBox({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-tertiary">{label}</span>
        <Button variant="ghost" size="sm" onClick={onCopy} disabled={!value}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div className="text-sm font-mono break-all">{value}</div>
    </div>
  );
}
