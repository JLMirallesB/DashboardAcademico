# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dashboard Académico is a React-based web application for visualizing and analyzing academic data from music education institutions (Conservatorios). It supports bilingual operation (Spanish/Valencian) and handles data from two educational stages: EEM (Enseñanzas Elementales) and EPM (Enseñanzas Profesionales de Música).

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture Overview

### Single-Page Application Structure

The UI still lives largely in one React component
([DashboardAcademico.jsx](src/DashboardAcademico.jsx)), now ~2517 lines. The
agreed strategy is **not** a big-bang split: each view gets extracted the next
time we work on that view (that is how `AlertasCurso.jsx` and
`FamiliasAsignaturas.jsx` came out).

**The calculations do not live there any more.** Everything that can be
computed without React is in [src/nucleo/](src/nucleo/) — pure ESM modules with
no DOM, no React and no jsPDF, each with its own test. When something needs a
number, it goes in the núcleo; the component only decides what to paint. That
is what made it possible to test the KPIs, the difficulty analysis, the alerts,
the correlations and the whole PDF report.

### Data Flow Pipeline

1. **CSV Import** → [csvParser.js](src/services/csvParser.js) parses multi-section CSV files (METADATA, ESTADISTICAS, CORRELACIONES, AGRUPACIONES)
2. **Processing** → [dataProcessor.js](src/services/dataProcessor.js) transforms parsed data into the internal structure
3. **State Management** → Main component manages all state using React hooks
4. **Visualization** → Recharts library renders statistics, correlations, and evolution charts

### Key Services

- **[csvParser.js](src/services/csvParser.js)**: Auto-detects CSV separator (`;` or `,`), parses sectioned CSV format
- **[dataProcessor.js](src/services/dataProcessor.js)**: Structures parsed data by level/subject, detects educational stage
- **[dataIO.js](src/services/dataIO.js)**: Handles JSON import/export for saving/loading dashboard state
- **[pdfGenerator.js](src/services/pdfGenerator.js)**: Generates PDF reports using jsPDF

### Custom Hooks

- **[useKPICalculation.js](src/hooks/useKPICalculation.js)**: Calculates 8 global KPIs (center average, standard deviation, mode, pass/fail rates by subject type)
- **[useDifficultyAnalysis.js](src/hooks/useDifficultyAnalysis.js)**: Categorizes subjects as DIFÍCIL/NEUTRAL/FÁCIL based on configurable thresholds
- **[useStatisticalCalculations.js](src/hooks/useStatisticalCalculations.js)**: Calculates trend analysis with 12 pattern types (stable, increasing/decreasing sustained/accelerated/decelerated, valley, peak, oscillating, irregular)

### Component Organization

```
src/
├── components/
│   ├── common/          # Shared UI components
│   │   ├── LanguageSwitcher.jsx      # ES/VA language toggle
│   │   ├── StageModeSwitcher.jsx     # EEM/EPM/TODOS stage selector
│   │   └── ViewTabNavigation.jsx     # Statistics/Correlations/Evolution/Difficulty tabs
│   ├── modals/          # Modal dialogs
│   │   ├── HelpModal.jsx             # In-app documentation
│   │   ├── ReportModal.jsx           # PDF report generation config
│   │   └── PreviewModal.jsx          # Preview the report before downloading
│   ├── vistas/          # Views extracted from the monolith
│   │   ├── AlertasCurso.jsx          # Red-subject counts, and what enters/leaves
│   │   └── FamiliasAsignaturas.jsx   # Subject families (they overlap: no pies)
│   └── kpi/             # KPI display components
│       ├── KPICentro.jsx             # Global center KPIs
│       ├── KPIDetalle.jsx            # Detailed KPI breakdown
│       └── KPIComparativa.jsx        # Comparative KPI views
├── nucleo/              # Pure calculation modules — no React, no DOM, all tested
├── services/            # Business logic and I/O
├── hooks/               # Thin React wrappers over src/nucleo/
├── utils/               # Utility functions
│   ├── validators.js    # CSV structure validation, number parsing
│   └── formatters.js    # Number and percentage formatting
├── constants.js         # Configurable thresholds, subject lists, abbreviations
├── translations.js      # Complete ES/VA translation dictionaries
└── utils.js             # Core utilities (normalizar, parseTrimestre, getBestTrimestre)
```

## Critical Concepts

### Trimestre Format

**Changed on 2026-08-23. The academic year is now part of the key.**

`{evaluation}-{course}-{stage}` — e.g. `1EV-2627-EEM`, `FINAL-2526-EPM`.

