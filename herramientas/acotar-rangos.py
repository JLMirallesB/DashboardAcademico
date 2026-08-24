"""Los rangos llegan hasta donde hay datos, no hasta la fila 20.000.

    python3 herramientas/acotar-rangos.py public/data/ANALIZADOR_*.xlsx

Se pasa DESPUÉS de los generadores. El problema medido: profesional citaba
345.221 veces un rango `$2:$20000`, y cada una son ~20.000 lecturas de celda.
Con 1.939 filas de datos reales, diecinueve de cada veinte lecturas eran de
celdas vacías.

Se hace con NOMBRES DEFINIDOS, y eso es lo que lo vuelve barato de dos
maneras. La ingenua —escribir `DATOS!$I$2:INDEX(DATOS!$I:$I,fin)` en cada
sitio— añadiría treinta caracteres a cada una de las 345.221 referencias, o
sea unos diez megas de texto de fórmula. Un nombre ocupa MENOS que el rango
que sustituye (`nASIG` son cinco caracteres y `DATOS!$I$2:$I$20000` son
diecinueve), así que el fichero encoge. Y de paso las fórmulas se leen.

`INDEX` y no `OFFSET`: OFFSET es volátil y obliga a recalcular todo el libro
cada vez que se toca una celda cualquiera, que es justo lo contrario de lo
que se busca aquí.
"""
import zipfile, re, sys

FIN = 20000
# La celda que dice hasta dónde hay datos. Va en CONFIG_METADATA, que es donde
# están las demás cosas que el libro se calcula a sí mismo.
CELDA_FIN = 'CONFIG_METADATA!$B$8'
# LOOKUP(2,1/(rango<>"")…) da la ÚLTIMA fila con algo, no la CUENTA de filas
# con algo: con un hueco en medio —una fila que alguien borró— contar se queda
# corto y el libro dejaría fuera las últimas notas sin decirlo.
F_FIN = ('IFERROR(LOOKUP(2,1/(DATOS!$A$2:$A%d<>""),ROW(DATOS!$A$2:$A%d)),2)' % (FIN, FIN))

NOMBRES = [
    ('nNIA',    'DATOS', 'A'), ('nCURSO',  'DATOS', 'D'), ('nESPEC', 'DATOS', 'E'),
    ('nEVAL',   'DATOS', 'G'), ('nASIG',   'DATOS', 'I'), ('nNOTA',  'DATOS', 'K'),
    ('nAPTO',   'DATOS', 'L'),
    ('nCUENTA', 'CONFIG_METADATA', 'G'), ('nCLAVE', 'CONFIG_METADATA', 'F'),
    ('nEXSINOR', 'CONFIG_METADATA', 'H'),
    ('nCLASE_E', 'CONFIG_METADATA', 'E'), ('nCLASE_I', 'CONFIG_METADATA', 'I'),
]
esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

def acotar(ruta):
    z = zipfile.ZipFile(ruta)
    piezas = {n: z.read(n) for n in z.namelist()}
    orden = z.namelist(); info = {i.filename: i for i in z.infolist()}
    z.close()

    hojas = [n for n in piezas if re.match(r'xl/worksheets/sheet\d+\.xml$', n)]
    usados = set()
    for h in hojas:
        for m in re.finditer(r'(DATOS|CONFIG_METADATA)!\$([A-Z]+)\$2:\$[A-Z]+\$%d' % FIN,
                             piezas[h].decode('utf8')):
            usados.add((m.group(1), m.group(2)))

    defs, cambios = [], 0
    for nombre, hoja, col in NOMBRES:
        if (hoja, col) not in usados: continue
        defs.append('<definedName name="%s">%s!$%s$2:INDEX(%s!$%s:$%s,%s)</definedName>'
                    % (nombre, hoja, col, hoja, col, col, CELDA_FIN))
        viejo = '%s!$%s$2:$%s$%d' % (hoja, col, col, FIN)
        for h in hojas:
            t = piezas[h].decode('utf8')
            cambios += t.count(viejo)
            piezas[h] = t.replace(viejo, nombre).encode('utf8')
    if not defs:
        print('%s: ya estaba acotado' % ruta.split('/')[-1]); return

    # la celda que dice hasta dónde
    meta = piezas['xl/worksheets/sheet3.xml'].decode('utf8')
    if 'FilasConDatos' not in meta:
        fila8 = re.search(r'<row r="8"([^>]*)>(.*?)</row>', meta, re.S)
        extra = ('<c r="A8" t="inlineStr"><is><t>FilasConDatos</t></is></c>'
                 '<c r="B8"><f>%s</f></c>'
                 '<c r="C8" t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>'
                 % (esc(F_FIN),
                    esc('Última fila de DATOS con algo. Es hasta donde miran todas las '
                        'fórmulas: sin esto recorrerían las 20.000 filas siempre, y '
                        'diecinueve de cada veinte lecturas serían de celdas vacías.')))
        if fila8:
            resto = re.sub(r'<c r="[ABC]8"(?:[^>]*/>|[^>]*>.*?</c>)', '', fila8.group(2), flags=re.S)
            meta = meta.replace(fila8.group(0), '<row r="8"%s>%s%s</row>'
                                % (fila8.group(1), extra, resto))
        else:
            meta = meta.replace('</sheetData>', '<row r="8">%s</row></sheetData>' % extra)
        piezas['xl/worksheets/sheet3.xml'] = meta.encode('utf8')

    # y los nombres, que van entre <sheets> y <calcPr> y no en cualquier sitio
    wb = piezas['xl/workbook.xml'].decode('utf8')
    assert '<definedNames>' not in wb
    wb = wb.replace('<calcPr', '<definedNames>' + ''.join(defs) + '</definedNames><calcPr', 1)
    piezas['xl/workbook.xml'] = wb.encode('utf8')

    w = zipfile.ZipFile(ruta, 'w', zipfile.ZIP_DEFLATED)
    for n in orden: w.writestr(info[n], piezas[n])
    w.close()
    print('%s: %d nombres, %d referencias acotadas' % (ruta.split('/')[-1], len(defs), cambios))

for r in sys.argv[1:]: acotar(r)
