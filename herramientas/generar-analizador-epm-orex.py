"""Añade la opción OR+EX al analizador de profesional.

El problema: TODAS las fórmulas del libro filtran por
`DATOS!G = CONFIG_METADATA!B4`, un código de evaluación único. Elegir «EX»
enseña solo las asignaturas suspendidas en ordinaria —que es lo único que
trae la extraordinaria—, así que la foto definitiva del curso no se podía
obtener del libro. Y una media de 4,2 sobre los recuperados se lee igual
que «la media del centro».

La forma de arreglarlo sin duplicar 34.000 fórmulas es cambiar QUIÉN
responde a la pregunta «¿cuenta esta fila?». Se añaden dos columnas
calculadas en CONFIG_METADATA —la clave de cada matrícula y un 1/0— y todas
las fórmulas pasan a mirar esa columna en vez de comparar la evaluación.
Solo hay dos formas escritas del criterio en todo el libro, así que la
sustitución es mecánica y no cambia ni un cálculo.

Con `OR+EX`, la regla es la que dijo el usuario: la ordinaria es la base y
cada fila de extraordinaria pisa la suya. Una fila de EX SIN su OR no puede
existir —no se recupera lo que no se suspendió— y se cuenta aparte para
decirlo.
"""
import zipfile, re, html

RUTA = '/Users/miralles/Documents/GitHub/DashboardAcademico/public/data/ANALIZADOR_PROFESIONAL_v2.xlsx'
FIN = 20000

esc = lambda s: (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                  .replace('"', '&quot;'))
txt = lambda ref, e, s: ('<c r="%s"%s t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>'
                         % (ref, (' s="%s"' % e) if e else '', esc(s)))
fx  = lambda ref, e, f: '<c r="%s"%s><f>%s</f></c>' % (ref, (' s="%s"' % e) if e else '', esc(f))

z = zipfile.ZipFile(RUTA)
piezas = {n: z.read(n) for n in z.namelist()}
orden = z.namelist(); info = {i.filename: i for i in z.infolist()}
z.close()
hoja = lambda n: piezas['xl/worksheets/sheet%d.xml' % n].decode('utf8')

# ---------- 1 · la columna selectora, en CONFIG_METADATA ----------
#
# UNA FÓRMULA POR FILA, y no una de matriz que se derrame. La primera versión
# usaba FILTER + MATCH en una sola celda y NO derramó: en el XML, una fórmula
# de matriz dinámica necesita `cm="1"` y `<f t="array">` —lo que Excel escribe
# y yo no puse—, así que se quedó en G2 y todos los totales daban 1. Con una
# fórmula por fila no hay metadato que falle, y además se puede pinchar
# cualquier fila y ver por qué cuenta o no.
#
# El COUNTIFS solo se evalúa en las filas de ordinaria y solo con OR+EX
# elegido —el IF corta antes—, así que en el resto de modos no cuesta nada.
FIN_F = FIN
def col_clave(r):
    return ('IF(DATOS!$A%d="","",DATOS!$A%d&"|"&DATOS!$D%d&"|"&DATOS!$E%d&"|"&DATOS!$I%d)'
            % (r, r, r, r, r))

def col_cuenta(r):
    ex = ('COUNTIFS(DATOS!$A$2:$A$%d,DATOS!$A%d,DATOS!$D$2:$D$%d,DATOS!$D%d,'
          'DATOS!$E$2:$E$%d,DATOS!$E%d,DATOS!$I$2:$I$%d,DATOS!$I%d,'
          'DATOS!$G$2:$G$%d,"EX")' % (FIN, r, FIN, r, FIN, r, FIN, r, FIN))
    return ('IF(DATOS!$A%d="",0,'
            'IF(CONFIG_METADATA!$B$4<>"OR+EX",--(DATOS!$G%d=CONFIG_METADATA!$B$4),'
            'IF(DATOS!$G%d="EX",1,'
            'IF(DATOS!$G%d="OR",--(%s=0),0))))' % (r, r, r, r, ex))

def col_huerfana(r):
    orr = ('COUNTIFS(DATOS!$A$2:$A$%d,DATOS!$A%d,DATOS!$D$2:$D$%d,DATOS!$D%d,'
           'DATOS!$E$2:$E$%d,DATOS!$E%d,DATOS!$I$2:$I$%d,DATOS!$I%d,'
           'DATOS!$G$2:$G$%d,"OR")' % (FIN, r, FIN, r, FIN, r, FIN, r, FIN))
    return 'IF(DATOS!$G%d<>"EX",0,--(%s=0))' % (r, orr)

meta = hoja(3)
filas = {int(re.search(r'r="(\d+)"', a).group(1)): (a, c)
         for a, c in re.findall(r'<row([^>]*)>(.*?)</row>', meta, re.S)}
est = (re.search(r'<c r="A2"[^>]*s="(\d+)"', filas[2][1]) or [None, ''])[1]

