/**
 * Dashboard Académico - Layout Principal
 * Wrapper con sidebar y área de contenido
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

/**
 * Layout principal con sidebar responsive
 * @param {ReactNode} children - Contenido principal
 * @param {Object} sidebarProps - Props para el Sidebar
 * @param {Object} headerProps - Props para el Header
 */
export const MainLayout = ({ children, sidebarProps, headerProps }) => {
  // Estado del sidebar
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Guardar preferencia en localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // Cerrar sidebar móvil al cambiar de vista
  useEffect(() => {
    setMobileOpen(false);
  }, [sidebarProps.currentView]);

  // Cerrar sidebar móvil con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar
          {...sidebarProps}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Sidebar - Móvil (drawer) */}
      <div
        className={`
          lg:hidden fixed inset-y-0 left-0 z-30
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          {...sidebarProps}
          collapsed={false}
          onToggleCollapse={() => setMobileOpen(false)}
        />
      </div>

      {/* Contenido principal */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}
        `}
      >
        {/* Header */}
        <Header
          {...headerProps}
          onMenuClick={() => setMobileOpen(true)}
          t={sidebarProps.t}
        />

        {/* Área de contenido */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
