/* Núcleo — leer el CSV que exporta el analizador
 *
 * Sin React y sin SheetJS: entra texto, sale una estructura. Es el contrato
 * entre el Excel del centro y todo lo demás, así que conviene tenerlo en un
 * sitio y con sus rarezas explicadas.
 *
 * El fichero va por secciones marcadas con almohadilla —#METADATA,
 * #ESTADISTICAS, #CORRELACIONES, #AGRUPACIONES— y el separador (`;` o `,`) se
 * adivina contando cuál abunda en las diez primeras líneas. #UMBRALES se
 * reconoce y se DESCARTA a propósito: los umbrales son del que mira, no del
 * fichero, y venían pisando los que el usuario acababa de ajustar.
 */

export const validarEstructuraCSV = (csvText) => {
  const lineas = csvText.split('\n').map(l => l.trim()).filter(l => l);

  // Validación básica: archivo no vacío
  if (lineas.length === 0) {
    throw new Error('El archivo CSV está vacío');
  }

  // Validar que tiene al menos las secciones requeridas
  const tieneMetadata = lineas.some(l => l.startsWith('#METADATA'));
  const tieneEstadisticas = lineas.some(l => l.startsWith('#ESTADISTICAS'));

  if (!tieneMetadata || !tieneEstadisticas) {
    throw new Error('El archivo CSV no tiene la estructura esperada. Debe contener #METADATA y #ESTADISTICAS');
  }

  return true;
};

/** Texto a número, con las dos formas de escribir que llegan de verdad.
 *
 * Antes era `replace(',', '.')` a secas, y eso hace dos cosas mal: solo cambia
 * LA PRIMERA coma, y no sabe nada de separadores de millar. Con `1.234,5`
 * salía 1,234 y con `1.050` registros salía **1,05** — y una asignatura con
 * 1,05 registros cae por debajo del mínimo de alumnado y **desaparece de todos
 * los análisis** sin que nada lo diga.
 *
 * Las reglas, en orden:
 *   · Si hay coma, la coma es el decimal y los puntos son millares.
 *   · Si solo hay puntos y la columna es de CONTAR (registros, distribución),
 *     un patrón de grupos de tres —`1.050`, `12.345`— son millares.
 *   · En cualquier otro caso el punto es el decimal, que es como llega un CSV
 *     con separador de coma.
 *
 * Lo de `entero` no es un adorno: sin saber qué columna es, `7.500` es
 * ambiguo —siete y medio o siete mil quinientos— y adivinarlo en una nota
 * sería peor que no tocarla.
 */
export const parseNumero = (valor, opciones) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  let num = valor.toString().trim();

  if (num.indexOf(',') >= 0) {
    num = num.replace(/\./g, '').replace(/,/g, '.');
  } else if (opciones && opciones.entero && /^-?\d{1,3}(\.\d{3})+$/.test(num)) {
    num = num.replace(/\./g, '');
  }

  const parsed = parseFloat(num);
  return isNaN(parsed) ? null : parsed;
};

/** Las columnas que cuentan cosas, donde un punto entre grupos de tres es un
 *  separador de millar y nunca un decimal. */
const COLUMNAS_ENTERAS = ['Registros', 'Dist1', 'Dist2', 'Dist3', 'Dist4', 'Dist5',
                          'Dist6', 'Dist7', 'Dist8', 'Dist9', 'Dist10'];


/**
 * Parsea una línea CSV respetando comillas dobles como delimitadores de campo
 * @param {string} linea - Línea a parsear
 * @param {string} separador - Separador de campos (';' o ',')
 * @returns {string[]} Array de campos parseados
 */
const parseCSVLine = (linea, separador) => {
  const campos = [];
  let campoActual = '';
  let dentroDeComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const char = linea[i];

    if (char === '"') {
      // Toggle estado de comillas
      dentroDeComillas = !dentroDeComillas;
      // No incluir las comillas en el campo
    } else if (char === separador && !dentroDeComillas) {
      // Separador fuera de comillas: fin de campo
      campos.push(campoActual.trim());
      campoActual = '';
    } else {
      // Carácter normal o separador dentro de comillas
      campoActual += char;
    }
  }

  // Añadir último campo
  campos.push(campoActual.trim());

  return campos;
};

