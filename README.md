# Dashboard Académico v2.4.0

---

## [ES] ESPAÑOL

### 📊 Visión General

**Dashboard Académico** es una aplicación web interactiva diseñada para visualizar y analizar datos académicos de conservatorios de música. Proporciona herramientas avanzadas de análisis estadístico para ayudar a directores, jefes de estudios y profesorado en la toma de decisiones basada en datos.

**🎯 Usuarios Objetivo:**
- Directores de conservatorios
- Jefes de estudios
- Profesorado
- Personal administrativo

**✨ Funciones Principales:**

- **Visualización Estadística Completa**: Análisis detallado por trimestre, nivel educativo y asignatura con gráficos interactivos (distribuciones, radar, mapas de calor)
- **Análisis de Correlaciones**: Identificación de relaciones entre asignaturas mediante coeficiente de Pearson con filtros avanzados
- **Seguimiento de Evolución Temporal**: Comparación de resultados a lo largo del curso académico con detección automática de tendencias
- **Identificación de Dificultad**: Clasificación automática de asignaturas según umbrales configurables (difícil/neutral/fácil)
- **Generación de Informes PDF**: Creación de reportes personalizados con KPIs, gráficos y análisis detallados
- **Importación/Exportación de Datos**: Soporte para CSV (desde Excel) y JSON para guardar y recuperar sesiones completas
- **Interfaz Bilingüe**: Soporte completo para español y valenciano

**🔗 Aplicación en Línea:**

https://jlmirallesb.github.io/DashboardAcademico/

**👤 Autor:**

Diseñado por **José Luis Miralles Bono** con ayuda de Claude

**📄 Licencia:**

Proyecto de código abierto disponible en GitHub

---

### 📖 Uso

#### Carga de Datos

**Formato CSV:**
1. Exportar datos desde la hoja **EXPORTAR** del archivo Excel del conservatorio
2. Hacer clic en **"Cargar CSV de trimestre"** en la pantalla inicial o desde el botón **"Gestionar datos cargados"**
3. Seleccionar el archivo CSV exportado
4. El sistema detecta automáticamente:
   - Separador (`;` o `,`)
   - Etapa educativa (EEM/EPM) según los niveles presentes
   - Estructura multi-sección (`#METADATA`, `#ESTADISTICAS`, `#CORRELACIONES`, `#AGRUPACIONES`)

**Formato JSON:**
1. Hacer clic en **"Importar JSON guardado"**
2. Seleccionar un archivo JSON previamente exportado desde la aplicación
3. Se restaura el estado completo con todos los trimestres cargados

**Gestión de Trimestres:**
- **Ver trimestres cargados**: Botón "Gestionar datos cargados" muestra todos los trimestres disponibles
- **Cambiar trimestre activo**: Seleccionar cualquier trimestre de la lista
- **Eliminar trimestre**: Botón de papelera en cada tarjeta de trimestre
- **Añadir más trimestres**: Cargar CSV adicionales para comparar múltiples evaluaciones

#### Navegación Básica

**Selector de Idioma:**
- **ES**: Español (Castellano)
- **VA**: Valencià (Valenciano)
- Cambia toda la interfaz y los contenidos de ayuda

**Selector de Etapa Educativa:**
- **EEM**: Enseñanzas Elementales de Música (1EEM a 4EEM)
- **EPM**: Enseñanzas Profesionales de Música (1EPM a 6EPM)
- **TODOS**: Vista combinada de ambas etapas (usa coincidencia automática de trimestres)

**Pestañas de Visualización:**

1. **Estadísticas**: KPIs globales del centro, gráficos de distribución, radar comparativo, mapas de calor, mapa de dispersión (nota media vs desviación típica)

2. **Correlaciones**: Matriz de correlaciones entre asignaturas con ordenación descendente, filtros por nivel, indicadores de fuerza (muy fuerte/fuerte/moderada/débil/muy débil)

3. **Evolución**: Gráficos de tendencia temporal comparando múltiples trimestres, detección automática de patrones (estable, creciente, decreciente, valle, pico, oscilante, irregular)

4. **Dificultad**: Análisis de asignaturas problemáticas según umbrales configurables, clasificación en difícil/neutral/fácil, razones detalladas

5. **Asignaturas**: Tabla completa de todas las asignaturas con filtrado por nivel, estadísticas detalladas (media, desviación, moda, aprobados, suspensos, excelencias)

#### Funciones Clave

**Exportar JSON:**
- Guarda el estado completo de la aplicación
- Incluye todos los trimestres cargados
- Permite recuperar sesiones de trabajo

**Generar Informe PDF:**
- Configuración personalizada de secciones a incluir
- Nombre del centro personalizable
- Incluye KPIs, gráficos, tablas y análisis

**Configurar Umbrales:**
- Disponible en la vista de Dificultad
- Ajustar criterios de alerta:
  - % Suspensos de alerta (defecto: 30%)
  - Nota media crítica (defecto: 6.0)
  - Nota media fácil (defecto: 8.0)
  - % Aprobados mínimo (defecto: 90%)
  - Nº mínimo de alumnos (defecto: 3)

---

### 📐 Términos Matemáticos y Estadísticos

Esta sección define los términos técnicos utilizados en el dashboard sin interpretaciones pedagógicas.

#### 1. Medidas de Centralidad

**Nota Media (x̄)**
> Suma de todas las calificaciones dividida entre el número total de registros.
> Fórmula: x̄ = Σx / n
>
> En términos simples: el promedio aritmético de todas las notas. Si hay 10 alumnos con notas que suman 75 puntos, la media es 7.5.

**Mediana**
> Valor que ocupa la posición central en un conjunto ordenado de datos, dividiendo el conjunto en dos mitades iguales.
> Fórmula: Si n es impar: valor en posición (n+1)/2. Si n es par: promedio de valores en posiciones n/2 y (n/2)+1.
>
> En términos simples: la nota del "alumno del medio" si ordenamos todas las notas de menor a mayor. Es más resistente a valores extremos que la media.

**Moda**
> Valor que aparece con mayor frecuencia en el conjunto de datos.
>
> En términos simples: la calificación que más se repite. Si 8 alumnos sacaron un 7 y el resto otras notas, la moda es 7. Puede haber más de una moda (distribución multimodal) o ninguna (distribución amodal).

**Moda Aprobados**
> Calificación más frecuente dentro del rango de notas aprobatorias (5-10).
>
> En términos simples: entre los alumnos que aprobaron, ¿qué nota fue la más común?

**Moda Suspendidos**
> Calificación más frecuente dentro del rango de notas no aprobatorias (0-4).
>
> En términos simples: entre los alumnos que suspendieron, ¿qué nota fue la más común?

#### 2. Medidas de Dispersión

**Desviación Típica (σ)**
> Medida de dispersión que cuantifica la variabilidad de los datos respecto a la media.
> Fórmula: σ = √(Σ(x - x̄)² / n)
>
> En términos simples: indica cuánto se "alejan" en promedio las notas de la media. Una desviación de 0.5 significa notas muy homogéneas; una de 2.5 indica resultados muy variables.

