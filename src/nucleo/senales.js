/* Núcleo — qué merece mirarse este trimestre, y por qué
 *
 * Sin React, sin DOM, sin jsPDF. Es lo que alimenta el resumen ejecutivo de la
 * pantalla y del informe.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA QUE ESTE ARCHIVO EXISTE PARA SOSTENER
 *
 * **Un indicador es una señal, no un diagnóstico.** Una media baja es
 * compatible con dificultades de aprendizaje, pero también con un aumento
 * legítimo de la exigencia, con una cohorte de partida distinta, con un cambio
 * de instrumentos de evaluación o con un problema de asistencia. Saltar del
 * dato a la causa es rápido, suena convincente y es la forma más fácil de
 * convertir una tabla en un juicio sobre alguien.
 *
 * Por eso de aquí NO sale ninguna frase que explique nada. Sale:
 *
 *   - la observación, en cifras y con su `n`;
 *   - **qué tan sólida es la señal**, y por qué;
 *   - qué preguntas puede contestar la propia aplicación, YA contestadas;
 *   - y qué preguntas exigen que alguien vaya a mirar fuera de los datos.
 *
 * Esa última división es la que de verdad aporta algo: la aplicación sabe si
 * algo es persistente, si se repite en otra cohorte, cómo está la dispersión y
 * cuánta gente hay detrás. No sabe —ni puede— si ha cambiado el profesorado,
 * si se han cambiado los criterios de evaluación o si hay un problema de
 * asistencia. Decir cuál es cuál evita las dos formas de equivocarse: dar por
 * comprobado lo que nadie ha mirado, y salir a preguntar lo que ya está en la
 * pantalla.
 *
 * ---------------------------------------------------------------------------
 * Y POR QUÉ SE ORDENAN EN VEZ DE AVISAR DE TODO
 *
 * La tentación es marcar cualquier cosa dudosa para no perderse nada. Ya
 * sabemos cómo acaba: **un cuadro que siempre tiene algo en rojo se aprende a
 * ignorar en una semana**, y entonces se pierde todo. Así que no se decide
 * *si* avisar; se ordena por solidez, con los criterios dichos en voz alta, y
 * quien mira decide dónde corta.
 *
 * Los criterios de solidez son acumulativos y ninguno basta por sí solo: una
 * media baja suelta en un trimestre pesa poco; una media baja que además es
 * persistente, se repite en otra cohorte y afecta a treinta alumnos pesa
 * mucho. Es la diferencia entre una anécdota y algo estructural.
 */

import { esAgregado, parseTrimestre } from './texto.js';
import { detectarEtapa } from './estadistica.js';

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

/** El reparto de una asignatura: si sus notas están más juntas o más
 *  separadas de lo habitual EN ESTE CENTRO.
 *
 *  ---------------------------------------------------------------------------
 *  POR QUÉ NO HAY UN NÚMERO FIJO, Y POR QUÉ ESTO NO ES UNA SEÑAL APARTE
 *
 *  Primero fue un umbral fijo —1,5, el mismo que pinta la línea del mapa de
 *  dispersión— y una señal propia, «notas muy repartidas». Al mirarlo en
 *  pantalla con datos de verdad, **las diez primeras señales del centro eran
 *  esa misma**, con desviaciones entre 1,53 y 1,75. Medido: en ese centro la
 *  mediana es 1,36 y el tercer cuartil 1,53, así que el umbral marcaba a una
 *  de cada tres asignaturas y no distinguía nada.
 *
 *  Dos cambios, y los dos vienen de la misma idea:
 *
 *  1. **La referencia es el propio centro.** Un 1,5 querría decir cosas
 *     distintas en un conservatorio y en otro, y nadie sabe de dónde salió.
 *     Se comparan las asignaturas con las del mismo momento.
 *  2. **La dispersión no es una señal: es un modificador.** Por sí sola no
 *     dice nada —una nube repartida puede ser una evaluación que distingue
 *     bien—. Lo que cambia la decisión es si una media baja la comparte el
 *     grupo o está concentrada en algunos: en el primer caso se mira la
 *     asignatura, en el segundo se mira a quién. Así que viaja pegada a la
 *     señal que sí lo es.
 */
export const REPARTO = { concentrado: 'concentrado', compartido: 'compartido', medio: 'medio' };

/** Con media alta, notas casi idénticas. No es un problema: es la única
 *  situación en la que conviene preguntarse si la evaluación distingue
 *  niveles distintos, y esa pregunta la hace alguien, no la tabla. */
export const DISPERSION_MUY_BAJA = 0.6;

