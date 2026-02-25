import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, List, Hash } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function LongText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  
  if (text.length <= 100) {
    return <span className="text-text-secondary dark:text-[#9A9AA0]">"{text}"</span>;
  }

  return (
    <span className="text-text-secondary dark:text-[#9A9AA0]">
      "{expanded ? text : text.slice(0, 100) + '...'}"
      <button 
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="ml-2 text-[12px] text-lavender hover:opacity-80 font-semibold bg-lavender/10 px-2 py-0.5 rounded-full transition-colors"
      >
        {expanded ? 'ver menos' : 'read more...'}
      </button>
    </span>
  );
}

interface TreeNodeProps {
  key?: React.Key;
  label: string;
  value: any;
  isExpanded?: boolean;
  onToggle?: () => void;
  level?: number;
}

export function TreeNode({ label, value, isExpanded: controlledExpanded, onToggle, level = 0 }: TreeNodeProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [expandedChildKey, setExpandedChildKey] = useState<string | null>(null);
  
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;
  
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isCollapsible = isObject || isArray;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCollapsible) {
      if (onToggle) onToggle();
      else setLocalExpanded(!isExpanded);
    }
  };

  const renderValue = () => {
    if (value === null) return <span className="text-text-muted italic">null</span>;
    if (typeof value === 'boolean') return <span className="text-mint-green font-medium">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-soft-purple font-medium">{value}</span>;
    if (typeof value === 'string') return <LongText text={value} />;
    return null;
  };

  const getIcon = () => {
    if (isArray) return <List className="w-4 h-4 text-lavender" />;
    if (isObject) return <Hash className="w-4 h-4 text-lavender" />;
    return <FileText className="w-4 h-4 text-text-muted" />;
  };

  return (
    <div className="font-sans text-[14px]">
      <div 
        className={cn(
          "flex items-start py-2 px-3 rounded-[12px] transition-colors duration-150 group",
          isCollapsible ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5",
          isExpanded && isCollapsible && "bg-black/5 dark:bg-white/5"
        )}
        onClick={toggleExpand}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <div className="flex items-center h-5 w-5 mr-1 shrink-0">
          {isCollapsible ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted group-hover:text-text-primary dark:group-hover:text-white transition-colors" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary dark:group-hover:text-white transition-colors" />
            )
          ) : (
            <span className="w-4 h-4" /> // Spacer
          )}
        </div>
        
        <div className="flex items-center mr-2 shrink-0">
          {getIcon()}
        </div>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-medium text-text-primary dark:text-white">{label}:</span>
          {!isCollapsible && renderValue()}
          {isCollapsible && !isExpanded && (
            <span className="text-text-muted text-[12px] bg-card-bg dark:bg-[#2C2C2E] px-2 py-0.5 rounded-full border border-divider dark:border-white/5">
              {isArray ? `${value.length} items` : `${Object.keys(value).length} keys`}
            </span>
          )}
        </div>
      </div>

      {isCollapsible && isExpanded && (
        <div className="mt-1">
          {isArray ? (
            value.map((item: any, index: number) => {
              const childLabel = item?.id || item?.label || item?.name || `[${index}]`;
              const key = String(index);
              return (
                <TreeNode 
                  key={key} 
                  label={childLabel} 
                  value={item} 
                  level={level + 1} 
                  isExpanded={expandedChildKey === key}
                  onToggle={() => setExpandedChildKey(expandedChildKey === key ? null : key)}
                />
              );
            })
          ) : (
            Object.entries(value).map(([key, val]) => (
              <TreeNode 
                key={key} 
                label={key} 
                value={val} 
                level={level + 1} 
                isExpanded={expandedChildKey === key}
                onToggle={() => setExpandedChildKey(expandedChildKey === key ? null : key)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function TreeView({ data }: { data: any }) {
  const [expandedRootKey, setExpandedRootKey] = useState<string | null>(null);

  if (!data) return <div className="text-text-muted italic p-4">No data to display</div>;

  return (
    <div className="w-full h-full">
      {Object.entries(data).map(([key, value]) => (
        <TreeNode 
          key={key} 
          label={key} 
          value={value} 
          isExpanded={expandedRootKey === key}
          onToggle={() => setExpandedRootKey(expandedRootKey === key ? null : key)}
        />
      ))}
    </div>
  );
}
