"""Lleva a profesional el rediseño que ya tiene elemental: manda la lista.

Lo que cambia, y por qué cada cosa:

  · El nombre de cada asignatura sale de CONFIG_ASIGNATURAS, no está escrito
    en la hoja de cálculo. Añadir una es escribir una línea.
  · Quién es «especialidad» lo dice la columna Grupo1, no un rango de filas.
    El libro traía una nota —«Especialidades están en filas 7-27. Para añadir
    nuevas, insertar en ese bloque»— que describe exactamente el problema:
    una asignatura escrita en la primera fila libre quedaba fuera de los dos
    totales sin que nada lo dijera.
  · «Teórica Troncal» tenía TRES nombres escritos dentro de la fórmula
    —Lenguaje Musical, Armonía, Análisis—. Ahora pregunta por Grupo2, que es
    donde el catálogo ya lo decía.
  · Los criterios miran «Activa», así que desactivar una asignatura la quita
    de las filas Y de los totales, en vez de solo de las filas.
  · Cada bloque de curso recibe únicamente las asignaturas que se imparten en
    ESE curso, que es para lo que existe la columna `Cursos`.
  · Y los rangos del catálogo llegan a la fila 91 para 42 asignaturas: hay
    sitio para lo que la norma añada y para lo que cada centro tenga suyo.
"""
import zipfile, re, html

RUTA = '/Users/miralles/Documents/GitHub/DashboardAcademico/public/data/ANALIZADOR_PROFESIONAL_v2.xlsx'
RANURAS = 60            # asignaturas provisionadas por bloque de CALC
FIN_CFG = 91            # hasta dónde miran los rangos del catálogo
CURSOS = ['1EPM', '2EPM', '3EPM', '4EPM', '5EPM', '6EPM']
BLOQUES = ['GLOBAL'] + CURSOS

# Las de diseño propio del centro. Salen de las Instrucciones de plantillas:
# heredan la ratio «por analogía» de la obligatoria más parecida, así que no
# se pueden tratar como las demás optativas del currículo.
DE_CENTRO = {'Improvisación y Jazz', 'Introducción a la Pedagogía Musical',
             'Formación Corporal para Músicos'}
# Se cursan UNA sola vez aunque se lleven dos especialidades (art. 14.1 del
# D.158/2007 y `PLAN.UNA_SOLA_VEZ` del jardín). Música de cámara y conjunto
# NO están: se repiten con cada especialidad nueva, porque se hacen con el
# instrumento nuevo.
UNA_SOLA_VEZ = {'Lenguaje Musical', 'Armonía', 'Análisis', 'Historia de la Música',
                'Coro', 'Piano Complementario', 'Clave Complementario'}
# Nombres que estaban en MAYÚSCULAS mezclados con el resto capitalizado. Es la
# trampa de la Dulzaina otra vez: el analizador compara contra este texto.
RENOMBRAR = {
    'FUNDAMENTOS DE INFORMÁTICA MUSICAL Y EDICIÓN DE PARTITURAS':
        'Fundamentos de Informática Musical y Edición de Partituras',
    'COMPLEMENTO PIANÍSTICO / CLAVECINÍSTICO': 'Complemento Pianístico / Clavecinístico',
}

esc = lambda s: (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                  .replace('"', '&quot;'))
txt = lambda ref, e, s: ('<c r="%s"%s t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>'
                         % (ref, (' s="%s"' % e) if e else '', esc(s)))
num = lambda ref, e, n: '<c r="%s"%s><v>%s</v></c>' % (ref, (' s="%s"' % e) if e else '', n)
fx  = lambda ref, e, f: '<c r="%s"%s><f>%s</f></c>' % (ref, (' s="%s"' % e) if e else '', esc(f))
vac = lambda ref, e: '<c r="%s"%s/>' % (ref, (' s="%s"' % e) if e else '')