/** El alumnado mínimo para decir algo sobre la FORMA de una distribución.
 *
 *  El mínimo general de la aplicación son tres alumnos, y para una media está
 *  bien: una media de tres notas es una media de tres notas. Pero la
 *  desviación típica es una afirmación sobre cómo se reparten, y sobre tres
 *  datos no se reparte nada — se vio en pantalla: «notas altas y muy parecidas
 *  entre sí» sobre un grupo de tres, que es una frase sin contenido.
 *
 *  Diez es una convención, como todos los umbrales de aquí, y está escrita
 *  para poder discutirla. La razón de que sea mayor que el mínimo general es
 *  que hablar de forma exige más datos que hablar de nivel. */
export const MINIMO_PARA_FORMA = 10;

/** Los cuartiles de una lista de números. Sin interpolar: con veinte
 *  asignaturas, afinar el cuartil no cambia ninguna decisión y sí complica
 *  leer el código. */
const cuartiles = (valores) => {
  const v = valores.filter(esNumero).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const en = (p) => v[Math.floor((v.length - 1) * p)];
  return { q1: en(0.25), mediana: en(0.5), q3: en(0.75), n: v.length };
};

/* ------------------------------------------------------------------ */
/* La solidez de una señal                                             */

/** Lo que hace que una señal merezca más atención que otra.
 *
 *  Los pesos no salen de ningún sitio con autoridad: salen de que la
 *  persistencia y la repetición entre cohortes son lo único que distingue un
 *  factor estructural de una casualidad, así que pesan el doble que lo demás.
 *  Están aquí, juntos y con nombre, para que se puedan discutir. */
export const PESOS = {
  persistente: 2,
  otraCohorte: 2,
  variosIndicadores: 1,
  magnitud: 1,
  alcance: 1,
  transicion: 1
};

const solidezDe = (motivos) => motivos.reduce((s, m) => s + (PESOS[m] || 0), 0);

/* ------------------------------------------------------------------ */
/* Qué puede contestar la aplicación y qué no                          */

/** Lo que hay que ir a mirar fuera de los datos, por tipo de señal. Son claves
 *  estables; el texto lo pone quien pinta.
 *
 *  Esta lista es deliberadamente corta. Una lista de veinte cosas que
 *  comprobar no se comprueba: se hojea. */
export const A_MIRAR = {
  mediaBaja: ['cambioCriterios', 'cambioProfesorado', 'cohorteDistinta', 'asistencia'],
  suspensosAltos: ['cambioCriterios', 'recuperacion', 'asistencia'],
  concentracionAlta: ['discriminaLaEvaluacion'],
  entraEnRojo: ['cambioCriterios', 'cambioProfesorado', 'calendario'],
  caidaEntreCursos: ['cambioCriterios', 'cambioProfesorado', 'cohorteDistinta'],
  correlacionFuerte: ['competenciasCompartidas', 'criteriosParecidos']
};

/* ------------------------------------------------------------------ */

/** Todas las asignaturas de un trimestre, ya filtradas por etapa y por el
 *  mínimo de alumnado. Las filas de total no son asignaturas. */
const asignaturasDe = (datosTrimestre, modoEtapa, umbrales) => {
  const fuera = [];
  Object.entries(datosTrimestre || {}).forEach(([nivel, asigs]) => {
    if (nivel === 'GLOBAL') return;
    if (modoEtapa && modoEtapa !== 'TODOS' && detectarEtapa(nivel) !== modoEtapa) return;
    Object.entries(asigs || {}).forEach(([asignatura, data]) => {
      if (esAgregado(asignatura) || !data || !data.stats) return;
      const s = data.stats;
      /* El mínimo de alumnado no es cosmético: con dos registros, un
         porcentaje no significa nada y una señal sobre él es ruido con
         apariencia de dato. */
      if (!esNumero(s.registros) || s.registros < (umbrales?.alumnosMinimo ?? 0)) return;
      fuera.push({ nivel, asignatura, etapa: detectarEtapa(nivel), stats: s });
    });
  });
  return fuera;
};

const claveDe = (nivel, asignatura) =>
  `${String(nivel).toUpperCase()}|${String(asignatura).trim().toLowerCase()}`;

/** En cuántos momentos del curso esta asignatura ha estado en rojo.
 *  Sale de la serie de alertas, que es quien recorre todas las evaluaciones. */
const vecesEnRojo = (serieAlertas, nivel, asignatura) => {
  if (!serieAlertas || !Array.isArray(serieAlertas.puntos)) return 0;
  const clave = claveDe(nivel, asignatura);
  return serieAlertas.puntos.filter((p) =>
    (p.listaDificiles || []).some((a) => claveDe(a.nivel, a.asignatura) === clave)
  ).length;
};