**Varianza (σ²)**
> Promedio de los cuadrados de las desviaciones respecto a la media.
> Fórmula: σ² = Σ(x - x̄)² / n
>
> En términos simples: similar a la desviación típica, pero elevada al cuadrado. Se usa en cálculos estadísticos porque evita que distancias positivas y negativas se cancelen entre sí.

#### 3. Indicadores de Rendimiento

**% Aprobados**
> Porcentaje de estudiantes con calificación mayor o igual a 5.
> Fórmula: (Nº de aprobados / Total de alumnos) × 100
>
> En términos simples: de cada 100 alumnos, cuántos superaron la asignatura.

**% Suspendidos**
> Porcentaje de estudiantes con calificación menor a 5.
> Fórmula: (Nº de suspendidos / Total de alumnos) × 100
>
> En términos simples: de cada 100 alumnos, cuántos no alcanzaron el aprobado.

**KPI (Key Performance Indicator)**
> Indicador Clave de Rendimiento. Métrica cuantificable utilizada para evaluar el desempeño global.
>
> En el dashboard se calculan KPIs como: nota media del centro, desviación típica global, moda del centro, notas medias por tipo de asignatura (Lenguaje Musical, Teórica Troncal, Especialidades), porcentajes de aprobados/suspendidos, y número de asignaturas difíciles/fáciles.

#### 4. Análisis de Relaciones

**Coeficiente de Correlación de Pearson (r)**
> Medida de la relación lineal entre dos variables. Rango: [-1, +1].
> Fórmula: r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)
>
> En términos simples: indica si dos asignaturas tienden a tener resultados similares. Si r = 0.8, cuando los alumnos van bien en una asignatura, tienden a ir bien en la otra.
>
> **Interpretación por fuerza:**
> - **Muy fuerte**: |r| ≥ 0.9 (relación casi perfecta)
> - **Fuerte**: 0.7 ≤ |r| < 0.9 (relación clara)
> - **Moderada**: 0.5 ≤ |r| < 0.7 (relación notable)
> - **Débil**: 0.3 ≤ |r| < 0.5 (relación leve)
> - **Muy débil**: |r| < 0.3 (relación mínima o nula)
>
> **Signo:**
> - **r > 0**: Correlación positiva (ambas variables suben juntas)
> - **r < 0**: Correlación negativa (cuando una sube, la otra baja)
> - **r = 0**: Sin correlación lineal

#### 5. Análisis de Tendencias

**Tendencia**
> Patrón de comportamiento de una variable a lo largo del tiempo, identificado mediante análisis de regresión.
>
> En términos simples: describe cómo evolucionan las notas a través de los trimestres o niveles educativos.

**12 Tipos de Tendencia Identificados:**

> **➖ Estable**: Variación mínima entre periodos. Criterio: |pendiente| < 0.1
>
> **↗️ Creciente Sostenido**: Aumento constante a lo largo del tiempo. Criterio: pendiente > 0.1 (lineal)
>
> **↘️ Decreciente Sostenido**: Disminución constante a lo largo del tiempo. Criterio: pendiente < -0.1 (lineal)
>
> **🚀 Creciente Acelerado**: Aumento que se acelera progresivamente. Criterio: pendiente > 0 y curvatura > 0. Como una bola rodando cuesta abajo que cada vez va más rápido.
>
> **📈 Creciente Desacelerado**: Aumento que se ralentiza progresivamente. Criterio: pendiente > 0 y curvatura < 0. Como un coche que frena mientras sube.
>
> **📉 Decreciente Acelerado**: Disminución que se acelera progresivamente. Criterio: pendiente < 0 y curvatura < 0. La caída es cada vez más pronunciada.
>
> **⬇️ Decreciente Desacelerado**: Disminución que se ralentiza progresivamente. Criterio: pendiente < 0 y curvatura > 0. La caída se va frenando.
>
> **↗️ Valle** (forma U): Descenso inicial seguido de recuperación. Criterio: 1 punto de inflexión, inicio negativo, final positivo.
>
> **⚠️ Pico** (forma ∩): Ascenso inicial seguido de caída. Criterio: 1 punto de inflexión, inicio positivo, final negativo.
>
> **〰️ Oscilante**: Alternancia frecuente entre subidas y bajadas. Criterio: R² < 0.3, varianza > 0.5, ≥2 puntos de datos.
>
> **❓ Irregular**: Sin patrón identificable. Criterio: R² < 0.3, varianza > 0.5.
>
> **📊 Datos Insuficientes**: Menos de 2 datos válidos para analizar tendencia.

**Regresión Lineal**
> Método estadístico que ajusta los datos a un modelo de línea recta: y = mx + b
> Donde m = pendiente y b = punto de corte con el eje Y.
>
> En términos simples: traza la "mejor línea recta" que representa la tendencia general de los datos. Se usa para detectar tendencias sostenidas.

**Regresión Cuadrática**
> Método estadístico que ajusta los datos a un modelo de parábola: y = ax² + bx + c
> Donde a = curvatura, b y c son coeficientes.
>
> En términos simples: traza una curva que captura aceleraciones o desaceleraciones. Se usa para detectar tendencias con cambios de ritmo.

**Pendiente (m)**
> Tasa de cambio en la regresión lineal. Indica cuánto aumenta o disminuye Y por cada unidad de X.
> Fórmula: m = (n×ΣXY - ΣX×ΣY) / (n×ΣX² - (ΣX)²)
>
> En términos simples: si la pendiente es 0.5, significa que por cada trimestre las notas suben medio punto en promedio.

**Curvatura (a)**
> Coeficiente cuadrático en la regresión cuadrática. Indica si la tendencia se acelera (a > 0) o desacelera (a < 0).
>
> En términos simples: determina si la "curva" se dobla hacia arriba (aceleración) o hacia abajo (desaceleración).

**R² (Coeficiente de Determinación)**
> Proporción de la variabilidad de los datos que es explicada por el modelo de regresión. Rango: [0, 1].
> Fórmula: R² = 1 - (SS_residual / SS_total)
>
> En términos simples: indica qué tan bien la línea de tendencia se ajusta a los datos. Un R² de 0.9 significa que el modelo explica el 90% de la variación. Un R² bajo indica datos muy dispersos o sin patrón claro.

#### 6. Análisis de Dificultad

**Clasificación de Asignaturas por Dificultad**
> Sistema de categorización automática basado en umbrales configurables:
>
> **🔴 DIFÍCIL**: Asignaturas con bajo rendimiento general.
> Criterios: % Suspendidos ≥ 30% O Nota Media < 6
>
> **⚪ NEUTRAL**: Asignaturas con rendimiento intermedio.
> Criterios: No cumple criterios de difícil ni fácil
>
> **🟢 FÁCIL**: Asignaturas con alto rendimiento general.
> Criterios: % Aprobados ≥ 90% O Nota Media ≥ 8
>
> En términos simples: clasifica automáticamente las asignaturas según los resultados de los alumnos. Los umbrales se pueden ajustar en la configuración.

