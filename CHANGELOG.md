# Novedades

Lo que cambia en cada versión, y **sobre todo lo que cambia de número**: varios
arreglos corrigen cifras que antes salían mal, así que si comparas una pantalla
de hoy con una captura de ayer, aquí está por qué no dicen lo mismo.

Las versiones anteriores a la 3.5.0 se reconstruyen desde el historial de git y
van resumidas.

---

## 3.5.0 — 23 de agosto de 2026

Una revisión a fondo. Catorce fallos de la auditoría inicial, cinco más que
encontró una revisión posterior, tres comparaciones nuevas y una reorganización
de la interfaz.

### ⚠️ Cifras que cambian

Si venías usando la versión anterior, estas son las que **ya no dirán lo
mismo**, porque antes estaban mal:

- **El porcentaje de suspensos, al comparar dos trimestres.** Subir de un 8,5 %
  a un 14 % salía en VERDE, como si fuera una mejora. Ahora en rojo.
- **El recuento de asignaturas.** «Total Especialidad», «Total No
  Especialidad» y «Teórica Troncal» son filas agregadas y se contaban como
  asignaturas: en la vista por niveles, con seis cursos de profesional, eran
  hasta doce entradas fantasma. Y como la tarjeta de KPIs sí las apartaba,
  **la tarjeta y la lista daban números distintos de lo mismo**.
- **La gráfica de evolución con las dos etapas cargadas.** El eje mezclaba
  elemental y profesional, así que la línea zigzagueaba: con las dos etapas
  subiendo, se leía como «baja y luego sube».
- **Los porcentajes de un CSV en escala 0-100.** Un `PctSuspendidos` de 1 —una
  suspensa de cada cien— se convertía en el 100 %, y esa asignatura salía
  clasificada como difícil.
- **Los informes filtrados por agrupación** perdían en silencio todas las
  asignaturas con tilde —percusión, violín, saxofón, órgano, acordeón— mientras
  la portada seguía contándolas.
- **Las correlaciones** dependían del orden en que se cargaran los ficheros:
  ganaba el último. Ahora son las del trimestre que estás mirando.
- **Los rótulos del mapa de dispersión eran diagnósticos.** «Nota baja y baja
  dispersión: Dificultad generalizada» decía la causa, y esa combinación es
  igual de compatible con una promoción con otro punto de partida o con unos
  criterios exigentes pero legítimos. Ahora dicen lo que se observa: que casi
  todo el alumnado saca notas parecidas y bajas.
- **Los pies de página del informe estaban mal numerados.** En un informe de
  26 páginas decían 2, 1, 3, 1, 4, 5, 6, 7, 8, 9, 1, 10, 1…: seis páginas
  numeradas «1» y cinco sin numerar, porque se escribía el número de página
  *de cada tabla* en vez del del documento. Con un índice delante, eso lo
  vuelve inservible.
- **El informe PDF escribía «0,00» donde no había dato**, y la diferencia con
  el centro le salía «(-100,0 %)»: una medición que nadie ha hecho. La pantalla
  ya ponía «—» en esos huecos; el informe no. Pasaba, por ejemplo, cuando el
  CSV no traía la fila «Total no Especialidad».
- **Y una asignatura sin nota en un curso hundía su media en el informe**: se
  sumaba como un cero y se dividía entre todo el alumnado, así que la
  asignatura salía peor de lo que era. Una fila de cero registros contaba como
  una de un alumno.

### Nuevo

- **«Qué merece mirarse».** Una vista nueva, la primera del menú, y la
  primera página del informe. Reúne todo lo que los indicadores han
  levantado y lo ordena por lo **sólida** que es cada señal: pesa el doble lo
  que se repite en varias evaluaciones o en otra promoción que lo que aparece
  una vez.

  Con una regla que gobierna todo lo que dice: **un indicador es una señal,
  no un diagnóstico**. Una media baja es compatible con dificultades de
  aprendizaje, pero también con un aumento legítimo de la exigencia, con una
  promoción distinta o con un cambio de criterios de evaluación. Así que cada
  línea es una observación con su alumnado, y debajo dos listas: **lo que la
  aplicación ya ha comprobado** (¿se repite?, ¿aparece en otro curso?, ¿cómo
  está la dispersión?) y **lo que hay que ir a mirar fuera de los datos**
  (¿ha cambiado el profesorado?, ¿los criterios?, ¿hay ausencias?).

  En la aplicación salen todas. En el informe caben seis, y se dice cuántas
  quedan fuera.
