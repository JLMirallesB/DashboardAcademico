"""La portada de los dos analizadores: lo que dicen y cómo se ven.

    python3 herramientas/portada.py

Se pasa DESPUÉS de los generadores y de acotar-rangos.

Por qué se rehace entera y no se retoca: la que había contradecía al propio
libro. Decía «incluye solo una única evaluación», y con OR+EX hay que pegar
DOS —la ordinaria y debajo la extraordinaria—; decía que el selector ofrece
«FINAL» cuando el código es «FI»; decía que la capacidad son 1.000 alumnos
cuando son 20.000 filas; y decía que para añadir una asignatura hacen falta
conocimientos de Excel o escribir al desarrollador, que era verdad cuando el
criterio era un rango de filas y ya no lo es. Una instrucción que miente es
peor que ninguna: la primera se sigue.

Y no nombra ninguna herramienta de gestión concreta. Este libro lo puede usar
cualquier conservatorio, y el que lo abra no tiene por qué usar las mismas
que nosotros: lo que importa es la FORMA de los datos, no de dónde salgan.
"""
import zipfile, re

ESTILOS_NUEVOS = {
    # fuentes que se añaden al final de las que ya hay
    'fonts': [
        '<font><sz val="30"/><color rgb="FF111827"/><name val="Calibri Light"/><family val="2"/></font>',
        '<font><sz val="13"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>',
        '<font><b/><sz val="12"/><color rgb="FF1D4ED8"/><name val="Calibri"/><family val="2"/></font>',
        '<font><sz val="11"/><color rgb="FF374151"/><name val="Calibri"/><family val="2"/></font>',
        '<font><b/><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>',
        '<font><sz val="9"/><color rgb="FF9CA3AF"/><name val="Calibri"/><family val="2"/></font>',
        '<font><b/><sz val="11"/><color rgb="FF1D4ED8"/><name val="Consolas"/><family val="3"/></font>',
        '<font><b/><sz val="12"/><color rgb="FF92400E"/><name val="Calibri"/><family val="2"/></font>',
        '<font><sz val="11"/><color rgb="FF92400E"/><name val="Calibri"/><family val="2"/></font>',
    ],
    'fills': [
        '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>',
        '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>',
        '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF7E7"/><bgColor indexed="64"/></patternFill></fill>',
    ],
    'borders': [
        '<border><left/><right/><top/><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border>',
        '<border><left/><right/><top/><bottom style="medium"><color rgb="FF1D4ED8"/></bottom><diagonal/></border>',
    ],
}

