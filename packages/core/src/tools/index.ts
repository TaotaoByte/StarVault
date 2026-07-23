export type ToolCategory = 'encode' | 'format' | 'generate' | 'dev';

export interface ToolDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: ToolCategory;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    icon: 'braces',
    description: '格式化、校验、压缩 JSON',
    category: 'format',
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    icon: 'binary',
    description: 'Base64 编码与解码',
    category: 'encode',
  },
  {
    id: 'url-codec',
    name: 'URL 编解码',
    icon: 'link',
    description: 'URL 编码与解码',
    category: 'encode',
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    icon: 'clock',
    description: '时间戳与日期互转',
    category: 'dev',
  },
  {
    id: 'regex',
    name: '正则测试',
    icon: 'search',
    description: '测试正则表达式匹配',
    category: 'dev',
  },
  {
    id: 'color',
    name: '颜色转换',
    icon: 'palette',
    description: 'HEX / RGB / HSL 互转',
    category: 'dev',
  },
  {
    id: 'markdown',
    name: 'Markdown 预览',
    icon: 'file-text',
    description: '实时渲染 Markdown',
    category: 'format',
  },
  {
    id: 'qrcode',
    name: '二维码生成',
    icon: 'qr-code',
    description: '文本/URL 生成二维码',
    category: 'generate',
  },
];

export interface JsonFormatResult {
  valid: boolean;
  formatted: string;
  compact: string;
  error?: string;
}

export function formatJson(input: string): JsonFormatResult {
  try {
    const trimmed = input.trim();
    if (!trimmed) return { valid: true, formatted: '', compact: '' };
    const parsed = JSON.parse(trimmed);
    return {
      valid: true,
      formatted: JSON.stringify(parsed, null, 2),
      compact: JSON.stringify(parsed),
    };
  } catch (err) {
    return {
      valid: false,
      formatted: input,
      compact: input,
      error: (err as Error).message,
    };
  }
}

export function base64Encode(input: string): string {
  try {
    return btoa(unescape(encodeURIComponent(input)));
  } catch {
    return '';
  }
}

export function base64Decode(input: string): string {
  try {
    return decodeURIComponent(escape(atob(input)));
  } catch {
    return '';
  }
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

export function urlDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function timestampToDate(ts: number): string {
  const ms = ts > 1e11 ? ts : ts * 1000;
  return new Date(ms).toISOString();
}

export interface RegexResult {
  valid: boolean;
  matches: { text: string; index: number; groups?: string[] }[];
  error?: string;
}

export function testRegex(pattern: string, flags: string, text: string): RegexResult {
  try {
    const re = new RegExp(pattern, flags);
    const matches: RegexResult['matches'] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      matches.push({
        text: match[0],
        index: match.index,
        groups: match.length > 1 ? match.slice(1) : undefined,
      });
      if (!flags.includes('g')) break;
    }
    return { valid: true, matches };
  } catch (err) {
    return { valid: false, matches: [], error: (err as Error).message };
  }
}

export interface ColorValues {
  hex: string;
  rgb: string;
  hsl: string;
}

export function parseColor(input: string): ColorValues | undefined {
  const hexMatch = input.match(/^#?([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(c => c + c)
        .join('');
    } else if (hex.length === 4) {
      hex = hex
        .split('')
        .map(c => c + c)
        .join('');
    }
    if (hex.length !== 6 && hex.length !== 8) return undefined;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return undefined;
    return {
      hex: `#${hex.slice(0, 6).toLowerCase()}`,
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${rgbToHsl(r, g, b)})`,
    };
  }

  const rgbMatch = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    return {
      hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: `hsl(${rgbToHsl(r, g, b)})`,
    };
  }

  return undefined;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

function rgbToHsl(r: number, g: number, b: number): string {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}