/** La misma asignatura y el mismo curso, en OTRO curso académico.
 *  Devuelve `null` si no hay con qué comparar — que no es lo mismo que «no se
 *  repite», y por eso se distinguen. */
const enOtraCohorte = ({ trimestresDisponibles, datosCompletos, trimestreSeleccionado,
                         nivel, asignatura, umbrales }) => {
  const yo = parseTrimestre(trimestreSeleccionado);
  if (!yo || !yo.curso) return null;

  let hayConQueComparar = false;
  let apareceIgual = false;

  (trimestresDisponibles || []).forEach((t) => {
    const p = parseTrimestre(t);
    /* MISMA evaluación y MISMA etapa, otro curso académico: comparar la 1.ª de
       este año con la 2.ª del anterior no significa nada. */
    if (!p || !p.curso || p.curso === yo.curso) return;
    if (p.base !== yo.base) return;
    if (yo.etapa && p.etapa && p.etapa !== yo.etapa) return;
    const datos = (datosCompletos || {})[t];
    if (!datos) return;
    hayConQueComparar = true;
    const s = datos[nivel] && datos[nivel][asignatura] && datos[nivel][asignatura].stats;
    if (!s) return;
    if (esNumero(s.registros) && s.registros < (umbrales?.alumnosMinimo ?? 0)) return;
    if (esNumero(s.notaMedia) && esNumero(umbrales?.mediaCritica) && s.notaMedia < umbrales.mediaCritica) apareceIgual = true;
    if (esNumero(s.suspendidos) && esNumero(umbrales?.suspensosAlerta) && s.suspendidos >= umbrales.suspensosAlerta) apareceIgual = true;
  });

  if (!hayConQueComparar) return null;
  return apareceIgual;
};

/* ------------------------------------------------------------------ */

/** Las señales del trimestre que se está mirando, ordenadas por solidez.
 *
 * No filtra nada: **devuelve todas**. Quien pinta decide dónde corta —la
 * pantalla las enseña todas y el informe se queda con las primeras—, y esa
 * decisión se toma con la lista delante, no escondida aquí dentro.
 *
 * @param trimestreSeleccionado  la clave del fichero que se mira
 * @param datosCompletos         todos los ficheros cargados
 * @param trimestresDisponibles  sus claves
 * @param umbrales               con los que se clasifica
 * @param modoEtapa              'EEM' | 'EPM' | 'TODOS'
 * @param serieAlertas           lo que devuelve `serieAlertas` (opcional)
 * @param correlaciones          las del trimestre (opcional)
 * @param tendencias             las transversales (opcional)
 * @returns [{ clave, tipo, nivel, asignatura, cifras, solidez, comprobado, aMirar }]
 */
