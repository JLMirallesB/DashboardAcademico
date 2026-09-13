"""El conversor: de la exportación de calificaciones a la hoja DATOS de los analizadores.

    python3 herramientas/generar-conversor.py [destino.xlsx] [--datos filas.json]

Se pasa DESPUÉS de generar los analizadores: el catálogo de asignaturas lo
lee de ellos, no lo lleva escrito. Si mañana se añade una asignatura a un
analizador y se vuelve a generar el conversor, entra sola.

Por qué un libro de fórmulas y no un script que convierta: quien lo usa es un
equipo directivo con un Excel en la mano, no alguien con Python. Pega, mira
la hoja de control, copia. Y el fichero de calificaciones no sale del
ordenador del centro.

---------------------------------------------------------------------------
LAS DECISIONES, Y DE DÓNDE SALEN

Se midieron sobre una exportación real de fin de curso (5.011 filas), sin
abrirla: solo recuentos agregados de la sala vis a vis.

  · **Las columnas se buscan por su cabecera**, no por su posición. Si el
    año que viene la exportación trae una columna más en medio, el libro
    sigue funcionando; si falta una, la hoja CONTROL dice cuál.
  · **La etapa sale del curso** (`…EEM` / `…EPM`). La columna de enseñanza
    trae el mismo código en las dos, así que no distingue nada.
  · **El curso es el de la asignatura** (`curso_cont`), también en las
    pendientes: la Armonía de 4.º que cursa uno de 5.º cuenta con la Armonía
    de 4.º. Con el curso de matrícula sumaría en el centro y no aparecería
    en ninguna fila de asignatura, porque en 5.º no se imparte.
  · **Se descartan las filas sin nota.** La exportación trae cada fila de
    profesional dos veces —ordinaria y extraordinaria— y la extraordinaria
    de quien aprobó en junio viene vacía. Con OR+EX el analizador deja que
    la extraordinaria sustituya a la ordinaria: una vacía la borraría, y
    como la media del analizador divide entre filas, contaría como un cero.
  · **Un 1 es una nota.** No hay «no presentado» en la exportación: el 1 es
    lo que se pone, y baja la media, que es lo que tiene que hacer.
  · **El NIA se sustituye por un número correlativo.** Los analizadores lo
    necesitan para cruzar ordinaria con extraordinaria y para las
    correlaciones, pero les da igual cuál sea. Así la hoja DATOS no lleva
    ningún identificador real. Nombre, apellidos y sexo no pasan.
  · **La especialidad se deduce**: la exportación no la trae como columna.
    Es la asignatura del alumno que el catálogo marca como especialidad.
    Quien tiene dos conserva las dos filas de las comunes, y eso es lo que
    cuenta el aviso DobleEspecialidad del analizador.
  · **El nombre de asignatura es el del catálogo.** La exportación lo trae en
    mayúsculas; Excel compararía igual, pero el CSV saldría con el nombre
    del catálogo de todas formas y así no hay dos grafías en el libro.

Y la regla de la casa: **no se nombra ninguna herramienta de gestión**. Lo
que importa es la forma de los datos, y esa forma está en las cabeceras.

---------------------------------------------------------------------------
LO QUE HAY QUE SABER DEL XML (lo mismo que en los analizadores)

  · Toda fórmula que opera con matrices se declara: `cm="1"` en la celda y
    `<f t="array" ref="…">`. Sin eso Excel no la derrama y no da error.
  · Las funciones modernas llevan su nombre de fichero: `_xlfn.LET`,
    `_xlfn.XLOOKUP`, `_xlfn._xlws.FILTER`… y las variables de LET, `_xlpm.`.
    Aquí se escriben sin prefijo y `al_fichero` los pone, para que las
    fórmulas se puedan leer.
  · No se usa HSTACK: las columnas se juntan con CHOOSE({1,2,…}), que
    funciona desde Excel 2021 como el resto del libro.
"""
import json, os, re, sys, zipfile
from xml.sax.saxutils import escape

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = RAIZ + '/public/data/CONVERSOR_EXCEL_A_DASHBOARD.xlsx'
ANALIZADORES = [('EEM', RAIZ + '/public/data/ANALIZADOR_ELEMENTAL_V2.xlsx'),
                ('EPM', RAIZ + '/public/data/ANALIZADOR_PROFESIONAL_v2.xlsx')]

# Las columnas de la exportación que se usan. Las demás se ignoran, y entre
# ellas las personales: ninguna fórmula del libro las nombra.
CABECERAS_ENTRADA = [
    'anoacademico_id', 'codcentro', 'denominacionespecifica', 'codensenanza',
    'curso_mat', 'curso_cont', 'nombre', 'apellido1', 'apellido2', 'nia', 'sexo',
    'ev_codigo', 'ev_abrv', 'ev_desc', 'ev_orden', 'ev_obligatoria',
    'ev_para_fct_proyecto', 'co_codigo', 'co_desc', 'co_estutoria', 'co_esproyecto',
    'co_caracter', 'co_tipobasico', 'co_singularidad', 'nota', 'aprueba', 'promociona']