- **«Cómo hay que leer este informe»**, al final del PDF, con los números de
  ese informe: cuántas asignaturas se han podido juzgar, cuántas se han
  quedado fuera por tener poco alumnado —que no es lo mismo que estar bien—,
  cuál es el grupo más pequeño que entra en una cifra y si las correlaciones
  traían su «n».
- **Curso académico contra curso académico.** El curso pasa a formar parte de
  la identidad de cada fichero, así que se pueden cargar varios años a la vez
  —antes se pisaban en silencio y uno desaparecía—. Y en Evolución hay un
  interruptor que pone la evaluación en el eje y una línea por curso: la
  distancia entre las líneas responde a «¿vamos mejor que el año pasado?».
- **Alertas a lo largo del curso.** Cuántas asignaturas están en rojo en cada
  momento y, sobre todo, **cuáles entran y salen**. La nota media es la cifra
  que menos se mueve: un centro puede tener la misma media y haber pasado de
  tres asignaturas problemáticas a nueve.
- **Familias de asignaturas.** Cuerda contra viento, tecla contra cuerda, con
  media ponderada por registros y un selector de familia de referencia.
- **Varios CSV de una vez.** Un curso completo son ocho ficheros; los repetidos
  se juntan en una sola pregunta en vez de ocho diálogos seguidos.
- **Ajustar los ejes a los datos** en el mapa de dispersión.
- Las fuentes van **empaquetadas** con la aplicación: ya no se piden a Google en
  cada visita.

### Arreglado

- **La aplicación se quedaba en blanco**, sin mensaje, al seleccionar una
  asignatura cuya moda viniera vacía —lo que pasa siempre que ninguna nota se
  repite—. Y ahora hay una red que convierte cualquier error inesperado en una
  pantalla que lo explica en vez de una página vacía.
- **El informe PDF imprimía tres páginas de KPIs a 0,00** con las dos etapas
  cargadas. Ahora saca un juego de páginas por etapa.
- **`1.050` registros se leían como `1,05`**, y esa asignatura desaparecía de
  todos los análisis sin decir nada.
- Tres rótulos enseñaban el texto de otro por claves de traducción duplicadas:
  donde debía poner «Motivo» ponía «Análisis Detallado», y el mensaje de «no
  hay datos» salía con `{level}` y `{subject}` en crudo.
- Diez rótulos más salían en castellano también «en valencià».
- Borrar un trimestre no borraba sus agrupaciones, que seguían filtrando.
- La cabecera enseñaba el centro y el curso del **primer** fichero cargado, no
  del que estabas mirando.

### El informe PDF

- **Ya no inventa cifras.** Escribía «0,00» donde no había dato y la
  diferencia con el centro le salía «(-100,0 %)»: una medición que nadie ha
  hecho. La pantalla ya ponía «—» en esos huecos.
- **Cinco secciones nuevas**, que la aplicación enseñaba y el informe no:
  las alertas a lo largo del curso —con qué entra y qué sale de la lista roja,
  y separando lo que ha mejorado de lo que ha dejado de medirse—, las familias
  de asignaturas con su aviso de solape, la comparación que se compone a mano
  en Estadísticas, la comparación con cursos anteriores y una primera página
  que dice **en qué se basa el informe**.
- **Con qué umbrales se ha clasificado.** Antes no aparecían por ningún lado,
  y son configurables: dos informes de los mismos datos podían llamar
  «difícil» a asignaturas distintas sin que nada lo delatara. Ahora salen los
  cinco, marcados cuando se han cambiado respecto de los de fábrica.
