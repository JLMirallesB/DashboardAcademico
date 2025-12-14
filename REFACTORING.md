# 🔄 Estado de Refactorización - Dashboard Académico

**Fecha:** 2025-12-14
**Versión base:** v1.9.2
**Estado:** Fase 4 en progreso (55% completada)

---

## ✅ Fases Completadas

### ✅ Fase 1: Utilidades y Constantes (100%)

**Archivos creados:**
- `src/constants.js` - Umbrales, colores, instrumentos, abreviaturas
- `src/utils/validators.js` - validarEstructuraCSV, parseNumero
- `src/utils/formatters.js` - formatearNombreTrimestre, abreviarAsignatura

**Beneficios:**
- Eliminación de código duplicado (función `abreviar` estaba 2 veces)
- Centralización de configuración
- Facilita testing unitario

---

### ✅ Fase 2: Servicios de Datos (100%)

**Archivos creados:**
- `src/services/csvParser.js` - parseCSV (103 líneas)
- `src/services/dataProcessor.js` - procesarDatos (72 líneas)
- `src/services/dataIO.js` - exportarJSON, procesarImportacionJSON (73 líneas)

**Beneficios:**
- Separación de lógica de negocio de UI
- Testeable independientemente
- Reutilizable en otros contextos

---

### ✅ Fase 3: Custom Hooks (100%)

**Archivos creados:**
- `src/hooks/useStatisticalCalculations.js` (380 líneas) ✅ **INTEGRADO**
  - calcularResultado
  - calcularTendencia (regresión lineal/cuadrática, detección de patrones)
  - getTrendInfo
  - detectarEtapa

- `src/hooks/useDifficultyAnalysis.js` (138 líneas) ⚠️ **Pendiente integración**
  - Análisis de dificultad por niveles/global
  - Categorización DIFÍCIL/NEUTRAL/FÁCIL

- `src/hooks/useKPICalculation.js` (132 líneas) ⚠️ **Requiere ajustes**
  - Cálculo de 8 KPIs globales
  - Nota: Faltan campos aprobadosCentro, suspendidosCentro

**Reducción lograda:** 4,807 → 4,582 líneas (-225 líneas, -4.7%)

---

### 🔄 Fase 4: Componentes UI (55% completada)

#### ✅ Componentes Comunes (3/3)

- **LanguageSwitcher.jsx** - Selector ES/VA
- **StageModeSwitcher.jsx** - Selector EEM/EPM/TODOS
- **ViewTabNavigation.jsx** - Navegación entre vistas

#### ✅ Modales (3/3)

- **ConfirmationModal.jsx** - Confirmación de reemplazo
- **DataManagementModal.jsx** - Gestión de trimestres cargados
- **ReportModal.jsx** - Configuración de informes PDF

#### ⏳ Vistas Pendientes (0/5)

Ubicaciones en DashboardAcademico.jsx actual:

1. **StatisticsView.jsx** - Líneas ~1723-2311 (~588 líneas)
   - Vista de estadísticas globales
   - KPIs del centro
   - Gráficos de barras y mapa de dispersión

2. **CorrelationsView.jsx** - Líneas ~2313-2656 (~343 líneas)
   - Matriz de correlaciones
   - Gráficos de evolución de correlaciones

3. **EvolutionView.jsx** - Líneas ~2658-3100 (~442 líneas)
   - Selector de asignaturas para comparación
   - Gráficos longitudinales y transversales
   - Tendencias con regresión

4. **DifficultyView.jsx** - Líneas ~3102-3279 (~177 líneas)
   - Lista de asignaturas difíciles/neutrales/fáciles
   - Tarjetas con razones de dificultad

5. **SubjectsMapView.jsx** - Líneas ~3281-3448 (~167 líneas)
   - Mapa de dispersión de asignaturas
   - Nota media vs Desviación estándar

**Patrón para extraer vistas:**

```jsx
// src/components/views/StatisticsView.jsx
import React from 'react';

export const StatisticsView = ({
  // Props necesarias (datos, funciones, estado)
  trimestreSeleccionado,
  kpisGlobales,
  datosDispersion,
  // ... otros
  t
}) => {
  return (
    <div>
      {/* JSX extraído del componente principal */}
    </div>
  );
};
```

