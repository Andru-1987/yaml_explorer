import React, { useMemo, useState } from 'react';
import { BookOpen, FolderTree, ChevronDown, ChevronRight, Download } from 'lucide-react';

interface DefinitionsViewProps {
  data: any;
}

export function DefinitionsView({ data }: DefinitionsViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const groupedDefinitions = useMemo(() => {
    const results: { term: string; definition: string; context?: string; path: string[] }[] = [];
    
    function extract(obj: any, currentPath: string[]) {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          // For arrays, we just pass the current path down
          extract(item, currentPath);
        });
      } else {
        // It's an object
        const itemName = obj.name || obj.id || obj.label || obj.term;
        
        let nextPath = [...currentPath];
        if (itemName && nextPath[nextPath.length - 1] !== itemName) {
          nextPath.push(itemName);
        }

        if (obj.definition) {
          results.push({
            term: itemName || nextPath[nextPath.length - 1] || 'Término sin nombre',
            definition: obj.definition,
            context: obj.context,
            path: nextPath.slice(0, -1) // Path excluding the term itself
          });
        }

        Object.entries(obj).forEach(([key, value]) => {
          if (key !== 'definition' && key !== 'context' && key !== 'name' && key !== 'id' && key !== 'label' && key !== 'term') {
            let childPath = [...nextPath];
            // Don't add structural keys like 'children' or 'items' to the visual path
            if (key !== 'children' && key !== 'items' && !Array.isArray(obj)) {
               childPath.push(key);
            }
            extract(value, childPath);
          }
        });
      }
    }
    
    extract(data, []);

    // Group by path string
    const grouped: Record<string, typeof results> = {};
    results.forEach(res => {
      const pathStr = res.path.length > 0 ? res.path.join(' > ') : 'Raíz';
      if (!grouped[pathStr]) {
        grouped[pathStr] = [];
      }
      grouped[pathStr].push(res);
    });

    return grouped;
  }, [data]);

  const toggleGroup = (groupPath: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupPath]: !prev[groupPath]
    }));
  };

  const handleExport = () => {
    let content = "Diccionario de Definiciones\n";
    content += "===========================\n\n";

    Object.entries(groupedDefinitions).forEach(([groupPath, defs]) => {
      content += `[ ${groupPath} ]\n`;
      content += `${"-".repeat(groupPath.length + 4)}\n`;
      
      defs.forEach(def => {
        content += `• ${def.term}:\n`;
        content += `  Definición: ${def.definition}\n`;
        if (def.context) {
          content += `  Contexto: ${def.context}\n`;
        }
        content += "\n";
      });
      content += "\n";
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'definiciones_exportadas.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (Object.keys(groupedDefinitions).length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-[#9A9AA0] p-8 text-center">
        <BookOpen className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-[18px] font-semibold text-white mb-2">No se encontraron definiciones</p>
        <p className="text-[14px] max-w-md">El archivo YAML no contiene campos "definition".</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex justify-end mb-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2E] text-white hover:bg-white/10 rounded-full text-[14px] font-medium transition-all shadow-sm border border-white/5"
        >
          <Download className="w-4 h-4" />
          Exportar a TXT
        </button>
      </div>

      <div className="flex flex-col gap-8">
        {Object.entries(groupedDefinitions).map(([groupPath, defs]) => {
          const isCollapsed = collapsedGroups[groupPath] || false;
          
          return (
            <div key={groupPath} className="flex flex-col gap-4">
              <div 
                className="flex items-center gap-2 text-lavender border-b border-white/10 pb-2 cursor-pointer hover:text-white transition-colors group select-none"
                onClick={() => toggleGroup(groupPath)}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-[#9A9AA0] group-hover:text-white transition-colors" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#9A9AA0] group-hover:text-white transition-colors" />
                )}
                <FolderTree className="w-5 h-5" />
                <h2 className="text-[16px] font-semibold tracking-wide">{groupPath} <span className="text-[#9A9AA0] text-[13px] font-normal ml-2">({defs.length})</span></h2>
              </div>
              
              {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max pl-2">
                  {defs.map((def, idx) => (
                    <div key={idx} className="bg-[#2C2C2E] border border-white/5 rounded-[16px] p-5 shadow-card hover:shadow-hover transition-shadow flex flex-col">
                      <h3 className="text-[16px] font-semibold text-white mb-2 capitalize">{def.term}</h3>
                      <p className="text-[14px] text-[#F4F5F7] leading-relaxed mb-4">{def.definition}</p>
                      {def.context && (
                        <div className="mt-auto pt-3 border-t border-white/5">
                          <span className="text-[12px] font-medium text-lavender uppercase tracking-wider block mb-1">Contexto</span>
                          <p className="text-[13px] text-[#9A9AA0] italic leading-relaxed">{def.context}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
