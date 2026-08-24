"""Regenera CONFIG_ASIGNATURAS, CALC_EEM y EXPORTADOR del analizador de
elemental para que la LISTA mande.

No reescribe ni una fórmula de cálculo: las copia de las filas que ya
existen y solo les cambia el número de fila. Lo que cambia es:

  · CONFIG_ASIGNATURAS lleva el catálogo completo del art. 5 del D.159/2007.
  · La columna B de CALC deja de ser un nombre escrito y pasa a ser
    «la n-ésima asignatura activa», así que añadir una especialidad es
    escribir una línea en la configuración y nada más.
  · EXPORTADOR se salta las asignaturas sin registros, para que el CSV no
    se llene de ceros de lo que un centro no imparte.
"""
import zipfile, re, html, sys

RUTA = '/Users/miralles/Documents/GitHub/DashboardAcademico/public/data/ANALIZADOR_ELEMENTAL_V2.xlsx'
RANURAS = 60          # asignaturas provisionadas por bloque
# Eran 34 para 26 asignaturas: seis de margen. En cuanto un centro añadiera una
# optativa propia se acababa, y quedarse sin ranura no da error — la asignatura
# simplemente no sale, y `FueraDeLasCifras` la cuenta sin decir cuál es. Con 60
# hay sitio para lo que la norma añada y para lo que cada centro tenga suyo.
BLOQUES = ['GLOBAL', '1EEM', '2EEM', '3EEM', '4EEM']
TODOS_LOS_CURSOS = '1EEM;2EEM;3EEM;4EEM'

# --- El catálogo. Las tres comunes y las 23 del artículo 5 del D.159/2007.
#     El Grupo2 de las nuevas va VACÍO a propósito: es departamental, no
#     organológico —percusión está en Metal porque ese es su departamento— y
#     eso lo decide el centro, no este script.
# El quinto campo es `UnaSolaVez`: si quien coge un segundo instrumento
# vuelve a cursarla o no. Conjunto y música de cámara SÍ se repiten con cada
# especialidad nueva —se hacen con el instrumento nuevo—; Lenguaje Musical y
# Coro no. Es el mismo criterio que `PLAN.UNA_SOLA_VEZ` del jardín, que hasta
# ahora era el único sitio donde vivía. Aquí es dato, no código.
# El sexto campo es `Tipo`: «Obligatoria» si la pone el currículo, «Optativa»
# si el currículo la ofrece pero no la cursa todo el mundo, y «De centro» si es
# de diseño propio. En elemental hoy son todas obligatorias; la columna existe
# para que un centro pueda añadir las suyas sin tocar el libro, y para que una
# optativa que elige el 10 % no se lea igual que una obligatoria.
COMUNES = [
    ('Lenguaje Musical', TODOS_LOS_CURSOS, 'Referencia', '', 'Sí', 'Obligatoria'),
    ('Coro',             TODOS_LOS_CURSOS, 'NoEspecialidad', '', 'Sí', 'Obligatoria'),
    ('Conjunto',         '3EEM;4EEM',      'NoEspecialidad', '', 'No', 'Obligatoria'),
]
FAMILIA = {'Arpa':'Cuerda','Contrabajo':'Cuerda','Guitarra':'Cuerda','Viola':'Cuerda',
           'Violín':'Cuerda','Violoncello':'Cuerda','Clarinete':'Madera','Fagot':'Madera',
           'Flauta Travesera':'Madera','Oboe':'Madera','Saxofón':'Madera','Percusión':'Metal',
           'Trombón':'Metal','Trompa':'Metal','Trompeta':'Metal','Piano':'Tecla'}
ESPECIALIDADES = ['Acordeón','Arpa','Clarinete','Clave','Contrabajo','Dulzaina','Fagot',
                  'Flauta Travesera','Flauta de Pico','Guitarra','Instrumentos de Púa','Oboe',
                  'Percusión','Piano','Saxofón','Trombón','Trompa','Trompeta','Tuba','Viola',
                  'Viola de Gamba','Violín','Violoncello']

CATALOGO = COMUNES + [(e, TODOS_LOS_CURSOS, 'Especialidad', FAMILIA.get(e, ''), 'No', 'Obligatoria')
                      for e in ESPECIALIDADES]

# Los rangos del catálogo llegan MÁS ABAJO que las asignaturas escritas: 60
# filas para 26. Así añadir una asignatura es escribir una línea y ya está —sin
# volver a generar el libro—, que era la promesa del rediseño. Las filas vacías
# no molestan: no tienen «Sí» en Activa, así que ningún criterio las recoge.
FIN_CFG = RANURAS + 1                # hasta dónde miran los rangos
FIN_ESCRITAS = len(CATALOGO) + 1     # hasta dónde hay algo escrito

esc = lambda s: (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                  .replace('"', '&quot;'))
txt = lambda ref, estilo, s: ('<c r="%s"%s t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>'
                              % (ref, (' s="%s"' % estilo) if estilo else '', esc(s)))
num = lambda ref, estilo, n: '<c r="%s"%s><v>%s</v></c>' % (ref, (' s="%s"' % estilo) if estilo else '', n)
fx  = lambda ref, estilo, f: '<c r="%s"%s><f>%s</f></c>' % (ref, (' s="%s"' % estilo) if estilo else '', esc(f))
vac = lambda ref, estilo: '<c r="%s"%s/>' % (ref, (' s="%s"' % estilo) if estilo else '')

# Una fórmula que lleva dentro FILTER o UNIQUE es de matriz dinámica, y en el
# XML eso se declara: `cm="1"` en la celda y `<f t="array" ref="…">`. Es lo que
# escribe Excel —las que ya traía el libro lo llevan— y lo que a mí se me
# olvidó en la columna selectora de profesional: sin ello la fórmula no se
# evalúa como matriz, no derrama, y no da ningún error.
fxm = lambda ref, e, f: ('<c r="%s"%s cm="1"><f t="array" ref="%s">%s</f></c>'
                         % (ref, (' s="%s"' % e) if e else '', ref, esc(f)))

# ------------------------------------------------------------------ #
z = zipfile.ZipFile(RUTA)
piezas = {n: z.read(n) for n in z.namelist()}
orden = z.namelist(); info = {i.filename: i for i in z.infolist()}
z.close()

def hoja(n): return piezas['xl/worksheets/sheet%d.xml' % n].decode('utf8')
def filas_de(x):
    return {int(re.search(r'r="(\d+)"', a).group(1)): (a, c)
            for a, c in re.findall(r'<row([^>]*)>(.*?)</row>', x, re.S)}

# ---------- 1 · CONFIG_ASIGNATURAS ----------
# El margen, dicho en el propio libro. Sin esto, «se pueden añadir asignaturas»
# es algo que solo sabe quien haya leído este generador.
AYUDA = [
    ('K1', 'CÓMO AÑADIR UNA ASIGNATURA'),
    ('K2', '1. Escríbela en la primera fila libre (marcada abajo con una flecha). No hace falta'),
    ('K3', '   insertar filas ni ordenar nada: las fórmulas no miran POSICIONES, miran columnas.'),
    ('K4', '2. B  Asignatura — EXACTAMENTE como la escriben GEODE o ITACA2Excel. Si no coincide'),
    ('K5', '      letra por letra, esa asignatura no aparece ni con un cero.'),
    ('K6', '3. C  Cursos — separados por punto y coma. Solo saldrá en los cursos que pongas ahí.'),
    ('K7', '4. D  Grupo1 — «Especialidad» si es un instrumento. Es lo que decide si cuenta en'),
    ('K8', '      «Total Especialidad» o en «Total No Especialidad».'),
    ('K9', '5. G  Activa — «Sí». Sin eso no sale por ningún sitio, y sus registros se cuentan'),
    ('K10', '      en CONFIG_METADATA como «fuera de las cifras».'),
    ('K11', '6. H  UnaSolaVez — «Sí» solo si NO se vuelve a cursar al coger un segundo instrumento.'),
    ('K12', '7. I  Tipo — Obligatoria / Optativa / De centro.'),
]
# La clase de cada asignatura, calculada UNA vez en el catálogo en vez de
# deducirse dentro de cada fórmula de total.
#
# Antes, cada uno de esos totales preguntaba
# `COUNTIFS(catálogo, DATOS!$I$2:$I$20000, …)` con el rango de DATOS entero
# como criterio: 20.000 × 90 comparaciones POR FÓRMULA, y hay cientos. Medido
# sobre el libro de profesional, eran unos 2.500 millones de comparaciones por
# recálculo solo en esto. Calculándolo aquí —90 fórmulas— y mirándolo con un
# VLOOKUP por fila de DATOS, baja a unos 30 millones sin cambiar ni una cifra.
#
#   «E»   es especialidad (un instrumento)
#   «NT»  no lo es, y además es teórica troncal
#   «N»   no lo es
#   «»    no está activa, o la fila está vacía
CLASE_DE = lambda r: ('IF($G%d<>"Sí","",IF($D%d="Especialidad","E",'
                      'IF($E%d="TeoricaTroncal","NT","N")))' % (r, r, r))

def ayuda_de(fila):
    PRIMERA_LIBRE = len(CATALOGO) + 2
    trozos = ''.join(txt(ref, '3', t) for ref, t in AYUDA if int(ref[1:]) == fila)
    if fila == PRIMERA_LIBRE:
        trozos += txt('M' + str(fila), '3', '↓ primera fila libre')
    if fila == FIN_CFG:
        trozos += txt('M' + str(fila), '3', '↑ última fila que miran las fórmulas')
    return trozos

cfg = hoja(2)
fc = filas_de(cfg)
cab = fc[1][1]                      # la cabecera se conserva tal cual
est_g1 = (re.search(r'<c r="G1"[^>]*s="(\d+)"', cab) or [None, ''])[1]
# La cabecera se rehace de H en adelante: en I y K había dos rótulos sueltos
# —«CURSOS», «GRUPOS»— sin nada debajo, de una versión anterior.
cab = re.sub(r'<c r="[H-Z]+1"(?:[^>]*/>|[^>]*>.*?</c>)', '', cab, flags=re.S)
cab += txt('H1', est_g1, 'UnaSolaVez') + txt('I1', est_g1, 'Tipo') + txt('J1', est_g1, 'Clase (calculada)') + ayuda_de(1)
notas_laterales = re.findall(r'<c r="[IK]\d+"[^>]*>(?:<v>\d+</v>)?</c>', fc[1][1])

filas_cfg = ['<row r="1"%s>%s</row>' % (re.sub(r'^ r="\d+"', '', fc[1][0]), cab)]
for i, (nombre, cursos, g1, g2, unaVez, tipo) in enumerate(CATALOGO, start=2):
    celdas = (num('A%d' % i, '3', i - 1) + txt('B%d' % i, '3', nombre)
              + txt('C%d' % i, '3', cursos) + txt('D%d' % i, '3', g1)
              + (txt('E%d' % i, '3', g2) if g2 else vac('E%d' % i, '3'))
              + txt('F%d' % i, '3', 'Sí' if g1 == 'Especialidad' else 'No')
              + txt('G%d' % i, '3', 'Sí') + txt('H%d' % i, '3', unaVez)
              + txt('I%d' % i, '3', tipo) + fx('J%d' % i, '3', CLASE_DE(i)))
    filas_cfg.append('<row r="%d" spans="1:11" ht="15" customHeight="1">%s</row>' % (i, celdas + ayuda_de(i)))

# Las filas del margen existen aunque estén vacías: si no, la flecha que dice
# «última fila que miran las fórmulas» no tendría dónde ponerse.
# El margen también calcula su clase: una asignatura escrita ahí queda
# clasificada sola, sin tocar nada más.
for n in range(len(CATALOGO) + 2, FIN_CFG + 1):
    filas_cfg.append('<row r="%d">%s</row>' % (n, fx('J%d' % n, '', CLASE_DE(n)) + ayuda_de(n)))

cfg_nueva = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(filas_cfg) + '</sheetData>',
                   cfg, flags=re.S)
cfg_nueva = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:I%d"/>' % FIN_CFG, cfg_nueva)
piezas['xl/worksheets/sheet2.xml'] = cfg_nueva.encode('utf8')
print('CONFIG_ASIGNATURAS: %d asignaturas (%d comunes + %d especialidades)'
      % (len(CATALOGO), len(COMUNES), len(ESPECIALIDADES)))

# La clase de la asignatura de CADA FILA de DATOS, buscada una sola vez.
# `CONFIG_METADATA!E` es lo que consultan después los cientos de totales, en
# vez de recorrerse el catálogo entero cada uno.
CLASE_FILA = 'CONFIG_METADATA!$E$2:$E$20000'
clase_de_fila = lambda r: ('IF(DATOS!$I%d="","",IFERROR(VLOOKUP(DATOS!$I%d,'
                           'CONFIG_ASIGNATURAS!$B$2:$J$%d,9,FALSE()),""))' % (r, r, FIN_CFG))


# ---------- 1 bis · CONFIG_METADATA: lo que las cifras se tragaban ----------
#
# Dos sesgos que existían y que nadie podía ver, porque vivían DENTRO de los
# números en vez de al lado:
#
#  · GEODE escribe una fila por matrícula, así que quien cursa dos
#    especialidades aparece dos veces en Lenguaje Musical y en Coro, con la
#    misma nota. Cuenta doble en la media, en la moda y en el reparto.
#  · Desde que el criterio de «especialidad» es positivo, una asignatura que
#    no esté en la configuración no entra en ninguno de los dos totales. Es
#    mejor que colarse como instrumento, pero solo si se dice.
#
# Ninguno de los dos se corrige aquí a propósito: corregirlos costaría una
# columna auxiliar en DATOS que habría que arrastrar en cada pegado, y son
# unidades sobre centenares. Un sesgo dicho no es un sesgo, es una condición
# de lectura. Lo que no se puede es callarlo.
meta = hoja(3)
fm = filas_de(meta)
FIN = FIN_CFG
UNA_VEZ = ('COUNTIFS(CONFIG_ASIGNATURAS!$B$2:$B$%d,DATOS!$I$2:$I$20000,'
           'CONFIG_ASIGNATURAS!$H$2:$H$%d,"Sí",'
           'CONFIG_ASIGNATURAS!$G$2:$G$%d,"Sí")>0' % (FIN, FIN, FIN))
COND = '(DATOS!$G$2:$G$20000=CONFIG_METADATA!$B$4)*(%s)' % UNA_VEZ
DOBLES = ('IFERROR(SUMPRODUCT(%s*1)-COUNTA(_xlfn.UNIQUE(_xlfn._xlws.FILTER('
          'DATOS!$A$2:$A$20000&"|"&DATOS!$I$2:$I$20000,%s))),0)' % (COND, COND))

est = (re.search(r'<c r="A2"[^>]*s="(\d+)"', fm[2][1]) or [None, ''])[1]
extra = [
    (6, 'DobleEspecialidad', DOBLES,
     'Registros de más: quien cursa dos especialidades aparece dos veces en '
     'las asignaturas de una sola vez, con la misma nota. Cuentan doble en la '
     'media, en la moda y en el reparto.'),
    (7, 'FueraDeLasCifras', 'CALC_EEM!$D$2-CALC_EEM!$D$3-CALC_EEM!$D$4',
     'Registros que no entran en ninguna cifra: su asignatura no está en '
     'CONFIG_ASIGNATURAS, o está pero con Activa = No. Si no es cero, falta '
     'algo en la configuración o sobra un No.'),
]
filas_meta = {}
for n in sorted(fm):
    if n == 5:
        # La lista visible de la columna D decía FINAL y el desplegable ofrece
        # FI, que es lo que escribe GEODE. Dos listas que no dicen lo mismo, a
        # un palmo la una de la otra, es una trampa puesta a mano.
        est_d5 = (re.search(r'<c r="D5"[^>]*s="(\d+)"', fm[n][1]) or [None, ''])[1]
        fm[n] = (fm[n][0], re.sub(r'<c r="D5"(?:[^>]*/>|[^>]*>.*?</c>)',
                                  txt('D5', est_d5, 'FI'), fm[n][1], flags=re.S))
    filas_meta[n] = [re.sub(r'^ r="\d+"', '', fm[n][0]), fm[n][1]]

for n, campo, formula, nota_ in extra:
    escribir = fxm if ('FILTER(' in formula or 'UNIQUE(' in formula) else fx
    filas_meta[n] = ['', txt('A%d' % n, est, campo) + escribir('B%d' % n, est, formula)
                         + txt('C%d' % n, est, nota_)]