NECESARIAS = ['nia', 'curso_mat', 'curso_cont', 'ev_codigo', 'co_codigo', 'co_desc',
              'co_tipobasico', 'nota', 'aprueba']

# La hoja DATOS de los analizadores, letra por letra. Si cambia allí, la
# prueba lo detecta: no se copia a mano en ningún otro sitio.
CABECERAS_DATOS = ['NIA', 'Apellidos', 'Nombre', 'Curso', 'Especialidad', 'Repite',
                   'Evaluación', 'Código Asig', 'Contenido', 'Nota', 'Nota Numérica',
                   'Apto', 'Profesor', 'Observ.']

FILAS_ENTRADA = 30000     # techo de lo que se puede pegar; los analizadores admiten 20.000
FILAS_CATALOGO = 200
ANCHO = 'AZ'              # hasta dónde se buscan cabeceras

# ── Leer el catálogo de los analizadores ───────────────────────────────────

def celdas_de(z, hoja):
    wb = z.read('xl/workbook.xml').decode()
    rid = re.search(r'<sheet [^>]*name="%s"[^>]*r:id="([^"]+)"' % hoja, wb).group(1)
    rels = z.read('xl/_rels/workbook.xml.rels').decode()
    destino = re.search(r'Id="%s"[^>]*Target="([^"]+)"' % rid, rels).group(1)
    xml = z.read('xl/' + destino.lstrip('/').replace('xl/', '')).decode()
    try:
        compartidas = [re.sub(r'<[^>]+>', '', s) for s in
                       re.findall(r'<si>(.*?)</si>', z.read('xl/sharedStrings.xml').decode(), re.S)]
    except KeyError:
        compartidas = []
    filas = {}
    for r, cuerpo in re.findall(r'<row [^>]*r="(\d+)"[^>]*>(.*?)</row>', xml, re.S):
        fila = {}
        for c in re.findall(r'<c [^>]*?(?:/>|>.*?</c>)', cuerpo, re.S):
            col = re.search(r'r="([A-Z]+)', c).group(1)
            t = re.search(r't="(\w+)"', c)
            v = re.search(r'<v>(.*?)</v>', c)
            en_linea = re.search(r'<t[^>]*>(.*?)</t>', c, re.S)
            if t and t.group(1) == 's' and v:
                fila[col] = compartidas[int(v.group(1))]
            elif en_linea:
                fila[col] = en_linea.group(1)
            elif v:
                fila[col] = v.group(1)
        filas[int(r)] = fila
    return filas

def catalogo():
    """[(asignatura, etapa, esEspecialidad)] de los dos analizadores."""
    lista = []
    for etapa, ruta in ANALIZADORES:
        z = zipfile.ZipFile(ruta)
        for n, fila in sorted(celdas_de(z, 'CONFIG_ASIGNATURAS').items()):
            nombre = (fila.get('B') or '').strip()
            if n == 1 or not nombre or nombre.startswith('↓'):
                continue
            lista.append((nombre, etapa, fila.get('F', 'No')))
    return lista

# ── Las fórmulas ────────────────────────────────────────────────────────────

MODERNAS = {'LET': '_xlfn.LET', 'XLOOKUP': '_xlfn.XLOOKUP', 'XMATCH': '_xlfn.XMATCH',
            'UNIQUE': '_xlfn.UNIQUE', 'FILTER': '_xlfn._xlws.FILTER',
            'SORT': '_xlfn._xlws.SORT', 'SEQUENCE': '_xlfn.SEQUENCE',
            # De Excel 2013: también lleva prefijo. Sin él, `#¿NOMBRE?` en
            # toda la columna Contenido, y ningún aviso al abrir.
            'IFNA': '_xlfn.IFNA',
            'TEXTJOIN': '_xlfn.TEXTJOIN', 'NUMBERVALUE': '_xlfn.NUMBERVALUE'}

def al_fichero(formula):
    """Pone los prefijos con que Excel guarda lo que no existía en 2007.

    Las variables de LET se escriben `vAlgo` —letra v y mayúscula— para
    poder encontrarlas sin confundirlas con nada: dentro de una fórmula de
    este libro no hay otra palabra con esa forma."""
    for f, pref in MODERNAS.items():
        formula = re.sub(r'(?<![\w.])%s\(' % f, pref + '(', formula)
    return re.sub(r'(?<![\w.])(v[A-Z]\w*)', r'_xlpm.\1', formula)

