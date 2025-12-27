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

The entire application is a single React component ([DashboardAcademico.jsx](src/DashboardAcademico.jsx)) with ~2000 lines. This monolithic approach was intentional for simplicity, though it makes the file very large.

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
│   │   ├── DataManagementModal.jsx   # Manage loaded trimesters
│   │   ├── ConfirmationModal.jsx     # Generic confirmation dialogs
│   │   └── ReportModal.jsx           # PDF report generation config
│   └── kpi/             # KPI display components
│       ├── KPICentro.jsx             # Global center KPIs
│       ├── KPIDetalle.jsx            # Detailed KPI breakdown
│       └── KPIComparativa.jsx        # Comparative KPI views
├── services/            # Business logic and I/O
├── hooks/               # Custom React hooks for calculations
├── utils/               # Utility functions
│   ├── validators.js    # CSV structure validation, number parsing
│   └── formatters.js    # Number and percentage formatting
├── constants.js         # Configurable thresholds, subject lists, abbreviations
├── translations.js      # Complete ES/VA translation dictionaries
└── utils.js             # Core utilities (normalizar, parseTrimestre, getBestTrimestre)
```

## Critical Concepts

### Trimestre Format

Trimesters use a compound key format: `{evaluation}-{stage}`
- Examples: `1EV-EEM`, `2EV-EPM`, `FINAL-EEM`
- Base evaluations: `1EV`, `2EV`, `3EV`, `FINAL`
- Stages: `EEM` (Elementary), `EPM` (Professional)
- Stage is auto-detected from level names during CSV processing

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

### Difficulty Analysis System

Uses configurable thresholds ([constants.js](src/constants.js:7-13)):
- `suspensosAlerta: 30` - High fail rate threshold (%)
- `mediaCritica: 6` - Critical average grade
- `mediaFacil: 8` - Easy average grade
- `aprobadosMinimo: 90` - Minimum pass rate (%)
- `alumnosMinimo: 3` - Minimum students for analysis

### Agrupaciones (Subject Groupings)

Flexible system allowing subjects to be grouped for correlation analysis. Stored as `{ asignatura: [grupo1, grupo2] }` and loaded from CSV `#AGRUPACIONES` section.

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
