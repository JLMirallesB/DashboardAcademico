"""Las listas cerradas del catálogo y la fila en rojo de lo desactivado.

    python3 herramientas/listas-y-formato.py

Se pasa al final, con la portada.

Por qué listas y no texto libre: las columnas del catálogo son criterios, no
rótulos. Escribir «especialidad» en minúscula, o «SI» sin tilde, no da error
en ninguna parte —la asignatura simplemente deja de contar donde debía, o
empieza a contar donde no—. Una lista desplegable es la diferencia entre un
error imposible y un error invisible.

Y el rojo: una asignatura con Activa = No no sale por ningún sitio. Eso es
lo que se quiere, pero mirando la hoja no se distingue de una activa, así
que se marca.

Ojo con el ORDEN de los elementos dentro de `<worksheet>`: lo fija el
esquema —`conditionalFormatting` antes que `dataValidations`, y las dos antes
que `printOptions` y `pageMargins`—. Ponerlo donde venga bien es lo que hizo
que los dos libros abrieran dañados la primera vez.
"""
import zipfile, re, sys

LISTAS = {
    'D': ['Referencia', 'NoEspecialidad', 'Especialidad', 'Optativas'],
    'F': ['Sí', 'No'],
    'G': ['Sí', 'No'],
    'H': ['Sí', 'No'],
    'I': ['Obligatoria', 'Optativa', 'De centro'],
}
AYUDA = {
    'D': ('Grupo1', 'Decide en qué total cuenta la asignatura. «Especialidad» es un '
                    'instrumento.'),
    'F': ('¿Es especialidad?', 'Tiene que decir lo mismo que Grupo1.'),
    'G': ('Activa', 'Con «No» la asignatura no sale por ningún sitio, y sus registros los '
                    'cuenta el aviso «FueraDeLasCifras».'),
    'H': ('¿Se cursa una sola vez?', '«Sí» solo si NO se vuelve a cursar al coger un '
                                     'segundo instrumento.'),
    'I': ('Tipo', 'Obligatoria la pone el currículo; De centro es de diseño propio.'),
}
# El rojo suave de las filas desactivadas. `dxf` es el formato que usa el
# formato condicional, y va en su propia tabla de styles.xml.
DXF = ('<dxf><font><color rgb="FF9CA3AF"/></font>'
       '<fill><patternFill><bgColor rgb="FFFDF2F2"/></patternFill></fill></dxf>')

ORDEN = ['sheetPr', 'dimension', 'sheetViews', 'sheetFormatPr', 'cols', 'sheetData',
         'sheetCalcPr', 'sheetProtection', 'protectedRanges', 'scenarios', 'autoFilter',
         'sortState', 'dataConsolidate', 'customSheetViews', 'mergeCells', 'phoneticPr',
         'conditionalFormatting', 'dataValidations', 'hyperlinks', 'printOptions',
         'pageMargins', 'pageSetup']

def insertar(xml, etiqueta, trozo):
    """Mete `trozo` donde el esquema dice que va, no donde venga bien."""
    i = ORDEN.index(etiqueta)
    for siguiente in ORDEN[i + 1:]:
        m = re.search(r'<%s[ />]' % siguiente, xml)
        if m: return xml[:m.start()] + trozo + xml[m.start():]
    return xml.replace('</worksheet>', trozo + '</worksheet>')

def preparar(ruta):
    z = zipfile.ZipFile(ruta)
    piezas = {n: z.read(n) for n in z.namelist()}
    orden = z.namelist(); info = {i.filename: i for i in z.infolist()}
    z.close()

    st = piezas['xl/styles.xml'].decode('utf8')
    if '<dxfs count="0"/>' in st:
        st = st.replace('<dxfs count="0"/>', '<dxfs count="1">%s</dxfs>' % DXF)
    elif '<dxfs' not in st:
        st = st.replace('</styleSheet>', '<dxfs count="1">%s</dxfs></styleSheet>' % DXF)
    piezas['xl/styles.xml'] = st.encode('utf8')

    cfg = piezas['xl/worksheets/sheet2.xml'].decode('utf8')
    fin = max(int(x) for x in re.findall(r'<row r="(\d+)"', cfg))

    if '<dataValidations' not in cfg:
        vs = []
        for col, valores in LISTAS.items():
            titulo, texto = AYUDA[col]
            vs.append('<dataValidation type="list" allowBlank="1" showInputMessage="1"'
                      ' showErrorMessage="1" errorTitle="Valor no válido"'
                      ' error="Elige uno de la lista: %s." promptTitle="%s" prompt="%s"'
                      ' sqref="%s2:%s%d"><formula1>&quot;%s&quot;</formula1></dataValidation>'
                      % (', '.join(valores), titulo, texto, col, col, fin, ','.join(valores)))
        cfg = insertar(cfg, 'dataValidations',
                       '<dataValidations count="%d">%s</dataValidations>' % (len(vs), ''.join(vs)))

    if '<conditionalFormatting' not in cfg:
        # `$B2<>""` para no pintar de rojo las filas del margen, que están
        # vacías a propósito y no son un descuido.
        cfg = insertar(cfg, 'conditionalFormatting',
                       '<conditionalFormatting sqref="A2:J%d">'
                       '<cfRule type="expression" dxfId="0" priority="1">'
                       '<formula>AND($B2&lt;&gt;"",$G2&lt;&gt;"Sí")</formula>'
                       '</cfRule></conditionalFormatting>' % fin)
    piezas['xl/worksheets/sheet2.xml'] = cfg.encode('utf8')

    # El curso académico: dos cifras, barra, dos cifras. Es lo que viaja al CSV
    # y de ahí a los informes, y un «2025-26» suelto se arrastra hasta el final.
    meta = piezas['xl/worksheets/sheet3.xml'].decode('utf8')
    if 'CursoNoValido' not in meta:
        v = ('<dataValidation type="custom" allowBlank="0" showInputMessage="1"'
             ' showErrorMessage="1" errorTitle="CursoNoValido"'
             ' error="Escríbelo como 25/26: dos cifras, barra, dos cifras."'
             ' promptTitle="Curso académico" prompt="Formato 25/26." sqref="B3">'
             '<formula1>AND(LEN(B3)=5,MID(B3,3,1)="/",ISNUMBER(VALUE(LEFT(B3,2))),'
             'ISNUMBER(VALUE(RIGHT(B3,2))))</formula1></dataValidation>')
        m = re.search(r'<dataValidations count="(\d+)">', meta)
        if m:
            meta = (meta[:m.end()] + v + meta[m.end():]).replace(
                '<dataValidations count="%s">' % m.group(1),
                '<dataValidations count="%d">' % (int(m.group(1)) + 1), 1)
        else:
            meta = insertar(meta, 'dataValidations',
                            '<dataValidations count="1">%s</dataValidations>' % v)
        piezas['xl/worksheets/sheet3.xml'] = meta.encode('utf8')

    w = zipfile.ZipFile(ruta, 'w', zipfile.ZIP_DEFLATED)
    for n in orden: w.writestr(info[n], piezas[n])
    w.close()
    print('%s: listas cerradas, fila en rojo si está desactivada, curso validado'
          % ruta.split('/')[-1])

for r in sys.argv[1:]: preparar(r)