CAB = 'ENTRADA!$A$1:$%s$1' % ANCHO

def columna(nombre):
    return 'INDEX(eBLOQUE,0,XMATCH("%s",%s))' % (nombre, CAB)

NOMBRES = {
    # La última fila con NIA. Un rango fijo una sola vez, aquí; todo lo demás
    # llega solo hasta donde hay datos, como en los analizadores.
    'eULTIMA': 'CONTROL!$B$4',
    'eBLOQUE': 'ENTRADA!$A$2:INDEX(ENTRADA!$%s:$%s,MAX(2,CONTROL!$B$4))' % (ANCHO, ANCHO),
    'eNIA': columna('nia'),
    'eCURSO': columna('curso_cont'),
    'eCURSOMAT': columna('curso_mat'),
    'eEVAL': columna('ev_codigo'),
    'eCODIGO': columna('co_codigo'),
    'eASIG': columna('co_desc'),
    'eTIPO': columna('co_tipobasico'),
    'eNOTA': columna('nota'),
    'eAPRUEBA': columna('aprueba'),
    'cASIG': 'CATALOGO!$A$2:$A$%d' % (FILAS_CATALOGO + 1),
    'cETAPA': 'CATALOGO!$B$2:$B$%d' % (FILAS_CATALOGO + 1),
    'cESP': 'CATALOGO!$C$2:$C$%d' % (FILAS_CATALOGO + 1),
}

# Lo que comparten la salida y el control: cada fila, ya interpretada.
COMUN = ('vEt,RIGHT(eCURSO,3),'
         'vAsig,TRIM(eASIG),'
         # IFNA y no el cuarto argumento de XLOOKUP. Con una matriz de
         # búsqueda, «si no se encuentra» NO va elemento a elemento: devuelve
         # el primer valor de la matriz entera. Una asignatura que no estaba
         # en el catálogo salía con el nombre de la primera fila del fichero
         # —las notas de Bandurria, apuntadas a Lenguaje Musical— y sin error.
         # Lo cazó `probar-conversor.py` con Excel; mirando el XML no se ve.
         'vCanon,IFNA(XLOOKUP(vAsig&"|"&vEt,cASIG&"|"&cETAPA,cASIG),vAsig),'
         'vEsEsp,ISNUMBER(XMATCH(vAsig&"|"&vEt&"|Sí",cASIG&"|"&cETAPA&"|"&cESP)),'
         'vClave,eNIA&"|"&vEt,'
         'vTexto,TRIM(eNOTA&""),'
         'vNum,IF(vTexto="","",IFERROR(IF(ISNUMBER(SEARCH(",",vTexto)),'
         'NUMBERVALUE(vTexto,","),NUMBERVALUE(vTexto,".")),"?")),')

def salida(etapa):
    return al_fichero(
        'IF(CONTROL!$B$4<2,"",LET(' + COMUN +
        # La especialidad: la suya si esta fila es su instrumento; si no, la
        # primera que tenga en esa etapa.
        'vInstr,IF(vEsEsp,vCanon,XLOOKUP(vClave,FILTER(vClave,vEsEsp,"~"),'
        'FILTER(vCanon,vEsEsp,""),"")),'
        # El mismo número para el mismo alumno en todo el fichero.
        'vId,XMATCH(eNIA&"",UNIQUE(eNIA&"")),'
        'vApto,IF(TRIM(eAPRUEBA&"")="",IF(vNum>=5,"S","N"),IF(TRIM(eAPRUEBA&"")="1","S","N")),'
        'vTabla,CHOOSE({1,2,3,4,5,6,7,8,9,10,11,12,13,14},'
        'vId,"","",eCURSO,vInstr,"",eEVAL,eCODIGO&"",vCanon,vNum,vNum,vApto,"",""),'
        'FILTER(vTabla,(vEt="%s")*(vTexto<>"")*ISNUMBER(vNum),"")))' % etapa)

def cuenta(expr):
    return al_fichero('IF(CONTROL!$B$4<2,0,LET(' + COMUN + expr + '))')

def lista(expr, nada='Ninguna'):
    return al_fichero('IF(CONTROL!$B$4<2,"—",LET(' + COMUN +
                      'vL,TEXTJOIN(" · ",TRUE,UNIQUE(' + expr + ')),IF(vL="","%s",vL)))' % nada)

def distintos(expr):
    return 'IFERROR(ROWS(UNIQUE(FILTER(%s))),0)' % expr