# Una fórmula que lleva dentro FILTER o UNIQUE es de matriz dinámica, y en el
# XML eso se declara: `cm="1"` en la celda y `<f t="array" ref="…">`. Es lo que
# escribe Excel —las que ya traía el libro lo llevan— y lo que a mí se me
# olvidó en la columna selectora de profesional: sin ello la fórmula no se
# evalúa como matriz, no derrama, y no da ningún error.
fxm = lambda ref, e, f: ('<c r="%s"%s cm="1"><f t="array" ref="%s">%s</f></c>'
                         % (ref, (' s="%s"' % e) if e else '', ref, esc(f)))

z = zipfile.ZipFile(RUTA)
piezas = {n: z.read(n) for n in z.namelist()}
orden = z.namelist(); info = {i.filename: i for i in z.infolist()}
z.close()
hoja = lambda n: piezas['xl/worksheets/sheet%d.xml' % n].decode('utf8')
SS = [html.unescape(re.sub(r'<.*?>', '', x))
      for x in re.findall(r'<si>(.*?)</si>', piezas['xl/sharedStrings.xml'].decode('utf8'), re.S)]

def filas_de(x):
    return {int(re.search(r'r="(\d+)"', a).group(1)): (a, c)
            for a, c in re.findall(r'<row([^>]*)>(.*?)</row>', x, re.S)}

