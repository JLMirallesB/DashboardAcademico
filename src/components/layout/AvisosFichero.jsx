/**
 * Los avisos que trae el fichero, encima de todo lo demás.
 *
 * No los calcula la aplicación: los trae el libro de cálculo, que es quien
 * sabe qué registros se quedaron fuera. Van arriba y no en una pestaña porque
 * cambian lo que SIGNIFICA una cifra: «media 7,4» con cuatro registros fuera
 * no es la misma frase que «media 7,4» con cero.
 *
 * Se puede cerrar. Un aviso que no se puede quitar de en medio se convierte
 * en parte del decorado, y entonces ya no avisa de nada.
 */
import React, { useState } from 'react';
import { avisosDelFichero, filasLeidas } from '../../nucleo/avisos.js';

const COLOR = {
  malo: 'bg-red-50 border-red-200 text-red-800',
  ojo: 'bg-amber-50 border-amber-200 text-amber-800',
};

export const AvisosFichero = ({ metadata, t }) => {
  const [cerrado, setCerrado] = useState(false);
  const avisos = avisosDelFichero(metadata);
  const filas = filasLeidas(metadata);
  if (cerrado || !avisos.length) return null;

  return (
    <div className="px-6 pt-4">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{t('avisosTitulo')}</h2>
          <button
            onClick={() => setCerrado(true)}
            className="text-gray-400 hover:text-gray-700 text-sm px-2"
            aria-label={t('close') || 'Cerrar'}
          >
            ✕
          </button>
        </div>
        <ul className="divide-y divide-gray-100">
          {avisos.map((a) => (
            <li key={a.clave} className={`px-4 py-2 text-sm border-l-4 ${COLOR[a.nivel]}`}>
              {(t(a.mensaje) || a.mensaje).replace('{n}', a.n)}
            </li>
          ))}
        </ul>
        {filas !== null && (
          <p className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
            {(t('avisoFilasLeidas') || '').replace('{n}', filas.toLocaleString('es-ES'))}
          </p>
        )}
      </div>
    </div>
  );
};
