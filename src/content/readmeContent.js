/**
 * Dashboard Académico - README Content
 * Embedded README content for the help modal
 */

export const README_CONTENT = `# Dashboard Académico v2.0.2

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
   - Separador (\`;\` o \`,\`)
   - Etapa educativa (EEM/EPM) según los niveles presentes
   - Estructura multi-sección (\`#METADATA\`, \`#ESTADISTICAS\`, \`#CORRELACIONES\`, \`#AGRUPACIONES\`)

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

**Nota Media (x̄)**
> Suma de todas las calificaciones dividida entre el número total de registros. Fórmula: x̄ = Σx / n

**Desviación Típica (σ)**
> Medida de dispersión que cuantifica la variabilidad de los datos respecto a la media. Valores altos indican mayor heterogeneidad en las calificaciones. Fórmula: σ = √(Σ(x - x̄)² / n)

**Moda**
> Valor que aparece con mayor frecuencia en el conjunto de datos. Puede haber más de una moda (distribución multimodal) o ninguna (distribución amodal).

**Coeficiente de Correlación de Pearson (r)**
> Medida de la relación lineal entre dos variables. Rango: -1 a +1.
> - **r = 1**: Correlación positiva perfecta
> - **r = -1**: Correlación negativa perfecta
> - **r = 0**: Sin correlación lineal
>
> Interpretación por fuerza:
> - **Muy fuerte**: |r| > 0.8
> - **Fuerte**: 0.6 < |r| ≤ 0.8
> - **Moderada**: 0.4 < |r| ≤ 0.6
> - **Débil**: 0.2 < |r| ≤ 0.4
> - **Muy débil**: |r| ≤ 0.2

**Tendencia**
> Patrón de comportamiento de una variable a lo largo del tiempo. El dashboard identifica 12 tipos:
> - **Estable**: Variación mínima entre periodos
> - **Creciente sostenida**: Aumento constante
> - **Creciente acelerada**: Aumento con incremento progresivo
> - **Creciente desacelerada**: Aumento con incremento decreciente
> - **Decreciente sostenida**: Disminución constante
> - **Decreciente acelerada**: Disminución con decremento progresivo
> - **Decreciente desacelerada**: Disminución con decremento decreciente
> - **Valle**: Descenso seguido de ascenso
> - **Pico**: Ascenso seguido de descenso
> - **Oscilante suave**: Variación periódica moderada
> - **Oscilante pronunciada**: Variación periódica intensa
> - **Irregular**: Sin patrón identificable

**Percentil**
> Valor que divide un conjunto ordenado de datos en 100 partes iguales. El percentil P indica que el P% de los datos son menores o iguales a ese valor.

**Cuartil**
> Caso especial de percentil que divide los datos en 4 partes:
> - **Q1** (percentil 25): Primer cuartil
> - **Q2** (percentil 50): Mediana
> - **Q3** (percentil 75): Tercer cuartil

**KPI (Key Performance Indicator)**
> Indicador Clave de Rendimiento. Métrica cuantificable utilizada para evaluar el desempeño. En el dashboard:
> - Nota media del centro
> - Desviación típica global
> - Moda del centro
> - Notas medias por tipo de asignatura (Lenguaje Musical, Teórica Troncal, Especialidades)
> - Porcentajes de aprobados
> - Número de asignaturas difíciles/fáciles

**Distribución de Frecuencias**
> Tabla o gráfico que muestra cuántos registros caen en cada intervalo de valores (por ejemplo: cuántos alumnos tienen notas entre 5-6, 6-7, etc.).

**Rango**
> Diferencia entre el valor máximo y mínimo de un conjunto de datos. Mide la amplitud total de variación.

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
   - Separador (\`;\` o \`,\`)
   - Etapa educativa (EEM/EPM) segons els nivells presents
   - Estructura multi-secció (\`#METADATA\`, \`#ESTADISTICAS\`, \`#CORRELACIONES\`, \`#AGRUPACIONES\`)

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

**Nota Mitjana (x̄)**
> Suma de totes les qualificacions dividida entre el nombre total de registres. Fórmula: x̄ = Σx / n

**Desviació Típica (σ)**
> Mesura de dispersió que quantifica la variabilitat de les dades respecte a la mitjana. Valors alts indiquen major heterogeneïtat en les qualificacions. Fórmula: σ = √(Σ(x - x̄)² / n)

**Moda**
> Valor que apareix amb major freqüència en el conjunt de dades. Pot haver-hi més d'una moda (distribució multimodal) o cap (distribució amodal).

**Coeficient de Correlació de Pearson (r)**
> Mesura de la relació lineal entre dos variables. Rang: -1 a +1.
> - **r = 1**: Correlació positiva perfecta
> - **r = -1**: Correlació negativa perfecta
> - **r = 0**: Sense correlació lineal
>
> Interpretació per força:
> - **Molt forta**: |r| > 0.8
> - **Forta**: 0.6 < |r| ≤ 0.8
> - **Moderada**: 0.4 < |r| ≤ 0.6
> - **Dèbil**: 0.2 < |r| ≤ 0.4
> - **Molt dèbil**: |r| ≤ 0.2

**Tendència**
> Patró de comportament d'una variable al llarg del temps. El dashboard identifica 12 tipus:
> - **Estable**: Variació mínima entre períodes
> - **Creixent sostinguda**: Augment constant
> - **Creixent accelerada**: Augment amb increment progressiu
> - **Creixent desaccelerada**: Augment amb increment decreixent
> - **Decreixent sostinguda**: Disminució constant
> - **Decreixent accelerada**: Disminució amb decrement progressiu
> - **Decreixent desaccelerada**: Disminució amb decrement decreixent
> - **Vall**: Descens seguit d'ascens
> - **Pic**: Ascens seguit de descens
> - **Oscil·lant suau**: Variació periòdica moderada
> - **Oscil·lant pronunciada**: Variació periòdica intensa
> - **Irregular**: Sense patró identificable

**Percentil**
> Valor que divideix un conjunt ordenat de dades en 100 parts iguals. El percentil P indica que el P% de les dades són menors o iguals a eixe valor.

**Quartil**
> Cas especial de percentil que divideix les dades en 4 parts:
> - **Q1** (percentil 25): Primer quartil
> - **Q2** (percentil 50): Mediana
> - **Q3** (percentil 75): Tercer quartil

**KPI (Key Performance Indicator)**
> Indicador Clau de Rendiment. Mètrica quantificable utilitzada per a avaluar l'acompliment. En el dashboard:
> - Nota mitjana del centre
> - Desviació típica global
> - Moda del centre
> - Notes mitjanes per tipus d'assignatura (Llenguatge Musical, Teòrica Troncal, Especialitats)
> - Percentatges d'aprovats
> - Nombre d'assignatures difícils/fàcils

**Distribució de Freqüències**
> Taula o gràfic que mostra quants registres cauen en cada interval de valors (per exemple: quants alumnes tenen notes entre 5-6, 6-7, etc.).

**Rang**
> Diferència entre el valor màxim i mínim d'un conjunt de dades. Mesura l'amplitud total de variació.
`;