def celdas(c):
    out = {}
    for m in re.finditer(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', c, re.S):
        col, at, cont = m.group(1), m.group(2), m.group(3) or ''
        v = re.search(r'<v>(.*?)</v>', cont, re.S)
        if v and 't="s"' in at: out[col] = SS[int(v.group(1))]
        elif '<is>' in cont: out[col] = html.unescape(re.sub(r'<.*?>', '', cont))
        elif v: out[col] = v.group(1)
        else: out[col] = ''
    return out

# ---------- 1 · CONFIG_ASIGNATURAS: el catálogo que ya había, más dos columnas
# El margen, dicho en el propio libro. Sin esto, «se pueden añadir asignaturas»
# es algo que solo sabe quien haya leído este generador.
AYUDA = [
    ('K1', 'CÓMO AÑADIR UNA ASIGNATURA'),
    ('K2', '1. Escríbela en la primera fila libre (marcada abajo con una flecha). No hace falta'),
    ('K3', '   insertar filas ni ordenar nada: las fórmulas no miran POSICIONES, miran columnas.'),
    ('K4', '2. B  Asignatura — EXACTAMENTE igual que en el fichero de calificaciones que'),
    ('K5', '      pegas en DATOS. Si no coincide letra por letra, esa asignatura no aparece'),
    ('K6', '      ni con un cero, y sus registros los cuenta el aviso «FueraDeLasCifras».'),
    ('K7', '3. C  Cursos — separados por punto y coma. Solo sale en los cursos que pongas.'),
    ('K8', '4. D  Grupo1 — «Especialidad» si es un instrumento: decide en qué total cuenta.'),
    ('K9', '5. G  Activa — «Sí». Sin eso no sale por ningún sitio.'),
    ('K10', '6. H  UnaSolaVez — «Sí» solo si NO se vuelve a cursar con un segundo instrumento.'),
    ('K11', '7. I  Tipo — Obligatoria / Optativa / De centro.'),
    ('K12', 'J  Clase se calcula sola. Si sale vacía, esa fila no está activa.'),
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
    trozos = ''.join(txt(ref, '', t) for ref, t in AYUDA if int(ref[1:]) == fila)
    if fila == PRIMERA_LIBRE:
        trozos += txt('M' + str(fila), '', '↓ primera fila libre')
    if fila == FIN_CFG:
        trozos += txt('M' + str(fila), '', '↑ última fila que miran las fórmulas')
    return trozos

cfg = hoja(2)
fc = filas_de(cfg)
CATALOGO = []
for r in sorted(k for k in fc if k > 1):
    c = celdas(fc[r][1])
    nombre = RENOMBRAR.get(c.get('B', ''), c.get('B', ''))
    if not nombre: continue
    g2 = c.get('E', '')
    # «LenguajeVoz» no agrupaba nada: canto ya es canto.
    if g2 == 'LenguajeVoz': g2 = ''
    CATALOGO.append({
        'nombre': nombre, 'cursos': c.get('C', ''), 'g1': c.get('D', ''), 'g2': g2,
        'unaVez': 'Sí' if nombre in UNA_SOLA_VEZ else 'No',
        'tipo': ('De centro' if nombre in DE_CENTRO
                 else 'Optativa' if c.get('D', '') == 'Optativas' else 'Obligatoria'),
    })

cab = fc[1][1]
est = (re.search(r'<c r="B1"[^>]*s="(\d+)"', cab) or [None, ''])[1]
cab = re.sub(r'<c r="[H-Z]+1"(?:[^>]*/>|[^>]*>.*?</c>)', '', cab, flags=re.S)
cab += txt('H1', est, 'UnaSolaVez') + txt('I1', est, 'Tipo') + txt('J1', est, 'Clase (calculada)') + ayuda_de(1)
filas_cfg = ['<row r="1"%s>%s</row>' % (re.sub(r'^ r="\d+"', '', fc[1][0]), cab)]
for i, a in enumerate(CATALOGO, start=2):
    filas_cfg.append('<row r="%d">%s</row>' % (i,
        num('A%d' % i, '', i - 1) + txt('B%d' % i, '', a['nombre'])
        + txt('C%d' % i, '', a['cursos']) + txt('D%d' % i, '', a['g1'])
        + (txt('E%d' % i, '', a['g2']) if a['g2'] else vac('E%d' % i, ''))
        + txt('F%d' % i, '', 'Sí' if a['g1'] == 'Especialidad' else 'No')
        + txt('G%d' % i, '', 'Sí') + txt('H%d' % i, '', a['unaVez'])
        + txt('I%d' % i, '', a['tipo']) + fx('J%d' % i, '', CLASE_DE(i)) + ayuda_de(i)))
# El margen también calcula su clase: una asignatura escrita ahí queda
# clasificada sola, sin tocar nada más.
for n in range(len(CATALOGO) + 2, FIN_CFG + 1):
    filas_cfg.append('<row r="%d">%s</row>' % (n, fx('J%d' % n, '', CLASE_DE(n)) + ayuda_de(n)))

cfg_n = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(filas_cfg) + '</sheetData>',
               cfg, flags=re.S)
cfg_n = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:I%d"/>' % FIN_CFG, cfg_n)
piezas['xl/worksheets/sheet2.xml'] = cfg_n.encode('utf8')
print('CONFIG_ASIGNATURAS: %d asignaturas · %d optativas · %d de centro'
      % (len(CATALOGO), sum(1 for a in CATALOGO if a['tipo'] == 'Optativa'),
         sum(1 for a in CATALOGO if a['tipo'] == 'De centro')))

# La clase de la asignatura de CADA FILA de DATOS, buscada una sola vez.
# `CONFIG_METADATA!I` es lo que consultan después los cientos de totales, en
# vez de recorrerse el catálogo entero cada uno: eran 20.000 × 90
# comparaciones por fórmula y unos 2.500 millones por recálculo.
CLASE_FILA = 'CONFIG_METADATA!$I$2:$I$20000'
clase_de_fila = lambda r: ('IF(DATOS!$I%d="","",IFERROR(VLOOKUP(DATOS!$I%d,'
                           'CONFIG_ASIGNATURAS!$B$2:$J$%d,9,FALSE()),""))' % (r, r, FIN_CFG))

# ---------- 2 · CALC_EPM ----------
SEL = 'CONFIG_METADATA!$G$2:$G$20000=1'
def criterio(clave):
    """Un solo criterio, y lo dice la clase que el catálogo ya calculó."""
    if clave == 'esp': return '%s="E"' % CLASE_FILA
    if clave == 'teorica': return '%s="NT"' % CLASE_FILA
    return '(%s<>"")*(%s<>"E")' % (CLASE_FILA, CLASE_FILA)

calc = hoja(6)
fk = filas_de(calc)
def rehacer(cont, viejo, nuevo):
    cont = re.sub(r'\br="([A-Z]+)%d"' % viejo, lambda m: 'r="%s%d"' % (m.group(1), nuevo), cont)
    return re.sub(r'(?<![$\w])([A-Z])%d(?![\d:])' % viejo, lambda m: '%s%d' % (m.group(1), nuevo), cont)

# Las plantillas se cogen por NÚMERO DE FILA, así que este generador solo
# sirve sobre el libro ORIGINAL. Corriéndolo sobre su propia salida cogería
# filas que ya no son las que cree —una ranura de curso en vez de un total— y
# el libro saldría con cifras plausibles y mal. Es idéntico a lo que pasó, y
# no dio ningún error.
if len(fk) != 298:
    raise SystemExit(
        'CALC_EPM tiene %d filas y el original tiene 298: este libro ya está '
        'regenerado. Parte del original (git checkout del commit anterior).' % len(fk))

PL = {'total': fk[2], 'esp': fk[3], 'noesp': fk[4], 'teorica': fk[5], 'asig': fk[6],
      'cTotal': fk[45], 'cEsp': fk[46], 'cNoesp': fk[47], 'cAsig': fk[68]}

def con_criterio(c, r, clave, curso):
    """Reescribe D..U de una fila de total con el criterio del catálogo."""
    NOTA, APTO = 'DATOS!$K$2:$K$20000', 'DATOS!$L$2:$L$20000'
    cond = '(%s)*(%s)' % (SEL, criterio(clave))
    if curso: cond = '(%s)*(DATOS!$D$2:$D$20000=A%d)*(%s)' % (SEL, r, criterio(clave))
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

filas_calc = ['<row r="1"%s>%s</row>' % (re.sub(r'^ r="\d+"', '', fk[1][0]), fk[1][1])]
r = 2
mapa = []
TOTALES_GLOBAL = [('total', 'Total', 'Total'), ('esp', 'Total Especialidad', 'TotalEsp'),
                  ('noesp', 'Total No Especialidad', 'TotalNoEsp'),
                  ('teorica', 'Teórica Troncal', 'TeoricaTroncal')]

def slot(plantilla, viejo, r, bloque, n):
    c = rehacer(plantilla, viejo, r)
    filtro = ('CONFIG_ASIGNATURAS!$G$2:$G$%d="Sí"' % FIN_CFG) if bloque == 'GLOBAL' else (
        '(CONFIG_ASIGNATURAS!$G$2:$G$%d="Sí")*ISNUMBER(SEARCH("%s",CONFIG_ASIGNATURAS!$C$2:$C$%d))'
        % (FIN_CFG, bloque, FIN_CFG))
    bf = ('IFERROR(INDEX(_xlfn._xlws.FILTER(CONFIG_ASIGNATURAS!$B$2:$B$%d,%s),%d),"")'
          % (FIN_CFG, filtro, n))
    cf = ('IF(B%d="","",IFERROR(VLOOKUP(B%d,CONFIG_ASIGNATURAS!$B$2:$D$%d,3,FALSE()),"Asignatura"))'
          % (r, r, FIN_CFG))
    c = re.sub(r'<c r="A%d"([^>]*)>.*?</c>' % r, txt('A%d' % r, '', bloque), c, flags=re.S)
    c = re.sub(r'<c r="B%d"(?:[^>]*/>|[^>]*>.*?</c>)' % r, fxm('B%d' % r, '', bf), c, flags=re.S)
    c = re.sub(r'<c r="C%d"(?:[^>]*/>|[^>]*>.*?</c>)' % r, fx('C%d' % r, '', cf), c, flags=re.S)
    return c

# GLOBAL: cuatro totales y sus ranuras
for clave, etiqueta, tipo in TOTALES_GLOBAL:
    a, c = PL[clave]
    viejo = int(re.search(r'r="(\d+)"', a).group(1))
    c = rehacer(c, viejo, r)
    if clave != 'total':
        c = con_criterio(c, r, clave, None)
    c = re.sub(r'<c r="A%d"([^>]*)>.*?</c>' % r, txt('A%d' % r, '', 'GLOBAL'), c, flags=re.S)
    c = re.sub(r'<c r="B%d"([^>]*)>.*?</c>' % r, txt('B%d' % r, '', etiqueta), c, flags=re.S)
    c = re.sub(r'<c r="C%d"([^>]*)>.*?</c>' % r, txt('C%d' % r, '', tipo), c, flags=re.S)
    filas_calc.append('<row r="%d">%s</row>' % (r, c)); mapa.append((r, 'GLOBAL', tipo)); r += 1
aG, cG = PL['asig']; viejoG = int(re.search(r'r="(\d+)"', aG).group(1))
for n in range(1, RANURAS + 1):
    filas_calc.append('<row r="%d">%s</row>' % (r, slot(cG, viejoG, r, 'GLOBAL', n)))
    mapa.append((r, 'GLOBAL', 'Asignatura')); r += 1

# el resumen por curso, los tres totales seguidos
for curso in CURSOS:
    for clave, etiqueta, tipo in [('cTotal', 'Total', 'Total'), ('cEsp', 'Total Especialidad', 'TotalEsp'),
                                  ('cNoesp', 'Total No Especialidad', 'TotalNoEsp')]:
        a, c = PL[clave]
        viejo = int(re.search(r'r="(\d+)"', a).group(1))
        c = rehacer(c, viejo, r)
        if clave != 'cTotal':
            c = con_criterio(c, r, {'cEsp': 'esp', 'cNoesp': 'noesp'}[clave], curso)
        c = re.sub(r'<c r="A%d"([^>]*)>.*?</c>' % r, txt('A%d' % r, '', curso), c, flags=re.S)
        c = re.sub(r'<c r="B%d"([^>]*)>.*?</c>' % r, txt('B%d' % r, '', etiqueta), c, flags=re.S)
        c = re.sub(r'<c r="C%d"([^>]*)>.*?</c>' % r, txt('C%d' % r, '', tipo), c, flags=re.S)
        filas_calc.append('<row r="%d">%s</row>' % (r, c)); mapa.append((r, curso, tipo)); r += 1

# y las asignaturas de cada curso
aC, cC = PL['cAsig']; viejoC = int(re.search(r'r="(\d+)"', aC).group(1))
for curso in CURSOS:
    for n in range(1, RANURAS + 1):
        filas_calc.append('<row r="%d">%s</row>' % (r, slot(cC, viejoC, r, curso, n)))
        mapa.append((r, curso, 'Asignatura')); r += 1

calc_n = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(filas_calc) + '</sheetData>',
                calc, flags=re.S)
calc_n = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:U%d"/>' % (r - 1), calc_n)
piezas['xl/worksheets/sheet6.xml'] = calc_n.encode('utf8')
print('CALC_EPM: %d filas (antes 298)' % (r - 1))

# ---------- 3 · EXPORTADOR ----------
exp = hoja(9)
fe = filas_de(exp)
FILAS_AVISO = [(6, 'ExtraordinariaSinOrdinaria'), (8, 'FilasConDatos'),
               (9, 'DobleEspecialidad'), (10, 'FueraDeLasCifras')]
# ── La cabecera del CSV: los avisos viajan con las cifras ──────────────────
#
# Los avisos vivían en CONFIG_METADATA y NO salían: el exportador solo leía
# el centro, el curso y la evaluación. Quien mira el Dashboard nunca se
# enteraba de que hay registros fuera de las cifras o contados dos veces —y
# son justo los que hacen que un número no signifique lo que parece—.
# El que abre el Excel los veía; el que solo ve la web, no.
AVISOS_CSV = [
    ('Centro', 'CONFIG_METADATA!B2'), ('CursoAcademico', 'CONFIG_METADATA!B3'),
    ('Trimestre', 'CONFIG_METADATA!B4'),
]
for _fila, _campo in FILAS_AVISO:
    AVISOS_CSV.append((_campo, 'CONFIG_METADATA!B%d' % _fila))

salida = []
cab_est = fe[[n for n in sorted(fe) if n >= 7][0]][1] if False else None
salida.append('<row r="1">%s</row>' % txt('A1', '', '#METADATA'))
salida.append('<row r="2">%s%s</row>' % (txt('A2', '', 'Campo'), txt('B2', '', 'Valor')))
_r = 3
for _campo, _ref in AVISOS_CSV:
    salida.append('<row r="%d">%s%s</row>'
                  % (_r, txt('A%d' % _r, '', _campo), fx('B%d' % _r, '', _ref)))
    _r += 1
_r += 1
salida.append('<row r="%d">%s</row>' % (_r, txt('A%d' % _r, '', '#ESTADISTICAS')))
_r += 1
salida.append('<row r="%d"%s>%s</row>'
              % (_r, re.sub(r'^ r="\d+"', '', fe[8][0]),
                 re.sub(r'\br="([A-Z]+)\d+"', lambda m: 'r="%s%d"' % (m.group(1), _r), fe[8][1])))
fila_exp = _r + 1

pl_a, pl_c = fe[9]
for (fila_calc, bloque, tipo) in mapa:
    c = re.sub(r'CALC_EPM!([A-Z]+)\d+', lambda m: 'CALC_EPM!%s%d' % (m.group(1), fila_calc), pl_c)
    c = re.sub(r'\br="([A-Z]+)\d+"', lambda m: 'r="%s%d"' % (m.group(1), fila_exp), c)
    def por_nombre(m, _f=fila_calc, _r=fila_exp):
        g = re.search(r'<f([^>]*)>(.*?)</f>', m.group(3) or '', re.S)
        if not g: return m.group(0)
        formula = re.sub(r'^IF\(CALC_EPM!\$?[A-Z]+%d=""," ?",' % _f,
                         'IF(CALC_EPM!$B%d="","",' % _f, html.unescape(g.group(2)), count=1)
        formula = re.sub(r'^IF\(CALC_EPM!\$?[A-Z]+%d="",' % _f,
                         'IF(CALC_EPM!$B%d="",' % _f, formula, count=1)
        if not formula.startswith('IF(CALC_EPM!$B%d=""' % _f):
            formula = 'IF(CALC_EPM!$B%d="","",%s)' % (_f, formula)
        return '<c r="%s%d"%s><f%s>%s</f></c>' % (m.group(1), _r, m.group(2), g.group(1), esc(formula))
    c = re.sub(r'<c r="([A-Z]+)%d"([^>]*)>(.*?)</c>' % fila_exp, por_nombre, c, flags=re.S)
    salida.append('<row r="%d">%s</row>' % (fila_exp, c))
    fila_exp += 1