def ampliar_estilos(t):
    """Añade fuentes, rellenos y bordes al final, y devuelve los índices."""
    if 'FF1D4ED8' in t:                      # ya estaba
        base = {}
        base['f0'] = len(re.findall(r'<font>', t)) - len(ESTILOS_NUEVOS['fonts'])
        base['r0'] = len(re.findall(r'<fill>', t)) - len(ESTILOS_NUEVOS['fills'])
        base['b0'] = len(re.findall(r'<border>', t)) - len(ESTILOS_NUEVOS['borders'])
        base['x0'] = len(re.findall(r'<xf ', re.search(r'<cellXfs.*?</cellXfs>', t, re.S).group(0))) - 12
        return t, base
    base = {'f0': len(re.findall(r'<font>', t)), 'r0': len(re.findall(r'<fill>', t)),
            'b0': len(re.findall(r'<border>', t))}
    for et in ('fonts', 'fills', 'borders'):
        # El count se sustituye con una expresión, no comparando la etiqueta
        # entera: `<fonts count="23" x14ac:knownFonts="1">` lleva atributos
        # detrás, y con una comparación literal el contador se quedaba sin
        # tocar mientras las fuentes SÍ se añadían. Excel lo aguanta, pero el
        # fichero queda diciendo una cosa y teniendo otra.
        t = re.sub(r'(<%s count=")(\d+)(")' % et,
                   lambda m, _e=et: m.group(1) + str(int(m.group(2)) + len(ESTILOS_NUEVOS[_e]))
                                    + m.group(3), t, count=1)
        t = t.replace('</%s>' % et, ''.join(ESTILOS_NUEVOS[et]) + '</%s>' % et, 1)

    F, R, B = base['f0'], base['r0'], base['b0']
    #                       fuente        relleno   borde
    NUEVOS = [
        (F + 0, None, None, 'left'),    # 0 título
        (F + 1, None, None, 'left'),    # 1 subtítulo
        (F + 2, None, B + 1, 'left'),   # 2 sección, con raya azul debajo
        (F + 3, None, None, 'left'),    # 3 cuerpo
        (F + 4, None, None, 'left'),    # 4 cuerpo fuerte
        (F + 5, None, None, 'left'),    # 5 pie
        (F + 6, R + 1, None, 'left'),   # 6 referencia de celda, en azul suave
        (F + 7, R + 2, None, 'left'),   # 7 aviso, título
        (F + 8, R + 2, None, 'left'),   # 8 aviso, cuerpo
        (F + 3, R + 0, None, 'left'),   # 9 cuerpo sobre tarjeta
        (F + 4, None, B + 0, 'left'),   # 10 fila con raya fina
        (F + 3, None, None, 'right'),   # 11 cuerpo a la derecha
    ]
    xfs = []
    for fid, rid, bid, al in NUEVOS:
        xfs.append('<xf numFmtId="0" fontId="%d" fillId="%d" borderId="%d" xfId="2"'
                   ' applyFont="1"%s%s applyAlignment="1"><alignment horizontal="%s"'
                   ' vertical="center" wrapText="1"/></xf>'
                   % (fid, rid or 0, bid or 0, ' applyFill="1"' if rid else '',
                      ' applyBorder="1"' if bid else '', al))
    base['x0'] = int(re.search(r'<cellXfs count="(\d+)"', t).group(1))
    t = re.sub(r'(<cellXfs count=")(\d+)(")',
               lambda m: m.group(1) + str(int(m.group(2)) + len(xfs)) + m.group(3), t, count=1)
    t = t.replace('</cellXfs>', ''.join(xfs) + '</cellXfs>', 1)
    return t, base


# ── El texto ────────────────────────────────────────────────────────────────
# T = título · S = subtítulo · H = sección · b = cuerpo · B = cuerpo fuerte
# c = referencia de celda · W = aviso título · w = aviso cuerpo · p = pie
# _ = línea en blanco · L = enlace (lleva su rId)