- Base evaluations: `1EV`, `2EV`, `3EV`, `FINAL`
- Course: 4 digits, normalised by `normalizarCurso` (`2026-2027`, `2025/26`
  and `25/26` all become `2627`/`2526`). Digits, not a slash: the key ends up
  inside a PDF filename and inside a Recharts `dataKey`.
- Stages: `EEM` (Elementary), `EPM` (Professional), auto-detected from level
  names during CSV processing.

Two-part keys (`1EV-EEM`) are still parsed for backwards compatibility, and
`parseTrimestre` disambiguates by shape: the course is all digits, the stage is
letters.

**Why it matters:** before this, two academic years of the same evaluation
collided on the same key and the second file silently overwrote the first. Any
new code that builds a key by hand (`${base}-${etapa}`) is a bug — use
`claveTrimestre`, and compare with `mismoMomento` / `parseTrimestre`, never
with `startsWith`.

### Momento

A **momento** is an academic year plus an evaluation. It is the X axis of every
evolution chart. Etapa is a *series* dimension, not a position on that axis:
elemental and professional are two populations and their combined mean means
nothing, so `TODOS` mode returns two blocks (`modoComparativo`), never one.

### Educational Stages

- **EEM** (Enseñanzas Elementales): 4 levels (1EEM-4EEM), includes Lenguaje Musical
- **EPM** (Enseñanzas Profesionales): 6 levels (1EPM-6EPM), includes Teórica Troncal
- **TODOS** mode: Mixed view combining both stages using `getBestTrimestre()` to match data

### Subject Types

Three subject categories for KPI calculation:
1. **Lenguaje Musical** (LM): Elementary core subject
2. **Teórica Troncal** (TT): Professional core subject
3. **Especialidades** (Instrumentales): Detected via `INSTRUMENTALES_EPM` Set in [constants.js](src/constants.js)

### Data Structure

```javascript
datosCompletos = {
  "1EV-EEM": {
    "GLOBAL": { "Total": { stats: {...}, distribucion: {...} } },
    "1EEM": {
      "lenguaje musical": { stats: {...}, distribucion: {...} },
      "piano": { stats: {...}, distribucion: {...} }
    }
  }
}
```

### The núcleo and the tests

`pruebas/` — no framework, node only:

```bash
bash pruebas/ejecutar-todo.sh     # ~770 checks; the deployment gate
```

House rules, and they are not decoration:

- **Cero y «no hay dato» no son lo mismo.** What cannot be computed is `null`,
  never `0`. A filler zero reads as a measurement — it once printed three full
  pages of KPIs at `0,00` and a difference of `(-100,0 %)` against subjects
  nobody had measured. Screens print `—`; so does the report
  (`src/nucleo/informe.js`).
- **A test that cannot fail is worse than no test.** Important checks are
  labelled `CANDADO:`, and the way to know they work is to break the
  production code on purpose and watch them go red. Several tests in this repo
  were found to be untestable this way and rewritten.
- Labels the PDF prints must stay inside WinAnsi — jsPDF's standard fonts are
  single-byte and a `σ` came out as `Ã`. `pruebas/traducciones.mjs` guards it.

### Warnings that travel inside the file

`src/nucleo/avisos.js` turns the `#METADATA` section into the list of things
you must know **before** reading a figure: records left outside every total,
records counted twice, extraordinary grades with no ordinary one. The app does
not compute them — the workbook does, because it is the one that knows what
fell out.

Two rules: a **zero is not shown** (a box that always has something in it gets
ignored within a week), and a **missing key is not invented** — a file from an
older workbook simply has no warnings, and `undefined` is not `0`.

### Signals, and the rule that governs them

`src/nucleo/senales.js` decides what is worth looking at, and the whole
sub-system exists to hold one line: **an indicator is a signal, not a
diagnosis.** A low mean fits poor learning, but equally a legitimate rise in
demands, a different cohort, or a change of assessment instruments. Nothing in
`senales.js`, `informe-senales.js` or `ResumenEjecutivo.jsx` may emit a
sentence that explains *why* — only the observation with its `n`, how solid the
signal is and why, and two separate lists: what the app has already checked,
and what somebody has to go and look at. `pruebas/senales.mjs` fails if a
forbidden word shows up in the output.

Three things learned by looking at it on screen, not from the tests:

