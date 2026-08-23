import React from 'react';
import { translations } from '../translations.js';
import { idiomaActual } from '../idioma.js';

/**
 * Red de seguridad de la interfaz.
 *
 * Hasta hoy no había ninguna, y eso significa que **cualquier** error
 * inesperado durante el render dejaba la página EN BLANCO, sin mensaje y sin
 * pista. Pasaba de verdad: al seleccionar una asignatura cuya moda venía vacía,
 * el formateo reventaba y la app desaparecía. Esa causa concreta está
 * arreglada, pero la siguiente haría exactamente lo mismo.
 *
 * Con esto, un error se convierte en una pantalla que dice qué ha pasado y
 * permite seguir: los datos cargados están en memoria y casi siempre basta con
 * volver a la vista anterior.
 *
 * Es una clase a propósito: React solo ofrece captura de errores en clases.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    /* A la consola sí, que es donde se mira cuando alguien reporta el fallo.
       No se manda a ningún sitio: la app no habla con nadie. */
    console.error('[Dashboard] Error no controlado en el render:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    /* El idioma no puede venir por props: este componente está por encima del
       que lo guarda, y cuando salta ese ya no está montado. */
    const tabla = translations[idiomaActual()] || translations.es;
    const t = (k) => tabla[k];
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-lg w-full bg-white border border-gray-300 rounded-lg p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            {t('errorTitulo') || 'Algo ha fallado en esta pantalla'}
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            {t('errorTexto') ||
              'Los datos que habías cargado siguen en memoria. Vuelve a la vista anterior o recarga la página y prueba con otra selección.'}
          </p>
          <pre className="text-xs bg-gray-100 rounded p-3 overflow-x-auto text-gray-700 mb-4">
            {String(this.state.error && this.state.error.message)}
          </pre>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white"
              onClick={() => this.setState({ error: null })}
            >
              {t('errorReintentar') || 'Volver a intentarlo'}
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700"
              onClick={() => window.location.reload()}
            >
              {t('errorRecargar') || 'Recargar la página'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