---

## ⏳ Fases Pendientes

### 📋 Fase 5: Servicio de Generación PDF (0%)

**Archivo a crear:**
- `src/services/pdfGenerator.js` (~350 líneas)

**Funciones a extraer:**
- generarInformePDF (líneas 936-1289)
- Funciones auxiliares de encabezado/pie
- Generación de portada, tablas, análisis

**Props necesarias:**
```javascript
{
  trimestreSeleccionado,
  datosCompletos,
  configInforme,
  kpisGlobales,
  correlacionesTrimestre,
  analisisDificultad,
  t
}
```

---

### 🎯 Fase 6: Context API y Optimización (0%)

**Archivos a crear:**

1. **src/context/DashboardContext.jsx**
   - Estado global: datosCompletos, correlacionesCompletas, metadata
   - Estado compartido: trimestresDisponibles, trimestreSeleccionado, modoEtapa, umbrales

2. **src/context/LanguageContext.jsx**
   - Estado de idioma y función t

**Beneficios esperados:**
- Eliminación de prop drilling
- Reducción de re-renders innecesarios
- Componente principal: ~350 líneas finales (vs 4,582 actuales)

---

## 📊 Métricas de Progreso

| Métrica | Antes | Actual | Objetivo | Progreso |
|---------|-------|--------|----------|----------|
| Líneas componente principal | 4,807 | 4,582 | ~350 | 4.7% |
| Archivos modulares | 0 | 16 | ~25 | 64% |
| Fases completadas | 0/6 | 3.5/6 | 6/6 | 58% |
| Hooks extraídos | 0 | 3 | 5 | 60% |
| Componentes UI | 0 | 6 | 11 | 55% |

---

## 🔧 Siguiente Sprint Recomendado

### Opción A: Completar Fase 4 (vistas)

**Ventajas:**
- UI completamente modular
- Más fácil de mantener y testear
- Mejor separación de responsabilidades

**Esfuerzo:** ~3-4 horas

### Opción B: Saltar a Fase 6 (Context API)

**Ventajas:**
- Mayor impacto en reducción de código
- Optimización de rendimiento
- Preparar terreno para vistas

**Esfuerzo:** ~2 horas

### Opción C: Fase 5 (PDF Service)

**Ventajas:**
- Separar lógica compleja
- ~350 líneas reducidas inmediatamente
- Testeable independientemente

**Esfuerzo:** ~1 hora

---

## 🚀 Comandos Útiles

```bash
# Build y verificación
npm run build

# Desarrollo local
npm run dev

# Ver progreso en GitHub
git log --oneline --graph

# Commits de refactorización
git log --grep="Fase" --oneline
```

---

## 📝 Notas Técnicas

### Decisiones de Diseño

1. **Hooks vs Componentes:** Los hooks extraídos mantienen la lógica de negocio separada de la UI
2. **Props vs Context:** Se mantienen props por ahora para no romper funcionalidad
3. **Integración gradual:** Los hooks están creados pero no todos integrados (evita riesgo)

### Problemas Conocidos

1. **useKPICalculation:** Faltan campos aprobadosCentro y suspendidosCentro
   - Solución temporal: No integrado completamente
   - Requiere: Añadir cálculos faltantes al hook

2. **useDifficultyAnalysis:** Estructura de datos ligeramente diferente
   - Solución temporal: No integrado
   - Requiere: Mapear campos categoria/razon vs resultado/razones

### Testing Checklist

Después de cada cambio, verificar:
- [ ] Build exitoso (`npm run build`)
- [ ] Cargar CSV funciona
- [ ] Todas las vistas se renderizan
- [ ] Cambio de idioma funciona
- [ ] Cambio de etapa funciona
- [ ] Exportar/Importar JSON funciona
- [ ] Generar PDF funciona

---

## 📚 Referencias

- Plan original: `/Users/miralles/.claude/plans/misty-wiggling-waffle.md`
- Tag de seguridad: `v1.9.2`
- Documentación hooks: Ver JSDoc en cada archivo .js

---

**Última actualización:** 2025-12-14
**Próxima acción recomendada:** Completar Fase 4 extrayendo las 5 vistas