for n in sorted(k for k in fe if k > 9 + 0 and celdas(fe[k][1]).get('A', '').startswith('#')):
    pass
exp_n = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(salida) + '</sheetData>',
               exp, flags=re.S)
exp_n = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:X%d"/>' % (fila_exp - 1), exp_n)
piezas['xl/worksheets/sheet9.xml'] = exp_n.encode('utf8')
print('EXPORTADOR: %d filas' % (fila_exp - 1))

# La columna de la clase, una celda por fila de DATOS, junto a las que ya
# había para OR+EX.
meta = hoja(3)
fmeta = filas_de(meta)
salida_meta = []
for n in sorted(set(fmeta) | set(range(2, 20001))):
    a, c = fmeta.get(n, ('', ''))
    c = re.sub(r'<c r="I%d"(?:[^>]*/>|[^>]*>.*?</c>)' % n, '', c, flags=re.S)
    salida_meta.append('<row r="%d"%s>%s</row>'
                       % (n, re.sub(r'^ r="\d+"', '', a), c + fx('I%d' % n, '', clase_de_fila(n))))
meta = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(salida_meta) + '</sheetData>',
              meta, flags=re.S)
meta = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:I20000"/>', meta)
piezas['xl/worksheets/sheet3.xml'] = meta.encode('utf8')
print('CONFIG_METADATA: columna de clase por fila')

