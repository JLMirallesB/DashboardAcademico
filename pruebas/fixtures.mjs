/* Ficheros de mentira que reproducen fallos concretos — pruebas/fixtures.mjs
 *
 * No son «un CSV de ejemplo»: cada uno está fabricado para que una cosa
 * concreta salga mal si el código vuelve a estar mal. Los valores son
 * pequeños y redondos para poder comprobarlos a mano.
 *
 * Ningún dato real: aquí no entra ni un NIA ni un nombre.
 */

const CAB = 'Tipo;Nivel;Asignatura;Registros;NotaMedia;Desviacion;Moda;' +
  'PctAprobados;PctSuspendidos;ModaAprobados;ModaSuspendidos;' +
  'Dist1;Dist2;Dist3;Dist4;Dist5;Dist6;Dist7;Dist8;Dist9;Dist10';

const CEROS = '0;0;0;0;0;0;0;0;0;0';

/** Una fila de #ESTADISTICAS. Los porcentajes se escriben como los escribe el
 *  analizador: fracción de 0 a 1, sin símbolo. */
export function fila({ tipo, nivel, asignatura, registros = 10, media = 7,
                       desviacion = 1, moda = 7, aprobados = 0.9,
                       suspendidos = 0.1, modaAprob = 7, modaSusp = 4 }) {
  const n = (v) => (v === null || v === undefined ? '—' : String(v).replace('.', ','));
  return [tipo, nivel, asignatura, registros, n(media), n(desviacion), n(moda),
          n(aprobados), n(suspendidos), n(modaAprob), n(modaSusp), CEROS].join(';');
}

/** Un CSV completo a partir de sus filas.
 *  El curso académico forma parte de la CLAVE del fichero desde el 23/08/2026
 *  —«1EV-2627-EEM»—, así que los constructores lo aceptan: es lo que permite
 *  montar en una prueba dos cursos distintos y comprobar que no se pisan. */
export function csv({ trimestre = '1EV', centro = 'Centro de prueba', filas = [],
                      agrupaciones = [], curso = '26/27' } = {}) {
  const partes = [
    '#METADATA',
    'Campo;Valor',
    'Centro;' + centro,
    'CursoAcademico;' + curso,
    'Trimestre;' + trimestre,
    '#ESTADISTICAS',
    CAB,
    ...filas
  ];
  if (agrupaciones.length) {
    partes.push('#AGRUPACIONES', 'Tipo;Asignatura;Grupos', ...agrupaciones);
  }
  return partes.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/* Los trimestres que hacen falta para probar la evolución              */

/** Un trimestre de elemental. `media` manda la nota del centro y del nivel. */
export const elemental = (trimestre, media, curso) => csv({
  trimestre, curso,
  filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100, media }),
    fila({ tipo: 'GLOBAL_ESP', nivel: 'GLOBAL', asignatura: 'Total Especialidad', registros: 50, media }),
    /* Ojo: elemental escribe «no» en minúscula. */
    fila({ tipo: 'GLOBAL_NOESP', nivel: 'GLOBAL', asignatura: 'Total no Especialidad', registros: 50, media }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 20, media }),
    fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 25, media }),
    fila({ tipo: 'CURSO_ESP', nivel: '1EEM', asignatura: 'Total Especialidad', registros: 12, media }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Piano', registros: 8, media })
  ]
});

/** Un trimestre de profesional. Escribe «No» con mayúscula, como su plantilla. */
export const profesional = (trimestre, media, curso) => csv({
  trimestre, curso,
  filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 200, media }),
    fila({ tipo: 'GLOBAL_ESP', nivel: 'GLOBAL', asignatura: 'Total Especialidad', registros: 90, media }),
    fila({ tipo: 'GLOBAL_NOESP', nivel: 'GLOBAL', asignatura: 'Total No Especialidad',
           registros: 110, media, aprobados: 0.99 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 30, media }),
    fila({ tipo: 'CURSO_TOTAL', nivel: '1EPM', asignatura: 'Total', registros: 40, media }),
    fila({ tipo: 'CURSO_ESP', nivel: '1EPM', asignatura: 'Total Especialidad', registros: 20, media }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EPM', asignatura: 'Piano', registros: 10, media })
  ]
});
