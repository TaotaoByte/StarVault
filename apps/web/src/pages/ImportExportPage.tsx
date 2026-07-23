import { useRef, useState } from 'react';
import { exportToJson, importFromJson, importFromHtml, type ImportResult } from '@starvault/core';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@starvault/ui';
import { useAppStore } from '../stores/appStore.js';
import { Download, Upload, FileJson, Globe } from 'lucide-react';

interface ImportExportPageProps {
  onImported?: () => void;
}

export default function ImportExportPage({ onImported }: ImportExportPageProps) {
  const store = useAppStore();
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState('');

  const handleExport = () => {
    if (!store.db) {
      setMessage('数据库未就绪');
      return;
    }
    const data = exportToJson(store.db);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starvault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('导出成功');
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store.db) return;
    try {
      const text = await readFile(file);
      const data = JSON.parse(text);
      const res = importFromJson(store.db, data);
      setResult(res);
      setMessage(`JSON 导入完成：新增 ${res.added}，更新 ${res.updated}`);
      onImported?.();
    } catch (err) {
      setMessage(`导入失败: ${(err as Error).message}`);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const handleImportHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store.db) return;
    try {
      const html = await readFile(file);
      const res = importFromHtml(store.db, html);
      setResult(res);
      setMessage(`HTML 书签导入完成：新增 ${res.added}，更新 ${res.updated}`);
      onImported?.();
    } catch (err) {
      setMessage(`导入失败: ${(err as Error).message}`);
    } finally {
      if (htmlInputRef.current) htmlInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">数据导入 / 导出</h1>

      {message && (
        <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm text-text-secondary">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            导出数据
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">将所有项目、标签、分类导出为 JSON 文件。</p>
          <Button onClick={handleExport} disabled={!store.db}>
            <FileJson className="h-4 w-4 mr-2" />
            导出 JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            导入 JSON
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">从 StarVault 导出的 JSON 文件恢复数据。</p>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportJson}
          />
          <Button variant="secondary" onClick={() => jsonInputRef.current?.click()} disabled={!store.db}>
            <FileJson className="h-4 w-4 mr-2" />
            选择 JSON 文件
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            导入 HTML 书签
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">支持 Chrome / Edge / Firefox 导出的 Netscape HTML 书签文件。</p>
          <input
            ref={htmlInputRef}
            type="file"
            accept="text/html,.html,.htm"
            className="hidden"
            onChange={handleImportHtml}
          />
          <Button variant="secondary" onClick={() => htmlInputRef.current?.click()} disabled={!store.db}>
            <Globe className="h-4 w-4 mr-2" />
            选择 HTML 书签
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>导入结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>新增：{result.added}</p>
            <p>更新：{result.updated}</p>
            {result.errors.length > 0 && (
              <div className="text-danger">
                <p className="font-medium">错误 ({result.errors.length})：</p>
                <ul className="list-disc pl-5 space-y-1">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
