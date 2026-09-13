#!/bin/sh
# Los dos modelos de analizador, de principio a fin.
#
#   herramientas/generar-modelos.sh
#
# Los generadores cogen sus plantillas POR NÚMERO DE FILA, así que solo sirven
# sobre el libro original: por eso cada uno parte de su commit y no de lo que
# haya en la carpeta. Correrlos sobre su propia salida coge una ranura creyendo
# que es un total, y el libro sale con cifras plausibles y mal —pasó—.
#
# Y `acotar-rangos.py` va SIEMPRE al final: es lo que cambia los `$2:$20000`
# por nombres que llegan hasta donde hay datos. Si se olvida, el libro
# funciona igual y tarda diez veces más en abrirse, que es de las cosas que
# nadie relaciona con un commit.
set -e
cd "$(dirname "$0")/.."
git checkout 9e2f6bd -- public/data/ANALIZADOR_ELEMENTAL_V2.xlsx
python3 herramientas/generar-analizador-eem.py
git checkout 4a6df25 -- public/data/ANALIZADOR_PROFESIONAL_v2.xlsx
python3 herramientas/generar-analizador-epm.py
python3 herramientas/acotar-rangos.py \
    public/data/ANALIZADOR_ELEMENTAL_V2.xlsx public/data/ANALIZADOR_PROFESIONAL_v2.xlsx
# La portada va al final, y las pruebas DESPUÉS de ella: es la que quita de los
# textos el nombre de herramientas concretas, y pasándolas antes se veía el
# libro a medio hacer.
python3 herramientas/portada.py
python3 herramientas/listas-y-formato.py \
    public/data/ANALIZADOR_ELEMENTAL_V2.xlsx public/data/ANALIZADOR_PROFESIONAL_v2.xlsx
# El conversor DESPUÉS de los analizadores: su catálogo lo lee de ellos. Si se
# genera antes, reparte el catálogo viejo y una especialidad recién añadida no
# se reconoce — y su alumnado sale sin especialidad sin que nada falle.
python3 herramientas/generar-conversor.py
cp public/data/ANALIZADOR_*.xlsx public/data/CONVERSOR_EXCEL_A_DASHBOARD.xlsx dist/data/
node pruebas/modelos-excel.mjs
node pruebas/conversor-excel.mjs
# Las cifras del conversor solo las comprueba un Excel de verdad; si hay uno a
# mano: python3 herramientas/probar-conversor.py