def contenido(etapa):
    eem = etapa == 'EEM'
    hoja = 'CALC_EEM' if eem else 'CALC_EPM'
    codigos = ('1EV · 2EV · 3EV · FI' if eem else '1EV · 2EV · 3EV · OR · EX · OR+EX')
    filas = [
        ('T', 'Analizador de calificaciones'),
        ('S', 'Enseñanzas %s de Música · Conservatorios'
              % ('Elementales' if eem else 'Profesionales')),
        ('_', ''),
        ('H', 'EMPEZAR'),
        ('B', '1 · Pega las calificaciones en la hoja DATOS'),
        ('b', 'Una fila por alumno, asignatura y evaluación. Las columnas ya están puestas: '
              'respeta su orden y sus nombres.'),
        ('_', ''),
        ('B', '2 · Elige la evaluación'),
        ('c', 'CONFIG_METADATA!B4'),
        ('b', 'Códigos: ' + codigos),
    ]
    if not eem:
        filas += [
            ('b', 'OR+EX es la foto definitiva del curso: la ordinaria como base, y cada '
                  'recuperación de la extraordinaria sustituyendo a la suya.'),
            ('b', 'Para usarla, pega la ordinaria y AÑADE DEBAJO las filas de la '
                  'extraordinaria. No las sustituyas: hacen falta las dos.'),
            ('b', 'EX a solas enseña solo lo que se suspendió en junio, así que su media '
                  'no es la del centro.'),
        ]
    filas += [
        ('_', ''),
        ('B', '3 · Mira los avisos antes de fiarte de las cifras'),
        ('b', 'Están en CONFIG_METADATA, debajo de la configuración. Cada uno dice qué '
              'significa que no sea cero.'),
        ('_', ''),
        ('B', '4 · Exporta'),
        ('b', 'Copia la hoja EXPORTADOR entera y guárdala como CSV. Ese CSV es lo que lee '
              'la aplicación de visualización.'),
        ('_', ''),
        ('H', 'AÑADIR UNA ASIGNATURA'),
        ('b', 'Escríbela en la primera fila libre de CONFIG_ASIGNATURAS: está marcada con '
              'una flecha, y al lado tienes las instrucciones.'),
        ('B', 'No hay que insertar filas ni ordenar nada.'),
        ('b', 'Las fórmulas no miran posiciones, miran columnas.'),
        ('_', ''),
        ('B', 'El nombre tiene que coincidir letra por letra con el que traen tus datos.'),
        ('b', 'Si no coincide, esa asignatura no aparece: ni siquiera con un cero. Los '
              'registros que se queden fuera los cuenta el aviso «FueraDeLasCifras».'),
        ('_', ''),
        ('H', 'QUÉ HAY EN CADA HOJA'),
        ('B', 'CONFIG_ASIGNATURAS'),
        ('b', 'La lista maestra. Manda ella: de aquí salen los nombres, los cursos y qué '
              'cuenta como especialidad.'),
        ('B', 'CONFIG_METADATA'),
        ('b', 'Centro, curso académico, selector de evaluación y los avisos.'),
        ('B', 'CONFIG_CORRELACIONES'),
        ('b', 'Los pares de asignaturas que se comparan entre sí.'),
        ('B', 'DATOS'),
        ('b', 'Donde se pegan las calificaciones. Es la única hoja que se toca a mano.'),
        ('B', hoja),
        ('b', 'Los cálculos: recuento, media, desviación, moda, aprobados y reparto de notas.'),
        ('B', 'DAT_CORRELACION  ·  CALC_CORRELACIONES'),
        ('b', 'El cruce entre asignaturas y su resultado.'),
        ('B', 'EXPORTADOR'),
        ('b', 'La salida en CSV, con sus secciones #METADATA, #ESTADISTICAS, '
              '#CORRELACIONES y #AGRUPACIONES.'),
        ('_', ''),
        ('W', 'ANTES DE FIARTE'),
        ('w', 'El plan de estudios sigue la normativa de la Comunitat Valenciana. Otra '
              'comunidad puede necesitar ajustes en CONFIG_ASIGNATURAS.'),
        ('w', 'Comprueba que las asignaturas activas son las de tu centro. Lo que no esté '
              'activo no sale por ningún sitio.'),
        ('w', 'Caben hasta 20.000 filas de calificaciones. Los cálculos llegan hasta la '
              'última fila con datos, no más allá.'),
        ('w', 'El libro se recalcula solo al abrirse. Si lo cierras sin guardar, no pasa '
              'nada: las cifras se rehacen.'),
        ('_', ''),
        ('H', 'ENLACES'),
        ('L1', 'Aplicación para visualizar los datos exportados'),
        ('L2', 'Repositorio del proyecto'),
        ('L3', 'Avisar de un fallo'),
        ('L4', '¿Te ha resultado útil? Invita a un café al desarrollador'),
        ('_', ''),
        ('p', 'José Luis Miralles Bono · www.jlmirall.es · joseluismirallesbono@gmail.com'),
        ('p', 'Desarrollado con Claude (Anthropic)'),
    ]
    return filas