# Y la columna de la clase, una celda por fila de DATOS.
for n in range(2, 20001):
    if n not in filas_meta: filas_meta[n] = ['', '']
    filas_meta[n][1] += fx('E%d' % n, '', clase_de_fila(n))

filas_meta = ['<row r="%d"%s>%s</row>' % (n, a, c) for n, (a, c) in sorted(filas_meta.items())]
meta_nueva = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(filas_meta) + '</sheetData>',
                    meta, flags=re.S)
meta_nueva = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:E20000"/>', meta_nueva)
piezas['xl/worksheets/sheet3.xml'] = meta_nueva.encode('utf8')
print('CONFIG_METADATA: dos avisos (doble especialidad y sin configurar)')

# ---------- 2 · CALC_EEM ----------
calc = hoja(6)
fk = filas_de(calc)

def rehacer(cont, viejo, nuevo):
    """Cambia el número de fila en las referencias relativas (B8→B41, A27→A60)."""
    cont = re.sub(r'\br="([A-Z]+)%d"' % viejo, lambda m: 'r="%s%d"' % (m.group(1), nuevo), cont)
    cont = re.sub(r'(?<![$\w])([A-Z])%d(?![\d:])' % viejo, lambda m: '%s%d' % (m.group(1), nuevo), cont)
    return cont

# --- Los dos totales, con UN SOLO criterio: el que dice el catálogo -------
#
# «Especialidad» era dos cosas a la vez. El recuento del bloque GLOBAL miraba
# el catálogo (COUNTIF sobre el bloque de instrumentos) y TODO lo demás
# —media, desviación, moda, porcentajes, reparto de notas, y también el
# recuento de los bloques de curso— usaba la lista negativa «no es Lenguaje
# Musical, ni Coro, ni Conjunto», con los tres nombres escritos dentro de
# dieciocho columnas.
#
# Coinciden mientras toda asignatura de DATOS esté en el catálogo. En cuanto
# llega una que no está —una asignatura nueva, una errata de GEODE— el
# recuento global la deja fuera y la media la mete dentro, y el global deja de
# ser la suma de los cursos. Y con los nombres escritos a mano, añadir una
# común a la configuración no la metía en «Total no Especialidad»: justo lo
# contrario de que mande la lista.
#
# El criterio pasa a ser POSITIVO en los dos casos: está en el bloque de
# instrumentos del catálogo, o está en el de comunes. Tiene una consecuencia
# que hay que conocer: si en DATOS hay una asignatura que no está en la
# configuración, `Total Especialidad + Total no Especialidad` da MENOS que
# `Total`, y la diferencia son exactamente esos registros. Antes se colaban
# como instrumento sin decirlo.
CUR  = 'DATOS!$G$2:$G$20000=CONFIG_METADATA!$B$4'
NOTA = 'DATOS!$K$2:$K$20000'
APTO = 'DATOS!$L$2:$L$20000'

def criterio(clave):
    """Quién es «especialidad» lo dice la columna Grupo1, no un rango de filas.

    Estaba escrito como `COUNTIF(CONFIG!$B$5:$B$27, …)`: las especialidades son
    «de la fila 5 a la 27». Eso obliga a insertar en mitad del bloque para
    añadir una —el propio libro traía una nota diciéndolo— y una asignatura
    puesta en la primera fila libre queda fuera de los dos totales sin que nada
    lo diga. Preguntando por `Grupo1` se puede escribir donde sea.

    «Activa» entra en el criterio, y no es un detalle.

    Sin ella, desactivar una asignatura que TIENE datos la borraba de las
    filas —la columna B sale de un FILTER por «Activa»— pero sus registros
    seguían sumando en el total, y `SinConfigurar` daba cero porque la
    asignatura sí estaba en la configuración. Registros que cuentan en una
    cifra y no salen en ninguna línea, sin que nada lo diga. Ahora el total y
    las filas preguntan lo mismo, así que `D2-D3-D4` los caza solo."""
    if clave == 'esp':
        return '%s="E"' % CLASE_FILA
    return '(%s<>"")*(%s<>"E")' % (CLASE_FILA, CLASE_FILA)