/**
 * Parsea un archivo CSV con formato del Dashboard Académico
 * Detecta automáticamente el separador (punto y coma o coma)
 * @param {string} csvText - Contenido del archivo CSV
 * @returns {Object} Objeto con metadata, estadisticas y correlaciones
 */
export const parseCSV = (csvText) => {
  // Validar estructura del CSV
  validarEstructuraCSV(csvText);

  const lineas = csvText.split('\n').map(l => l.trim()).filter(l => l);

  // Detectar separador: si hay más ; que , en las primeras líneas, usar ;
  const primerasLineas = lineas.slice(0, 10).join('\n');
  const separador = (primerasLineas.match(/;/g) || []).length > (primerasLineas.match(/,/g) || []).length ? ';' : ',';

  let seccionActual = null;
  const resultado = {
    metadata: {},
    estadisticas: [],
    correlaciones: [],
    agrupaciones: []
  };

  let encabezadosStats = [];
  let encabezadosCorr = [];
  let encabezadosAgrup = [];

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    // Detectar sección
    if (linea.startsWith('#METADATA')) {
      seccionActual = 'metadata';
      continue;
    } else if (linea.startsWith('#ESTADISTICAS')) {
      seccionActual = 'estadisticas';
      continue;
    } else if (linea.startsWith('#CORRELACIONES')) {
      seccionActual = 'correlaciones';
      continue;
    } else if (linea.startsWith('#AGRUPACIONES')) {
      seccionActual = 'agrupaciones';
      continue;
    } else if (linea.startsWith('#UMBRALES')) {
      seccionActual = 'umbrales'; // Ignoramos umbrales del CSV
      continue;
    }

    // Parsear según sección usando el separador detectado (respetando comillas)
    const campos = parseCSVLine(linea, separador);

    if (seccionActual === 'metadata') {
      if (campos[0] === 'Campo') continue; // Skip header
      if (campos[0] && campos[1]) {
        resultado.metadata[campos[0]] = campos[1];
      }
    } else if (seccionActual === 'estadisticas') {
      // Nuevo formato: primera columna es 'Tipo', soportar también formato antiguo con 'Nivel'
      if (campos[0] === 'Tipo' || campos[0] === 'Nivel') {
        encabezadosStats = campos;
        continue;
      }
      if (campos[0] && encabezadosStats.length > 0) {
        const fila = {};
        /* Los porcentajes NO se convierten aquí: hace falta ver el fichero
           entero para saber en qué escala viene. Ver `escalaDePorcentajes`. */
        const explicitos = [];
        encabezadosStats.forEach((h, idx) => {
          let valor = campos[idx] || '';
          // Normalizar nombres de columnas del nuevo formato
          let nombreColumna = h;
          if (h === 'PctAprobados') nombreColumna = 'Aprobados';
          if (h === 'PctSuspendidos') nombreColumna = 'Suspendidos';

          /* Columnas de texto y columnas de número: el guión largo significa
             lo mismo en las dos —«aquí no hay dato»— pero se representa
             distinto. En las numéricas tiene que ser `null` y NO cadena vacía:
             `''.toFixed()` revienta, y como no hay ErrorBoundary la pantalla
             se queda en blanco sin decir nada. Pasaba al elegir cualquier
             asignatura cuya moda viniera como «—», que es lo normal siempre
             que ninguna nota se repite. */
          const esGuion = (valor === '—' || valor === '-' || valor === '–');
          const inicioNumericos = encabezadosStats[0] === 'Tipo' ? 3 : 2;
          const esNumerica = idx >= inicioNumericos;

          if (!esNumerica) {
            fila[nombreColumna] = esGuion ? '' : valor;
            return;
          }

          if (esGuion || valor === '') { fila[nombreColumna] = null; return; }

          const esPorc = valor.toString().includes('%');
          if (esPorc) {
            valor = valor.replace('%', '');
            explicitos.push(nombreColumna);
          }
          fila[nombreColumna] = parseNumero(valor,
            { entero: COLUMNAS_ENTERAS.indexOf(nombreColumna) >= 0 });
        });
        if (explicitos.length) fila.__porcentajeExplicito = true;
        resultado.estadisticas.push(fila);
      }
    } else if (seccionActual === 'correlaciones') {
      // Nuevo formato: primera columna es 'Tipo', soportar también formato antiguo con 'Nivel'
      if (campos[0] === 'Tipo' || campos[0] === 'Nivel') {
        encabezadosCorr = campos;
        continue;
      }
      if (campos[0] && encabezadosCorr.length > 0) {
        const fila = {};
        encabezadosCorr.forEach((h, idx) => {
          let valor = campos[idx] || '';
          if (h === 'Correlacion' && valor !== '') {
            valor = parseNumero(valor);
          }
          // Saltar la columna Tipo en el resultado final
          if (h !== 'Tipo') {
            fila[h] = valor;
          }
        });
        if (fila.Correlacion !== null && fila.Correlacion !== undefined) {
          resultado.correlaciones.push(fila);
        }
      }
    } else if (seccionActual === 'agrupaciones') {
      // Nuevo formato: primera columna es 'Tipo', soportar también formato antiguo con 'Asignatura'
      if (campos[0] === 'Tipo' || campos[0] === 'Asignatura') {
        encabezadosAgrup = campos;
        continue;
      }
      if (campos[0] && encabezadosAgrup.length > 0) {
        const fila = {};
        encabezadosAgrup.forEach((h, idx) => {
          // Saltar la columna Tipo en el resultado final
          if (h !== 'Tipo') {
            fila[h] = campos[idx] || '';
          }
        });
        // Solo añadir si tiene asignatura
        if (fila.Asignatura) {
          resultado.agrupaciones.push(fila);
        }
      }
    }
  }

  escalaDePorcentajes(resultado.estadisticas);
  return resultado;
};

