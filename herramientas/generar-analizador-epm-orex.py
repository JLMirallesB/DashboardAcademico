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
COL = 'DATOS!$A$2:$A$%d' % FIN
CLAVE = ('%s&"|"&DATOS!$D$2:$D$%d&"|"&DATOS!$E$2:$E$%d&"|"&DATOS!$I$2:$I$%d'
         % (COL, FIN, FIN, FIN))
G = 'DATOS!$G$2:$G$%d' % FIN
CLAVES = 'CONFIG_METADATA!$F$2:$F$%d' % FIN

f_clave = 'IF(%s="","",%s)' % (COL, CLAVE)
# 1 si la fila cuenta para la evaluación elegida
f_sel = ('IF(%s="",0,'
         'IF(CONFIG_METADATA!$B$4<>"OR+EX",--(%s=CONFIG_METADATA!$B$4),'
         'IF(%s="EX",1,'
         'IF(%s="OR",--ISNA(MATCH(%s,_xlfn._xlws.FILTER(%s,%s="EX","(ninguna)"),0)),0))))'
         % (COL, G, G, G, CLAVES, CLAVES, G))
# filas de EX que no tienen su OR: no se recupera lo que no se suspendió
f_huerfanas = ('SUMPRODUCT((%s="EX")*--ISNA(MATCH(%s,'
               '_xlfn._xlws.FILTER(%s,%s="OR","(ninguna)"),0)))' % (G, CLAVES, CLAVES, G))

meta = hoja(3)
filas = {int(re.search(r'r="(\d+)"', a).group(1)): (a, c)
         for a, c in re.findall(r'<row([^>]*)>(.*?)</row>', meta, re.S)}
est = (re.search(r'<c r="A2"[^>]*s="(\d+)"', filas[2][1]) or [None, ''])[1]

nuevas = {
    1: txt('D1', est, 'Evaluaciones') + txt('F1', est, 'Clave de matrícula')
       + txt('G1', est, 'Cuenta'),
    2: txt('D2', est, '1EV') + fx('F2', est, f_clave) + fx('G2', est, f_sel),
    3: txt('D3', est, '2EV'),
    4: txt('D4', est, '3EV'),
    5: txt('D5', est, 'OR'),
    6: txt('D6', est, 'EX') + txt('A6', est, 'ExtraordinariaSinOrdinaria')
       + fx('B6', est, f_huerfanas)
       + txt('C6', est, 'Filas de extraordinaria que no tienen su fila de ordinaria. '
                        'No se recupera lo que no se suspendió: si no es cero, falta '
                        'por pegar la ordinaria o sobra algo en la extraordinaria.'),
    7: txt('D7', est, 'OR+EX') + txt('A7', est, 'ComoSeLee')
       + txt('C7', est, 'Con OR+EX manda la ordinaria y cada fila de extraordinaria pisa '
                        'la suya. Es la única opción que da la foto definitiva del curso: '
                        'EX a solas enseña solo lo que se suspendió en junio.'),
}
salida = []
for n in sorted(set(filas) | set(nuevas)):
    a, c = filas.get(n, ('', ''))
    trozos = re.findall(r'<c r="[A-Z]+\d+"(?:[^>]*/>|[^>]*>.*?</c>)', c, re.S)
    # las celdas nuevas mandan sobre las de esa referencia
    refs_nuevas = set(re.findall(r'<c r="([A-Z]+)\d+"', nuevas.get(n, '')))
    trozos = [t for t in trozos if re.search(r'<c r="([A-Z]+)', t).group(1) not in refs_nuevas]
    todas = trozos + re.findall(r'<c r="[A-Z]+\d+"(?:[^>]*/>|[^>]*>.*?</c>)', nuevas.get(n, ''), re.S)
    col = lambda t: (lambda s: sum((ord(ch) - 64) * 26 ** i
                                   for i, ch in enumerate(reversed(s))))(
        re.search(r'<c r="([A-Z]+)', t).group(1))
    todas.sort(key=col)
    salida.append('<row r="%d"%s>%s</row>' % (n, re.sub(r'^ r="\d+"', '', a), ''.join(todas)))

meta = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(salida) + '</sheetData>',
              meta, flags=re.S)
meta = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:G%d"/>' % FIN, meta)
meta = meta.replace('&quot;1EV,2EV,3EV,OR,EX&quot;', '&quot;1EV,2EV,3EV,OR,EX,OR+EX&quot;')
piezas['xl/worksheets/sheet3.xml'] = meta.encode('utf8')
print('CONFIG_METADATA: columna selectora, lista visible, aviso de EX sin OR')

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
