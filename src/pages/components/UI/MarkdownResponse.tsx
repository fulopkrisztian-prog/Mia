import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MarkdownResponseProps {
  content: string;
}

const MarkdownResponse: React.FC<MarkdownResponseProps> = ({ content }) => {
  return (
    <div className="markdown-content text-slate-200 leading-relaxed space-y-4">
      <ReactMarkdown
        components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const [copied, setCopied] = useState(false);

          const codeString = String(children).replace(/\n$/, '');

          const handleCopy = async () => {
            await navigator.clipboard.writeText(codeString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          };

          if (!inline && match) {
            return (
              <div className="relative group my-6 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                      <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                    </div>
                    <span className="ml-2 text-xs font-mono text-slate-400 font-semibold tracking-wider uppercase">
                      {match[1]}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all active:scale-95"
                  >
                    {copied ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} className="text-slate-400" />
                    )}
                    <span className={`text-[10px] font-bold uppercase ${copied ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {copied ? 'Másolva!' : 'Másolás'}
                    </span>
                  </button>
                </div>

                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  showLineNumbers={true}
                  customStyle={{
                    margin: 0,
                    padding: '1.25rem',
                    background: '#020617',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                  }}
                  codeTagProps={{
                    style: { fontFamily: '"Fira Code", "Cascadia Code", monospace' }
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code 
              className="bg-slate-800/80 text-blue-300 px-1.5 py-0.5 rounded-md font-mono text-sm border border-slate-700/50" 
              {...props}
            >
              {children}
            </code>
          );
        },
        ul: ({children}) => <ul className="list-disc ml-6 space-y-2">{children}</ul>,
        ol: ({children}) => <ol className="list-decimal ml-6 space-y-2">{children}</ol>,
        a: ({href, children}) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownResponse;