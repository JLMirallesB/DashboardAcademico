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
RANURAS = 34          # asignaturas provisionadas por bloque
BLOQUES = ['GLOBAL', '1EEM', '2EEM', '3EEM', '4EEM']
TODOS_LOS_CURSOS = '1EEM;2EEM;3EEM;4EEM'

# --- El catálogo. Las tres comunes y las 23 del artículo 5 del D.159/2007.
#     El Grupo2 de las nuevas va VACÍO a propósito: es departamental, no
#     organológico —percusión está en Metal porque ese es su departamento— y
#     eso lo decide el centro, no este script.
COMUNES = [
    ('Lenguaje Musical', TODOS_LOS_CURSOS, 'Referencia', '', 'No'),
    ('Coro',             TODOS_LOS_CURSOS, 'NoEspecialidad', '', 'No'),
    ('Conjunto',         '3EEM;4EEM',      'NoEspecialidad', '', 'No'),
]
FAMILIA = {'Arpa':'Cuerda','Contrabajo':'Cuerda','Guitarra':'Cuerda','Viola':'Cuerda',
           'Violín':'Cuerda','Violoncello':'Cuerda','Clarinete':'Madera','Fagot':'Madera',
           'Flauta Travesera':'Madera','Oboe':'Madera','Saxofón':'Madera','Percusión':'Metal',
           'Trombón':'Metal','Trompa':'Metal','Trompeta':'Metal','Piano':'Tecla'}
ESPECIALIDADES = ['Acordeón','Arpa','Clarinete','Clave','Contrabajo','Dulzaina','Fagot',
                  'Flauta Travesera','Flauta de Pico','Guitarra','Instrumentos de Púa','Oboe',
                  'Percusión','Piano','Saxofón','Trombón','Trompa','Trompeta','Tuba','Viola',
                  'Viola de Gamba','Violín','Violoncello']

CATALOGO = COMUNES + [(e, TODOS_LOS_CURSOS, 'Especialidad', FAMILIA.get(e, ''), 'Sí')
                      for e in ESPECIALIDADES]

esc = lambda s: (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                  .replace('"', '&quot;'))
txt = lambda ref, estilo, s: ('<c r="%s"%s t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>'
                              % (ref, (' s="%s"' % estilo) if estilo else '', esc(s)))
num = lambda ref, estilo, n: '<c r="%s"%s><v>%s</v></c>' % (ref, (' s="%s"' % estilo) if estilo else '', n)
fx  = lambda ref, estilo, f: '<c r="%s"%s><f>%s</f></c>' % (ref, (' s="%s"' % estilo) if estilo else '', esc(f))
vac = lambda ref, estilo: '<c r="%s"%s/>' % (ref, (' s="%s"' % estilo) if estilo else '')

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
cfg = hoja(2)
fc = filas_de(cfg)
cab = fc[1][1]                      # la cabecera se conserva tal cual
notas_laterales = re.findall(r'<c r="[IK]\d+"[^>]*>(?:<v>\d+</v>)?</c>', fc[1][1])

filas_cfg = ['<row r="1"%s>%s</row>' % (re.sub(r'^ r="\d+"', '', fc[1][0]), cab)]
for i, (nombre, cursos, g1, g2, esEsp) in enumerate(CATALOGO, start=2):
    celdas = (num('A%d' % i, '3', i - 1) + txt('B%d' % i, '3', nombre)
              + txt('C%d' % i, '3', cursos) + txt('D%d' % i, '3', g1)
              + (txt('E%d' % i, '3', g2) if g2 else vac('E%d' % i, '3'))
              + txt('F%d' % i, '3', 'Sí' if g1 == 'Especialidad' else 'No')
              + txt('G%d' % i, '3', 'Sí'))
    filas_cfg.append('<row r="%d" spans="1:11" ht="15" customHeight="1">%s</row>' % (i, celdas))

cfg_nueva = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(filas_cfg) + '</sheetData>',
                   cfg, flags=re.S)
cfg_nueva = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:K%d"/>' % (len(CATALOGO) + 1), cfg_nueva)
piezas['xl/worksheets/sheet2.xml'] = cfg_nueva.encode('utf8')
print('CONFIG_ASIGNATURAS: %d asignaturas (%d comunes + %d especialidades)'
      % (len(CATALOGO), len(COMUNES), len(ESPECIALIDADES)))

# ---------- 2 · CALC_EEM ----------
calc = hoja(6)
fk = filas_de(calc)
FIN_CFG = len(CATALOGO) + 1          # última fila usada de CONFIG

def rehacer(cont, viejo, nuevo):
    """Cambia el número de fila en las referencias relativas (B8→B41, A27→A60)."""
    cont = re.sub(r'\br="([A-Z]+)%d"' % viejo, lambda m: 'r="%s%d"' % (m.group(1), nuevo), cont)
    cont = re.sub(r'(?<![$\w])([A-Z])%d(?![\d:])' % viejo, lambda m: '%s%d' % (m.group(1), nuevo), cont)
    return cont

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
        # el rango de especialidades de CONFIG se ensancha al catálogo entero
        c = c.replace('CONFIG_ASIGNATURAS!$B$5:$B$20',
                      'CONFIG_ASIGNATURAS!$B$%d:$B$%d' % (len(COMUNES) + 2, FIN_CFG))
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
        # B: la n-ésima asignatura ACTIVA de la configuración
        # `_xlfn._xlws.` NO es decorativo: es como Excel guarda las funciones de
        # matriz dinámica en el XML. Escrito a pelo, `FILTER` no es una función que
        # exista y el libro entero abre con «hemos encontrado un problema».
        bf = ('IFERROR(INDEX(_xlfn._xlws.FILTER(CONFIG_ASIGNATURAS!$B$2:$B$%d,'
              'CONFIG_ASIGNATURAS!$G$2:$G$%d="Sí"),%d),"")' % (FIN_CFG, FIN_CFG, n))
        c = re.sub(r'<c r="B%d"([^>]*)>.*?</c>' % r, fx('B%d' % r, '3', bf), c, flags=re.S)
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
    # y se salta lo que no tiene registros: sin esto el CSV se llena de ceros
    c = re.sub(r'<c r="([A-Z]+)%d"([^>]*)><f>(.*?)</f></c>' % fila_exp,
               lambda m: '<c r="%s%d"%s><f>%s</f></c>' % (
                   m.group(1), fila_exp, m.group(2),
                   esc('IF(OR(CALC_EEM!$B%d="",N(CALC_EEM!$D%d)=0),"",%s)'
                       % (fila_calc, fila_calc, html.unescape(m.group(3))))
                   if m.group(1) != 'A' else m.group(3)), c)
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