- **Dispersion is a modifier, not a signal.** With a fixed 1.5 threshold the
  centre's ten top signals were all «notas muy repartidas». Measured: median
  1.36, third quartile 1.53. It now compares against **the centre's own**
  quartiles, and rides along with the signal it qualifies — because what
  changes the decision is whether a low mean is shared by the group or
  concentrated in a few students.
- **Talking about the shape of a distribution needs more data than talking
  about its level.** The app's general minimum is 3 students, which is fine
  for a mean and meaningless for a standard deviation. `MINIMO_PARA_FORMA`.
- **`null` is not `false`.** «No other academic year loaded to compare with»
  must never be written the same as «checked, and it does not repeat».

### The PDF report

[pdfGenerator.js](src/services/pdfGenerator.js) only *draws*. What the report
*says* lives in the núcleo (`informe.js` plus `informe-alertas`,
`informe-familias`, `informe-selecciones`, `informe-cursos`,
`informe-contexto`), each returning `{ vacio, cabecera, filas, avisos }` with
the cells already formatted.

Two things to know before touching it:

- `generarInformePDF` accepts `guardar(pdf, nombre)`. Without it the PDF is
  downloaded; with it, the document is handed back. That single seam is what
  lets `pruebas/informe-completo.mjs` generate the whole report in Node and
  read the resulting PDF, and what lets the UI show a preview before saving.
- **Charts are captured as JPEG, deliberately.** jsPDF cannot pass an
  html2canvas PNG through: it decodes it and stores raw pixels, three bytes
  each. Two charts weighed 17,85 MB of an 18 MB report. A JPEG goes in as
  `DCTDecode`, untouched. Compressing the whole document instead freezes the
  tab — jsPDF's deflate is synchronous.

### Difficulty Analysis System

Uses configurable thresholds ([constants.js](src/constants.js:7-13)):
- `suspensosAlerta: 30` - High fail rate threshold (%)
- `mediaCritica: 6` - Critical average grade
- `mediaFacil: 8` - Easy average grade
- `aprobadosMinimo: 90` - Minimum pass rate (%)
- `alumnosMinimo: 3` - Minimum students for analysis

### Agrupaciones (Subject Groupings)

Flexible system allowing subjects to be grouped for correlation analysis. Stored as `{ asignatura: [grupo1, grupo2] }` and loaded from CSV `#AGRUPACIONES` section.

## The Excel models are generated, not edited

`public/data/ANALIZADOR_*.xlsx` are the two workbooks the centres actually
use: they paste their grades in, and the CSV they export is what this app
reads. **They are not edited by hand any more** — they are produced by scripts
in `herramientas/`, and there is one entry point:

```bash
herramientas/generar-modelos.sh    # both books, end to end, then the tests
node pruebas/modelos-excel.mjs     # 56 checks
```

The order matters and the script encodes it: each generator starts from a
pinned commit (they pick their templates **by row number**, so running one over
its own output picks a slot believing it is a total — that happened, and the
book came out with plausible wrong figures), then `acotar-rangos.py`, then
`portada.py`, then `listas-y-formato.py`.

An `.xlsx` is a zip of XML, and every rule below was learnt by shipping a
broken file. `pruebas/modelos-excel.mjs` guards all of them, and each check was
verified by reintroducing the fault and watching it go red:

- **Element order inside `<worksheet>` is fixed by the schema.**
  `conditionalFormatting` before `dataValidations`, both before `pageMargins`.
  Out of place, Excel opens with «we found a problem with the content».
- **`calcChain.xml` is a cache of every formula cell.** Move rows and it stops
  matching; Excel checks it on open. It is rebuildable, so it is dropped.
- **Excel does not store `FILTER(`, it stores `_xlfn._xlws.FILTER(`.** The
  prefix is the function's name in the file, not decoration.
- **A formula containing a dynamic-array function must be declared as one:**
  `cm="1"` on the cell and `<f t="array" ref="…">`. Without it the formula does
  not spill — and gives no error. One of them stayed in a single cell and every
  total in the book read `1`, with the first cell showing the right value.
- **No duplicated cells in a row, no rows out of order**, which is what
  rebuilding a sheet while keeping what was there produces.
- **No range reaching row 20.000 by brute force.** Ranges are defined names
  bounded by the last row with data (`INDEX`, never volatile `OFFSET`). If
  someone writes a fixed range nothing fails: the book gives the same figures
  and takes ten times longer to open.
- **No mention of any specific school-management product** in anything the user
  reads. These books are used by other conservatoires; what matters is the
  *shape* of the data, not where it came from.

