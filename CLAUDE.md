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