def totales(c, clave, r, es_global):
    cond = ('(%s)*(%s)' % (CUR, criterio(clave)) if es_global else
            '(%s)*(DATOS!$D$2:$D$20000=A%d)*(%s)' % (CUR, r, criterio(clave)))
    n = 'SUMPRODUCT(%s*1)' % cond
    f = {'D': n,
         'E': 'IFERROR(AVERAGE(IF(%s,%s)),"—")' % (cond, NOTA),
         'F': 'IFERROR(_xlfn.STDEV.P(IF(%s,%s)),"—")' % (cond, NOTA),
         'G': 'IFERROR(_xlfn.MODE.SNGL(IF(%s,%s)),"—")' % (cond, NOTA),
         'H': 'IFERROR(SUMPRODUCT(%s*(%s="S"))/%s,"—")' % (cond, APTO, n),
         'I': 'IFERROR(SUMPRODUCT(%s*(%s="N"))/%s,"—")' % (cond, APTO, n),
         'J': 'IFERROR(_xlfn.MODE.SNGL(IF(%s*(%s="S"),%s)),"—")' % (cond, APTO, NOTA),
         'K': 'IFERROR(_xlfn.MODE.SNGL(IF(%s*(%s="N"),%s)),"—")' % (cond, APTO, NOTA)}
    for i, col in enumerate('LMNOPQRSTU', start=1):
        f[col] = 'SUMPRODUCT(%s*(%s=%d))' % (cond, NOTA, i)
    for col, formula in f.items():
        m = re.search(r'<c r="%s%d"([^>]*)>' % (col, r), c)
        e = re.search(r's="(\d+)"', m.group(1)) if m else None
        c = re.sub(r'<c r="%s%d"(?:[^>]*/>|[^>]*>.*?</c>)' % (col, r),
                   lambda _m, _c=col, _f=formula, _e=(e.group(1) if e else ''):
                       fx('%s%d' % (_c, r), _e, _f), c, flags=re.S)
    return c

# plantillas: GLOBAL (sin guarda) y de curso (con guarda V)
PL_GLOBAL = {'total': fk[2], 'esp': fk[3], 'noesp': fk[4], 'asig': fk[8]}
PL_CURSO  = {'total': fk[24], 'esp': fk[25], 'noesp': fk[26], 'asig': fk[30]}

filas_calc = ['<row r="1"%s>%s</row>' % (re.sub(r'^ r="\d+"', '', fk[1][0]), fk[1][1])]
r = 2
mapa = []           # (fila, bloque, tipo) para el exportador
for bloque in BLOQUES:
    pl = PL_GLOBAL if bloque == 'GLOBAL' else PL_CURSO
    for clave, etiqueta, tipo in [('total', 'Total', 'Total'),
                                  ('esp', 'Total Especialidad', 'TotalEsp'),
                                  ('noesp', 'Total no Especialidad', 'TotalNoEsp')]:
        attrs, cont = pl[clave]
        viejo = int(re.search(r'r="(\d+)"', attrs).group(1))
        c = rehacer(cont, viejo, r)
        if clave != 'total':
            c = totales(c, clave, r, bloque == 'GLOBAL')
        # nivel y rótulos, que son literales
        c = re.sub(r'<c r="A%d"([^>]*)>.*?</c>' % r, txt('A%d' % r, '3', bloque), c, flags=re.S)
        c = re.sub(r'<c r="B%d"([^>]*)>.*?</c>' % r, txt('B%d' % r, '3', etiqueta), c, flags=re.S)
        c = re.sub(r'<c r="C%d"([^>]*)>.*?</c>' % r, txt('C%d' % r, '3', tipo), c, flags=re.S)
        filas_calc.append('<row r="%d" spans="1:22">%s</row>' % (r, c))
        mapa.append((r, bloque, tipo))
        r += 1
    attrs, cont = pl['asig']
    viejo = int(re.search(r'r="(\d+)"', attrs).group(1))
    for n in range(1, RANURAS + 1):
        c = rehacer(cont, viejo, r)
        c = re.sub(r'<c r="A%d"([^>]*)>.*?</c>' % r, txt('A%d' % r, '3', bloque), c, flags=re.S)
        # B: la n-ésima asignatura ACTIVA de la configuración —y, en un bloque
        # de curso, de las que se imparten EN ESE CURSO.
        #
        # Ese segundo filtro es lo que hace que la columna `Cursos` sirva para
        # algo. Sin él, cada bloque recibía TODAS las asignaturas activas, así
        # que Conjunto —que solo se cursa en 3.º y 4.º— salía en 1.º y 2.º con
        # un cero. Y desde que el exportador se calla por «Activa» y no por
        # cero, ese cero viaja al Dashboard como si fuera un dato: «1EEM /
        # Conjunto: 0 alumnos», que no es que no haya nadie, es que no existe.
        #
        # `_xlfn._xlws.` NO es decorativo: es como Excel guarda las funciones de
        # matriz dinámica en el XML. Escrito a pelo, `FILTER` no es una función que
        # exista y el libro entero abre con «hemos encontrado un problema».
        filtro_curso = ('CONFIG_ASIGNATURAS!$G$2:$G$%d="Sí"' % FIN_CFG) if bloque == 'GLOBAL' else (
            '(CONFIG_ASIGNATURAS!$G$2:$G$%d="Sí")*ISNUMBER(SEARCH("%s",CONFIG_ASIGNATURAS!$C$2:$C$%d))'
            % (FIN_CFG, bloque, FIN_CFG))
        bf = ('IFERROR(INDEX(_xlfn._xlws.FILTER(CONFIG_ASIGNATURAS!$B$2:$B$%d,%s),%d),"")'
              % (FIN_CFG, filtro_curso, n))
        c = re.sub(r'<c r="B%d"([^>]*)>.*?</c>' % r, fxm('B%d' % r, '3', bf), c, flags=re.S)
        # C: el tipo, también de la configuración
        cf = ('IF(B%d="","",IFERROR(IF(VLOOKUP(B%d,CONFIG_ASIGNATURAS!$B$2:$F$%d,5,FALSE())="Sí",'
              '"Especialidad","Asignatura"),"Asignatura"))' % (r, r, FIN_CFG))
        c = re.sub(r'<c r="C%d"([^>]*)>.*?</c>' % r, fx('C%d' % r, '3', cf), c, flags=re.S)
        filas_calc.append('<row r="%d" spans="1:22">%s</row>' % (r, c))
        mapa.append((r, bloque, 'Asignatura'))
        r += 1