The design principle behind all of it: **the list rules**. Subject names,
courses and what counts as a speciality come from `CONFIG_ASIGNATURAS`, never
from a row range and never written inside a formula. Adding a subject is
writing one line in the marked free margin.

## Translations

The app is fully bilingual (ES/VA) using [translations.js](src/translations.js). All user-facing strings must exist in both `translations.es` and `translations.va` objects. Current language is stored in component state and switched via `LanguageSwitcher`.

## Deployment

Automatic deployment to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
- Triggers on push to `main` branch
- Uses Node 20, runs `npm ci` and `npm run build`
- Deploys `dist/` folder to https://jlmirallesb.github.io/DashboardAcademico/
- Base path `/DashboardAcademico/` configured in [vite.config.js](vite.config.js:7)

## Important Notes

- **Large main file**: [DashboardAcademico.jsx](src/DashboardAcademico.jsx) exceeds 25k tokens and requires offset/limit or grep for reading
- **Normalization**: All string comparisons use `normalizar()` for case-insensitive matching
- **CSV format**: Multi-section format with `#METADATA`, `#ESTADISTICAS`, `#CORRELACIONES`, `#AGRUPACIONES` markers
- **Auto-save**: Dashboard state can be exported to JSON and re-imported to preserve multi-trimester data

## Documentation Maintenance

When adding new features or making significant changes to the application, you must maintain the bilingual README documentation:

1. **Update README.md** in BOTH Spanish and Valencian sections
   - Spanish section: `## [ES] ESPAÑOL`
   - Valencian section: `## [VA] VALENCIÀ`

2. **Keep both language versions synchronized**
   - Every change in Spanish must have its parallel translation in Valencian
   - Maintain identical structure and formatting in both sections

3. **Update mathematical/statistical terms section** if new concepts are introduced
   - Add definitions without pedagogical interpretations
   - Provide technical explanations with formulas when applicable

4. **Update [readmeContent.js](src/content/readmeContent.js)** to match README.md changes
   - This file contains the embedded version used by the help modal
   - Copy the entire updated README content into the `README_CONTENT` constant
   - Ensure proper escaping of backticks (use `\`` for inline code)