# Los dos avisos que elemental ya tenía y este no. Ninguno se corrige: los
# dos se DICEN, que es distinto. Un sesgo dicho es una condición de lectura.
UNA_VEZ = ('COUNTIFS(CONFIG_ASIGNATURAS!$B$2:$B$%d,DATOS!$I$2:$I$20000,'
           'CONFIG_ASIGNATURAS!$H$2:$H$%d,"Sí",'
           'CONFIG_ASIGNATURAS!$G$2:$G$%d,"Sí")>0' % (FIN_CFG, FIN_CFG, FIN_CFG))
COND = '(%s)*(%s)' % (SEL, UNA_VEZ)
CLAVES = 'CONFIG_METADATA!$F$2:$F$20000'
DOBLES = ('IFERROR(SUMPRODUCT(%s*1)-COUNTA(_xlfn.UNIQUE(_xlfn._xlws.FILTER(%s,%s))),0)'
          % (COND, CLAVES, COND))

meta2 = piezas['xl/worksheets/sheet3.xml'].decode('utf8')
f2 = filas_de(meta2)
avisos = [
    (9, 'DobleEspecialidad', DOBLES, True,
     'Registros de más: quien cursa dos especialidades aparece dos veces en las '
     'asignaturas de una sola vez, con la misma nota. Cuentan doble en la media, '
     'en la moda y en el reparto.'),
    (10, 'FueraDeLasCifras', 'CALC_EPM!$D$2-CALC_EPM!$D$3-CALC_EPM!$D$4', False,
     'Registros que no entran en ninguna cifra: su asignatura no está en '
     'CONFIG_ASIGNATURAS, o está pero con Activa = No. Si no es cero, falta algo '
     'en la configuración o sobra un No.'),
]
salida2 = []
for n in sorted(set(f2) | {x[0] for x in avisos}):
    a, c = f2.get(n, ('', ''))
    for fila, campo, formula, matriz, nota_ in avisos:
        if fila != n: continue
        c = re.sub(r'<c r="[ABC]%d"(?:[^>]*/>|[^>]*>.*?</c>)' % n, '', c, flags=re.S)
        escribir = fxm if matriz else fx
        c = (txt('A%d' % n, '', campo) + escribir('B%d' % n, '', formula)
             + txt('C%d' % n, '', nota_) + c)
    salida2.append('<row r="%d"%s>%s</row>' % (n, re.sub(r'^ r="\d+"', '', a), c))
meta2 = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(salida2) + '</sheetData>',
               meta2, flags=re.S)
piezas['xl/worksheets/sheet3.xml'] = meta2.encode('utf8')
print('CONFIG_METADATA: avisos de doble especialidad y fuera de las cifras')

CC = 'xl/calcChain.xml'
if CC in piezas:
    del piezas[CC]; orden = [x for x in orden if x != CC]
    piezas['[Content_Types].xml'] = re.sub(r'<Override PartName="/xl/calcChain\.xml"[^>]*/>', '',
                                           piezas['[Content_Types].xml'].decode('utf8')).encode('utf8')
    piezas['xl/_rels/workbook.xml.rels'] = re.sub(r'<Relationship[^>]*calcChain\.xml"[^>]*/>', '',
                                                  piezas['xl/_rels/workbook.xml.rels'].decode('utf8')).encode('utf8')
w = zipfile.ZipFile(RUTA, 'w', zipfile.ZIP_DEFLATED)
for n in orden: w.writestr(info[n], piezas[n])
w.close()
print('escrito')
