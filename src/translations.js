export const translations = {
  es: {
    // General
    appTitle: 'Dashboard Académico',
    appSubtitle: 'Análisis de rendimiento por curso, asignatura y trimestre',
    loadData: 'Cargar datos',

    // Acciones
    loadCSV: 'Cargar CSV de trimestre',
    importJSON: 'Importar JSON guardado',
    exportJSON: 'Exportar JSON',
    addTrimester: 'Añadir trimestre',
    add: 'Añadir',
    cancel: 'Cancelar',
    replace: 'Reemplazar',
    delete: 'Eliminar',

    // Navegación
    statistics: 'Estadísticas',
    correlations: 'Correlaciones',
    evolution: 'Evolución',
    difficulty: 'Dificultad',

    // KPIs
    kpis: 'Indicadores Clave del Centro',
    kpiCenterAvg: 'Nota Media del Centro',
    kpiLMAvg: 'Nota Media Lenguaje Musical',
    kpiInstrAvg: 'Nota Media Especialidades',
    kpiDifficult: 'Asignaturas Difíciles',
    kpiEasy: 'Asignaturas Fáciles',
    kpiPassedAvg: '% Aprobados Total',
    kpiPassedLM: '% Aprobados LM',
    kpiPassedInstr: '% Aprobados Esp.',
    kpiFailedAvg: '% Suspendidos Total',
    kpiFailedLM: '% Suspendidos LM',
    kpiFailedInstr: '% Suspendidos Esp.',

    // Selecciones
    selections: 'Selecciones para comparar',
    selection: 'Selección',
    trimester: 'Trimestre',
    level: 'Nivel',
    subject: 'Asignatura',
    compareLevels: 'Comparar misma asignatura en todos los niveles (1EEM - 4EEM)',
    subjectToCompare: 'Asignatura a comparar',

    // Umbrales
    configureThresholds: 'Configurar umbrales',
    thresholdConfig: 'Configuración de umbrales',
    restoreDefaults: 'Restaurar valores por defecto',
    failedAlert: '% Suspensos alerta',
    criticalAvg: 'Media crítica',
    easyAvg: 'Media fácil',
    minPassed: '% Aprobados mínimo',
    minStudents: 'Alumnos mínimos',

    // Etiquetas
    difficult: 'DIFÍCIL',
    easy: 'FÁCIL',
    neutral: 'NEUTRAL',
    global: 'GLOBAL',
    all: 'Todos',
    difficultSubjects: 'Asignaturas Difíciles',
    neutralSubjects: 'Asignaturas Neutrales',
    easySubjects: 'Asignaturas Fáciles',
    difficultyReason: 'Motivo',

    // Estadísticas
    records: 'Registros',
    average: 'Nota Media',
    deviation: 'Desviación',
    mode: 'Moda',
    passed: 'Aprobados',
    failed: 'Suspendidos',
    passedMode: 'Moda Aprobados',
    failedMode: 'Moda Suspendidos',
    excellence: 'Excelencia',

    // Gráficos
    gradeDistribution: 'Distribución de Notas',
    distributionTable: 'Tabla de Distribución',
    grade: 'Nota',
    total: 'TOTAL',
    groupByGrade: 'Agrupación por calificaciones',
    grades: 'Notas',
    insufficient: 'Insuficiente',
    sufficient: 'Suficiente',
    good: 'Bien',
    notable: 'Notable',
    excellent: 'Excelente',
    radarChart: 'Gráfico Radar',
    heatmapAbsolute: 'Absoluto',
    heatmapRelative: 'Relativo',
    distributionAbsolute: 'Valores Absolutos',
    distributionPercentage: 'Porcentajes',

    // Correlaciones
    correlationsTitle: 'Correlaciones',
    sortDesc: 'Mayor → Menor',
    sortAsc: 'Menor → Mayor',
    noSort: 'Sin ordenar',
    inverse: 'Inversa',
    veryStrong: 'Muy fuerte',
    strong: 'Fuerte',
    moderate: 'Moderada',
    weak: 'Débil',
    veryWeak: 'Muy débil',
    correlationEvolution: 'Evolución de correlaciones por nivel',
    correlationEvolutionDesc: 'Cada línea representa un nivel (1EEM-4EEM), el eje X muestra los pares de asignaturas',
    correlationToggleSubjects: 'Por Asignaturas',
    correlationToggleLevels: 'Por Niveles',
    radarComparison: 'Comparación Radar',

    // Evolución
    evolutionTitle: 'Evolución entre trimestres',
    evolutionDesc: 'Compara la evolución de una asignatura o nivel a lo largo de los trimestres cargados. Usa el selector de selecciones en la vista "Estadísticas" para elegir diferentes combinaciones de trimestre + nivel + asignatura y ver cómo cambian las métricas.',
    needTwoTrimesters: 'Necesitas cargar al menos 2 trimestres para ver la evolución.',
    trimestersLoaded: 'Trimestres cargados',
    showingEvolution: 'Mostrando evolución de',
    notEnoughData: 'No hay datos suficientes para {level} - {subject} en múltiples trimestres.',

    // Mensajes
    trimesterAlreadyLoaded: 'Trimestre ya cargado',
    replaceConfirm: 'El trimestre {trimester} ya está cargado. ¿Quieres reemplazar los datos existentes?',
    noCorrelationData: 'No hay datos de correlaciones para este trimestre.',
    csvInstructions: 'Exporta los datos desde la hoja EXPORTAR de tu Excel en formato CSV, o importa un archivo JSON previamente guardado.',
    trimestersLoadedLabel: 'Trimestres cargados:',

    // Footer
    designedBy: 'App diseñada por',
    withHelpOf: 'con ayuda de Claude',
  },
  va: {
    // General
    appTitle: 'Tauler Acadèmic',
    appSubtitle: 'Anàlisi de rendiment per curs, assignatura i trimestre',
    loadData: 'Carregar dades',

    // Accions
    loadCSV: 'Carregar CSV de trimestre',
    importJSON: 'Importar JSON guardat',
    exportJSON: 'Exportar JSON',
    addTrimester: 'Afegir trimestre',
    add: 'Afegir',
    cancel: 'Cancel·lar',
    replace: 'Reemplaçar',
    delete: 'Eliminar',

    // Navegació
    statistics: 'Estadístiques',
    correlations: 'Correlacions',
    evolution: 'Evolució',
    difficulty: 'Dificultat',

    // KPIs
    kpis: 'Indicadors Clau del Centre',
    kpiCenterAvg: 'Nota Mitjana del Centre',
    kpiLMAvg: 'Nota Mitjana Llenguatge Musical',
    kpiInstrAvg: 'Nota Mitjana Especialitats',
    kpiDifficult: 'Assignatures Difícils',
    kpiEasy: 'Assignatures Fàcils',
    kpiPassedAvg: '% Aprovats Total',
    kpiPassedLM: '% Aprovats LM',
    kpiPassedInstr: '% Aprovats Esp.',
    kpiFailedAvg: '% Suspesos Total',
    kpiFailedLM: '% Suspesos LM',
    kpiFailedInstr: '% Suspesos Esp.',

    // Seleccions
    selections: 'Seleccions per a comparar',
    selection: 'Selecció',
    trimester: 'Trimestre',
    level: 'Nivell',
    subject: 'Assignatura',
    compareLevels: 'Comparar mateixa assignatura en tots els nivells (1EEM - 4EEM)',
    subjectToCompare: 'Assignatura a comparar',

    // Llindars
    configureThresholds: 'Configurar llindars',
    thresholdConfig: 'Configuració de llindars',
    restoreDefaults: 'Restaurar valors per defecte',
    failedAlert: '% Suspesos alerta',
    criticalAvg: 'Mitjana crítica',
    easyAvg: 'Mitjana fàcil',
    minPassed: '% Aprovats mínim',
    minStudents: 'Alumnes mínims',

    // Etiquetes
    difficult: 'DIFÍCIL',
    easy: 'FÀCIL',
    neutral: 'NEUTRAL',
    global: 'GLOBAL',
    all: 'Tots',
    difficultSubjects: 'Assignatures Difícils',
    neutralSubjects: 'Assignatures Neutrals',
    easySubjects: 'Assignatures Fàcils',
    difficultyReason: 'Motiu',

    // Estadístiques
    records: 'Registres',
    average: 'Nota Mitjana',
    deviation: 'Desviació',
    mode: 'Moda',
    passed: 'Aprovats',
    failed: 'Suspesos',
    passedMode: 'Moda Aprovats',
    failedMode: 'Moda Suspesos',
    excellence: 'Excel·lència',

    // Gràfics
    gradeDistribution: 'Distribució de Notes',
    distributionTable: 'Taula de Distribució',
    grade: 'Nota',
    total: 'TOTAL',
    groupByGrade: 'Agrupació per qualificacions',
    grades: 'Notes',
    insufficient: 'Insuficient',
    sufficient: 'Suficient',
    good: 'Bé',
    notable: 'Notable',
    excellent: 'Excel·lent',
    radarChart: 'Gràfic Radar',
    heatmapAbsolute: 'Absolut',
    heatmapRelative: 'Relatiu',
    distributionAbsolute: 'Valors Absoluts',
    distributionPercentage: 'Percentatges',

    // Correlacions
    correlationsTitle: 'Correlacions',
    sortDesc: 'Major → Menor',
    sortAsc: 'Menor → Major',
    noSort: 'Sense ordenar',
    inverse: 'Inversa',
    veryStrong: 'Molt forta',
    strong: 'Forta',
    moderate: 'Moderada',
    weak: 'Dèbil',
    veryWeak: 'Molt dèbil',
    correlationEvolution: 'Evolució de correlacions per nivell',
    correlationEvolutionDesc: 'Cada línia representa un nivell (1EEM-4EEM), l\'eix X mostra els parells d\'assignatures',
    correlationToggleSubjects: 'Per Assignatures',
    correlationToggleLevels: 'Per Nivells',
    radarComparison: 'Comparació Radar',

    // Evolució
    evolutionTitle: 'Evolució entre trimestres',
    evolutionDesc: 'Compara l\'evolució d\'una assignatura o nivell al llarg dels trimestres carregats. Utilitza el selector de seleccions a la vista "Estadístiques" per a triar diferents combinacions de trimestre + nivell + assignatura i veure com canvien les mètriques.',
    needTwoTrimesters: 'Necessites carregar almenys 2 trimestres per a veure l\'evolució.',
    trimestersLoaded: 'Trimestres carregats',
    showingEvolution: 'Mostrant evolució de',
    notEnoughData: 'No hi ha dades suficients per a {level} - {subject} en múltiples trimestres.',

    // Missatges
    trimesterAlreadyLoaded: 'Trimestre ja carregat',
    replaceConfirm: 'El trimestre {trimester} ja està carregat. Vols reemplaçar les dades existents?',
    noCorrelationData: 'No hi ha dades de correlacions per a aquest trimestre.',
    csvInstructions: 'Exporta les dades des del full EXPORTAR del teu Excel en format CSV, o importa un arxiu JSON prèviament guardat.',
    trimestersLoadedLabel: 'Trimestres carregats:',

    // Footer
    designedBy: 'App dissenyada per',
    withHelpOf: 'amb ajuda de Claude',
  }
};