#### 7. Distribuciones

**Distribución de Frecuencias**
> Tabla o gráfico que muestra cuántos registros caen en cada valor o intervalo de valores.
>
> En términos simples: indica cuántos alumnos sacaron cada nota (1, 2, 3... 10). Por ejemplo: "15 alumnos sacaron un 7, 8 alumnos sacaron un 8, etc."

#### 8. Tipos de Gráficas y Visualizaciones

**Gráfico de Distribución de Calificaciones**
> Gráfico de líneas que muestra la frecuencia de cada calificación (1-10).
>
> - **Eje X**: Calificaciones (1 a 10)
> - **Eje Y**: Cantidad de alumnos o porcentaje
> - **Configuración**: Modo absoluto (cantidad) o porcentaje
>
> En términos simples: visualiza "la forma" de las notas de una asignatura. Permite ver si la mayoría aprueba, suspende, o si hay dos grupos diferenciados.

**Mapa de Dispersión (Scatter Chart)**
> Gráfico que muestra la relación entre Nota Media y Desviación Estándar de las asignaturas.
>
> - **Eje X**: Nota Media (0-10)
> - **Eje Y**: Desviación Estándar
> - **Tamaño del punto**: Proporcional al número de alumnos
> - **Colores por cuadrante**:
>   - 🟢 **Verde**: Media alta + Dispersión baja (rendimiento ideal, resultados uniformes)
>   - 🔵 **Azul**: Media alta + Dispersión alta (buenos resultados pero variables)
>   - 🟠 **Naranja**: Media baja + Dispersión baja (dificultad consistente)
>   - 🟣 **Rosa**: Media baja + Dispersión alta (resultados muy inconsistentes)
> - **Líneas de referencia**: Vertical en media = 7, horizontal en desviación = 1.5
>
> En términos simples: permite identificar de un vistazo qué asignaturas tienen buenos resultados homogéneos (zona verde) vs asignaturas problemáticas con mucha variabilidad (zona rosa).

**Gráfico Radar (Polar Chart)**
> Gráfico en forma de telaraña que compara hasta 5 selecciones en 4 dimensiones simultáneamente.
>
> - **Dimensiones analizadas**: Nota Media, % Aprobados, % Excelencia (notas 9-10), Moda
> - **Área sombreada**: Cada selección forma un polígono, cuanto más grande mejor rendimiento
>
> En términos simples: como comparar el "perfil completo" de varias asignaturas. Permite ver de forma visual cuál tiene mejor rendimiento global en todas las métricas.

**Tabla con Mapa de Calor (Heatmap)**
> Tabla de distribución de calificaciones con coloración por intensidad.
>
> - **Filas**: Calificaciones (1-10) o grupos (Insuficiente, Suficiente, Bien, Notable, Excelente)
> - **Columnas**: Selecciones de asignaturas/trimestres
> - **Modo Relativo**: Colores según el máximo de cada columna
> - **Modo Absoluto**: Colores según el máximo global
> - **Escala de color**: Verde claro (valores bajos) → Amarillo (medios) → Rojo (altos)
>
> En términos simples: la tabla "se pinta" de colores más intensos donde hay más alumnos, permitiendo detectar patrones de un vistazo.

**Gráficos de Evolución Longitudinal**
> Gráficos de líneas que muestran cómo cambia una asignatura a través de todos los niveles educativos.
>
> - **Eje X**: Niveles educativos (1EEM-4EEM o 1EPM-6EPM)
> - **Eje Y**: Nota Media o % Suspendidos
> - **Incluye**: Indicador de tendencia con icono (➖, ↗️, 🚀, etc.)
>
> En términos simples: permite ver si una asignatura se hace más difícil o fácil conforme avanzan los cursos.

**Gráfico de Evolución de Correlaciones**
> Gráfico de líneas que muestra cómo varían las correlaciones entre asignaturas a lo largo de los trimestres o niveles.
>
> - **Modo Pares**: Muestra correlación entre pares de asignaturas específicas
> - **Modo Niveles**: Muestra correlación por nivel educativo
> - **Eje Y**: Coeficiente de correlación [-0.2, 0.8]
>
> En términos simples: permite detectar si la relación entre dos asignaturas se fortalece o debilita con el tiempo.

---

### 📈 Guía de Interpretación de Indicadores

> **Nota sobre umbrales**: Los valores de referencia mencionados en esta sección (media alta = 7, dispersión = 1.5, % suspensos crítico = 30%, etc.) son los umbrales por defecto de la aplicación. Pueden ajustarse según el contexto del centro mediante la configuración de umbrales disponible en la vista de Dificultad.

#### Indicadores globales (KPIs)

**Nota media del centro**

Mide el rendimiento agregado del alumnado y ofrece una primera señal sobre la situación general.

- Una nota media igual o superior a 7 suele indicar que el alumnado alcanza los objetivos previstos con relativa solvencia. No obstante, conviene contrastar este dato con la exigencia de los criterios de evaluación, la dispersión de las calificaciones y la comparativa con cursos anteriores, para descartar efectos de evaluación poco discriminante o inflación de notas.
- Una nota media en torno a 6 o inferior puede señalar dificultades en la asimilación de contenidos, sobrecarga de tareas o desajustes metodológicos. Alternativamente, puede reflejar:
  - Un aumento deliberado de la exigencia.
  - Un perfil de cohorte distinto (menor base previa).
  - Cambios recientes en criterios o instrumentos de evaluación.

Por tanto, la media debe interpretarse como señal de alerta o confirmación, no como diagnóstico en sí misma.

**Nota media de Lenguaje Musical / Teórica Troncal**

Actúa como referencia del "tronco común" y de los fundamentos teóricos.

- Si estas medias se sitúan claramente por debajo de la media del centro, puede indicar la necesidad de refuerzo en fundamentos, ajustes en la secuenciación o mayor coordinación metodológica.
- No obstante, también es frecuente que las troncales:
  - Se evalúen con criterios más homogéneos y objetivos.
  - Sean menos tolerantes a lagunas previas.
  - Reciban menor prioridad por parte del alumnado frente a las especialidades.

Por ello, diferencias moderadas entre troncales y media global no implican necesariamente un problema estructural, pero sí justifican un análisis más detallado.

**Nota media de especialidades**

Refleja el progreso en la práctica instrumental o vocal.

- Si la media de especialidades está por encima del tronco común, suele interpretarse como buen progreso práctico, motivación y transferencia efectiva de aprendizajes.
- Si está por debajo, puede sugerir dificultades técnicas, necesidad de mayor acompañamiento o desajustes entre repertorio, expectativas y tiempo de trabajo disponible.

Alternativamente, medias más bajas pueden deberse a:
- Mayor heterogeneidad del punto de partida.
- Criterios de evaluación más individualizados y exigentes.
- Condiciones externas (acceso a instrumento, práctica autónoma, apoyo familiar).