# (etiqueta, fórmula o None, explicación)
CONTROL = [
    ('Columnas que faltan en ENTRADA',
     al_fichero('LET(vC,{%s},vL,TEXTJOIN(", ",TRUE,IF(ISNA(XMATCH(vC,%s)),vC,"")),'
                'IF(vL="","Ninguna",vL))' % (','.join('"%s"' % c for c in NECESARIAS), CAB)),
     'Si falta alguna, el resto de la hoja no vale: la exportación no tiene la forma esperada.'),
    ('Última fila con datos',
     al_fichero('IFERROR(LOOKUP(2,1/(INDEX(ENTRADA!$A$1:$%s$%d,0,XMATCH("nia",%s))<>""),'
                'ROW(ENTRADA!$A$1:$A$%d)),1)' % (ANCHO, FILAS_ENTRADA, CAB, FILAS_ENTRADA)),
     'Hasta dónde miran las fórmulas. Se decide por la columna nia.'),
    ('Filas pegadas', 'MAX(0,CONTROL!$B$4-1)', ''),
    ('Filas de elemental', cuenta('SUM(--(vEt="EEM"))'), 'Por el curso de la asignatura.'),
    ('Filas de profesional', cuenta('SUM(--(vEt="EPM"))'), ''),
    ('Filas con un curso que no es de ninguna etapa', cuenta('SUM((vEt<>"EEM")*(vEt<>"EPM"))'),
     'No pasan a ninguna hoja. Si no es cero, algún curso viene escrito de otra forma.'),
    ('Filas sin nota, descartadas', cuenta('SUM(--(vTexto=""))'),
     'Casi todas son la extraordinaria de quien aprobó en la ordinaria: no se examinó.'),
    ('   de ellas, de la extraordinaria', cuenta('SUM((vTexto="")*(eEVAL="EX"))'), ''),
    ('Filas con una nota que no es un número', cuenta('SUM((vTexto<>"")*(vNum="?"))'),
     'Tampoco pasan. Si no es cero, hay que ver qué traen.'),
    ('Filas que pasan a DATOS_EEM', cuenta('SUM((vEt="EEM")*(vTexto<>"")*(vNum<>"?"))'),
     'Se pegan en DATOS del analizador de Elementales. Evaluación: FI.'),
    ('Filas que pasan a DATOS_EPM', cuenta('SUM((vEt="EPM")*(vTexto<>"")*(vNum<>"?"))'),
     'Se pegan en DATOS del analizador de Profesionales. Evaluación: OR+EX.'),
    ('Evaluaciones en elemental', lista('FILTER(eEVAL&"",vEt="EEM","")', '—'),
     'Lo esperado es FI.'),
    ('Evaluaciones en profesional', lista('FILTER(eEVAL&"",vEt="EPM","")', '—'),
     'Lo esperado es OR y EX.'),
    ('Pendientes', cuenta('SUM(--(TRIM(eTIPO&"")="Pendiente"))'),
     'Cuentan en el curso de la asignatura, no en el de matrícula.'),
    ('Filas cuyo curso de matrícula es de otra etapa', cuenta('SUM(--(RIGHT(eCURSOMAT,3)<>vEt))'),
     'Cuentan en la etapa de la asignatura.'),
    ('Alumnado distinto', cuenta(distintos('eNIA&"",eNIA&""<>""')),
     'En DATOS lleva un número correlativo en lugar del NIA.'),
    ('Alumnado con dos especialidades',
     cuenta(distintos('vClave&"|"&vCanon,vEsEsp') + '-' + distintos('vClave,vEsEsp')),
     'Sus asignaturas comunes aparecen dos veces: lo cuenta el aviso DobleEspecialidad del analizador.'),
    ('Alumnado de profesional sin especialidad reconocida',
     cuenta(distintos('vClave,vEt="EPM"') + '-' + distintos('vClave,vEsEsp*(vEt="EPM")')),
     'Su columna Especialidad sale vacía. Si no es cero, falta su instrumento en CATALOGO.'),
    ('Asignaturas que no están en el catálogo de su etapa',
     # La misma condición que su lista en INCIDENCIAS: si no, CONTROL y
     # INCIDENCIAS darían dos cifras distintas de lo mismo.
     cuenta(distintos('vAsig&"|"&vEt,(vAsig<>"")*((vEt="EEM")+(vEt="EPM"))'
                      '*ISNA(XMATCH(vAsig&"|"&vEt,cASIG&"|"&cETAPA))')),
     'Pasan con el nombre que traen, y el analizador las cuenta en «FueraDeLasCifras». '
     'La lista está en INCIDENCIAS.'),
]

# ── INCIDENCIAS: lo que no se procesa bien, en una hoja que se puede enviar ──
#
# El conversor está hecho con el catálogo de un centro. Otro conservatorio
# tendrá una especialidad que aquí no está, un curso escrito de otra forma o
# una nota con letras, y lo que necesitamos para arreglarlo a futuro es la
# LISTA de esas cosas — no sus datos. Así que cada bloque agrupa por el valor
# problemático y dice cuántas filas afecta: ni un NIA, ni un nombre, ni una
# fila suelta. Es la hoja que un centro nos puede mandar sin pedir permiso a
# nadie.
#
# Cada bloque va en sus propias columnas: un bloque derrama hacia abajo tantas
# filas como valores distintos, y dos bloques uno encima de otro se pisarían
# (#¡DESBORDAMIENTO!) en cuanto el de arriba creciera.