nuevas = {
    1: txt('D1', est, 'Evaluaciones') + txt('F1', est, 'Clave de matrícula')
       + txt('G1', est, 'Cuenta') + txt('H1', est, 'EX sin OR'),
    2: txt('D2', est, '1EV'),
    3: txt('D3', est, '2EV'),
    4: txt('D4', est, '3EV'),
    5: txt('D5', est, 'OR'),
    6: txt('D6', est, 'EX') + txt('A6', est, 'ExtraordinariaSinOrdinaria')
       + fx('B6', est, 'SUM(CONFIG_METADATA!$H$2:$H$%d)' % FIN)
       + txt('C6', est, 'Filas de extraordinaria que no tienen su fila de ordinaria. '
                        'No se recupera lo que no se suspendió: si no es cero, falta '
                        'por pegar la ordinaria o sobra algo en la extraordinaria.'),
    7: txt('D7', est, 'OR+EX') + txt('A7', est, 'ComoSeLee')
       + txt('C7', est, 'Con OR+EX manda la ordinaria y cada fila de extraordinaria pisa '
                        'la suya. Es la única opción que da la foto definitiva del curso: '
                        'EX a solas enseña solo lo que se suspendió en junio.'),
}
salida = []
for n in sorted(set(filas) | set(nuevas) | set(range(2, FIN_F + 1))):
    a, c = filas.get(n, ('', ''))
    trozos = re.findall(r'<c r="[A-Z]+\d+"(?:[^>]*/>|[^>]*>.*?</c>)', c, re.S)
    refs_nuevas = set(re.findall(r'<c r="([A-Z]+)\d+"', nuevas.get(n, '')))
    # Las tres columnas calculadas se reescriben SIEMPRE. Sin esto, la fila 2
    # conservaba las de la versión anterior y recibía además las nuevas: dos
    # celdas con la misma referencia en la misma fila, que es de las cosas que
    # Excel comprueba al abrir.
    if n >= 2:
        refs_nuevas |= {'F', 'G', 'H'}
    trozos = [t for t in trozos if re.search(r'<c r="([A-Z]+)', t).group(1) not in refs_nuevas]
    todas = trozos + re.findall(r'<c r="[A-Z]+\d+"(?:[^>]*/>|[^>]*>.*?</c>)', nuevas.get(n, ''), re.S)
    if n >= 2:
        todas += [fx('F%d' % n, '', col_clave(n)), fx('G%d' % n, '', col_cuenta(n)),
                  fx('H%d' % n, '', col_huerfana(n))]
    if not todas:
        continue
    col = lambda t: (lambda s: sum((ord(ch) - 64) * 26 ** i
                                   for i, ch in enumerate(reversed(s))))(
        re.search(r'<c r="([A-Z]+)', t).group(1))
    todas.sort(key=col)
    salida.append('<row r="%d"%s>%s</row>' % (n, re.sub(r'^ r="\d+"', '', a), ''.join(todas)))

meta = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(salida) + '</sheetData>',
              meta, flags=re.S)
meta = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:H%d"/>' % FIN, meta)
meta = meta.replace('&quot;1EV,2EV,3EV,OR,EX&quot;', '&quot;1EV,2EV,3EV,OR,EX,OR+EX&quot;')
piezas['xl/worksheets/sheet3.xml'] = meta.encode('utf8')
print('CONFIG_METADATA: %d filas con clave, cuenta y aviso' % (FIN_F - 1))

# ---------- 2 · todas las fórmulas miran la columna, no la evaluación ----------
SEL = 'CONFIG_METADATA!$G$2:$G$%d' % FIN
cambios = [
    ('DATOS!$G$2:$G$%d=CONFIG_METADATA!$B$4' % FIN, '%s=1' % SEL),
    ('DATOS!$G$2:$G$%d,CONFIG_METADATA!$B$4' % FIN, '%s,1' % SEL),
]
total = 0
for n in (6, 7, 8, 9):
    clave = 'xl/worksheets/sheet%d.xml' % n
    t = piezas[clave].decode('utf8')
    for viejo, nuevo in cambios:
        c = t.count(esc(viejo)); total += c
        t = t.replace(esc(viejo), esc(nuevo))
    piezas[clave] = t.encode('utf8')
print('fórmulas que pasan a mirar la columna: %d' % total)

CC = 'xl/calcChain.xml'
if CC in piezas:
    del piezas[CC]; orden = [x for x in orden if x != CC]
    piezas['[Content_Types].xml'] = re.sub(r'<Override PartName="/xl/calcChain\.xml"[^>]*/>', '',
                                           piezas['[Content_Types].xml'].decode('utf8')).encode('utf8')
    piezas['xl/_rels/workbook.xml.rels'] = re.sub(r'<Relationship[^>]*calcChain\.xml"[^>]*/>', '',
                                                  piezas['xl/_rels/workbook.xml.rels'].decode('utf8')).encode('utf8')
    print('calcChain: fuera')

w = zipfile.ZipFile(RUTA, 'w', zipfile.ZIP_DEFLATED)
for n in orden: w.writestr(info[n], piezas[n])
w.close()
print('escrito')