**% de aprobados y % de suspensos (total, troncales, especialidades)**

Ofrecen una visión complementaria sobre la "salud" del trimestre.

- Porcentajes de aprobados muy altos (p. ej. >90 %) junto con medias altas pueden indicar objetivos asequibles y buen acompañamiento, pero también invitan a revisar si la evaluación discrimina adecuadamente los distintos niveles de logro.
- Incrementos en los suspensos pueden alertar sobre desajustes de ritmo, prerequisitos no consolidados o necesidad de apoyos adicionales. También pueden reflejar:
  - Cambios en criterios de promoción.
  - Evaluaciones acumulativas sin suficiente recuperación.
  - Incidencias de asistencia o contexto personal del alumnado.

#### Visualizaciones

**Mapa de dispersión (Nota media vs. desviación)**

El mapa permite observar simultáneamente el nivel medio y la heterogeneidad de resultados.

- **Eje X (nota media)**: nivel general de logro.
- **Eje Y (desviación)**: grado de dispersión entre el alumnado.

**Lectura de cuadrantes** (orientativa, no prescriptiva):

- **Media alta, dispersión baja**: rendimiento elevado y homogéneo. Puede reflejar buen alineamiento didáctico, aunque conviene comprobar que la homogeneidad no oculte falta de profundidad.
- **Media alta, dispersión alta**: buen promedio con brecha interna. Suele justificar apoyos focalizados, aunque también puede indicar evaluación sensible a diferencias reales de nivel.
- **Media baja, dispersión baja**: resultados ajustados de forma generalizada. Puede apuntar a dificultad compartida, pero también a cohortes homogéneas con menor base o a estándares exigentes.
- **Media baja, dispersión alta**: gran variabilidad. Requiere diagnóstico más fino (asistencia, práctica, adaptación de materiales), evitando intervenciones uniformes.

El tamaño del punto (número de alumnos) ayuda a priorizar, aunque grupos pequeños con resultados extremos también pueden requerir atención específica.

Las líneas de referencia (p. ej. media = 7, desviación ≈ 1.5) facilitan la lectura comparativa, pero no deben interpretarse como umbrales rígidos.

**Distribución de notas**

La distribución muestra cómo se reparten las calificaciones y complementa la media y la desviación.

**Escenarios habituales** (con lecturas alternativas):

- **Campana centrada en 6–7 con poca cola baja**: grupo equilibrado. Puede bastar con refuerzos ligeros o ajustes puntuales.
- **Pico en 5 y cola larga hacia abajo**: muchos aprobados justos y riesgo de suspensos. Puede indicar base frágil, pero también una cultura evaluativa muy criterial.
- **Distribución bimodal**: dos velocidades claras. Suele justificar diferenciación, aunque también puede responder a subgrupos con trayectorias previas distintas.
- **Cola alta pronunciada (muchos 9–10)**: posible facilidad de objetivos o evaluación generosa, aunque también puede reflejar un grupo especialmente fuerte.
- **Cola baja larga y pocos sobresalientes**: posible desajuste de contenidos o ritmo, pero conviene descartar primero factores externos o cambios recientes.

Los heatmaps y porcentajes por rangos permiten identificar rápidamente concentraciones críticas, siempre interpretadas junto con el contexto del nivel y la asignatura.

**Comparativa transversal (misma asignatura en distintos niveles)**

Permite observar tendencias a lo largo de los cursos en nota media y suspensos.

- **Tendencia creciente**: puede indicar progresión curricular adecuada; conviene confirmar que no se deba solo a selección o abandono del alumnado con más dificultades.
- **Tendencia decreciente**: puede señalar un escalón mal calibrado o prerequisitos débiles, aunque también cambios de criterios o docencia.
- **Valle en un curso intermedio**: sugiere un "cuello de botella", pero conviene analizar si es estructural o coyuntural.
- **Pico puntual**: puede reflejar diferencias de exigencia o evaluación entre cursos.
- **Oscilaciones**: pueden deberse a heterogeneidad de grupos o enfoques docentes distintos; no siempre implican un problema, pero sí merecen seguimiento.

**Correlaciones entre asignaturas**

La correlación indica hasta qué punto los resultados del alumnado tienden a moverse conjuntamente entre materias. No implica causalidad, sino coexistencia de patrones.

**Lectura orientativa**:

- **Correlación positiva alta**: puede reflejar competencias base compartidas, hábitos de estudio comunes o criterios evaluativos similares. La coordinación puede ser útil, aunque conviene evitar asumir dependencia directa entre contenidos.
- **Correlación negativa**: puede sugerir conflictos de carga o priorización del alumnado, pero también estrategias compensatorias o diferencias en el tipo de exigencia.
- **Correlación cercana a cero**: indica independencia aparente; no descarta relaciones no lineales o efectos en subgrupos.

**Uso práctico**: Ordenar las correlaciones ayuda a priorizar dónde la coordinación puede tener mayor impacto, siempre interpretando los datos como punto de partida para indagación, no como prueba concluyente.

#### Análisis de dificultad

La vista de dificultad clasifica cada asignatura según criterios configurables:

- **DIFÍCIL**: Asignaturas con % de suspensos ≥ umbral de alerta O nota media < umbral crítico.
- **FÁCIL**: Asignaturas con % de aprobados ≥ umbral mínimo O nota media ≥ umbral fácil.
- **NEUTRAL**: Asignaturas que no cumplen ninguno de los criterios anteriores.

**Interpretación** (no prescriptiva):

- Una asignatura clasificada como **DIFÍCIL** puede indicar contenidos complejos, prerequisitos no consolidados, o desajustes metodológicos. Alternativamente, puede reflejar criterios de evaluación más exigentes, una cohorte con menor base previa, o factores externos (asistencia, práctica autónoma).
- Una asignatura clasificada como **FÁCIL** puede indicar buen alineamiento didáctico, objetivos asequibles o alta motivación del alumnado. También puede reflejar criterios de evaluación poco discriminantes, por lo que conviene revisar si la evaluación diferencia adecuadamente los distintos niveles de logro.
- Las asignaturas **NEUTRALES** se sitúan en zona intermedia y merecen seguimiento, especialmente si sus valores se aproximan a los umbrales críticos.

La clasificación debe entenderse como señal para profundizar el análisis, no como etiqueta definitiva.

#### Cierre interpretativo

En conjunto, estos indicadores permiten detectar señales tempranas y orientar la toma de decisiones. Dado que el objetivo es evitar falsos negativos, se recomienda:

- Tratar los resultados como hipótesis plausibles, no como diagnósticos cerrados.
- Contrastar siempre con información cualitativa (observación docente, asistencia, cambios organizativos).
- Priorizar intervenciones proporcionales y reversibles antes de cambios estructurales.

---

## [VA] VALENCIÀ

### 📊 Visió General