def incidencias(columnas, condicion):
    """Valores distintos de `columnas` en las filas que cumplen `condicion`,
    con cuántas filas tiene cada uno, de más a menos.

    Sin LAMBDA: el recuento es un MMULT de «esta clave contra todas», que con
    unos pocos valores distintos y unos miles de filas es nada."""
    n = len(columnas)
    unir = lambda partes: '&"|"&'.join(partes)
    return al_fichero(
        'IF(CONTROL!$B$4<2,"Sin datos",IFERROR(LET(' + COMUN +
        'vCond,%s,' % condicion +
        'vK,FILTER(%s,vCond),' % unir(columnas) +
        'vU,UNIQUE(FILTER(CHOOSE({%s},%s),vCond)),' % (
            ','.join(str(i + 1) for i in range(n)), ','.join(columnas)) +
        'vN,MMULT(--((%s)=TRANSPOSE(vK)),SEQUENCE(ROWS(vK),1,1,0)),' % unir(
            ['INDEX(vU,0,%d)' % (i + 1) for i in range(n)]) +
        'SORT(CHOOSE({%s},%s,vN),%d,-1)),"Ninguna"))' % (
            ','.join(str(i + 1) for i in range(n + 1)),
            ','.join('INDEX(vU,0,%d)' % (i + 1) for i in range(n)), n + 1))

# Solo en filas con etapa: las que no la tienen ya salen en su propia lista, y
# contarlas dos veces haría creer que son dos problemas.
NO_EN_CATALOGO = ('(vAsig<>"")*((vEt="EEM")+(vEt="EPM"))'
                  '*ISNA(XMATCH(vAsig&"|"&vEt,cASIG&"|"&cETAPA))')
EVALUACION_RARA = ('((vEt="EEM")*(eEVAL&""<>"FI")+(vEt="EPM")*(eEVAL&""<>"OR")*(eEVAL&""<>"EX"))>0')

# (título, qué pasa con esas filas, cabeceras, columnas, condición)
BLOQUES = [
    ('Asignaturas que no están en el catálogo',
     'Pasan con el nombre que traen y el analizador no las enseña: las cuenta en «FueraDeLasCifras». '
     'Si una es una especialidad, además su alumnado se queda sin especialidad.',
     ['Asignatura, tal como viene', 'Etapa', 'Filas'], ['vAsig', 'vEt'], NO_EN_CATALOGO),
    ('Cursos que no son de ninguna etapa',
     'No pasan a ninguna hoja. El curso tiene que acabar en EEM o EPM (1EEM, 3EPM…).',
     ['Curso, tal como viene', 'Filas'], ['eCURSO&""'], '(vEt<>"EEM")*(vEt<>"EPM")'),
    ('Notas que no son un número',
     'No pasan. El analizador solo entiende notas numéricas.',
     ['Nota, tal como viene', 'Filas'], ['vTexto'], '(vTexto<>"")*(vNum="?")'),
    ('Evaluaciones que no son las de fin de curso',
     'Pasan, pero el analizador solo las cuenta si se elige esa evaluación. Lo esperado es FI en '
     'elemental, y OR y EX en profesional.',
     ['Evaluación', 'Etapa', 'Filas'], ['eEVAL&""', 'vEt'], EVALUACION_RARA),
]

# ── El libro ────────────────────────────────────────────────────────────────