/* ------------------------------------------------------------------ */

/** Pone los porcentajes en escala 0-100, decidiendo la escala UNA VEZ para
 *  todo el fichero.
 *
 * Antes se decidía celda a celda con «si vale 1 o menos, multiplica por 100».
 * Acierta con el fichero que produce el analizador —que escribe fracciones—
 * pero destroza cualquier otro: un `PctSuspendidos` de **1**, que en escala
 * 0-100 es un suspenso de cada cien, se convertía en **100 % de suspensos**,
 * la asignatura salía clasificada como DIFÍCIL y contaminaba el recuento.
 *
 * La escala es una propiedad del FICHERO, no de la celda. Si alguna fila trae
 * un porcentaje mayor que 1, o alguna venía con el símbolo `%`, entonces el
 * fichero está en 0-100 y no hay nada que multiplicar. El caso límite —un
 * fichero donde el máximo es exactamente 1— da lo mismo por los dos caminos:
 * 1 como fracción es 100 %, y como porcentaje sería un 1 % junto a un 99 % que
 * ya habría delatado la escala.
 */
export const escalaDePorcentajes = (filas) => {
  let hayExplicito = false;
  let maximo = 0;
  (filas || []).forEach((f) => {
    if (f.__porcentajeExplicito) hayExplicito = true;
    ['Aprobados', 'Suspendidos'].forEach((k) => {
      if (typeof f[k] === 'number' && f[k] > maximo) maximo = f[k];
    });
  });

  const enFraccion = !hayExplicito && maximo <= 1;
  (filas || []).forEach((f) => {
    if (enFraccion) {
      ['Aprobados', 'Suspendidos'].forEach((k) => {
        if (typeof f[k] === 'number') f[k] = f[k] * 100;
      });
    }
    delete f.__porcentajeExplicito;
  });
  return enFraccion ? 'fraccion' : 'porcentaje';
};
