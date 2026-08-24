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
cab += txt('H1', est, 'UnaSolaVez') + txt('I1', est, 'Tipo')
filas_cfg = ['<row r="1"%s>%s</row>' % (re.sub(r'^ r="\d+"', '', fc[1][0]), cab)]
for i, a in enumerate(CATALOGO, start=2):
    filas_cfg.append('<row r="%d">%s</row>' % (i,
        num('A%d' % i, '', i - 1) + txt('B%d' % i, '', a['nombre'])
        + txt('C%d' % i, '', a['cursos']) + txt('D%d' % i, '', a['g1'])
        + (txt('E%d' % i, '', a['g2']) if a['g2'] else vac('E%d' % i, ''))
        + txt('F%d' % i, '', 'Sí' if a['g1'] == 'Especialidad' else 'No')
        + txt('G%d' % i, '', 'Sí') + txt('H%d' % i, '', a['unaVez'])
        + txt('I%d' % i, '', a['tipo'])))
cfg_n = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(filas_cfg) + '</sheetData>',
               cfg, flags=re.S)
cfg_n = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:I%d"/>' % FIN_CFG, cfg_n)
piezas['xl/worksheets/sheet2.xml'] = cfg_n.encode('utf8')
print('CONFIG_ASIGNATURAS: %d asignaturas · %d optativas · %d de centro'
      % (len(CATALOGO), sum(1 for a in CATALOGO if a['tipo'] == 'Optativa'),
         sum(1 for a in CATALOGO if a['tipo'] == 'De centro')))

# ---------- 2 · CALC_EPM ----------
SEL = 'CONFIG_METADATA!$G$2:$G$20000=1'
def criterio(clave):
    """Un solo criterio, y lo dice el catálogo. Nunca un rango de filas."""
    col, val = {'esp': ('D', '"Especialidad"'), 'noesp': ('D', '"<>Especialidad"'),
                'teorica': ('E', '"TeoricaTroncal"')}[clave]
    return ('COUNTIFS(CONFIG_ASIGNATURAS!$B$2:$B$%d,DATOS!$I$2:$I$20000,'
            'CONFIG_ASIGNATURAS!$%s$2:$%s$%d,%s,'
            'CONFIG_ASIGNATURAS!$G$2:$G$%d,"Sí")>0'
            % (FIN_CFG, col, col, FIN_CFG, val, FIN_CFG))

calc = hoja(6)
fk = filas_de(calc)
def rehacer(cont, viejo, nuevo):
    cont = re.sub(r'\br="([A-Z]+)%d"' % viejo, lambda m: 'r="%s%d"' % (m.group(1), nuevo), cont)
    return re.sub(r'(?<![$\w])([A-Z])%d(?![\d:])' % viejo, lambda m: '%s%d' % (m.group(1), nuevo), cont)

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
salida = [ '<row r="%d"%s>%s</row>' % (n, re.sub(r'^ r="\d+"', '', fe[n][0]), fe[n][1])
           for n in sorted(fe) if n < 9 ]
pl_a, pl_c = fe[9]
fila_exp = 9
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
