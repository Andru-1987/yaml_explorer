import React, { useState, useRef } from 'react';
import { FileCode2, LayoutList, Network, Upload, AlertCircle, BookOpen, FileUp } from 'lucide-react';
import { parseYaml } from './utils/yamlParser';
import { TreeView } from './components/TreeView';
import { D3TreeView } from './components/D3TreeView';
import { DefinitionsView } from './components/DefinitionsView';
import { cn } from './components/TreeView'; // Reusing the cn utility

export default function App() {
  const [parsedData, setParsedData] = useState<any>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'graph' | 'definitions'>('graph');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const data = parseYaml(content);
        setParsedData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Invalid YAML format');
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  return (
    <div className="dark min-h-screen font-sans flex flex-col bg-[#1C1C1E] text-[#F4F5F7] transition-colors duration-200">
      {/* Header */}
      <header className="bg-[#2C2C2E] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-card transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="bg-lavender p-2 rounded-full text-text-primary shadow-sm">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight text-white leading-[1.3]">YAML Explorer</h1>
            <p className="text-[14px] text-[#9A9AA0] font-medium leading-[1.4]">Visualiza estructuras YAML de forma elegante</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-[#1C1C1E] p-1 rounded-full border border-white/5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-[#2C2C2E] text-white shadow-card' 
                  : 'text-[#9A9AA0] hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
                viewMode === 'graph' 
                  ? 'bg-[#2C2C2E] text-white shadow-card' 
                  : 'text-[#9A9AA0] hover:text-white hover:bg-white/5'
              }`}
            >
              <Network className="w-4 h-4" />
              Grafo (D3)
            </button>
            <button
              onClick={() => setViewMode('definitions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
                viewMode === 'definitions' 
                  ? 'bg-[#2C2C2E] text-white shadow-card' 
                  : 'text-[#9A9AA0] hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Definiciones
            </button>
          </div>
          
          <label className="flex items-center gap-2 px-[18px] py-[10px] bg-lavender text-text-primary hover:opacity-90 rounded-full text-[14px] font-medium cursor-pointer transition-all shadow-none hover:shadow-hover hover:scale-[1.01] active:scale-[0.98]">
            <Upload className="w-4 h-4" />
            Subir Archivo
            <input 
              type="file" 
              accept=".yaml,.yml" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </label>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 md:p-10">
        {!parsedData && !error ? (
          /* Landing page — no YAML loaded yet */
          <div
            className={`flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] rounded-card border-2 border-dashed transition-all duration-300 ${
              dragOver
                ? 'border-lavender bg-lavender/10 scale-[1.01]'
                : 'border-white/10 bg-[#2C2C2E]'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
              {/* Icon */}
              <div className="w-24 h-24 rounded-full bg-lavender/20 flex items-center justify-center shadow-lg">
                <FileUp className="w-12 h-12 text-lavender" />
              </div>

              {/* Title & description */}
              <div>
                <h2 className="text-[26px] font-bold text-white mb-2 tracking-tight">
                  Sube tu archivo YAML
                </h2>
                <p className="text-[15px] text-[#9A9AA0] leading-relaxed">
                  Para comenzar a explorar, arrastra y suelta tu archivo{' '}
                  <span className="text-lavender font-medium">.yaml</span> o{' '}
                  <span className="text-lavender font-medium">.yml</span> aquí, o haz clic en el botón de abajo.
                </p>
              </div>

              {/* Upload button */}
              <label className="flex items-center gap-2 px-6 py-3 bg-lavender text-text-primary hover:opacity-90 rounded-full text-[15px] font-semibold cursor-pointer transition-all shadow-md hover:shadow-hover hover:scale-[1.03] active:scale-[0.97]">
                <Upload className="w-5 h-5" />
                Seleccionar archivo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,.yml"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Hint */}
              <p className="text-[13px] text-[#9A9AA0]/60">
                Soporta archivos <code className="text-lavender/80">.yaml</code> y <code className="text-lavender/80">.yml</code>
              </p>
            </div>
          </div>
        ) : (
          /* Explorer view — YAML loaded */
          <div className="flex flex-col gap-6 h-[calc(100vh-10rem)]">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[18px] font-semibold text-white tracking-tight">
                Visualización {viewMode === 'list' ? 'Estructurada' : viewMode === 'graph' ? 'Gráfica' : 'de Definiciones'}
                {fileName && (
                  <span className="ml-3 text-[13px] font-normal text-[#9A9AA0] bg-white/5 px-3 py-1 rounded-full">
                    {fileName}
                  </span>
                )}
              </h2>
            </div>

            <div className="flex-1 overflow-hidden rounded-card bg-[#2C2C2E] shadow-card transition-colors duration-200 p-6">
              {error ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#9A9AA0] p-8 text-center bg-[#1C1C1E]/50 rounded-[16px]">
                  <AlertCircle className="w-12 h-12 text-coral mb-4" />
                  <p className="text-[18px] font-semibold text-white mb-2">No se puede visualizar</p>
                  <p className="text-[14px] max-w-md">{error}</p>
                </div>
              ) : (
                <div className="w-full h-full overflow-auto rounded-[16px] bg-[#1C1C1E] shadow-sm">
                  {viewMode === 'list' ? (
                    <div className="p-4">
                      <TreeView data={parsedData} />
                    </div>
                  ) : viewMode === 'graph' ? (
                    <D3TreeView data={parsedData} />
                  ) : (
                    <DefinitionsView data={parsedData} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