def rehacer(ruta, etapa, version):
    z = zipfile.ZipFile(ruta)
    piezas = {n: z.read(n) for n in z.namelist()}
    orden = z.namelist(); info = {i.filename: i for i in z.infolist()}
    z.close()

    piezas['xl/styles.xml'], base = ampliar_estilos(piezas['xl/styles.xml'].decode('utf8'))
    piezas['xl/styles.xml'] = piezas['xl/styles.xml'].encode('utf8')
    X = base['x0']
    EST = {'T': X + 0, 'S': X + 1, 'H': X + 2, 'b': X + 3, 'B': X + 4, 'p': X + 5,
           'c': X + 6, 'W': X + 7, 'w': X + 8, '_': X + 3,
           'L1': X + 3, 'L2': X + 3, 'L3': X + 3, 'L4': X + 3}
    esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

    filas, enlaces, r = [], [], 2
    for clase, texto in contenido(etapa) + [('_', ''), ('p', version)]:
        if clase != '_':
            filas.append('<row r="%d" ht="%d" customHeight="1"><c r="B%d" s="%d" t="inlineStr">'
                         '<is><t xml:space="preserve">%s</t></is></c></row>'
                         % (r, 34 if clase == 'T' else 20 if clase in 'HSW' else 16,
                            r, EST[clase], esc(texto)))
            if clase.startswith('L'):
                enlaces.append('<hyperlink ref="B%d" r:id="rId%s"/>' % (r, clase[1]))
        r += 1

    t = piezas['xl/worksheets/sheet1.xml'].decode('utf8')
    t = re.sub(r'<sheetData>.*?</sheetData>', '<sheetData>' + ''.join(filas) + '</sheetData>',
               t, flags=re.S)
    t = re.sub(r'<dimension ref="[^"]*"/>', '<dimension ref="A1:C%d"/>' % (r - 1), t)
    # una columna ancha y aire a los lados; sin cuadrícula, que es la mitad del aspecto
    t = re.sub(r'<cols>.*?</cols>',
               '<cols><col min="1" max="1" width="4" customWidth="1"/>'
               '<col min="2" max="2" width="104" customWidth="1"/>'
               '<col min="3" max="3" width="4" customWidth="1"/></cols>', t, flags=re.S)
    # Sin cuadrícula: es la mitad del aspecto de una portada.
    t = re.sub(r'<sheetView\b([^>]*)>',
               lambda m: '<sheetView showGridLines="0"%s>'
                         % re.sub(r'\s*showGridLines="\d+"', '', m.group(1)), t, count=1)
    t = re.sub(r'<mergeCells.*?</mergeCells>', '', t, flags=re.S)
    t = re.sub(r'<hyperlinks>.*?</hyperlinks>',
               '<hyperlinks>' + ''.join(enlaces) + '</hyperlinks>', t, flags=re.S)
    piezas['xl/worksheets/sheet1.xml'] = t.encode('utf8')

    # El aviso del selector de evaluación: es lo único que el usuario lee
    # cuando se equivoca, y nombraba una herramienta de gestión concreta. Este
    # libro lo puede abrir cualquier conservatorio.
    meta = piezas['xl/worksheets/sheet3.xml'].decode('utf8')
    lista = re.search(r'<formula1>&quot;(.*?)&quot;</formula1>', meta).group(1)
    meta = re.sub(r'error="[^"]*"',
                  'error="Usa uno de estos códigos, tal como vienen en la columna '
                  'Evaluación de DATOS: %s."' % lista, meta, count=1)
    meta = re.sub(r'prompt="[^"]*"',
                  'prompt="El código tiene que coincidir EXACTAMENTE con lo que pone la '
                  'columna Evaluación de la hoja DATOS."', meta, count=1)
    piezas['xl/worksheets/sheet3.xml'] = meta.encode('utf8')

    w = zipfile.ZipFile(ruta, 'w', zipfile.ZIP_DEFLATED)
    for n in orden: w.writestr(info[n], piezas[n])
    w.close()
    print('%s: portada de %d filas' % (ruta.split('/')[-1], r - 2))


VERSION = 'Versión 2.0 · agosto 2026'
rehacer('public/data/ANALIZADOR_ELEMENTAL_V2.xlsx', 'EEM', VERSION)
rehacer('public/data/ANALIZADOR_PROFESIONAL_v2.xlsx', 'EPM', VERSION)