calc_nueva = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(filas_calc) + '</sheetData>',
                    calc, flags=re.S)
calc_nueva = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:V%d"/>' % (r - 1), calc_nueva)
piezas['xl/worksheets/sheet6.xml'] = calc_nueva.encode('utf8')
print('CALC_EEM: %d filas (%d bloques × %d) — antes 111' % (r - 1, len(BLOQUES), 3 + RANURAS))

# ---------- 3 · EXPORTADOR ----------
exp = hoja(9)
fe = filas_de(exp)
pl_est = fe[9]      # una fila de #ESTADISTICAS
pl_agr = fe[122]    # una fila de #AGRUPACIONES

nuevas = []
for a, c in sorted(fe.items()):
    pass
# se reconstruye entero: cabecera (1-8), estadísticas, agrupaciones, correlaciones
salida = []
for n in range(1, 9):
    if n in fe: salida.append('<row r="%d"%s>%s</row>' % (n, re.sub(r'^ r="\d+"', '', fe[n][0]), fe[n][1]))

fila_exp = 9
attrs, cont = pl_est
viejo_exp = 9
for (fila_calc, bloque, tipo) in mapa:
    c = cont
    # las referencias a CALC_EEM!X<fila> pasan a la fila que toca
    c = re.sub(r'CALC_EEM!([A-Z]+)\d+', lambda m: 'CALC_EEM!%s%d' % (m.group(1), fila_calc), c)
    c = re.sub(r'\br="([A-Z]+)\d+"', lambda m: 'r="%s%d"' % (m.group(1), fila_exp), c)
    # Cada columna se guardaba a SÍ MISMA —`IF(CALC_EEM!D2="","",CALC_EEM!D2)`—,
    # así que una ranura sin usar salía al CSV con el nivel puesto, la
    # asignatura vacía y ceros en todo. Y `parseCSV` la ingiere, porque solo
    # mira que la primera columna tenga algo y esa es el nivel: 40 filas
    # fantasma por fichero, indistinguibles de asignaturas con cero alumnos.
    #
    # Ahora todas se guardan sobre el NOMBRE. Sin nombre no hay fila; con
    # nombre y cero registros, sí la hay. Esa es justo la diferencia que
    # `Activa` existe para marcar: «no lo impartimos» y «lo impartimos y este
    # año no hay nadie» no son lo mismo, y el cero no los distingue.
    def guardar_por_nombre(m):
        cuerpo = m.group(3)
        f = re.search(r'<f([^>]*)>(.*?)</f>', cuerpo, re.S)
        if not f:
            return m.group(0)
        formula = re.sub(r'^IF\(CALC_EEM!\$?[A-Z]+%d="",' % fila_calc,
                         'IF(CALC_EEM!$B%d="",' % fila_calc, f.group(2), count=1)
        if formula == f.group(2):          # no tenía guarda: se le pone
            formula = 'IF(CALC_EEM!$B%d="","",%s)' % (fila_calc, formula)
        return '<c r="%s%d"%s><f%s>%s</f></c>' % (m.group(1), fila_exp, m.group(2),
                                                  f.group(1), formula)

    c = re.sub(r'<c r="([A-Z]+)%d"([^>]*)>(.*?)</c>' % fila_exp,
               guardar_por_nombre, c, flags=re.S)
    salida.append('<row r="%d" spans="1:24">%s</row>' % (fila_exp, c))
    fila_exp += 1

