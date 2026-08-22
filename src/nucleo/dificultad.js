/* Núcleo — qué asignaturas están costando y cuáles no
 *
 * Sin React. Este cálculo estaba DENTRO del render, en un `useMemo` de 90
 * líneas en mitad del componente, y por eso no había forma de probarlo.
 *
 * Había además una segunda copia en `useDifficultyAnalysis`, importada y nunca
 * usada: un arreglo que se le hizo en su día no llegó nunca a la pantalla. La
 * copia que se conserva es LA QUE SE VE, y la otra se retira — mantener dos
 * respuestas para la misma pregunta es cómo se llega a que la tarjeta de KPIs y
 * esta lista den cifras distintas de lo mismo.
 */

import { esFilaTotal, normalizar } from './texto.js';
import { calcularResultado, detectarEtapa } from './estadistica.js';

/** Analiza las asignaturas de un trimestre y las reparte en tres cajas.
 *
 * @param datos     el trimestre: { GLOBAL: {...}, '1EEM': {...}, ... }
 * @param opciones  { umbrales, vista: 'niveles'|'global', modoEtapa }
 * @returns { dificiles, neutrales, faciles, todas }
 */
export const analizarDificultad = (datos, opciones) => {
  const vacio = { dificiles: [], neutrales: [], faciles: [], todas: [] };
  if (!datos) return vacio;

  const { umbrales, vista, modoEtapa } = opciones || {};
  const asignaturas = [];

  Object.entries(datos).forEach(([nivel, asigs]) => {
    if (vista === 'niveles' && nivel === 'GLOBAL') return;
    if (vista === 'global' && nivel !== 'GLOBAL') return;
    if (nivel !== 'GLOBAL' && modoEtapa !== 'TODOS' && detectarEtapa(nivel) !== modoEtapa) return;

    Object.entries(asigs).forEach(([asig, data]) => {
      /* Las tres filas de total se apartan, no solo «Total». Antes se
         comparaba la cadena exacta, así que «Total Especialidad» y «Total no
         Especialidad» entraban en el ranking como si fueran asignaturas: dos
         filas falsas por cada curso, y en la vista por niveles con seis cursos
         de profesional eran doce entradas fantasma. Peor todavía, la tarjeta
         de KPIs sí las apartaba, así que la tarjeta y esta lista daban cifras
         distintas de lo mismo. */
      if (esFilaTotal(asig) || !data || !data.stats) return;
      if (data.stats.registros < umbrales.alumnosMinimo) return;

      const stats = data.stats;
      const resultado = calcularResultado(stats, umbrales);

      let categoria = 'NEUTRAL';
      let razon = '';

      if (resultado === 'DIFÍCIL') {
        categoria = 'DIFÍCIL';
        const motivos = [];
        if (stats.suspendidos >= umbrales.suspensosAlerta) {
          motivos.push(`${(stats.suspendidos || 0).toFixed(1)}% de suspensos (umbral: ${umbrales.suspensosAlerta}%)`);
        }
        if (stats.notaMedia < umbrales.mediaCritica) {
          motivos.push(`nota media de ${(stats.notaMedia || 0).toFixed(2)} (umbral crítico: ${umbrales.mediaCritica})`);
        }
        razon = `Esta asignatura tiene ${motivos.join(' y/o ')}`;
      } else if (resultado === 'FÁCIL') {
        categoria = 'FÁCIL';
        const motivos = [];
        if (stats.aprobados >= umbrales.aprobadosMinimo) {
          motivos.push(`${(stats.aprobados || 0).toFixed(1)}% de aprobados (umbral: ${umbrales.aprobadosMinimo}%)`);
        }
        if (stats.notaMedia >= umbrales.mediaFacil) {
          motivos.push(`nota media de ${(stats.notaMedia || 0).toFixed(2)} (umbral fácil: ${umbrales.mediaFacil})`);
        }
        razon = `Esta asignatura tiene ${motivos.join(' y/o ')}`;
      } else {
        razon = `Esta asignatura se encuentra en un rango equilibrado con ${(stats.aprobados || 0).toFixed(1)}% de aprobados y una nota media de ${(stats.notaMedia || 0).toFixed(2)}`;
      }

      asignaturas.push({
        nivel,
        asignatura: asig,
        categoria,
        razon,
        notaMedia: stats.notaMedia,
        desviacion: stats.desviacion,
        moda: stats.moda,
        aprobados: stats.aprobados,
        suspendidos: stats.suspendidos,
        modaAprobados: stats.modaAprobados,
        modaSuspendidos: stats.modaSuspendidos,
        registros: stats.registros
      });
    });
  });

  /* Primero lo que preocupa. Dentro de cada caja, por nota media ascendente:
     lo más bajo arriba, que es por donde se empieza a mirar. */
  const orden = { 'DIFÍCIL': 0, 'NEUTRAL': 1, 'FÁCIL': 2 };
  asignaturas.sort((a, b) => {
    if (orden[a.categoria] !== orden[b.categoria]) return orden[a.categoria] - orden[b.categoria];
    return a.notaMedia - b.notaMedia;
  });

  return {
    dificiles: asignaturas.filter((a) => a.categoria === 'DIFÍCIL'),
    neutrales: asignaturas.filter((a) => a.categoria === 'NEUTRAL'),
    faciles: asignaturas.filter((a) => a.categoria === 'FÁCIL'),
    todas: asignaturas
  };
};

export { esFilaTotal, normalizar };