export const senalesDelTrimestre = ({
  trimestreSeleccionado,
  datosCompletos = {},
  trimestresDisponibles = [],
  umbrales,
  modoEtapa,
  serieAlertas = null,
  correlaciones = [],
  tendencias = []
} = {}) => {
  if (!trimestreSeleccionado || !umbrales) return [];
  const datos = datosCompletos[trimestreSeleccionado];
  if (!datos) return [];

  const senales = [];
  const asignaturas = asignaturasDe(datos, modoEtapa, umbrales);

  /* La mediana del alumnado por asignatura. Sirve para poder decir «afecta a
     más gente que la mitad de las asignaturas» en vez de inventarse un número
     redondo que en un centro de doscientos alumnos y en otro de mil querría
     decir cosas distintas. */
  const tamanos = asignaturas.map((a) => a.stats.registros).filter(esNumero).sort((x, y) => x - y);
  const medianaRegistros = tamanos.length
    ? tamanos[Math.floor((tamanos.length - 1) / 2)]
    : 0;

  /* La dispersión típica DE ESTE CENTRO en este momento. Es la referencia
     contra la que se dice si una asignatura tiene las notas más juntas o más
     separadas de lo habitual, en vez de contra un número que no sabe en qué
     centro está. */
  const dispersionCentro = cuartiles(asignaturas.map((a) => a.stats.desviacion));

  const repartoDe = (desviacion, registros) => {
    if (!esNumero(desviacion) || !dispersionCentro) return null;
    /* Sobre poca gente, la desviación no describe un reparto. */
    if (!esNumero(registros) || registros < MINIMO_PARA_FORMA) return null;
    /* Hacen falta unas cuantas asignaturas para que un cuartil signifique
       algo. Con cuatro, el «tercer cuartil» es la segunda de la lista. */
    if (dispersionCentro.n < 8) return null;
    const como = desviacion >= dispersionCentro.q3 ? REPARTO.concentrado
      : desviacion <= dispersionCentro.q1 ? REPARTO.compartido
        : REPARTO.medio;
    return { como, desviacion, tipicaDelCentro: dispersionCentro.mediana,
             q1: dispersionCentro.q1, q3: dispersionCentro.q3 };
  };

  /* Qué asignaturas caen en una transición: las que la comparación transversal
     ha marcado como valle o como decreciente. No es lo mismo un curso flojo
     suelto que un escalón por el que pasa todo el alumnado. */
  const enTransicion = new Set();
  (tendencias || []).forEach((tn) => {
    const tipo = tn?.tendenciaMedia?.tipo;
    if (tipo === 'valle' || String(tipo || '').startsWith('decreciente')) {
      enTransicion.add(String(tn.asignatura).trim().toLowerCase());
    }
  });

  asignaturas.forEach(({ nivel, asignatura, etapa, stats }) => {
    const comunes = () => {
      const veces = vecesEnRojo(serieAlertas, nivel, asignatura);
      const otra = enOtraCohorte({ trimestresDisponibles, datosCompletos,
        trimestreSeleccionado, nivel, asignatura, umbrales });
      return { veces, otra };
    };

    const cifras = {
      notaMedia: esNumero(stats.notaMedia) ? stats.notaMedia : null,
      desviacion: esNumero(stats.desviacion) ? stats.desviacion : null,
      aprobados: esNumero(stats.aprobados) ? stats.aprobados : null,
      suspendidos: esNumero(stats.suspendidos) ? stats.suspendidos : null,
      registros: stats.registros
    };

    /* Cuántos indicadores distintos apuntan a la vez a esta asignatura. Que
       coincidan tres es lo que separa una cifra rara de algo que mirar. */
    let indicadores = 0;
    const bajaMedia = esNumero(cifras.notaMedia) && esNumero(umbrales.mediaCritica) &&
      cifras.notaMedia < umbrales.mediaCritica;
    const muchosSuspensos = esNumero(cifras.suspendidos) && esNumero(umbrales.suspensosAlerta) &&
      cifras.suspendidos >= umbrales.suspensosAlerta;
    if (bajaMedia) indicadores++;
    if (muchosSuspensos) indicadores++;
    const reparto = repartoDe(cifras.desviacion, cifras.registros);

    const anadir = (tipo, extra) => {
      const { veces, otra } = comunes();
      /* Una sola fuente para «persistente». Estaba escrito dos veces —aquí y
         en `comprobado`— y una mutación demostró que se podían separar: la
         señal dejaba de contar como persistente para ordenar y seguía
         diciendo que lo era en la ficha. Dos cifras de lo mismo, distintas. */
      const persistente = veces > 1;
      const motivos = [];
      if (persistente) motivos.push('persistente');
      if (otra === true) motivos.push('otraCohorte');
      if (indicadores > 1) motivos.push('variosIndicadores');
      if (extra?.magnitud) motivos.push('magnitud');
      /* El alcance no es «muchos alumnos» en abstracto: es que esta asignatura
         tenga más alumnado que la mediana de las que se están mirando. */
      if (cifras.registros >= medianaRegistros) motivos.push('alcance');
      if (enTransicion.has(String(asignatura).trim().toLowerCase())) motivos.push('transicion');

      senales.push({
        clave: `${tipo}|${claveDe(nivel, asignatura)}`,
        tipo, nivel, asignatura, etapa,
        cifras,
        /* Si lo que se observa lo comparte el grupo o está concentrado en
           algunos. Cambia la decisión: en un caso se mira la asignatura, en
           el otro se mira a quién. `null` cuando no hay bastantes
           asignaturas para saber qué es lo habitual aquí. */
        reparto,
        solidez: { puntos: solidezDe(motivos), motivos },
        /* Las preguntas que la aplicación sí sabe contestar, contestadas.
           `null` es «no hay con qué comparar», que no es «no». */
        comprobado: {
          momentosEnRojo: veces,
          persistente,
          otraCohorte: otra,
          desviacion: cifras.desviacion,
          suspendidos: cifras.suspendidos,
          alumnado: cifras.registros
        },
        aMirar: A_MIRAR[tipo] || []
      });
    };

    if (bajaMedia) {
      anadir('mediaBaja', {
        magnitud: esNumero(umbrales.mediaCritica) && cifras.notaMedia <= umbrales.mediaCritica - 1
      });
    }
    if (muchosSuspensos) {
      anadir('suspensosAltos', {
        magnitud: esNumero(umbrales.suspensosAlerta) &&
          cifras.suspendidos >= umbrales.suspensosAlerta + 15
      });
    }
    /* Media alta y notas casi idénticas. **No es un problema**, y el rótulo no
       puede insinuar que lo sea: es la única situación en la que conviene
       preguntarse si la evaluación distingue niveles distintos, y esa pregunta
       la tiene que hacer alguien, no la tabla.
       Se pide poco Y por debajo de la referencia absoluta: en un centro donde
       todo esté muy junto, el cuartil bajo marcaría asignaturas normales. */
    if (esNumero(cifras.notaMedia) && esNumero(umbrales.mediaFacil) &&
        cifras.notaMedia >= umbrales.mediaFacil &&
        esNumero(cifras.desviacion) && cifras.desviacion <= DISPERSION_MUY_BAJA &&
        cifras.registros >= MINIMO_PARA_FORMA &&
        (!reparto || reparto.como === REPARTO.compartido)) {
      anadir('concentracionAlta', {});
    }
  });

  /* Las que entran en rojo entre una evaluación y la siguiente. Van aparte
     porque no son un estado, son un cambio, y un cambio pesa distinto. */
  if (serieAlertas && Array.isArray(serieAlertas.cambios)) {
    serieAlertas.cambios.forEach((c) => {
      (c.entran || []).forEach((a) => {
        const otra = enOtraCohorte({ trimestresDisponibles, datosCompletos,
          trimestreSeleccionado, nivel: a.nivel, asignatura: a.asignatura, umbrales });
        const motivos = [];
        if (otra === true) motivos.push('otraCohorte');
        if (enTransicion.has(String(a.asignatura).trim().toLowerCase())) motivos.push('transicion');
        senales.push({
          clave: `entraEnRojo|${claveDe(a.nivel, a.asignatura)}|${c.a}`,
          tipo: 'entraEnRojo',
          nivel: a.nivel, asignatura: a.asignatura, etapa: a.etapa,
          cifras: { notaMedia: a.notaMedia, suspendidos: a.suspendidos,
                    desviacion: null, aprobados: null, registros: a.registros },
          salto: { de: c.de, a: c.a },
          solidez: { puntos: solidezDe(motivos), motivos },
          comprobado: { otraCohorte: otra, alumnado: a.registros,
                        suspendidos: a.suspendidos, momentosEnRojo: null, persistente: false,
                        desviacion: null },
          aMirar: A_MIRAR.entraEnRojo
        });
      });
    });
  }

  /* Las correlaciones fuertes. Se incluyen porque son útiles para pensar en
     coordinación, y con el aviso puesto: **no dicen que mejorar una mejore la
     otra**. Y solo con `n` suficiente, que es lo que separa un 0,72 de algo. */
  (correlaciones || []).forEach((c) => {
    const r = Number(c.Correlacion);
    if (!Number.isFinite(r) || Math.abs(r) < 0.6) return;
    const n = Number(c.N);
    if (Number.isFinite(n) && n < (umbrales.alumnosMinimo ?? 0)) return;
    const motivos = Math.abs(r) >= 0.8 ? ['magnitud'] : [];
    senales.push({
      clave: `correlacionFuerte|${c.Nivel}|${c.Asignatura1}|${c.Asignatura2}`,
      tipo: 'correlacionFuerte',
      nivel: c.Nivel, asignatura: null, etapa: detectarEtapa(c.Nivel),
      par: [c.Asignatura1, c.Asignatura2],
      cifras: { correlacion: r, registros: Number.isFinite(n) ? n : null,
                notaMedia: null, desviacion: null, aprobados: null, suspendidos: null },
      solidez: { puntos: solidezDe(motivos), motivos },
      comprobado: { alumnado: Number.isFinite(n) ? n : null, otraCohorte: null,
                    momentosEnRojo: null, persistente: false, desviacion: null,
                    suspendidos: null },
      aMirar: A_MIRAR.correlacionFuerte
    });
  });

  /* Orden: primero lo más sólido. A igual solidez, lo que afecta a más gente;
     y a igualdad de todo, por clave, para que dos ejecuciones den la misma
     lista y la pantalla no baile entre recargas. */
  return senales.sort((a, b) => {
    if (b.solidez.puntos !== a.solidez.puntos) return b.solidez.puntos - a.solidez.puntos;
    const ra = a.cifras.registros || 0, rb = b.cifras.registros || 0;
    if (rb !== ra) return rb - ra;
    return a.clave < b.clave ? -1 : (a.clave > b.clave ? 1 : 0);
  });
};

export { esAgregado };