# estilos: 0 normal · 1 cabecera · 2 título · 3 texto largo · 4 fuerte · 5 gris · 6 aviso
ESTILOS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
<font><sz val="11"/><color rgb="FF374151"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="24"/><color rgb="FF111827"/><name val="Calibri Light"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF92400E"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFEF7E7"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="medium"><color rgb="FF111827"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/>
</styleSheet>'''

def letra(i):
    s = ''
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s

def texto(ref, valor, estilo=0):
    if valor is None or valor == '':
        return '<c r="%s" s="%d"/>' % (ref, estilo) if estilo else ''
    return '<c r="%s" s="%d" t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>' % (
        ref, estilo, escape(str(valor)))

def numero(ref, valor, estilo=0):
    return '<c r="%s" s="%d"><v>%s</v></c>' % (ref, estilo, valor)

def formula(ref, f, estilo=0, matriz=True):
    """Toda fórmula de este libro opera con matrices, y se declara como tal."""
    if matriz:
        return '<c r="%s" s="%d" cm="1"><f t="array" ref="%s">%s</f></c>' % (ref, estilo, ref, escape(f))
    return '<c r="%s" s="%d"><f>%s</f></c>' % (ref, estilo, escape(f))

def hoja(filas, anchos=(), congelar=None, pestana=None):
    """`filas`: {número: [xml de celda, …]}. Los elementos en el orden del esquema."""
    pr = '<sheetPr><tabColor rgb="%s"/></sheetPr>' % pestana if pestana else ''
    vista = '<sheetView workbookViewId="0"/>'
    if congelar:
        vista = ('<sheetView workbookViewId="0"><pane ySplit="%d" topLeftCell="A%d" '
                 'activePane="bottomLeft" state="frozen"/></sheetView>' % (congelar, congelar + 1))
    cols = ''
    if anchos:
        cols = '<cols>%s</cols>' % ''.join(
            '<col min="%d" max="%d" width="%s" customWidth="1"/>' % (i + 1, i + 1, a)
            for i, a in enumerate(anchos))
    datos = ''.join('<row r="%d">%s</row>' % (n, ''.join(c for c in filas[n] if c))
                    for n in sorted(filas))
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            + pr + '<sheetViews>' + vista + '</sheetViews>'
            + '<sheetFormatPr defaultRowHeight="15"/>' + cols
            + '<sheetData>' + datos + '</sheetData>'
            + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
            + '</worksheet>')

PORTADA = [
    ('T', 'Conversor Excel a Dashboard'),
    ('g', 'De la exportación de calificaciones de fin de curso a la hoja DATOS de los dos analizadores.'),
    ('w', 'Necesita Excel 365 o Excel 2021 o posterior, igual que los analizadores. En Excel 2019 o '
          'anterior las fórmulas salen como #¿NOMBRE?.'),
    ('', ''),
    ('B', '1 · Pega la exportación en ENTRADA'),
    ('b', 'Entera, desde la celda A1, con su fila de cabeceras. Si había algo de otra vez, bórralo antes.'),
    ('b', 'Las columnas se buscan por el nombre de su cabecera: da igual en qué orden vengan.'),
    ('', ''),
    ('B', '2 · Mira CONTROL antes de seguir'),
    ('b', 'Dice cuántas filas pasan a cada etapa, cuántas se descartan y por qué, y qué asignaturas '
          'no están en el catálogo. Si «Columnas que faltan» no dice «Ninguna», para aquí.'),
    ('', ''),
    ('B', '3 · Copia DATOS_EEM y DATOS_EPM en sus analizadores'),
    ('b', 'Selecciona la hoja desde A1 hasta la última fila, copia, y en la hoja DATOS del analizador '
          'pega SOLO LOS VALORES desde A1.'),
    ('b', 'Elementales: DATOS_EEM, y en CONFIG_METADATA elige la evaluación FI.'),
    ('b', 'Profesionales: DATOS_EPM, y elige OR+EX: la ordinaria con las recuperaciones de la '
          'extraordinaria encima. Es la foto definitiva del curso.'),
    ('', ''),
    ('B', '4 · Si INCIDENCIAS lista algo, envíala'),
    ('b', 'Son las asignaturas, cursos, notas o evaluaciones que el conversor no sabe tratar: por '
          'ejemplo, una especialidad que tu centro imparte y el catálogo no tiene. La hoja no lleva '
          'datos de nadie, solo esos valores y cuántas filas afectan.'),
    ('', ''),
    ('H', 'QUÉ HACE CON LOS DATOS'),
    ('b', 'Etapa: la del curso de la asignatura (…EEM o …EPM).'),
    ('b', 'Curso: el de la asignatura, también en las pendientes. La Armonía de 4.º que cursa un alumno '
          'de 5.º cuenta en 4.º, con el resto de la Armonía de 4.º.'),
    ('b', 'Filas sin nota: se descartan. Son sobre todo la extraordinaria de quien aprobó en la ordinaria; '
          'si pasaran, borrarían su nota de junio y contarían como un cero.'),
    ('b', 'NIA: se sustituye por un número. Es el mismo para el mismo alumno dentro de este fichero, y '
          'basta para que el analizador cruce ordinaria y extraordinaria. Nombre, apellidos y sexo no pasan.'),
    ('b', 'Especialidad: la exportación no la trae; es la asignatura del alumno que CATALOGO marca como '
          'especialidad. Quien tiene dos conserva sus comunes repetidas, y el analizador lo avisa.'),
    ('b', 'Asignatura: con el nombre del catálogo. La que no esté pasa con el suyo, y el analizador la '
          'cuenta en «FueraDeLasCifras».'),
    ('', ''),
    ('W', 'ANTES DE GUARDAR O COMPARTIR'),
    ('w', 'ENTRADA contiene datos personales. Cuando hayas copiado las dos hojas, borra ENTRADA: el '
          'conversor vacío no guarda nada de nadie, y los analizadores solo reciben números.'),
    ('w', 'CATALOGO tiene que decir lo mismo que los analizadores. Si añades una asignatura a uno de '
          'ellos, añádela aquí también, con su etapa.'),
    ('', ''),
    ('p', 'José Luis Miralles Bono · www.jlmirall.es · Desarrollado con Claude (Anthropic)'),
]
ESTILO_PORTADA = {'T': 2, 'g': 5, 'B': 4, 'b': 3, 'H': 1, 'W': 6, 'w': 3, 'p': 5, '': 0}

def construir(destino, datos=None):
    cat = catalogo()

    # PORTADA
    filas = {i + 1: [texto('A%d' % (i + 1), t, ESTILO_PORTADA[k])] for i, (k, t) in enumerate(PORTADA)}
    s_portada = hoja(filas, anchos=[110], pestana='FF111827')

    # ENTRADA: las cabeceras esperadas, para que se vea qué forma tiene lo que
    # se pega. Pegar encima las sustituye por las reales.
    filas = {1: [texto('%s1' % letra(i), c, 1) for i, c in enumerate(CABECERAS_ENTRADA)]}
    for n, registro in enumerate(datos or [], start=2):
        filas[n] = [(numero if isinstance(v, (int, float)) and not isinstance(v, bool) else texto)(
            '%s%d' % (letra(i), n), v) for i, v in enumerate(registro)]
    s_entrada = hoja(filas, anchos=[14] * len(CABECERAS_ENTRADA), congelar=1)

    # CATALOGO
    filas = {1: [texto('A1', 'Asignatura', 1), texto('B1', 'Etapa', 1),
                 texto('C1', 'EsEspecialidad', 1), texto('E1', 'CÓMO SE USA', 1)]}
    ayuda = ['Es el mismo catálogo que CONFIG_ASIGNATURAS de los dos analizadores, con su etapa.',
             'Sirve para dos cosas: escribir cada asignatura con el nombre del analizador, y saber',
             'qué asignatura es la especialidad de cada alumno.',
             'Una asignatura nueva: en la primera fila libre, con el MISMO nombre que en el analizador,',
             'su etapa (EEM o EPM) y «Sí» si es un instrumento. No hace falta ordenar nada.']
    for i, (a, e, es) in enumerate(cat, start=2):
        filas[i] = [texto('A%d' % i, a), texto('B%d' % i, e), texto('C%d' % i, es)]
    for i, t in enumerate(ayuda, start=2):
        filas.setdefault(i, []).append(texto('E%d' % i, t, 5))
    filas[len(cat) + 2] = [texto('A%d' % (len(cat) + 2), '↓ primera fila libre', 5)]
    s_catalogo = hoja(filas, anchos=[52, 8, 15, 3, 90], congelar=1)

    # DATOS_EEM / DATOS_EPM
    def s_datos(etapa):
        filas = {1: [texto('%s1' % letra(i), c, 1) for i, c in enumerate(CABECERAS_DATOS)],
                 2: [formula('A2', salida(etapa))]}
        return hoja(filas, anchos=[8, 10, 10, 8, 20, 7, 11, 11, 40, 7, 13, 6, 10, 10],
                    congelar=1, pestana='FF1D4ED8')

    # CONTROL
    filas = {1: [texto('A1', 'Comprobación', 1), texto('B1', 'Resultado', 1), texto('C1', 'Qué significa', 1)],
             2: [texto('A2', 'Mira esto antes de copiar DATOS_EEM y DATOS_EPM.', 5)]}
    for i, (etiqueta, f, que) in enumerate(CONTROL, start=3):
        filas[i] = [texto('A%d' % i, etiqueta, 4 if not etiqueta.startswith(' ') else 3),
                    formula('B%d' % i, f, 3) if f else '', texto('C%d' % i, que, 5)]
    s_control = hoja(filas, anchos=[48, 40, 90], pestana='FFB45309')

    # INCIDENCIAS
    filas = {1: [texto('A1', 'Lo que no se procesa bien', 2)],
             2: [texto('A2', 'Esta hoja NO contiene datos personales: agrupa por el valor que da problemas y '
                             'cuenta filas. Si hay algo distinto de «Ninguna», envíala a quien mantiene el '
                             'conversor (joseluismirallesbono@gmail.com) para que se pueda incorporar.', 6)]}
    anchos, col = [], 0
    for titulo, que, cabeceras, _, _ in BLOQUES:
        filas.setdefault(4, []).append(texto('%s4' % letra(col), titulo, 4))
        filas.setdefault(5, []).append(texto('%s5' % letra(col), que, 5))
        filas.setdefault(6, []).extend(texto('%s6' % letra(col + i), c, 1) for i, c in enumerate(cabeceras))
        anchos += [30] + [9] * (len(cabeceras) - 1) + [3]
        col += len(cabeceras) + 1
    col = 0
    for _, _, cabeceras, columnas, condicion in BLOQUES:
        filas.setdefault(7, []).append(formula('%s7' % letra(col), incidencias(columnas, condicion)))
        col += len(cabeceras) + 1
    # El alumnado sin especialidad no es un valor que se pueda agrupar sin
    # señalar a alguien: va como recuento, debajo del título.
    filas[3] = [texto('A3', 'Alumnado de profesional sin especialidad reconocida:', 4),
                formula('D3', cuenta(distintos('vClave,vEt="EPM"') + '-' +
                                     distintos('vClave,vEsEsp*(vEt="EPM")')), 4)]
    s_incidencias = hoja(filas, anchos=anchos, pestana='FFB91C1C')

    HOJAS = [('PORTADA', s_portada), ('ENTRADA', s_entrada), ('CATALOGO', s_catalogo),
             ('DATOS_EEM', s_datos('EEM')), ('DATOS_EPM', s_datos('EPM')), ('CONTROL', s_control),
             ('INCIDENCIAS', s_incidencias)]

    nombres = ''.join('<definedName name="%s">%s</definedName>' % (n, escape(al_fichero(v)))
                      for n, v in sorted(NOMBRES.items()))
    workbook = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                '<workbookPr/><bookViews><workbookView activeTab="0"/></bookViews><sheets>'
                + ''.join('<sheet name="%s" sheetId="%d" r:id="rId%d"/>' % (n, i + 1, i + 1)
                          for i, (n, _) in enumerate(HOJAS))
                + '</sheets><definedNames>' + nombres + '</definedNames>'
                '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>')
    n = len(HOJAS)
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + ''.join('<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/'
                      '2006/relationships/worksheet" Target="worksheets/sheet%d.xml"/>' % (i + 1, i + 1)
                      for i in range(n))
            + '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/'
              'relationships/styles" Target="styles.xml"/>' % (n + 1)
            + '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/'
              'relationships/sheetMetadata" Target="metadata.xml"/>' % (n + 2)
            + '</Relationships>')
    tipos = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
             '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
             '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
             '<Default Extension="xml" ContentType="application/xml"/>'
             '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-'
             'officedocument.spreadsheetml.sheet.main+xml"/>'
             + ''.join('<Override PartName="/xl/worksheets/sheet%d.xml" ContentType="application/'
                       'vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' % (i + 1)
                       for i in range(n))
             + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-'
               'officedocument.spreadsheetml.styles+xml"/>'
             '<Override PartName="/xl/metadata.xml" ContentType="application/vnd.openxmlformats-'
             'officedocument.spreadsheetml.sheetMetadata+xml"/>'
             '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-'
             'package.core-properties+xml"/></Types>')
    raiz = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/'
            'relationships/officeDocument" Target="xl/workbook.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/'
            'metadata/core-properties" Target="docProps/core.xml"/></Relationships>')
    # La declaración de matriz dinámica: lo que `cm="1"` señala en cada celda.
    metadatos = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                 '<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                 'xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray">'
                 '<metadataTypes count="1"><metadataType name="XLDAPR" minSupportedVersion="120000" '
                 'copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" '
                 'clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/></metadataTypes>'
                 '<futureMetadata name="XLDAPR" count="1"><bk><extLst><ext '
                 'uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" '
                 'fCollapsed="0"/></ext></extLst></bk></futureMetadata>'
                 '<cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>')
    core = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/'
            'core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '<dc:title>Conversor Excel a Dashboard</dc:title>'
            '<dc:creator>José Luis Miralles Bono</dc:creator></cp:coreProperties>')

    with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', tipos)
        z.writestr('_rels/.rels', raiz)
        z.writestr('docProps/core.xml', core)
        z.writestr('xl/workbook.xml', workbook)
        z.writestr('xl/_rels/workbook.xml.rels', rels)
        z.writestr('xl/styles.xml', ESTILOS)
        z.writestr('xl/metadata.xml', metadatos)
        for i, (_, xml) in enumerate(HOJAS):
            z.writestr('xl/worksheets/sheet%d.xml' % (i + 1), xml)
    return len(cat)

if __name__ == '__main__':
    args = sys.argv[1:]
    datos = None
    if '--datos' in args:
        i = args.index('--datos')
        datos = json.load(open(args[i + 1]))
        del args[i:i + 2]
    destino = args[0] if args else DESTINO
    n = construir(destino, datos)
    print('%s · %d asignaturas en el catálogo%s' % (
        destino, n, ' · %d filas de prueba en ENTRADA' % len(datos) if datos else ''))
