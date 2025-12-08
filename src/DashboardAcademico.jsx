import React, { useState, useMemo, useCallback, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { translations } from './translations.js';

const DashboardAcademico = () => {
  // Estado de idioma
  const [idioma, setIdioma] = useState('es');
  const t = (key) => translations[idioma][key];

  // Estado principal
  const [datosCompletos, setDatosCompletos] = useState({});
  const [correlacionesCompletas, setCorrelacionesCompletas] = useState({});
  const [metadata, setMetadata] = useState({});
  const [trimestresDisponibles, setTrimestresDisponibles] = useState([]);
  
  // Umbrales configurables
  const [umbrales, setUmbrales] = useState({
    suspensosAlerta: 30,
    mediaCritica: 6,
    mediaFacil: 8,
    aprobadosMinimo: 90,
    alumnosMinimo: 3
  });
  
  // UI State
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState(null);
  const [vistaActual, setVistaActual] = useState('estadisticas'); // 'estadisticas', 'correlaciones', 'evolucion', 'dificultad'
  const [selecciones, setSelecciones] = useState([]);
  const [mostrarModalConfirm, setMostrarModalConfirm] = useState(false);
  const [trimestrePendiente, setTrimestrePendiente] = useState(null);
  const [datosPendientes, setDatosPendientes] = useState(null);
  const [mostrarPanelUmbrales, setMostrarPanelUmbrales] = useState(false);
  const [mostrarPanelCarga, setMostrarPanelCarga] = useState(true);
  const [compararNiveles, setCompararNiveles] = useState(false);
  const [asignaturaComparada, setAsignaturaComparada] = useState('Lenguaje Musical');
  const [ordenCorrelaciones, setOrdenCorrelaciones] = useState('desc'); // 'desc', 'asc', 'none'
  const [ejeCorrelaciones, setEjeCorrelaciones] = useState('niveles'); // 'pares' o 'niveles'
  const [modoHeatmap, setModoHeatmap] = useState('relativo'); // 'absoluto' o 'relativo'
  const [modoDistribucion, setModoDistribucion] = useState('porcentaje'); // 'absoluto' o 'porcentaje'
  
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  // Colores para comparaciones
  const colores = [
    { line: "#1a1a2e", label: "Principal", bg: "#f8f9fa" },
    { line: "#e63946", label: "Rojo", bg: "#fff5f5" },
    { line: "#2a9d8f", label: "Verde", bg: "#f0fdf4" },
    { line: "#e9c46a", label: "Dorado", bg: "#fefce8" },
    { line: "#9381ff", label: "Violeta", bg: "#f5f3ff" }
  ];

  // Parser de CSV - detecta automáticamente el separador
  const parseCSV = useCallback((csvText) => {
    const lineas = csvText.split('\n').map(l => l.trim()).filter(l => l);
    
    // Detectar separador: si hay más ; que , en las primeras líneas, usar ;
    const primerasLineas = lineas.slice(0, 10).join('\n');
    const separador = (primerasLineas.match(/;/g) || []).length > (primerasLineas.match(/,/g) || []).length ? ';' : ',';
    
    let seccionActual = null;
    const resultado = {
      metadata: {},
      estadisticas: [],
      correlaciones: []
    };
    
    let encabezadosStats = [];
    let encabezadosCorr = [];
    
    // Función para convertir número (maneja tanto , como . decimal)
    const parseNumero = (valor) => {
      if (valor === '' || valor === null || valor === undefined) return null;
      // Reemplazar coma decimal por punto
      let num = valor.toString().replace(',', '.');
      const parsed = parseFloat(num);
      return isNaN(parsed) ? null : parsed;
    };
    
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
      } else if (linea.startsWith('#UMBRALES')) {
        seccionActual = 'umbrales'; // Ignoramos umbrales del CSV
        continue;
      }
      
      // Parsear según sección usando el separador detectado
      const campos = linea.split(separador).map(c => c.trim());
      
      if (seccionActual === 'metadata') {
        if (campos[0] === 'Campo') continue; // Skip header
        if (campos[0] && campos[1]) {
          resultado.metadata[campos[0]] = campos[1];
        }
      } else if (seccionActual === 'estadisticas') {
        if (campos[0] === 'Nivel') {
          encabezadosStats = campos;
          continue;
        }
        if (campos[0] && encabezadosStats.length > 0) {
          const fila = {};
          encabezadosStats.forEach((h, idx) => {
            let valor = campos[idx] || '';
            // Convertir números (columnas desde la 3ª en adelante)
            if (idx >= 2 && valor !== '') {
              valor = parseNumero(valor);
              // Si es porcentaje (Aprobados o Suspendidos) y viene como decimal, convertir
              if ((h === 'Aprobados' || h === 'Suspendidos') && valor !== null && valor <= 1) {
                valor = valor * 100;
              }
            }
            fila[h] = valor;
          });
          resultado.estadisticas.push(fila);
        }
      } else if (seccionActual === 'correlaciones') {
        if (campos[0] === 'Nivel') {
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
            fila[h] = valor;
          });
          if (fila.Correlacion !== null && fila.Correlacion !== undefined) {
            resultado.correlaciones.push(fila);
          }
        }
      }
    }
    
    return resultado;
  }, []);

  // Procesar datos parseados
  const procesarDatos = useCallback((parsed) => {
    const trimestre = parsed.metadata.Trimestre;
    if (!trimestre) {
      alert('Error: El CSV no contiene información de trimestre en METADATA');
      return null;
    }
    
    // Estructurar datos
    const datosEstructurados = {};
    parsed.estadisticas.forEach(fila => {
      const nivel = fila.Nivel;
      const asignatura = fila.Asignatura;
      
      if (!datosEstructurados[nivel]) {
        datosEstructurados[nivel] = {};
      }
      
      datosEstructurados[nivel][asignatura] = {
        stats: {
          registros: fila.Registros,
          notaMedia: fila.NotaMedia,
          desviacion: fila.Desviacion,
          moda: fila.Moda,
          aprobados: fila.Aprobados,
          suspendidos: fila.Suspendidos,
          modaAprobados: fila.ModaAprobados,
          modaSuspendidos: fila.ModaSuspendidos
        },
        distribucion: {
          1: fila.Dist1 || 0,
          2: fila.Dist2 || 0,
          3: fila.Dist3 || 0,
          4: fila.Dist4 || 0,
          5: fila.Dist5 || 0,
          6: fila.Dist6 || 0,
          7: fila.Dist7 || 0,
          8: fila.Dist8 || 0,
          9: fila.Dist9 || 0,
          10: fila.Dist10 || 0
        }
      };
    });
    
    return {
      trimestre,
      metadata: parsed.metadata,
      datos: datosEstructurados,
      correlaciones: parsed.correlaciones
    };
  }, []);

  // Aplicar datos
  const aplicarDatos = useCallback((procesado) => {
    console.log('[DEBUG] Aplicando datos:', procesado);
    const { trimestre, metadata: meta, datos, correlaciones } = procesado;

    console.log('[DEBUG] Trimestre:', trimestre);
    console.log('[DEBUG] Datos:', Object.keys(datos));
    console.log('[DEBUG] Correlaciones:', correlaciones?.length);

    setDatosCompletos(prev => ({
      ...prev,
      [trimestre]: datos
    }));

    setCorrelacionesCompletas(prev => ({
      ...prev,
      [trimestre]: correlaciones
    }));

    setMetadata(prev => ({
      ...prev,
      [trimestre]: meta
    }));

    setTrimestresDisponibles(prev => {
      const nuevos = prev.includes(trimestre) ? prev : [...prev, trimestre];
      return nuevos.sort((a, b) => {
        const orden = { '1EV': 1, '2EV': 2, '3EV': 3, 'FINAL': 4 };
        return (orden[a] || 99) - (orden[b] || 99);
      });
    });

    if (!trimestreSeleccionado) {
      console.log('[DEBUG] Estableciendo trimestre seleccionado:', trimestre);
      setTrimestreSeleccionado(trimestre);
    }

    // Inicializar selección por defecto
    if (selecciones.length === 0 && datos['GLOBAL']) {
      console.log('[DEBUG] Inicializando selección por defecto');
      setSelecciones([{
        id: 0,
        trimestre: trimestre,
        nivel: 'GLOBAL',
        asignatura: 'Todos'
      }]);
    }

    console.log('[DEBUG] Datos aplicados correctamente');
    setMostrarPanelCarga(false);
  }, [trimestreSeleccionado, selecciones.length]);

  // Cargar CSV
  const handleCargarCSV = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('[DEBUG] Cargando archivo CSV:', file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const texto = e.target.result;
      console.log('[DEBUG] CSV leído, longitud:', texto.length);
      const parsed = parseCSV(texto);
      console.log('[DEBUG] CSV parseado:', parsed);
      const procesado = procesarDatos(parsed);
      console.log('[DEBUG] Datos procesados:', procesado);

      if (!procesado) {
        console.error('[DEBUG] Error: procesarDatos devolvió null');
        return;
      }

      // Verificar si el trimestre ya existe
      if (trimestresDisponibles.includes(procesado.trimestre)) {
        console.log('[DEBUG] Trimestre ya existe, mostrando modal de confirmación');
        setTrimestrePendiente(procesado.trimestre);
        setDatosPendientes(procesado);
        setMostrarModalConfirm(true);
      } else {
        console.log('[DEBUG] Aplicando datos de nuevo trimestre:', procesado.trimestre);
        aplicarDatos(procesado);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [parseCSV, procesarDatos, trimestresDisponibles, aplicarDatos]);

  // Confirmar reemplazo de trimestre
  const confirmarReemplazo = useCallback(() => {
    if (datosPendientes) {
      aplicarDatos(datosPendientes);
    }
    setMostrarModalConfirm(false);
    setTrimestrePendiente(null);
    setDatosPendientes(null);
  }, [datosPendientes, aplicarDatos]);

  // Cancelar reemplazo
  const cancelarReemplazo = useCallback(() => {
    setMostrarModalConfirm(false);
    setTrimestrePendiente(null);
    setDatosPendientes(null);
  }, []);

  // Eliminar trimestre
  const eliminarTrimestre = useCallback((trimestre) => {
    setDatosCompletos(prev => {
      const nuevo = { ...prev };
      delete nuevo[trimestre];
      return nuevo;
    });
    
    setCorrelacionesCompletas(prev => {
      const nuevo = { ...prev };
      delete nuevo[trimestre];
      return nuevo;
    });
    
    setMetadata(prev => {
      const nuevo = { ...prev };
      delete nuevo[trimestre];
      return nuevo;
    });
    
    setTrimestresDisponibles(prev => prev.filter(t => t !== trimestre));
    
    if (trimestreSeleccionado === trimestre) {
      const restantes = trimestresDisponibles.filter(t => t !== trimestre);
      setTrimestreSeleccionado(restantes[0] || null);
    }
    
    setSelecciones(prev => prev.filter(s => s.trimestre !== trimestre));
  }, [trimestreSeleccionado, trimestresDisponibles]);

  // Exportar JSON
  const exportarJSON = useCallback(() => {
    const exportData = {
      metadata: {
        exportadoEl: new Date().toISOString(),
        trimestres: trimestresDisponibles,
        metadataPorTrimestre: metadata
      },
      umbrales,
      datos: datosCompletos,
      correlaciones: correlacionesCompletas
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_academico_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [trimestresDisponibles, metadata, umbrales, datosCompletos, correlacionesCompletas]);

  // Importar JSON
  const handleImportarJSON = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importado = JSON.parse(e.target.result);
        
        if (importado.datos) setDatosCompletos(importado.datos);
        if (importado.correlaciones) setCorrelacionesCompletas(importado.correlaciones);
        if (importado.umbrales) setUmbrales(importado.umbrales);
        if (importado.metadata) {
          setMetadata(importado.metadata.metadataPorTrimestre || {});
          const trims = importado.metadata.trimestres || Object.keys(importado.datos || {});
          setTrimestresDisponibles(trims);
          if (trims.length > 0) {
            setTrimestreSeleccionado(trims[0]);
            const primerTrim = trims[0];
            const niveles = Object.keys(importado.datos[primerTrim] || {});
            if (niveles.includes('GLOBAL')) {
              setSelecciones([{
                id: 0,
                trimestre: primerTrim,
                nivel: 'GLOBAL',
                asignatura: 'Todos'
              }]);
            }
          }
        }
        
        setMostrarPanelCarga(false);
      } catch (err) {
        alert('Error al parsear el archivo JSON');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  // Calcular resultado (FÁCIL/DIFÍCIL)
  const calcularResultado = useCallback((stats) => {
    if (!stats) return null;
    
    const esDificil = stats.suspendidos >= umbrales.suspensosAlerta || 
                      stats.notaMedia < umbrales.mediaCritica;
    const esFacil = stats.aprobados >= umbrales.aprobadosMinimo || 
                    stats.notaMedia >= umbrales.mediaFacil;
    
    if (esDificil) return 'DIFÍCIL';
    if (esFacil) return 'FÁCIL';
    return null;
  }, [umbrales]);

  // Obtener niveles disponibles
  const nivelesDisponibles = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) return [];
    return Object.keys(datosCompletos[trimestreSeleccionado]);
  }, [trimestreSeleccionado, datosCompletos]);

  // Obtener todas las asignaturas disponibles (excluyendo GLOBAL)
  const todasLasAsignaturas = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) return [];
    const asignaturas = new Set();
    Object.entries(datosCompletos[trimestreSeleccionado]).forEach(([nivel, asigs]) => {
      if (nivel !== 'GLOBAL') {
        Object.keys(asigs).forEach(asig => asignaturas.add(asig));
      }
    });
    return Array.from(asignaturas).sort();
  }, [trimestreSeleccionado, datosCompletos]);

  // Niveles sin GLOBAL para comparación
  const nivelesSinGlobal = useMemo(() => {
    return nivelesDisponibles.filter(n => n !== 'GLOBAL');
  }, [nivelesDisponibles]);

  // Activar comparación de niveles
  const activarCompararNiveles = useCallback(() => {
    if (!trimestreSeleccionado) return;
    setCompararNiveles(true);
    const nuevasSelecciones = nivelesSinGlobal.map((nivel, idx) => ({
      id: idx,
      trimestre: trimestreSeleccionado,
      nivel,
      asignatura: asignaturaComparada
    })).filter(sel => {
      // Solo incluir si el nivel tiene esa asignatura
      return datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
    });
    setSelecciones(nuevasSelecciones);
  }, [trimestreSeleccionado, nivelesSinGlobal, asignaturaComparada, datosCompletos]);

  // Desactivar comparación de niveles
  const desactivarCompararNiveles = useCallback(() => {
    setCompararNiveles(false);
    if (datosCompletos[trimestreSeleccionado]?.['GLOBAL']) {
      setSelecciones([{
        id: 0,
        trimestre: trimestreSeleccionado,
        nivel: 'GLOBAL',
        asignatura: 'Todos'
      }]);
    }
  }, [trimestreSeleccionado, datosCompletos]);

  // Cambiar asignatura comparada
  const cambiarAsignaturaComparada = useCallback((nuevaAsignatura) => {
    setAsignaturaComparada(nuevaAsignatura);
    if (compararNiveles) {
      const nuevasSelecciones = nivelesSinGlobal.map((nivel, idx) => ({
        id: idx,
        trimestre: trimestreSeleccionado,
        nivel,
        asignatura: nuevaAsignatura
      })).filter(sel => {
        return datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
      });
      setSelecciones(nuevasSelecciones);
    }
  }, [compararNiveles, nivelesSinGlobal, trimestreSeleccionado, datosCompletos]);

  // Obtener asignaturas por nivel
  const getAsignaturas = useCallback((trimestre, nivel) => {
    if (!trimestre || !nivel || !datosCompletos[trimestre]?.[nivel]) return [];
    return Object.keys(datosCompletos[trimestre][nivel]);
  }, [datosCompletos]);

  // Gestión de selecciones
  const agregarSeleccion = useCallback(() => {
    if (selecciones.length >= 5) return;
    const nuevoId = Math.max(0, ...selecciones.map(s => s.id)) + 1;
    const nivel = nivelesDisponibles.find(n => n !== 'GLOBAL') || 'GLOBAL';
    const asignaturas = getAsignaturas(trimestreSeleccionado, nivel);
    setSelecciones(prev => [...prev, {
      id: nuevoId,
      trimestre: trimestreSeleccionado,
      nivel,
      asignatura: asignaturas[0] || ''
    }]);
  }, [selecciones, nivelesDisponibles, getAsignaturas, trimestreSeleccionado]);

  const eliminarSeleccion = useCallback((id) => {
    if (selecciones.length <= 1) return;
    setSelecciones(prev => prev.filter(s => s.id !== id));
  }, [selecciones.length]);

  const actualizarSeleccion = useCallback((id, campo, valor) => {
    setSelecciones(prev => prev.map(s => {
      if (s.id !== id) return s;
      const nueva = { ...s, [campo]: valor };
      
      // Si cambia trimestre o nivel, actualizar asignatura
      if (campo === 'trimestre' || campo === 'nivel') {
        const trim = campo === 'trimestre' ? valor : s.trimestre;
        const niv = campo === 'nivel' ? valor : s.nivel;
        const asigs = getAsignaturas(trim, niv);
        nueva.asignatura = asigs[0] || '';
      }
      
      return nueva;
    }));
  }, [getAsignaturas]);

  // Calcular datos de una seleccion
  const calcularDatosSeleccion = useCallback((sel) => {
    return datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
  }, [datosCompletos]);

  // Datos para gráfico de distribución
  const datosDistribucion = useMemo(() => {
    const chartData = [];
    for (let nota = 1; nota <= 10; nota++) {
      const punto = { nota: nota.toString() };
      selecciones.forEach((sel) => {
        const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
        if (datos) {
          const label = `${sel.trimestre} - ${sel.nivel} - ${sel.asignatura}`;
          const valorAbsoluto = datos.distribucion[nota] || 0;

          if (modoDistribucion === 'porcentaje') {
            const total = datos.stats.registros || 1;
            punto[label] = (valorAbsoluto / total * 100);
          } else {
            punto[label] = valorAbsoluto;
          }
        }
      });
      chartData.push(punto);
    }
    return chartData;
  }, [selecciones, datosCompletos, modoDistribucion]);

  // Correlaciones del trimestre seleccionado (con ordenación)
  const correlacionesTrimestre = useMemo(() => {
    if (!trimestreSeleccionado) return [];
    const corrs = correlacionesCompletas[trimestreSeleccionado] || [];
    
    if (ordenCorrelaciones === 'none') return corrs;
    
    return [...corrs].sort((a, b) => {
      const valA = a.Correlacion ?? 0;
      const valB = b.Correlacion ?? 0;
      return ordenCorrelaciones === 'desc' ? valB - valA : valA - valB;
    });
  }, [trimestreSeleccionado, correlacionesCompletas, ordenCorrelaciones]);

  // Tipos de correlaciones únicos para el gráfico de evolución
  const tiposCorrelacion = useMemo(() => {
    const tipos = new Set();
    Object.values(correlacionesCompletas).forEach(corrs => {
      corrs.forEach(c => {
        tipos.add(`${c.Asignatura1}-${c.Asignatura2}`);
      });
    });
    return Array.from(tipos);
  }, [correlacionesCompletas]);

  // Datos para gráfico de evolución de correlaciones
  const datosEvolucionCorrelaciones = useMemo(() => {
    if (tiposCorrelacion.length === 0) return [];
    
    // Función para abreviar nombres de asignaturas
    const abreviar = (nombre) => {
      const abreviaturas = {
        'Lenguaje Musical': 'LM',
        'Coro': 'Cor',
        'Conjunto': 'Con',
        'Especialidad': 'Esp',
        'Arpa': 'Arp',
        'Clarinete': 'Cla',
        'Contrabajo': 'Ctb',
        'Fagot': 'Fag',
        'Flauta': 'Fla',
        'Guitarra': 'Gui',
        'Oboe': 'Obo',
        'Percusión': 'Per',
        'Piano': 'Pia',
        'Saxofón': 'Sax',
        'Trombón': 'Trb',
        'Trompa': 'Trp',
        'Trompeta': 'Tpt',
        'Viola': 'Vla',
        'Violín': 'Vln',
        'Violoncello': 'Vcl'
      };
      return abreviaturas[nombre] || nombre.substring(0, 3);
    };
    
    return tiposCorrelacion.map(tipo => {
      const [asig1, asig2] = tipo.split('-');
      const punto = { 
        par: `${abreviar(asig1)}-${abreviar(asig2)}`, 
        parCompleto: `${asig1} ↔ ${asig2}` 
      };
      
      ['1EEM', '2EEM', '3EEM', '4EEM'].forEach(nivel => {
        // Buscar en todos los trimestres
        Object.entries(correlacionesCompletas).forEach(([trim, corrs]) => {
          const corr = corrs.find(c => 
            c.Asignatura1 === asig1 && c.Asignatura2 === asig2 && c.Nivel === nivel
          );
          if (corr) {
            if (!punto[nivel]) punto[nivel] = {};
            punto[nivel] = corr.Correlacion;
          }
        });
      });
      
      return punto;
    });
  }, [tiposCorrelacion, correlacionesCompletas]);

  // Datos alternativos para gráfico de evolución de correlaciones (eje X = niveles, líneas = pares)
  const datosEvolucionCorrelacionesAlt = useMemo(() => {
    if (tiposCorrelacion.length === 0) return [];

    // Función para abreviar nombres de asignaturas
    const abreviar = (nombre) => {
      const abreviaturas = {
        'Lenguaje Musical': 'LM',
        'Coro': 'Cor',
        'Conjunto': 'Con',
        'Especialidad': 'Esp',
        'Arpa': 'Arp',
        'Clarinete': 'Cla',
        'Contrabajo': 'Ctb',
        'Fagot': 'Fag',
        'Flauta': 'Fla',
        'Guitarra': 'Gui',
        'Oboe': 'Obo',
        'Percusión': 'Per',
        'Piano': 'Pia',
        'Saxofón': 'Sax',
        'Trombón': 'Trb',
        'Trompa': 'Trp',
        'Trompeta': 'Tpt',
        'Viola': 'Vla',
        'Violín': 'Vln',
        'Violoncello': 'Vcl'
      };
      return abreviaturas[nombre] || nombre.substring(0, 3);
    };

    // Calcular promedio de correlaciones para cada par de asignaturas
    const promediosPares = {};
    tiposCorrelacion.forEach(tipo => {
      const [asig1, asig2] = tipo.split('-');
      let suma = 0;
      let count = 0;

      ['1EEM', '2EEM', '3EEM', '4EEM'].forEach(nivel => {
        Object.entries(correlacionesCompletas).forEach(([trim, corrs]) => {
          const corr = corrs.find(c =>
            c.Asignatura1 === asig1 && c.Asignatura2 === asig2 && c.Nivel === nivel
          );
          if (corr && corr.Correlacion !== null) {
            suma += Math.abs(corr.Correlacion);
            count++;
          }
        });
      });

      promediosPares[tipo] = count > 0 ? suma / count : 0;
    });

    // Seleccionar los 10 pares más relevantes (mayor correlación promedio)
    const paresOrdenados = Object.entries(promediosPares)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tipo]) => tipo);

    // Crear estructura de datos con eje X = niveles
    return ['1EEM', '2EEM', '3EEM', '4EEM'].map(nivel => {
      const punto = { nivel };

      paresOrdenados.forEach(tipo => {
        const [asig1, asig2] = tipo.split('-');
        const parAbreviado = `${abreviar(asig1)}-${abreviar(asig2)}`;

        // Buscar correlación en todos los trimestres para este nivel y par
        Object.entries(correlacionesCompletas).forEach(([trim, corrs]) => {
          const corr = corrs.find(c =>
            c.Asignatura1 === asig1 && c.Asignatura2 === asig2 && c.Nivel === nivel
          );
          if (corr) {
            punto[parAbreviado] = corr.Correlacion;
          }
        });
      });

      return punto;
    });
  }, [tiposCorrelacion, correlacionesCompletas]);

  // Obtener pares de asignaturas para el modo alternativo
  const paresCorrelacionesAlt = useMemo(() => {
    if (datosEvolucionCorrelacionesAlt.length === 0) return [];

    const pares = new Set();
    datosEvolucionCorrelacionesAlt.forEach(punto => {
      Object.keys(punto).forEach(key => {
        if (key !== 'nivel') {
          pares.add(key);
        }
      });
    });

    return Array.from(pares);
  }, [datosEvolucionCorrelacionesAlt]);

  // Interpretar nivel de correlación
  const interpretarCorrelacion = useCallback((valor) => {
    if (valor < 0) return { nivel: t('inverse'), color: '#1a1a2e', textColor: 'white' };
    const abs = Math.abs(valor);
    if (abs >= 0.8) return { nivel: t('veryStrong'), color: '#065f46', textColor: 'white' };
    if (abs >= 0.6) return { nivel: t('strong'), color: '#059669', textColor: 'white' };
    if (abs >= 0.4) return { nivel: t('moderate'), color: '#fbbf24', textColor: 'black' };
    if (abs >= 0.2) return { nivel: t('weak'), color: '#f97316', textColor: 'white' };
    return { nivel: t('veryWeak'), color: '#ef4444', textColor: 'white' };
  }, [idioma]);

  // Calcular KPIs globales del centro
  const kpisGlobales = useMemo(() => {
    console.log('[DEBUG] Calculando kpisGlobales...');
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
      console.log('[DEBUG] No hay trimestre seleccionado o datos completos');
      return null;
    }

    const datos = datosCompletos[trimestreSeleccionado];
    const global = datos['GLOBAL'];
    if (!global || !global['Todos']) {
      console.log('[DEBUG] No hay datos GLOBAL o GLOBAL/Todos');
      return null;
    }
    console.log('[DEBUG] Datos GLOBAL encontrados:', Object.keys(global));

    // Lista de asignaturas instrumentales (todas excepto LM, Coro, Conjunto, Todos)
    const asignaturasInstrumentales = new Set();
    const asignaturasLM = new Set();

    // Recopilar todas las asignaturas de todos los niveles
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel === 'GLOBAL') return;
      Object.keys(asigs).forEach(asig => {
        if (asig === 'Lenguaje Musical') {
          asignaturasLM.add(`${nivel}-${asig}`);
        } else if (!['Coro', 'Conjunto', 'Todos'].includes(asig)) {
          asignaturasInstrumentales.add(`${nivel}-${asig}`);
        }
      });
    });

    // Función helper para calcular media ponderada
    const calcularMediaPonderada = (lista) => {
      let sumaPonderada = 0;
      let sumaPesos = 0;
      lista.forEach(({ valor, peso }) => {
        if (valor !== null && valor !== undefined && peso > 0) {
          sumaPonderada += valor * peso;
          sumaPesos += peso;
        }
      });
      return sumaPesos > 0 ? sumaPonderada / sumaPesos : null;
    };

    // KPI 1: Nota media del centro (GLOBAL/Todos)
    const notaMediaCentro = global['Todos']?.stats?.notaMedia || 0;

    // KPI 2: Nota media de Lenguaje Musical
    const datosLM = [];
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel !== 'GLOBAL' && asigs['Lenguaje Musical']?.stats) {
        datosLM.push({
          valor: asigs['Lenguaje Musical'].stats.notaMedia,
          peso: asigs['Lenguaje Musical'].stats.registros
        });
      }
    });
    const notaMediaLM = calcularMediaPonderada(datosLM) || 0;

    // KPI 3: Nota media de Especialidades
    const datosEsp = [];
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel !== 'GLOBAL') {
        Object.entries(asigs).forEach(([asig, data]) => {
          if (!['Lenguaje Musical', 'Coro', 'Conjunto', 'Todos'].includes(asig) && data?.stats) {
            datosEsp.push({
              valor: data.stats.notaMedia,
              peso: data.stats.registros
            });
          }
        });
      }
    });
    const notaMediaEsp = calcularMediaPonderada(datosEsp) || 0;

    // KPI 4: Contador de asignaturas difíciles/fáciles
    let countDificiles = 0;
    let countFaciles = 0;
    Object.entries(datos).forEach(([nivel, asigs]) => {
      Object.entries(asigs).forEach(([asig, data]) => {
        if (data?.stats) {
          const resultado = calcularResultado(data.stats);
          if (resultado === 'DIFÍCIL') countDificiles++;
          if (resultado === 'FÁCIL') countFaciles++;
        }
      });
    });

    // KPI 5-7: % Aprobados (total, LM, especialidades)
    const aprobadosCentro = global['Todos']?.stats?.aprobados || 0;

    const datosAprobadosLM = [];
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel !== 'GLOBAL' && asigs['Lenguaje Musical']?.stats) {
        datosAprobadosLM.push({
          valor: asigs['Lenguaje Musical'].stats.aprobados,
          peso: asigs['Lenguaje Musical'].stats.registros
        });
      }
    });
    const aprobadosLM = calcularMediaPonderada(datosAprobadosLM) || 0;

    const datosAprobadosEsp = [];
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel !== 'GLOBAL') {
        Object.entries(asigs).forEach(([asig, data]) => {
          if (!['Lenguaje Musical', 'Coro', 'Conjunto', 'Todos'].includes(asig) && data?.stats) {
            datosAprobadosEsp.push({
              valor: data.stats.aprobados,
              peso: data.stats.registros
            });
          }
        });
      }
    });
    const aprobadosEsp = calcularMediaPonderada(datosAprobadosEsp) || 0;

    // KPI 8-10: % Suspendidos (total, LM, especialidades)
    const suspendidosCentro = global['Todos']?.stats?.suspendidos || 0;

    const datosSuspendidosLM = [];
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel !== 'GLOBAL' && asigs['Lenguaje Musical']?.stats) {
        datosSuspendidosLM.push({
          valor: asigs['Lenguaje Musical'].stats.suspendidos,
          peso: asigs['Lenguaje Musical'].stats.registros
        });
      }
    });
    const suspendidosLM = calcularMediaPonderada(datosSuspendidosLM) || 0;

    const datosSuspendidosEsp = [];
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel !== 'GLOBAL') {
        Object.entries(asigs).forEach(([asig, data]) => {
          if (!['Lenguaje Musical', 'Coro', 'Conjunto', 'Todos'].includes(asig) && data?.stats) {
            datosSuspendidosEsp.push({
              valor: data.stats.suspendidos,
              peso: data.stats.registros
            });
          }
        });
      }
    });
    const suspendidosEsp = calcularMediaPonderada(datosSuspendidosEsp) || 0;

    const result = {
      notaMediaCentro,
      notaMediaLM,
      notaMediaEsp,
      countDificiles,
      countFaciles,
      aprobadosCentro,
      aprobadosLM,
      aprobadosEsp,
      suspendidosCentro,
      suspendidosLM,
      suspendidosEsp
    };
    console.log('[DEBUG] KPIs globales calculados:', result);
    return result;
  }, [trimestreSeleccionado, datosCompletos, calcularResultado]);

  // Análisis de dificultad de asignaturas
  const analisisDificultad = useMemo(() => {
    console.log('[DEBUG] Calculando analisisDificultad...');
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
      console.log('[DEBUG] No hay trimestre seleccionado o datos completos para análisis');
      return null;
    }

    const datos = datosCompletos[trimestreSeleccionado];
    const asignaturas = [];

    // Recopilar todas las asignaturas (excluyendo GLOBAL y "Todos")
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel === 'GLOBAL') return;
      Object.entries(asigs).forEach(([asig, data]) => {
        if (asig === 'Todos' || !data?.stats) return;

        // Filtrar por número mínimo de alumnos
        if (data.stats.registros < umbrales.alumnosMinimo) return;

        const stats = data.stats;
        const resultado = calcularResultado(stats);

        // Determinar categoría de dificultad
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
          aprobados: stats.aprobados,
          suspendidos: stats.suspendidos
        });
      });
    });

    // Ordenar: DIFÍCIL primero, luego NEUTRAL, luego FÁCIL
    const ordenCategoria = { 'DIFÍCIL': 0, 'NEUTRAL': 1, 'FÁCIL': 2 };
    asignaturas.sort((a, b) => {
      if (ordenCategoria[a.categoria] !== ordenCategoria[b.categoria]) {
        return ordenCategoria[a.categoria] - ordenCategoria[b.categoria];
      }
      // Dentro de cada categoría, ordenar por nota media ascendente
      return a.notaMedia - b.notaMedia;
    });

    // Agrupar por categoría
    const dificiles = asignaturas.filter(a => a.categoria === 'DIFÍCIL');
    const neutrales = asignaturas.filter(a => a.categoria === 'NEUTRAL');
    const faciles = asignaturas.filter(a => a.categoria === 'FÁCIL');

    console.log('[DEBUG] Análisis de dificultad completado:', {
      dificiles: dificiles.length,
      neutrales: neutrales.length,
      faciles: faciles.length
    });
    return { dificiles, neutrales, faciles, todas: asignaturas };
  }, [trimestreSeleccionado, datosCompletos, calcularResultado, umbrales]);

  // Si no hay datos, mostrar pantalla de carga
  if (trimestresDisponibles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
          * { font-family: 'DM Sans', sans-serif; }
          h1, h2, h3 { font-family: 'DM Serif Display', serif; }
        `}</style>

        <div className="max-w-xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl text-slate-800 mb-4">{t('appTitle')}</h1>
            <p className="text-slate-500 text-lg">{t('appSubtitle')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <h2 className="text-2xl text-slate-700 mb-6 text-center">{t('loadData')}</h2>

            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-6 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-medium text-lg flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('loadCSV')}
              </button>

              <button
                onClick={() => jsonInputRef.current?.click()}
                className="w-full py-4 px-6 bg-white text-slate-700 rounded-xl border-2 border-slate-300 hover:border-slate-400 transition-all font-medium text-lg flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('importJSON')}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCargarCSV}
              className="hidden"
            />
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleImportarJSON}
              className="hidden"
            />

            <div className="mt-8 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 text-center">
                {t('csvInstructions')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-400 mt-8">
            {t('designedBy')} <a href="https://jlmirall.es" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800 underline">José Luis Miralles Bono</a> {t('withHelpOf')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        h1, h2, h3 { font-family: 'DM Serif Display', serif; }
        select {
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
        }
      `}</style>

      {/* Modal de confirmación */}
      {mostrarModalConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl text-slate-800 mb-4">{t('trimesterAlreadyLoaded')}</h3>
            <p className="text-slate-600 mb-6">
              {t('replaceConfirm').replace('{trimester}', trimestrePendiente)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelarReemplazo}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmarReemplazo}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium"
              >
                {t('replace')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-5xl text-slate-800 mb-2">{t('appTitle')}</h1>
              <p className="text-xl text-slate-600 font-medium">
                {metadata[trimestresDisponibles[0]]?.Centro || 'EEM'} ·
                Curso {metadata[trimestresDisponibles[0]]?.CursoAcademico || ''}
              </p>
            </div>
            {/* Selector de idioma */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setIdioma('es')}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                  idioma === 'es' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ES
              </button>
              <button
                onClick={() => setIdioma('va')}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                  idioma === 'va' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                VA
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-4 bg-white text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 transition-all text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('addTrimester')}
            </button>
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="py-2 px-4 bg-white text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 transition-all text-sm font-medium"
            >
              {t('importJSON')}
            </button>
            <button
              onClick={exportarJSON}
              className="py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all text-sm font-medium"
            >
              {t('exportJSON')}
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCargarCSV} className="hidden" />
        <input ref={jsonInputRef} type="file" accept=".json" onChange={handleImportarJSON} className="hidden" />
      </div>

      {/* Trimestres cargados */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 font-medium">{t('trimestersLoadedLabel')}</span>
          {trimestresDisponibles.map(trim => (
            <div
              key={trim}
              className={`inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium transition-all ${
                trim === trimestreSeleccionado
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <button onClick={() => setTrimestreSeleccionado(trim)}>
                {trim}
              </button>
              {trimestresDisponibles.length > 1 && (
                <button
                  onClick={() => eliminarTrimestre(trim)}
                  className={`ml-1 hover:text-red-500 ${trim === trimestreSeleccionado ? 'text-white/70' : 'text-slate-400'}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navegación de vistas */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 w-fit">
          {[
            { id: 'estadisticas', label: t('statistics') },
            { id: 'correlaciones', label: t('correlations') },
            { id: 'evolucion', label: t('evolution') },
            { id: 'dificultad', label: t('difficulty') }
          ].map(vista => (
            <button
              key={vista.id}
              onClick={() => setVistaActual(vista.id)}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                vistaActual === vista.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {vista.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel de Umbrales */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => setMostrarPanelUmbrales(!mostrarPanelUmbrales)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-all"
        >
          <svg className={`w-4 h-4 transition-transform ${mostrarPanelUmbrales ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t('configureThresholds')}
        </button>

        {mostrarPanelUmbrales && (
          <div className="mt-4 p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-700">{t('thresholdConfig')}</span>
              <button
                onClick={() => setUmbrales({
                  suspensosAlerta: 30,
                  mediaCritica: 6,
                  mediaFacil: 8,
                  aprobadosMinimo: 90,
                  alumnosMinimo: 3
                })}
                className="text-xs py-1 px-3 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all"
              >
                {t('restoreDefaults')}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('failedAlert')}</label>
                <input
                  type="number"
                  value={umbrales.suspensosAlerta}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, suspensosAlerta: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('criticalAvg')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={umbrales.mediaCritica}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, mediaCritica: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('easyAvg')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={umbrales.mediaFacil}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, mediaFacil: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('minPassed')}</label>
                <input
                  type="number"
                  value={umbrales.aprobadosMinimo}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, aprobadosMinimo: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('minStudents')}</label>
                <input
                  type="number"
                  value={umbrales.alumnosMinimo}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, alumnosMinimo: parseInt(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded mr-2">{t('difficult')}</span>
              {t('failed')} ≥ {umbrales.suspensosAlerta}% o {t('average')} &lt; {umbrales.mediaCritica}
              <span className="mx-4">|</span>
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded mr-2">{t('easy')}</span>
              {t('passed')} ≥ {umbrales.aprobadosMinimo}% o {t('average')} ≥ {umbrales.mediaFacil}
              <span className="mx-4">|</span>
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded mr-2">Filtro</span>
              Solo asignaturas con ≥ {umbrales.alumnosMinimo} alumnos
            </div>
          </div>
        )}
      </div>

      {/* VISTA: ESTADÍSTICAS */}
      {vistaActual === 'estadisticas' && (
        <div className="max-w-7xl mx-auto">
          {/* Panel de KPIs Globales */}
          {kpisGlobales && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('kpis')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Nota Media del Centro */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-blue-700">{t('kpiCenterAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-900">{(kpisGlobales.notaMediaCentro || 0).toFixed(2)}</div>
                </div>

                {/* Nota Media LM */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-xs font-medium text-purple-700">{t('kpiLMAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-900">
                    {(kpisGlobales.notaMediaLM || 0).toFixed(2)}
                  </div>
                </div>

                {/* Nota Media Especialidades */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-xs font-medium text-amber-700">{t('kpiInstrAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-900">
                    {(kpisGlobales.notaMediaEsp || 0).toFixed(2)}
                  </div>
                </div>

                {/* Asignaturas Difíciles */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-medium text-red-700">{t('kpiDifficult')}</span>
                  </div>
                  <div className="text-3xl font-bold text-red-900">{kpisGlobales.countDificiles}</div>
                </div>

                {/* Asignaturas Fáciles */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span className="text-xs font-medium text-green-700">{t('kpiEasy')}</span>
                  </div>
                  <div className="text-3xl font-bold text-green-900">{kpisGlobales.countFaciles}</div>
                </div>

                {/* % Aprobados Total */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-teal-700">{t('kpiPassedAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-teal-900">{(kpisGlobales.aprobadosCentro || 0).toFixed(1)}%</div>
                </div>

                {/* % Aprobados LM */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-xs font-medium text-cyan-700">{t('kpiPassedLM')}</span>
                  </div>
                  <div className="text-3xl font-bold text-cyan-900">
                    {(kpisGlobales.aprobadosLM || 0).toFixed(1)}%
                  </div>
                </div>

                {/* % Aprobados Especialidades */}
                <div className="bg-gradient-to-br from-lime-50 to-lime-100 border border-lime-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-xs font-medium text-lime-700">{t('kpiPassedInstr')}</span>
                  </div>
                  <div className="text-3xl font-bold text-lime-900">
                    {(kpisGlobales.aprobadosEsp || 0).toFixed(1)}%
                  </div>
                </div>

                {/* % Suspendidos Total */}
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs font-medium text-rose-700">{t('kpiFailedAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-rose-900">{(kpisGlobales.suspendidosCentro || 0).toFixed(1)}%</div>
                </div>

                {/* % Suspendidos LM */}
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-xs font-medium text-pink-700">{t('kpiFailedLM')}</span>
                  </div>
                  <div className="text-3xl font-bold text-pink-900">
                    {(kpisGlobales.suspendidosLM || 0).toFixed(1)}%
                  </div>
                </div>

                {/* % Suspendidos Especialidades */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-xs font-medium text-orange-700">{t('kpiFailedInstr')}</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-900">
                    {(kpisGlobales.suspendidosEsp || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selectores */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('selections')}</h3>
              {!compararNiveles && selecciones.length < 5 && (
                <button
                  onClick={agregarSeleccion}
                  className="py-2 px-4 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-all"
                >
                  + {t('add')}
                </button>
              )}
            </div>

            {/* Opción de comparar niveles */}
            {todasLasAsignaturas.length > 0 && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {t('compareLevels')}
                    </span>
                    <button
                      onClick={() => compararNiveles ? desactivarCompararNiveles() : activarCompararNiveles()}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        compararNiveles ? 'bg-slate-800' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        compararNiveles ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                {compararNiveles && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">{t('subjectToCompare')}</label>
                    <select
                      value={asignaturaComparada}
                      onChange={(e) => cambiarAsignaturaComparada(e.target.value)}
                      className="w-full md:w-64 py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm"
                    >
                      {todasLasAsignaturas.map(asig => (
                        <option key={asig} value={asig}>{asig}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-3">
              {selecciones.map((sel, idx) => (
                <div
                  key={sel.id}
                  className="p-4 rounded-lg border-2"
                  style={{ borderColor: colores[idx].line, backgroundColor: colores[idx].bg }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colores[idx].line }} />
                      <span className="text-sm font-semibold" style={{ color: colores[idx].line }}>
                        {t('selection')} {idx + 1}
                      </span>
                    </div>
                    {!compararNiveles && selecciones.length > 1 && (
                      <button
                        onClick={() => eliminarSeleccion(sel.id)}
                        className="text-slate-400 hover:text-red-500 text-xl"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('trimester')}</label>
                      <select
                        value={sel.trimestre}
                        onChange={(e) => actualizarSeleccion(sel.id, 'trimestre', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        {trimestresDisponibles.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('level')}</label>
                      <select
                        value={sel.nivel}
                        onChange={(e) => actualizarSeleccion(sel.id, 'nivel', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        {Object.keys(datosCompletos[sel.trimestre] || {}).map(n => (
                          <option key={n} value={n}>{n === 'GLOBAL' ? `📊 ${t('global')}` : n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('subject')}</label>
                      <select
                        value={sel.asignatura}
                        onChange={(e) => actualizarSeleccion(sel.id, 'asignatura', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        {getAsignaturas(sel.trimestre, sel.nivel).map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {selecciones.map((sel, idx) => {
              const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
              if (!datos) return null;
              
              const resultado = calcularResultado(datos.stats);
              const base = selecciones[0];
              const datosBase = datosCompletos[base.trimestre]?.[base.nivel]?.[base.asignatura];
              
              // Generar descripción textual
              const generarDescripcion = () => {
                const { stats } = datos;
                const partes = [];
                
                // Análisis de nota media
                if (stats.notaMedia >= 8) {
                  partes.push(`Excelente rendimiento con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                } else if (stats.notaMedia >= 7) {
                  partes.push(`Buen rendimiento con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                } else if (stats.notaMedia >= 6) {
                  partes.push(`Rendimiento aceptable con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                } else if (stats.notaMedia >= 5) {
                  partes.push(`Rendimiento ajustado con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                } else {
                  partes.push(`Rendimiento bajo con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                }
                
                // Análisis de aprobados/suspendidos
                if (stats.aprobados === 100) {
                  partes.push('100% de aprobados');
                } else if (stats.aprobados >= 90) {
                  partes.push(`alto porcentaje de aprobados (${stats.aprobados}%)`);
                } else if (stats.suspendidos >= 20) {
                  partes.push(`atención: ${stats.suspendidos}% de suspensos`);
                }
                
                // Análisis de dispersión
                if (stats.desviacion <= 1) {
                  partes.push('notas muy homogéneas');
                } else if (stats.desviacion >= 2) {
                  partes.push('alta dispersión en las notas');
                }
                
                // Análisis de moda
                if (stats.moda) {
                  partes.push(`la nota más frecuente es ${stats.moda}`);
                }
                
                return partes.join('. ') + '.';
              };
              
              return (
                <div
                  key={sel.id}
                  className="bg-white rounded-xl border-2 p-4"
                  style={{ borderColor: colores[idx].line }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colores[idx].line }} />
                      <h4 className="font-semibold text-slate-800 text-sm">
                        {sel.trimestre} · {sel.nivel} · {sel.asignatura}
                      </h4>
                      {resultado && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          resultado === 'DIFÍCIL' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {resultado}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-8 gap-2 mb-3">
                    {[
                      { label: 'N', title: t('records'), key: 'registros', format: (v) => v },
                      { label: t('average'), title: t('average'), key: 'notaMedia', format: (v) => v?.toFixed(2) },
                      { label: 'σ', title: t('deviation'), key: 'desviacion', format: (v) => v?.toFixed(2) },
                      { label: t('mode'), title: t('mode'), key: 'moda', format: (v) => v ?? '—' },
                      { label: t('passed'), title: `% ${t('passed')}`, key: 'aprobados', format: (v) => `${v?.toFixed(0)}%` },
                      { label: t('failed'), title: `% ${t('failed')}`, key: 'suspendidos', format: (v) => `${v?.toFixed(0)}%` },
                      { label: `${t('mode')} ${t('passed')}`, title: t('passedMode'), key: 'modaAprobados', format: (v) => v ?? '—' },
                      { label: `${t('mode')} ${t('failed')}`, title: t('failedMode'), key: 'modaSuspendidos', format: (v) => v ?? '—' }
                    ].map(({ label, title, key, format }) => {
                      const valor = datos.stats[key];
                      let diff = null;
                      if (idx > 0 && datosBase && ['notaMedia', 'aprobados', 'suspendidos'].includes(key)) {
                        diff = valor - datosBase.stats[key];
                      }

                      return (
                        <div key={key} className="bg-slate-50 rounded p-2 md:p-3 lg:p-4 text-center min-h-[60px] md:min-h-[70px] lg:min-h-[80px] flex flex-col justify-center" title={title}>
                          <div className="text-xs md:text-sm text-slate-500">{label}</div>
                          <div className="text-sm md:text-base lg:text-lg font-bold text-slate-800">{format(valor)}</div>
                          {diff !== null && (
                            <div className={`text-xs md:text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Descripción textual */}
                  <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 italic">
                    {generarDescripcion()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Radar combinado de todas las selecciones */}
          {selecciones.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">{t('radarComparison')}</h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={(() => {
                  // Calcular datos del radar para cada selección
                  const metricas = ['Nota Media', `% ${t('passed')}`, `% ${t('excellence')}`, t('mode')];

                  return metricas.map((metrica, metricaIdx) => {
                    const punto = { subject: metrica };

                    selecciones.forEach((sel, idx) => {
                      if (idx >= 5) return; // Máximo 5 selecciones

                      const datos = calcularDatosSeleccion(sel);
                      if (!datos) return;

                      const label = `Sel ${idx + 1}`;

                      if (metricaIdx === 0) {
                        // Nota Media (normalizada 0-100)
                        punto[label] = (datos.stats.notaMedia / 10) * 100;
                      } else if (metricaIdx === 1) {
                        // % Aprobados (0-100)
                        punto[label] = datos.stats.aprobados;
                      } else if (metricaIdx === 2) {
                        // % Excelencia (0-100)
                        const registros = datos.stats.registros || 0;
                        punto[label] = registros > 0
                          ? ((datos.distribucion[9] || 0) + (datos.distribucion[10] || 0)) / registros * 100
                          : 0;
                      } else if (metricaIdx === 3) {
                        // Moda (normalizada 0-100)
                        punto[label] = datos.stats.moda ? (datos.stats.moda / 10) * 100 : 0;
                      }
                    });

                    return punto;
                  });
                })()}>
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  {selecciones.slice(0, 5).map((sel, idx) => (
                    <Radar
                      key={sel.id}
                      name={`${sel.trimestre} - ${sel.nivel} - ${sel.asignatura}`}
                      dataKey={`Sel ${idx + 1}`}
                      stroke={colores[idx].line}
                      fill={colores[idx].line}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => (value || 0).toFixed(1)}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico de distribución */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('gradeDistribution')}</h3>
              <div className="inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setModoDistribucion('porcentaje')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoDistribucion === 'porcentaje'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('distributionPercentage')}
                </button>
                <button
                  onClick={() => setModoDistribucion('absoluto')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoDistribucion === 'absoluto'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('distributionAbsolute')}
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={datosDistribucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nota" stroke="#64748b" />
                <YAxis
                  stroke="#64748b"
                  label={{
                    value: modoDistribucion === 'porcentaje' ? '% Alumnos' : 'Cantidad',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#64748b' }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {selecciones.map((sel, idx) => {
                  const label = `${sel.trimestre} - ${sel.nivel} - ${sel.asignatura}`;
                  return (
                    <Line
                      key={sel.id}
                      type="monotone"
                      dataKey={label}
                      stroke={colores[idx].line}
                      strokeWidth={2}
                      dot={{ fill: colores[idx].line, r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de distribución */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('distributionTable')}</h3>
              <div className="inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setModoHeatmap('relativo')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoHeatmap === 'relativo'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('heatmapRelative')}
                </button>
                <button
                  onClick={() => setModoHeatmap('absoluto')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoHeatmap === 'absoluto'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('heatmapAbsolute')}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {(() => {
                // Calcular totales y máximos para el mapa de calor
                const totales = selecciones.map(sel => {
                  const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                  return datos ? Object.values(datos.distribucion).reduce((a, b) => a + b, 0) : 0;
                });

                // Calcular máximos según el modo
                let maxValorGlobal = 0;
                const maxValoresPorColumna = [];

                selecciones.forEach((sel) => {
                  const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                  let maxColumna = 0;
                  if (datos) {
                    Object.values(datos.distribucion).forEach(v => {
                      if (v > maxValorGlobal) maxValorGlobal = v;
                      if (v > maxColumna) maxColumna = v;
                    });
                  }
                  maxValoresPorColumna.push(maxColumna);
                });

                // Función para color del mapa de calor (rojo = alto, verde = bajo)
                const getHeatmapColor = (valor, max) => {
                  if (max === 0 || valor === 0) return 'transparent';
                  const intensity = valor / max;
                  // De verde claro (bajo) a rojo (alto)
                  if (intensity < 0.33) {
                    return `rgba(134, 239, 172, ${0.3 + intensity})`; // Verde claro
                  } else if (intensity < 0.66) {
                    return `rgba(253, 224, 71, ${0.3 + intensity * 0.5})`; // Amarillo
                  } else {
                    return `rgba(248, 113, 113, ${0.4 + intensity * 0.4})`; // Rojo
                  }
                };
                
                // Calcular agrupaciones
                const calcularAgrupacion = (dist) => {
                  const total = Object.values(dist).reduce((a, b) => a + b, 0);
                  const grupos = {
                    insuficiente: (dist[1] || 0) + (dist[2] || 0) + (dist[3] || 0) + (dist[4] || 0),
                    suficiente: dist[5] || 0,
                    bien: dist[6] || 0,
                    notable: (dist[7] || 0) + (dist[8] || 0),
                    excelente: (dist[9] || 0) + (dist[10] || 0)
                  };
                  const porcentajes = {
                    insuficiente: total > 0 ? (grupos.insuficiente / total * 100).toFixed(1) : '0.0',
                    suficiente: total > 0 ? (grupos.suficiente / total * 100).toFixed(1) : '0.0',
                    bien: total > 0 ? (grupos.bien / total * 100).toFixed(1) : '0.0',
                    notable: total > 0 ? (grupos.notable / total * 100).toFixed(1) : '0.0',
                    excelente: total > 0 ? (grupos.excelente / total * 100).toFixed(1) : '0.0'
                  };
                  return { grupos, porcentajes };
                };
                
                return (
                  <>
                    <table className="w-full mb-8">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="py-3 px-3 text-left text-sm font-semibold text-slate-600">{t('grade')}</th>
                          {selecciones.map((sel, idx) => (
                            <th key={sel.id} className="py-3 px-2 text-center text-xs font-semibold text-slate-700">
                              <div>{sel.trimestre} · {sel.nivel}</div>
                              <div className="font-normal text-slate-500">{sel.asignatura}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nota => (
                          <tr key={nota} className="border-b border-slate-100">
                            <td className="py-2 px-3 font-medium text-slate-700">{nota}</td>
                            {selecciones.map((sel, idx) => {
                              const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                              const valor = datos?.distribucion[nota] || 0;
                              const total = totales[idx];
                              const porcentaje = total > 0 ? (valor / total * 100).toFixed(1) : '0.0';
                              const maxParaColor = modoHeatmap === 'relativo' ? maxValoresPorColumna[idx] : maxValorGlobal;
                              return (
                                <td
                                  key={sel.id}
                                  className="py-2 px-2 text-center"
                                  style={{ backgroundColor: getHeatmapColor(valor, maxParaColor) }}
                                >
                                  <span className="font-semibold text-slate-800">{valor}</span>
                                  <span className="text-xs text-slate-700 ml-1">({porcentaje}%)</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-300 font-bold bg-slate-50">
                          <td className="py-3 px-3 text-slate-700">{t('total')}</td>
                          {selecciones.map((sel, idx) => (
                            <td key={sel.id} className="py-3 px-2 text-center text-slate-800">
                              {totales[idx]}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>

                    {/* Tabla de agrupaciones */}
                    <h4 className="text-md font-semibold text-slate-700 mb-3">{t('groupByGrade')}</h4>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="py-3 px-3 text-left text-sm font-semibold text-slate-600">{t('grade')}</th>
                          <th className="py-3 px-3 text-left text-xs font-normal text-slate-500">{t('grades')}</th>
                          {selecciones.map((sel, idx) => (
                            <th key={sel.id} className="py-3 px-2 text-center text-xs font-semibold text-slate-700">
                              {sel.trimestre} · {sel.nivel}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'insuficiente', label: t('insufficient'), notas: '1-4', color: '#ef4444' },
                          { key: 'suficiente', label: t('sufficient'), notas: '5', color: '#f97316' },
                          { key: 'bien', label: t('good'), notas: '6', color: '#fbbf24' },
                          { key: 'notable', label: t('notable'), notas: '7-8', color: '#22c55e' },
                          { key: 'excelente', label: t('excellent'), notas: '9-10', color: '#059669' }
                        ].map(({ key, label, notas, color }) => (
                          <tr key={key} className="border-b border-slate-100">
                            <td className="py-2 px-3 font-medium" style={{ color }}>{label}</td>
                            <td className="py-2 px-3 text-xs text-slate-500">{notas}</td>
                            {selecciones.map((sel, idx) => {
                              const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                              if (!datos) return <td key={sel.id} className="py-2 px-2 text-center">—</td>;
                              const { grupos, porcentajes } = calcularAgrupacion(datos.distribucion);
                              return (
                                <td key={sel.id} className="py-2 px-2 text-center">
                                  <span className="font-semibold text-slate-800">{grupos[key]}</span>
                                  <span className="text-xs text-slate-800 ml-1">({porcentajes[key]}%)</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* VISTA: CORRELACIONES */}
      {vistaActual === 'correlaciones' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-slate-800">
                {t('correlationsTitle')} · {trimestreSeleccionado}
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={trimestreSeleccionado}
                  onChange={(e) => setTrimestreSeleccionado(e.target.value)}
                  className="py-2 px-4 border border-slate-300 rounded-lg text-sm"
                >
                  {trimestresDisponibles.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setOrdenCorrelaciones('desc')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'desc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {t('sortDesc')}
                  </button>
                  <button
                    onClick={() => setOrdenCorrelaciones('asc')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'asc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {t('sortAsc')}
                  </button>
                  <button
                    onClick={() => setOrdenCorrelaciones('none')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'none' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {t('noSort')}
                  </button>
                </div>
              </div>
            </div>

            {/* Leyenda compacta */}
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#1a1a2e' }}>&lt;0 {t('inverse')}</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#065f46' }}>≥0,80 {t('veryStrong')}</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#059669' }}>≥0,60 {t('strong')}</span>
              <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#fbbf24' }}>≥0,40 {t('moderate')}</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#f97316' }}>≥0,20 {t('weak')}</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#ef4444' }}>&lt;0,20 {t('veryWeak')}</span>
            </div>

            {correlacionesTrimestre.length === 0 ? (
              <p className="text-slate-500 text-center py-8">{t('noCorrelationData')}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {correlacionesTrimestre.map((corr, idx) => {
                  const interp = interpretarCorrelacion(corr.Correlacion);
                  return (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border border-slate-200 hover:shadow-md transition-all"
                      style={{ borderLeftWidth: '4px', borderLeftColor: interp.color }}
                    >
                      <div className="text-xs text-slate-400 mb-1">{corr.Nivel}</div>
                      <div className="text-sm font-semibold text-slate-800 leading-tight mb-2">
                        {corr.Asignatura1}
                        <span className="text-slate-400 mx-1">↔</span>
                        {corr.Asignatura2}
                      </div>
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-lg font-bold font-mono"
                          style={{ color: interp.color }}
                        >
                          {corr.Correlacion?.toFixed(2)}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: interp.color, color: interp.textColor }}
                        >
                          {interp.nivel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Gráfico de evolución de correlaciones por nivel */}
          {trimestresDisponibles.length >= 1 && correlacionesTrimestre.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">{t('correlationEvolution')}</h3>
                  <p className="text-sm text-slate-500">
                    {ejeCorrelaciones === 'pares' ? t('correlationEvolutionDesc') : 'El eje X muestra los niveles (1EEM-4EEM), cada línea representa un par de asignaturas'}
                  </p>
                </div>
                <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setEjeCorrelaciones('pares')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      ejeCorrelaciones === 'pares'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {t('correlationToggleSubjects')}
                  </button>
                  <button
                    onClick={() => setEjeCorrelaciones('niveles')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      ejeCorrelaciones === 'niveles'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {t('correlationToggleLevels')}
                  </button>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                {ejeCorrelaciones === 'pares' ? (
                  <LineChart data={datosEvolucionCorrelaciones} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="par"
                      stroke="#64748b"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      domain={[-0.2, 0.8]}
                      tickFormatter={(v) => (v || 0).toFixed(1)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => [value?.toFixed(2), name]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.parCompleto;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="1EEM"
                      name="1EEM"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="2EEM"
                      name="2EEM"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 4 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="3EEM"
                      name="3EEM"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 4 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="4EEM"
                      name="4EEM"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ fill: '#a855f7', r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                ) : (
                  <LineChart data={datosEvolucionCorrelacionesAlt} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="nivel"
                      stroke="#64748b"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      domain={[-0.2, 0.8]}
                      tickFormatter={(v) => (v || 0).toFixed(1)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => [value?.toFixed(2), name]}
                    />
                    <Legend />
                    {paresCorrelacionesAlt.map((par, idx) => {
                      const coloresLineas = [
                        '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f59e0b',
                        '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316'
                      ];
                      return (
                        <Line
                          key={par}
                          type="monotone"
                          dataKey={par}
                          name={par}
                          stroke={coloresLineas[idx % coloresLineas.length]}
                          strokeWidth={2}
                          dot={{ fill: coloresLineas[idx % coloresLineas.length], r: 4 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* VISTA: EVOLUCIÓN */}
      {vistaActual === 'evolucion' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('evolutionTitle')}</h3>

            {trimestresDisponibles.length < 2 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-2">{t('needTwoTrimesters')}</p>
                <p className="text-sm text-slate-400">{t('trimestersLoaded')}: {trimestresDisponibles.join(', ') || 'Ninguno'}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 mb-6">
                  {t('evolutionDesc')}
                </p>

                {/* Gráfico de evolución de nota media */}
                {(() => {
                  const nivel = selecciones[0]?.nivel || 'GLOBAL';
                  const asignatura = selecciones[0]?.asignatura || 'Todos';

                  const datosEvolucion = trimestresDisponibles.map(trim => {
                    const d = datosCompletos[trim]?.[nivel]?.[asignatura];
                    return {
                      trimestre: trim,
                      notaMedia: d?.stats.notaMedia || null,
                      aprobados: d?.stats.aprobados || null,
                      suspendidos: d?.stats.suspendidos || null
                    };
                  }).filter(d => d.notaMedia !== null);

                  if (datosEvolucion.length < 2) {
                    return (
                      <p className="text-slate-500 text-center py-8">
                        {t('notEnoughData').replace('{level}', nivel).replace('{subject}', asignatura)}
                      </p>
                    );
                  }

                  return (
                    <div>
                      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">
                          {t('showingEvolution')}: <span className="font-bold">{nivel} - {asignatura}</span>
                        </span>
                      </div>

                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={datosEvolucion}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="trimestre" stroke="#64748b" />
                          <YAxis yAxisId="left" stroke="#64748b" domain={[0, 10]} />
                          <YAxis yAxisId="right" orientation="right" stroke="#64748b" domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="notaMedia"
                            name={t('average')}
                            stroke="#1a1a2e"
                            strokeWidth={3}
                            dot={{ fill: '#1a1a2e', r: 6 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="aprobados"
                            name={`% ${t('passed')}`}
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={{ fill: '#22c55e', r: 5 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="suspendidos"
                            name={`% ${t('failed')}`}
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ fill: '#ef4444', r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* VISTA: DIFICULTAD */}
      {vistaActual === 'dificultad' && analisisDificultad && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('difficulty')}</h3>

            {/* Selector de trimestre */}
            <div className="mb-6 p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">
                {t('trimester')}: <span className="font-bold">{trimestreSeleccionado}</span>
              </span>
            </div>

            {/* Asignaturas Difíciles */}
            {analisisDificultad.dificiles.length > 0 && (
              <div className="mb-8">
                <h4 className="text-md font-semibold text-red-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  {t('difficultSubjects')} ({analisisDificultad.dificiles.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analisisDificultad.dificiles.map((asig, idx) => (
                    <div
                      key={idx}
                      className="bg-red-50 border-2 border-red-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-slate-800 text-sm">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 text-xs font-bold rounded">
                          {t('difficult')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-slate-800">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-slate-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('failed')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Asignaturas Neutrales */}
            {analisisDificultad.neutrales.length > 0 && (
              <div className="mb-8">
                <h4 className="text-md font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-slate-400 rounded-full"></span>
                  {t('neutralSubjects')} ({analisisDificultad.neutrales.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analisisDificultad.neutrales.map((asig, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border-2 border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-slate-800 text-sm">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-slate-200 text-slate-800 text-xs font-bold rounded">
                          {t('neutral')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-slate-800">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-slate-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('failed')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Asignaturas Fáciles */}
            {analisisDificultad.faciles.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-green-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  {t('easySubjects')} ({analisisDificultad.faciles.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analisisDificultad.faciles.map((asig, idx) => (
                    <div
                      key={idx}
                      className="bg-green-50 border-2 border-green-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-semibold text-slate-800 text-sm">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded">
                          {t('easy')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-slate-800">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-slate-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('failed')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-12 py-6 border-t border-slate-200">
        <p className="text-center text-sm text-slate-400">
          {t('designedBy')} <a href="https://jlmirall.es" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800 underline">José Luis Miralles Bono</a> {t('withHelpOf')}
        </p>
      </footer>
    </div>
  );
};

export default DashboardAcademico;