- **Índice y marcadores**, para no recorrer veinte páginas buscando una tabla.
- **Vista previa antes de descargar**: se ve el informe y se baja si es el que
  querías, en vez de acabar con seis PDF iguales en la carpeta.
- **De 18 MB a una fracción.** Las gráficas se guardaban en crudo, tres bytes
  por píxel: dos de ellas ocupaban 17,85 de esos 18 MB, y Gmail corta en 25.
- **La columna de desviación se veía como «Ã»** en vez de «σ» — las fuentes
  del PDF no tienen la sigma. Ahora dice «Desv.».
- **La cabecera y la portada decían la clave interna del fichero**
  («1EV-2627-EEM»). Ahora dicen «26/27 · 1EV (EPM)», con el curso académico
  siempre escrito: el informe se lee fuera de la aplicación, donde no hay
  ningún selector al lado que diga de qué año es.
- **La portada se rellena del fichero.** El centro y el curso venían escritos
  a mano en la configuración —«2024-2025»— y había que acordarse de
  cambiarlos; con datos de 26/27 cargados, la portada se contradecía con las
  cifras que llevaba dentro. Siguen siendo editables en el diálogo.
- **Las gráficas ya no se estiran.** Cada imagen se ajustaba al hueco que
  sobrara en la página, así que la misma gráfica salía achatada o alargada
  según cuánto texto llevara encima — y una nube de puntos deformada mueve la
  diagonal que uno lee.
- **El mapa de dispersión del informe respeta el zoom de la pantalla.** Se
  pintaba siempre de 0 a 10, así que quien ajustaba los ejes para ver las
  diferencias se encontraba dentro del PDF la versión apelotonada, con los
  rótulos montados unos encima de otros.
- **Doce rótulos estaban en castellano dentro del código**, así que el informe
  «en valencià» salía con los títulos traducidos y las tablas no.

### La interfaz

Había tres nociones de «qué estoy mirando» que no se hablaban entre sí, y de
ahí salía casi todo el desconcierto:

- Ahora hay **una sola barra de contexto**, arriba y fija, con el momento del
  curso y la etapa. Antes la etapa vivía en la barra lateral y el trimestre
  solo se podía cambiar desde el modal de gestión de ficheros.
- **Se retiró un desplegable de la vista de Correlaciones que cambiaba el
  trimestre global**: tocarlo ahí cambiaba lo que veías después en Indicadores
  y en Dificultad, sin ningún aviso.
- Las vistas que comparan varios momentos **lo declaran** en vez de enseñar un
  contexto que no usan.
- Los selectores solo aparecen cuando hay algo que elegir.
- La pestaña «Comparativa» de KPIs ya no se apaga sola al entrar en «las dos
  etapas»: se deshabilita y dice por qué.

### Por dentro

- El cálculo sale del componente a `src/nucleo/`, sin React y ejercitable en
  node. **Red de pruebas nueva: 379 comprobaciones**, sin framework, y `npm
  test` y `npm run lint` pasan a ser puerta del despliegue.
- Fuera 19 `console.log` de depuración y 1.900 líneas de código muerto.
- Un JSON exportado con la versión anterior **sigue cargándose**: sus claves se
  reconstruyen solas.

---

## 3.4.0 — 28 de diciembre de 2025

Plantillas de Excel descargables desde la propia aplicación y enlaces de apoyo.

## 3.3.0 — 28 de diciembre de 2025

Datos de ejemplo y botón para cargarlos, para poder probar la aplicación sin
tener un CSV a mano.

## 3.2.0 — 28 de diciembre de 2025

Corregido el parseo de los KPIs globales de «No Especialidad» en los CSV de
profesional.

## 3.1.0 — 28 de diciembre de 2025

Rediseño minimalista completo, con su sistema de diseño documentado.

## 3.0.6 — 27 de diciembre de 2025

Mejoras en el informe PDF: soporte de etapas y distribución de notas.
