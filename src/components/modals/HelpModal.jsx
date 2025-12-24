/**
 * Dashboard Académico - Modal de Ayuda
 * Modal para mostrar documentación y ayuda bilingüe
 */

import React, { useMemo, useState } from 'react';
import { README_CONTENT } from '../../content/readmeContent.js';
import { parseMarkdown, extractLanguageSection, extractTableOfContents } from '../../utils/markdownParser.js';

/**
 * Modal de ayuda que muestra el README en el idioma seleccionado
 * @param {boolean} isOpen - Si el modal está visible
 * @param {Function} onClose - Callback al cerrar modal
 * @param {string} idioma - Idioma actual ('es' o 'va')
 * @param {Function} t - Función de traducción
 */
export const HelpModal = ({ isOpen, onClose, idioma, t }) => {
  // Parse README content based on selected language
  const { helpContent, tableOfContents } = useMemo(() => {
    // Extract language-specific section
    const languageContent = extractLanguageSection(README_CONTENT, idioma);

    // Parse markdown to HTML
    const htmlContent = parseMarkdown(languageContent);

    // Extract table of contents
    const toc = extractTableOfContents(languageContent);

    return {
      helpContent: { __html: htmlContent },
      tableOfContents: toc
    };
  }, [idioma]);

  const [activeSection, setActiveSection] = useState('');
  const [showTocMobile, setShowTocMobile] = useState(false);

  // Scroll to section when clicking TOC link
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
      setShowTocMobile(false); // Close mobile TOC after selection
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Mobile TOC Toggle */}
            <button
              onClick={() => setShowTocMobile(!showTocMobile)}
              className="md:hidden text-slate-600 hover:text-slate-800 transition-colors"
              aria-label="Toggle Table of Contents"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-slate-800">{t('help')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Table of Contents Sidebar */}
          <div className={`
            w-64 border-r border-slate-200 overflow-y-auto bg-slate-50 p-4
            md:block
            ${showTocMobile ? 'absolute inset-y-0 left-0 z-20 shadow-xl' : 'hidden'}
          `}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                {idioma === 'es' ? 'Índice' : 'Índex'}
              </h3>
              {/* Close button for mobile */}
              <button
                onClick={() => setShowTocMobile(false)}
                className="md:hidden text-slate-500 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="space-y-1">
              {tableOfContents.map((item, index) => (
                <button
                  key={index}
                  onClick={() => scrollToSection(item.id)}
                  className={`
                    block w-full text-left text-sm transition-colors rounded px-2 py-1.5
                    ${item.level === 2 ? 'font-semibold text-slate-800' : ''}
                    ${item.level === 3 ? 'pl-4 text-slate-600' : ''}
                    ${item.level === 4 ? 'pl-6 text-slate-500 text-xs' : ''}
                    ${activeSection === item.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200'}
                  `}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile overlay */}
          {showTocMobile && (
            <div
              className="md:hidden absolute inset-0 bg-black/30 z-10"
              onClick={() => setShowTocMobile(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={helpContent}
            />
          </div>
        </div>
      </div>

      {/* Inline Styles for Markdown Content */}
      <style>{`
        .markdown-content {
          color: rgb(71, 85, 105);
          line-height: 1.75;
        }

        .markdown-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          margin-top: 1.5rem;
          color: rgb(30, 41, 59);
          border-bottom: 3px solid rgb(59, 130, 246);
          padding-bottom: 0.75rem;
          scroll-margin-top: 1rem;
        }

        .markdown-content h2 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: rgb(30, 41, 59);
          border-bottom: 2px solid rgb(226, 232, 240);
          padding-bottom: 0.5rem;
          scroll-margin-top: 1rem;
        }

        .markdown-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: rgb(51, 65, 85);
          scroll-margin-top: 1rem;
        }

        .markdown-content h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: rgb(51, 65, 85);
          scroll-margin-top: 1rem;
        }

        .markdown-content p {
          margin-bottom: 0.5rem;
          line-height: 1.6;
          color: rgb(71, 85, 105);
        }

        .markdown-content ul {
          list-style: disc;
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .markdown-content ol {
          list-style: decimal;
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .markdown-content li {
          margin-bottom: 0.25rem;
          line-height: 1.5;
          color: rgb(71, 85, 105);
          padding-left: 0.25rem;
        }

        .markdown-content strong {
          font-weight: 600;
          color: rgb(30, 41, 59);
        }

        .markdown-content a {
          color: rgb(37, 99, 235);
          text-decoration: underline;
          transition: color 0.2s;
        }

        .markdown-content a:hover {
          color: rgb(29, 78, 216);
        }

        .markdown-content hr {
          border: none;
          border-top: 2px solid rgb(226, 232, 240);
          margin: 1.5rem 0;
        }

        .markdown-content blockquote {
          border-left: 4px solid rgb(59, 130, 246);
          padding-left: 1rem;
          margin: 1rem 0;
          background-color: rgb(248, 250, 252);
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          border-radius: 0.25rem;
        }

        .markdown-content blockquote p {
          margin: 0.25rem 0;
          color: rgb(51, 65, 85);
          font-size: 0.95rem;
        }

        .markdown-content code {
          background-color: rgb(241, 245, 249);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.875em;
          color: rgb(239, 68, 68);
        }

        .markdown-content br {
          display: none;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .markdown-content h1 {
            font-size: 1.75rem;
          }

          .markdown-content h2 {
            font-size: 1.5rem;
          }

          .markdown-content h3 {
            font-size: 1.25rem;
          }

          .markdown-content h4 {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
};