# agrupaciones y correlaciones, detrás
salida.append('<row r="%d"><c r="A%d" t="inlineStr"><is><t>#AGRUPACIONES</t></is></c></row>' % (fila_exp+1, fila_exp+1))
fila_exp += 2
salida.append('<row r="%d">%s</row>' % (
    fila_exp, re.sub(r'\br="([A-Z]+)\d+"', lambda m: 'r="%s%d"' % (m.group(1), fila_exp), fe[121][1])))
fila_exp += 1
attrs, cont = pl_agr
for i in range(2, FIN_CFG + 1):
    c = re.sub(r'CONFIG_ASIGNATURAS!([A-Z]+)\d+', lambda m: 'CONFIG_ASIGNATURAS!%s%d' % (m.group(1), i), cont)
    c = re.sub(r'\br="([A-Z]+)\d+"', lambda m: 'r="%s%d"' % (m.group(1), fila_exp), c)
    salida.append('<row r="%d">%s</row>' % (fila_exp, c))
    fila_exp += 1

# la sección de correlaciones se conserva tal cual, corrida
for n in sorted(k for k in fe if k >= 142):
    c = re.sub(r'\br="([A-Z]+)\d+"', lambda m: 'r="%s%d"' % (m.group(1), fila_exp), fe[n][1])
    salida.append('<row r="%d">%s</row>' % (fila_exp, c))
    fila_exp += 1

exp_nueva = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(salida) + '</sheetData>',
                   exp, flags=re.S)
exp_nueva = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:X%d"/>' % (fila_exp - 1), exp_nueva)
piezas['xl/worksheets/sheet9.xml'] = exp_nueva.encode('utf8')
print('EXPORTADOR: %d filas — antes 158' % (fila_exp - 1))

# `calcChain.xml` es el orden en que Excel recalculó la última vez: una lista
# de TODAS las celdas con fórmula. Al mover filas deja de cuadrar con las que
# hay, y Excel lo comprueba al abrir —fue la segunda avería de este fichero—.
# Es una caché reconstruible: se tira, y con `fullCalcOnLoad` se rehace sola.
CC = 'xl/calcChain.xml'
if CC in piezas:
    del piezas[CC]; orden = [n for n in orden if n != CC]
    piezas['[Content_Types].xml'] = re.sub(
        r'<Override PartName="/xl/calcChain\.xml"[^>]*/>', '',
        piezas['[Content_Types].xml'].decode('utf8')).encode('utf8')
    piezas['xl/_rels/workbook.xml.rels'] = re.sub(
        r'<Relationship[^>]*calcChain\.xml"[^>]*/>', '',
        piezas['xl/_rels/workbook.xml.rels'].decode('utf8')).encode('utf8')
    print('calcChain: fuera (la rehace Excel al abrir)')

nuevo = zipfile.ZipFile(RUTA, 'w', zipfile.ZIP_DEFLATED)
for n in orden: nuevo.writestr(info[n], piezas[n])
nuevo.close()
print('escrito')