**Dashboard Acadèmic** és una aplicació web interactiva dissenyada per a visualitzar i analitzar dades acadèmiques de conservatoris de música. Proporciona ferramentes avançades d'anàlisi estadística per a ajudar a directors, caps d'estudis i professorat en la presa de decisions basada en dades.

**🎯 Usuaris Objectiu:**
- Directors de conservatoris
- Caps d'estudis
- Professorat
- Personal administratiu

**✨ Funcions Principals:**

- **Visualització Estadística Completa**: Anàlisi detallada per trimestre, nivell educatiu i assignatura amb gràfics interactius (distribucions, radar, mapes de calor)
- **Anàlisi de Correlacions**: Identificació de relacions entre assignatures mitjançant coeficient de Pearson amb filtres avançats
- **Seguiment d'Evolució Temporal**: Comparació de resultats al llarg del curs acadèmic amb detecció automàtica de tendències
- **Identificació de Dificultat**: Classificació automàtica d'assignatures segons llindars configurables (difícil/neutral/fàcil)
- **Generació d'Informes PDF**: Creació de reports personalitzats amb KPIs, gràfics i anàlisis detallades
- **Importació/Exportació de Dades**: Suport per a CSV (des d'Excel) i JSON per a guardar i recuperar sessions completes
- **Interfície Bilingüe**: Suport complet per a castellà i valencià

**🔗 Aplicació en Línia:**

https://jlmirallesb.github.io/DashboardAcademico/

**👤 Autor:**

Dissenyat per **José Luis Miralles Bono** amb ajuda de Claude

**📄 Llicència:**

Projecte de codi obert disponible en GitHub

---

### 📖 Ús

#### Càrrega de Dades

**Format CSV:**
1. Exportar dades des del full **EXPORTAR** de l'arxiu Excel del conservatori
2. Fer clic en **"Carregar CSV de trimestre"** en la pantalla inicial o des del botó **"Gestionar dades carregades"**
3. Seleccionar l'arxiu CSV exportat
4. El sistema detecta automàticament:
   - Separador (`;` o `,`)
   - Etapa educativa (EEM/EPM) segons els nivells presents
   - Estructura multi-secció (`#METADATA`, `#ESTADISTICAS`, `#CORRELACIONES`, `#AGRUPACIONES`)

**Format JSON:**
1. Fer clic en **"Importar JSON guardat"**
2. Seleccionar un arxiu JSON prèviament exportat des de l'aplicació
3. Es restaura l'estat complet amb tots els trimestres carregats

**Gestió de Trimestres:**
- **Veure trimestres carregats**: Botó "Gestionar dades carregades" mostra tots els trimestres disponibles
- **Canviar trimestre actiu**: Seleccionar qualsevol trimestre de la llista
- **Eliminar trimestre**: Botó de paperera en cada targeta de trimestre
- **Afegir més trimestres**: Carregar CSV addicionals per a comparar múltiples avaluacions

#### Navegació Bàsica

**Selector d'Idioma:**
- **ES**: Español (Castellà)
- **VA**: Valencià (Valencià)
- Canvia tota la interfície i els continguts d'ajuda

**Selector d'Etapa Educativa:**
- **EEM**: Ensenyances Elementals de Música (1EEM a 4EEM)
- **EPM**: Ensenyances Professionals de Música (1EPM a 6EPM)
- **TOTS**: Vista combinada d'ambdues etapes (usa coincidència automàtica de trimestres)

**Pestanyes de Visualització:**

1. **Estadístiques**: KPIs globals del centre, gràfics de distribució, radar comparatiu, mapes de calor, mapa de dispersió (nota mitjana vs desviació típica)

2. **Correlacions**: Matriu de correlacions entre assignatures amb ordenació descendent, filtres per nivell, indicadors de força (molt forta/forta/moderada/dèbil/molt dèbil)

3. **Evolució**: Gràfics de tendència temporal comparant múltiples trimestres, detecció automàtica de patrons (estable, creixent, decreixent, vall, pic, oscil·lant, irregular)

4. **Dificultat**: Anàlisi d'assignatures problemàtiques segons llindars configurables, classificació en difícil/neutral/fàcil, raons detallades

5. **Assignatures**: Taula completa de totes les assignatures amb filtrat per nivell, estadístiques detallades (mitjana, desviació, moda, aprovats, suspesos, excel·lències)

#### Funcions Clau

**Exportar JSON:**
- Guarda l'estat complet de l'aplicació
- Inclou tots els trimestres carregats
- Permet recuperar sessions de treball

**Generar Informe PDF:**
- Configuració personalitzada de seccions a incloure
- Nom del centre personalitzable
- Inclou KPIs, gràfics, taules i anàlisis

**Configurar Llindars:**
- Disponible en la vista de Dificultat
- Ajustar criteris d'alerta:
  - % Suspesos d'alerta (defecte: 30%)
  - Nota mitjana crítica (defecte: 6.0)
  - Nota mitjana fàcil (defecte: 8.0)
  - % Aprovats mínim (defecte: 90%)
  - Nº mínim d'alumnes (defecte: 3)

---

### 📐 Termes Matemàtics i Estadístics

Esta secció defineix els termes tècnics utilitzats en el dashboard sense interpretacions pedagògiques.

#### 1. Mesures de Centralitat

**Nota Mitjana (x̄)**
> Suma de totes les qualificacions dividida entre el nombre total de registres.
> Fórmula: x̄ = Σx / n
>
> En termes simples: el promig aritmètic de totes les notes. Si hi ha 10 alumnes amb notes que sumen 75 punts, la mitjana és 7.5.

**Mediana**
> Valor que ocupa la posició central en un conjunt ordenat de dades, dividint el conjunt en dos meitats iguals.
> Fórmula: Si n és senar: valor en posició (n+1)/2. Si n és parell: promig de valors en posicions n/2 i (n/2)+1.
>
> En termes simples: la nota de l'"alumne del mig" si ordenem totes les notes de menor a major. És més resistent a valors extrems que la mitjana.

**Moda**
> Valor que apareix amb major freqüència en el conjunt de dades.
>
> En termes simples: la qualificació que més es repeteix. Si 8 alumnes van traure un 7 i la resta altres notes, la moda és 7. Pot haver-hi més d'una moda (distribució multimodal) o cap (distribució amodal).

**Moda Aprovats**
> Qualificació més freqüent dins del rang de notes aprovades (5-10).
>
> En termes simples: entre els alumnes que van aprovar, quina nota va ser la més comuna?

**Moda Suspesos**
> Qualificació més freqüent dins del rang de notes no aprovades (0-4).
>
> En termes simples: entre els alumnes que van suspendre, quina nota va ser la més comuna?

#### 2. Mesures de Dispersió

**Desviació Típica (σ)**
> Mesura de dispersió que quantifica la variabilitat de les dades respecte a la mitjana.
> Fórmula: σ = √(Σ(x - x̄)² / n)
>
> En termes simples: indica quant s'"allunyen" en promig les notes de la mitjana. Una desviació de 0.5 significa notes molt homogènies; una de 2.5 indica resultats molt variables.

**Variància (σ²)**
> Promig dels quadrats de les desviacions respecte a la mitjana.
> Fórmula: σ² = Σ(x - x̄)² / n
>
> En termes simples: similar a la desviació típica, però elevada al quadrat. S'usa en càlculs estadístics perquè evita que distàncies positives i negatives es cancel·len entre si.

#### 3. Indicadors de Rendiment

**% Aprovats**
> Percentatge d'estudiants amb qualificació major o igual a 5.
> Fórmula: (Nº d'aprovats / Total d'alumnes) × 100
>
> En termes simples: de cada 100 alumnes, quants van superar l'assignatura.

**% Suspesos**
> Percentatge d'estudiants amb qualificació menor a 5.
> Fórmula: (Nº de suspesos / Total d'alumnes) × 100
>
> En termes simples: de cada 100 alumnes, quants no van arribar a l'aprovat.

**KPI (Key Performance Indicator)**
> Indicador Clau de Rendiment. Mètrica quantificable utilitzada per a avaluar l'acompliment global.
>
> En el dashboard es calculen KPIs com: nota mitjana del centre, desviació típica global, moda del centre, notes mitjanes per tipus d'assignatura (Llenguatge Musical, Teòrica Troncal, Especialitats), percentatges d'aprovats/suspesos, i nombre d'assignatures difícils/fàcils.

#### 4. Anàlisi de Relacions

**Coeficient de Correlació de Pearson (r)**
> Mesura de la relació lineal entre dos variables. Rang: [-1, +1].
> Fórmula: r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)
>
> En termes simples: indica si dos assignatures tendeixen a tindre resultats similars. Si r = 0.8, quan els alumnes van bé en una assignatura, tendeixen a anar bé en l'altra.
>
> **Interpretació per força:**
> - **Molt forta**: |r| ≥ 0.9 (relació quasi perfecta)
> - **Forta**: 0.7 ≤ |r| < 0.9 (relació clara)
> - **Moderada**: 0.5 ≤ |r| < 0.7 (relació notable)
> - **Dèbil**: 0.3 ≤ |r| < 0.5 (relació lleu)
> - **Molt dèbil**: |r| < 0.3 (relació mínima o nul·la)
>
> **Signe:**
> - **r > 0**: Correlació positiva (ambdues variables pugen juntes)
> - **r < 0**: Correlació negativa (quan una puja, l'altra baixa)
> - **r = 0**: Sense correlació lineal

#### 5. Anàlisi de Tendències

**Tendència**
> Patró de comportament d'una variable al llarg del temps, identificat mitjançant anàlisi de regressió.
>
> En termes simples: descriu com evolucionen les notes a través dels trimestres o nivells educatius.

**12 Tipus de Tendència Identificats:**

> **➖ Estable**: Variació mínima entre períodes. Criteri: |pendent| < 0.1
>
> **↗️ Creixent Sostingut**: Augment constant al llarg del temps. Criteri: pendent > 0.1 (lineal)
>
> **↘️ Decreixent Sostingut**: Disminució constant al llarg del temps. Criteri: pendent < -0.1 (lineal)
>
> **🚀 Creixent Accelerat**: Augment que s'accelera progressivament. Criteri: pendent > 0 i curvatura > 0. Com una bola rodant costa avall que cada vegada va més ràpid.
>
> **📈 Creixent Desaccelerat**: Augment que es ralentitza progressivament. Criteri: pendent > 0 i curvatura < 0. Com un cotxe que frena mentre puja.
>
> **📉 Decreixent Accelerat**: Disminució que s'accelera progressivament. Criteri: pendent < 0 i curvatura < 0. La caiguda és cada vegada més pronunciada.
>
> **⬇️ Decreixent Desaccelerat**: Disminució que es ralentitza progressivament. Criteri: pendent < 0 i curvatura > 0. La caiguda es va frenant.
>
> **↗️ Vall** (forma U): Descens inicial seguit de recuperació. Criteri: 1 punt d'inflexió, inici negatiu, final positiu.
>
> **⚠️ Pic** (forma ∩): Ascens inicial seguit de caiguda. Criteri: 1 punt d'inflexió, inici positiu, final negatiu.
>
> **〰️ Oscil·lant**: Alternança freqüent entre pujades i baixades. Criteri: R² < 0.3, variància > 0.5, ≥2 punts de dades.
>
> **❓ Irregular**: Sense patró identificable. Criteri: R² < 0.3, variància > 0.5.
>
> **📊 Dades Insuficients**: Menys de 2 dades vàlides per a analitzar tendència.

**Regressió Lineal**
> Mètode estadístic que ajusta les dades a un model de línia recta: y = mx + b
> On m = pendent i b = punt de tall amb l'eix Y.
>
> En termes simples: traça la "millor línia recta" que representa la tendència general de les dades. S'usa per a detectar tendències sostingudes.

**Regressió Quadràtica**
> Mètode estadístic que ajusta les dades a un model de paràbola: y = ax² + bx + c
> On a = curvatura, b i c són coeficients.
>
> En termes simples: traça una corba que captura acceleracions o desacceleracions. S'usa per a detectar tendències amb canvis de ritme.

**Pendent (m)**
> Taxa de canvi en la regressió lineal. Indica quant augmenta o disminueix Y per cada unitat de X.
> Fórmula: m = (n×ΣXY - ΣX×ΣY) / (n×ΣX² - (ΣX)²)
>
> En termes simples: si el pendent és 0.5, significa que per cada trimestre les notes pugen mig punt en promig.

**Curvatura (a)**
> Coeficient quadràtic en la regressió quadràtica. Indica si la tendència s'accelera (a > 0) o desaccelera (a < 0).
>
> En termes simples: determina si la "corba" es doblega cap amunt (acceleració) o cap avall (desacceleració).

**R² (Coeficient de Determinació)**
> Proporció de la variabilitat de les dades que és explicada pel model de regressió. Rang: [0, 1].
> Fórmula: R² = 1 - (SS_residual / SS_total)
>
> En termes simples: indica què tan bé la línia de tendència s'ajusta a les dades. Un R² de 0.9 significa que el model explica el 90% de la variació. Un R² baix indica dades molt disperses o sense patró clar.

#### 6. Anàlisi de Dificultat

**Classificació d'Assignatures per Dificultat**
> Sistema de categorització automàtica basat en llindars configurables:
>
> **🔴 DIFÍCIL**: Assignatures amb baix rendiment general.
> Criteris: % Suspesos ≥ 30% O Nota Mitjana < 6
>
> **⚪ NEUTRAL**: Assignatures amb rendiment intermedi.
> Criteris: No compleix criteris de difícil ni fàcil
>
> **🟢 FÀCIL**: Assignatures amb alt rendiment general.
> Criteris: % Aprovats ≥ 90% O Nota Mitjana ≥ 8
>
> En termes simples: classifica automàticament les assignatures segons els resultats dels alumnes. Els llindars es poden ajustar en la configuració.

#### 7. Distribucions

**Distribució de Freqüències**
> Taula o gràfic que mostra quants registres cauen en cada valor o interval de valors.
>
> En termes simples: indica quants alumnes van traure cada nota (1, 2, 3... 10). Per exemple: "15 alumnes van traure un 7, 8 alumnes van traure un 8, etc."

#### 8. Tipus de Gràfiques i Visualitzacions

**Gràfic de Distribució de Qualificacions**
> Gràfic de línies que mostra la freqüència de cada qualificació (1-10).
>
> - **Eix X**: Qualificacions (1 a 10)
> - **Eix Y**: Quantitat d'alumnes o percentatge
> - **Configuració**: Mode absolut (quantitat) o percentatge
>
> En termes simples: visualitza "la forma" de les notes d'una assignatura. Permet veure si la majoria aprova, suspén, o si hi ha dos grups diferenciats.

**Mapa de Dispersió (Scatter Chart)**
> Gràfic que mostra la relació entre Nota Mitjana i Desviació Estàndard de les assignatures.
>
> - **Eix X**: Nota Mitjana (0-10)
> - **Eix Y**: Desviació Estàndard
> - **Grandària del punt**: Proporcional al nombre d'alumnes
> - **Colors per quadrant**:
>   - 🟢 **Verd**: Mitjana alta + Dispersió baixa (rendiment ideal, resultats uniformes)
>   - 🔵 **Blau**: Mitjana alta + Dispersió alta (bons resultats però variables)
>   - 🟠 **Taronja**: Mitjana baixa + Dispersió baixa (dificultat consistent)
>   - 🟣 **Rosa**: Mitjana baixa + Dispersió alta (resultats molt inconsistents)
> - **Línies de referència**: Vertical en mitjana = 7, horitzontal en desviació = 1.5
>
> En termes simples: permet identificar d'una ullada quines assignatures tenen bons resultats homogenis (zona verda) vs assignatures problemàtiques amb molta variabilitat (zona rosa).

**Gràfic Radar (Polar Chart)**
> Gràfic en forma de teranyina que compara fins a 5 seleccions en 4 dimensions simultàniament.
>
> - **Dimensions analitzades**: Nota Mitjana, % Aprovats, % Excel·lència (notes 9-10), Moda
> - **Àrea ombrejada**: Cada selecció forma un polígon, quant més gran millor rendiment
>
> En termes simples: com a comparar el "perfil complet" de diverses assignatures. Permet veure de forma visual quina té millor rendiment global en totes les mètriques.

**Taula amb Mapa de Calor (Heatmap)**
> Taula de distribució de qualificacions amb coloració per intensitat.
>
> - **Files**: Qualificacions (1-10) o grups (Insuficient, Suficient, Bé, Notable, Excel·lent)
> - **Columnes**: Seleccions d'assignatures/trimestres
> - **Mode Relatiu**: Colors segons el màxim de cada columna
> - **Mode Absolut**: Colors segons el màxim global
> - **Escala de color**: Verd clar (valors baixos) → Groc (mitjans) → Roig (alts)
>
> En termes simples: la taula "es pinta" de colors més intensos on hi ha més alumnes, permetent detectar patrons d'una ullada.

**Gràfics d'Evolució Longitudinal**
> Gràfics de línies que mostren com canvia una assignatura a través de tots els nivells educatius.
>
> - **Eix X**: Nivells educatius (1EEM-4EEM o 1EPM-6EPM)
> - **Eix Y**: Nota Mitjana o % Suspesos
> - **Inclou**: Indicador de tendència amb icona (➖, ↗️, 🚀, etc.)
>
> En termes simples: permet veure si una assignatura es fa més difícil o fàcil conforme avancen els cursos.

**Gràfic d'Evolució de Correlacions**
> Gràfic de línies que mostra com varien les correlacions entre assignatures al llarg dels trimestres o nivells.
>
> - **Mode Parells**: Mostra correlació entre parells d'assignatures específiques
> - **Mode Nivells**: Mostra correlació per nivell educatiu
> - **Eix Y**: Coeficient de correlació [-0.2, 0.8]
>
> En termes simples: permet detectar si la relació entre dos assignatures es fortifica o s'afebleix amb el temps.

---

### 📈 Guia d'Interpretació d'Indicadors

> **Nota sobre llindars**: Els valors de referència esmentats en esta secció (mitjana alta = 7, dispersió = 1.5, % suspesos crític = 30%, etc.) són els llindars per defecte de l'aplicació. Poden ajustar-se segons el context del centre mitjançant la configuració de llindars disponible en la vista de Dificultat.

#### Indicadors globals (KPIs)

**Nota mitjana del centre**

Mesura el rendiment agregat de l'alumnat i ofereix una primera senyal sobre la situació general.

- Una nota mitjana igual o superior a 7 sol indicar que l'alumnat aconsegueix els objectius previstos amb relativa solvència. No obstant això, convé contrastar esta dada amb l'exigència dels criteris d'avaluació, la dispersió de les qualificacions i la comparativa amb cursos anteriors, per a descartar efectes d'avaluació poc discriminant o inflació de notes.
- Una nota mitjana entorn de 6 o inferior pot assenyalar dificultats en l'assimilació de continguts, sobrecàrrega de tasques o desajustos metodològics. Alternativament, pot reflectir:
  - Un augment deliberat de l'exigència.
  - Un perfil de cohort diferent (menor base prèvia).
  - Canvis recents en criteris o instruments d'avaluació.

Per tant, la mitjana ha d'interpretar-se com a senyal d'alerta o confirmació, no com a diagnòstic en si mateixa.

**Nota mitjana de Llenguatge Musical / Teòrica Troncal**

Actua com a referència del "tronc comú" i dels fonaments teòrics.

- Si estes mitjanes se situen clarament per davall de la mitjana del centre, pot indicar la necessitat de reforç en fonaments, ajustos en la seqüenciació o major coordinació metodològica.
- No obstant això, també és freqüent que les troncals:
  - S'avaluen amb criteris més homogenis i objectius.
  - Siguen menys tolerants a llacunes prèvies.
  - Reben menor prioritat per part de l'alumnat enfront de les especialitats.

Per això, diferències moderades entre troncals i mitjana global no impliquen necessàriament un problema estructural, però sí justifiquen una anàlisi més detallada.

**Nota mitjana d'especialitats**

Reflecteix el progrés en la pràctica instrumental o vocal.

- Si la mitjana d'especialitats està per damunt del tronc comú, sol interpretar-se com a bon progrés pràctic, motivació i transferència efectiva d'aprenentatges.
- Si està per davall, pot suggerir dificultats tècniques, necessitat de major acompanyament o desajustos entre repertori, expectatives i temps de treball disponible.

Alternativament, mitjanes més baixes poden deure's a:
- Major heterogeneïtat del punt de partida.
- Criteris d'avaluació més individualitzats i exigents.
- Condicions externes (accés a instrument, pràctica autònoma, suport familiar).

**% d'aprovats i % de suspesos (total, troncals, especialitats)**

Ofereixen una visió complementària sobre la "salut" del trimestre.

- Percentatges d'aprovats molt alts (p. ex. >90 %) juntament amb mitjanes altes poden indicar objectius assequibles i bon acompanyament, però també conviden a revisar si l'avaluació discrimina adequadament els diferents nivells d'assoliment.
- Increments en els suspesos poden alertar sobre desajustos de ritme, prerequisits no consolidats o necessitat de suports addicionals. També poden reflectir:
  - Canvis en criteris de promoció.
  - Avaluacions acumulatives sense suficient recuperació.
  - Incidències d'assistència o context personal de l'alumnat.

#### Visualitzacions

**Mapa de dispersió (Nota mitjana vs. desviació)**

El mapa permet observar simultàniament el nivell mitjà i l'heterogeneïtat de resultats.

- **Eix X (nota mitjana)**: nivell general d'assoliment.
- **Eix Y (desviació)**: grau de dispersió entre l'alumnat.

**Lectura de quadrants** (orientativa, no prescriptiva):

- **Mitjana alta, dispersió baixa**: rendiment elevat i homogeni. Pot reflectir bon alineament didàctic, encara que convé comprovar que l'homogeneïtat no oculte falta de profunditat.
- **Mitjana alta, dispersió alta**: bon promig amb bretxa interna. Sol justificar suports focalitzats, encara que també pot indicar avaluació sensible a diferències reals de nivell.
- **Mitjana baixa, dispersió baixa**: resultats ajustats de forma generalitzada. Pot apuntar a dificultat compartida, però també a cohorts homogènies amb menor base o a estàndards exigents.
- **Mitjana baixa, dispersió alta**: gran variabilitat. Requereix diagnòstic més fi (assistència, pràctica, adaptació de materials), evitant intervencions uniformes.

La grandària del punt (nombre d'alumnes) ajuda a prioritzar, encara que grups xicotets amb resultats extrems també poden requerir atenció específica.

Les línies de referència (p. ex. mitjana = 7, desviació ≈ 1.5) faciliten la lectura comparativa, però no han d'interpretar-se com a llindars rígids.

**Distribució de notes**

La distribució mostra com es reparteixen les qualificacions i complementa la mitjana i la desviació.

**Escenaris habituals** (amb lectures alternatives):

- **Campana centrada en 6–7 amb poca cua baixa**: grup equilibrat. Pot bastar amb reforços lleugers o ajustos puntuals.
- **Pic en 5 i cua llarga cap avall**: molts aprovats justs i risc de suspesos. Pot indicar base fràgil, però també una cultura avaluativa molt criterial.
- **Distribució bimodal**: dos velocitats clares. Sol justificar diferenciació, encara que també pot respondre a subgrups amb trajectòries prèvies diferents.
- **Cua alta pronunciada (molts 9–10)**: possible facilitat d'objectius o avaluació generosa, encara que també pot reflectir un grup especialment fort.
- **Cua baixa llarga i pocs excel·lents**: possible desajust de continguts o ritme, però convé descartar primer factors externs o canvis recents.

Els heatmaps i percentatges per rangs permeten identificar ràpidament concentracions crítiques, sempre interpretades juntament amb el context del nivell i l'assignatura.

**Comparativa transversal (mateixa assignatura en diferents nivells)**

Permet observar tendències al llarg dels cursos en nota mitjana i suspesos.

- **Tendència creixent**: pot indicar progressió curricular adequada; convé confirmar que no es dega només a selecció o abandó de l'alumnat amb més dificultats.
- **Tendència decreixent**: pot assenyalar un escaló mal calibrat o prerequisits dèbils, encara que també canvis de criteris o docència.
- **Vall en un curs intermedi**: suggereix un "coll de botella", però convé analitzar si és estructural o conjuntural.
- **Pic puntual**: pot reflectir diferències d'exigència o avaluació entre cursos.
- **Oscil·lacions**: poden deure's a heterogeneïtat de grups o enfocaments docents diferents; no sempre impliquen un problema, però sí mereixen seguiment.

**Correlacions entre assignatures**

La correlació indica fins a quin punt els resultats de l'alumnat tendeixen a moure's conjuntament entre matèries. No implica causalitat, sinó coexistència de patrons.

**Lectura orientativa**:

- **Correlació positiva alta**: pot reflectir competències base compartides, hàbits d'estudi comuns o criteris avaluatius similars. La coordinació pot ser útil, encara que convé evitar assumir dependència directa entre continguts.
- **Correlació negativa**: pot suggerir conflictes de càrrega o priorització de l'alumnat, però també estratègies compensatòries o diferències en el tipus d'exigència.
- **Correlació pròxima a zero**: indica independència aparent; no descarta relacions no lineals o efectes en subgrups.

**Ús pràctic**: Ordenar les correlacions ajuda a prioritzar on la coordinació pot tindre major impacte, sempre interpretant les dades com a punt de partida per a indagació, no com a prova concloent.

#### Anàlisi de dificultat

La vista de dificultat classifica cada assignatura segons criteris configurables:

- **DIFÍCIL**: Assignatures amb % de suspesos ≥ llindar d'alerta O nota mitjana < llindar crític.
- **FÀCIL**: Assignatures amb % d'aprovats ≥ llindar mínim O nota mitjana ≥ llindar fàcil.
- **NEUTRAL**: Assignatures que no compleixen cap dels criteris anteriors.

**Interpretació** (no prescriptiva):

- Una assignatura classificada com a **DIFÍCIL** pot indicar continguts complexos, prerequisits no consolidats, o desajustos metodològics. Alternativament, pot reflectir criteris d'avaluació més exigents, una cohort amb menor base prèvia, o factors externs (assistència, pràctica autònoma).
- Una assignatura classificada com a **FÀCIL** pot indicar bon alineament didàctic, objectius assequibles o alta motivació de l'alumnat. També pot reflectir criteris d'avaluació poc discriminants, per la qual cosa convé revisar si l'avaluació diferencia adequadament els diferents nivells d'assoliment.
- Les assignatures **NEUTRALS** se situen en zona intermèdia i mereixen seguiment, especialment si els seus valors s'aproximen als llindars crítics.

La classificació ha d'entendre's com a senyal per a aprofundir l'anàlisi, no com a etiqueta definitiva.

#### Tancament interpretatiu

En conjunt, estos indicadors permeten detectar senyals primerencs i orientar la presa de decisions. Atés que l'objectiu és evitar falsos negatius, es recomana:

- Tractar els resultats com a hipòtesis plausibles, no com a diagnòstics tancats.
- Contrastar sempre amb informació qualitativa (observació docent, assistència, canvis organitzatius).
- Prioritzar intervencions proporcionals i reversibles abans de canvis estructurals.

---

**Repositorio GitHub**: https://github.com/jlmirallesb/DashboardAcademico