5. **Maintain consistent formatting** between language sections
   - Use the same heading levels (###, ##, #)
   - Keep bullet point structures identical
   - Preserve emoji usage across both versions

## Design System - Minimalist Aesthetic

The application follows a **minimalist design philosophy** with a monochromatic color palette. Color is reserved exclusively for data visualization and critical alerts.

### Color Palette

**Base Colors (Monochromatic)**
```javascript
const PALETTE = {
  // Backgrounds
  background: {
    primary: '#FFFFFF',      // Pure white - main backgrounds
    secondary: '#F8F9FA',    // Gray 50 - secondary backgrounds
    tertiary: '#F1F3F5',     // Gray 100 - tertiary/hover backgrounds
  },

  // Borders
  border: {
    light: '#E9ECEF',        // Gray 200 - subtle borders
    medium: '#DEE2E6',       // Gray 300 - main borders
    dark: '#ADB5BD',         // Gray 400 - important separators
  },

  // Text
  text: {
    primary: '#212529',      // Near black - titles
    secondary: '#495057',    // Gray 700 - main text
    tertiary: '#6C757D',     // Gray 600 - secondary text
    quaternary: '#ADB5BD',   // Gray 400 - disabled/hints
  },

  // Interactive elements (monochrome)
  interactive: {
    primary: '#212529',      // Black - primary buttons
    hover: '#000000',        // Pure black - hover state
    focus: '#495057',        // Dark gray - focus/active
  }
}
```

**Accent Colors (Data & Alerts Only)**
```javascript
// ONLY use for charts, graphs, and critical alerts
const DATA_COLORS = {
  success: '#10B981',      // Green - positive data/high pass rates
  warning: '#F59E0B',      // Amber - warnings
  danger: '#EF4444',       // Red - critical alerts/high fail rates

  // Chart colors (for data visualization)
  charts: [
    '#212529',  // Black - primary line
    '#6C757D',  // Gray - secondary line
    '#ADB5BD',  // Light gray - tertiary
    '#EF4444',  // Red - alerts only
    '#10B981',  // Green - success only
  ]
}
```

### Typography System

**Font Family**: DM Sans (400, 500, 700 weights only)

**Type Scale** (Modular scale ratio 1.25 - Major Third)
```css
--text-xs: 0.75rem;      /* 12px - Small labels */
--text-sm: 0.875rem;     /* 14px - Secondary text */
--text-base: 1rem;       /* 16px - Body text */
--text-lg: 1.25rem;      /* 20px - Subtitles */
--text-xl: 1.5rem;       /* 24px - Section titles */
--text-2xl: 2rem;        /* 32px - Main titles */
--text-3xl: 3rem;        /* 48px - Large numbers (KPIs) */

/* Font weights (only 3 variants) */
--font-normal: 400;      /* Regular text */
--font-medium: 500;      /* Soft emphasis */
--font-bold: 700;        /* Titles and important numbers */
```

**Typography Hierarchy**
- H1 (Dashboard titles): `text-2xl font-bold text-gray-900`
- H2 (Section headers): `text-xl font-bold text-gray-900`
- H3 (Card titles): `text-lg font-medium text-gray-900`
- Body: `text-base font-normal text-gray-700`
- Labels: `text-sm font-medium text-gray-600 uppercase tracking-wide`
- Hints: `text-xs font-normal text-gray-500`
- KPI Numbers: `text-3xl font-bold text-gray-900`

### Component Styling Rules

#### KPI Cards
```jsx
// Standard KPI card (NO gradients, NO colors)
<div className="bg-white border border-gray-300 rounded-lg p-6 hover:border-gray-900 transition-colors">
  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Label</span>
  <div className="text-3xl font-bold text-gray-900 mt-2">7.45</div>
  <div className="mt-3 h-0.5 bg-gray-900"></div>
</div>

// Critical alert variant (only when thresholds exceeded)
<div className="bg-white border-l-4 border-l-red-500 border-r border-t border-b border-gray-300 rounded-lg p-6">
  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">% Suspendidos</span>
  <div className="text-3xl font-bold text-gray-900 mt-2">35.2%</div>
  <span className="text-xs text-red-600 mt-1">Por encima del umbral</span>
</div>
```

#### Buttons
```jsx
// Primary (main actions)
<button className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-black transition-colors">

// Secondary (secondary actions)
<button className="px-6 py-3 bg-white border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors">

// Tertiary (subtle actions)
<button className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">

// Destructive (delete only)
<button className="px-6 py-3 bg-white border-2 border-red-600 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors">
```

#### Tables
```jsx
// Table headers - bold black border
<thead>
  <tr className="border-b-2 border-gray-900">
    <th className="text-left py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide">

// Table rows - subtle gray borders, hover effect
<tbody>
  <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">

// Critical row (alerts only)
<tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors border-l-4 border-l-red-500">
```

#### Navigation (Sidebar)
```jsx
// Active state - left border + white background
<button className="w-full px-4 py-3 text-left bg-white text-gray-900 border-l-4 border-l-gray-900 font-medium">

// Inactive state - hover to white
<button className="w-full px-4 py-3 text-left text-gray-700 hover:bg-white hover:text-gray-900 transition-colors font-medium">
```

### Spacing System

Use multiples of 4px for all spacing:
```javascript
const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
}
```

### Borders and Shadows

**Borders** (consistent thickness)
- Standard: `border border-gray-300` (1px)
- Emphasis: `border-2 border-gray-900` (2px)
- Critical: `border-l-4 border-l-red-500` (4px left border for alerts)

**NO SHADOWS**: Eliminate all `shadow-*` classes. Use borders only for depth.

**Border Radius**
- Cards/Buttons: `rounded-lg` (0.5rem)
- Modals/Large containers: `rounded-xl` (0.75rem)

### Color Usage Rules

**When to use color:**
1. ✅ Charts and data visualizations (Recharts components)
2. ✅ Critical alerts (fail rates > threshold, low averages)
3. ✅ Success indicators (pass rates > 90%)
4. ✅ Status badges (EEM/EPM stage indicators)

**When NOT to use color:**
1. ❌ KPI card backgrounds (no gradients)
2. ❌ Navigation elements (use gray/black)
3. ❌ Headers and titles
4. ❌ Buttons (except destructive red)
5. ❌ Table backgrounds
6. ❌ Decorative elements

### Interactive States

```css
/* Hover - always darker */
hover:bg-gray-50
hover:border-gray-900
hover:text-gray-900

/* Focus - black ring */
focus:outline-none
focus:ring-2
focus:ring-gray-900
focus:ring-offset-2

/* Active - slightly darker */
active:bg-gray-100

/* Disabled - light gray */
disabled:bg-gray-100
disabled:text-gray-400
disabled:cursor-not-allowed
```

### Reference Example

See `ejemplo-rediseno-minimalista.html` for complete visual examples of all components following this design system.
