/* Los avisos que viajan con el fichero — pruebas/avisos.mjs */
import { avisosDelFichero, filasLeidas, AVISOS } from '../src/nucleo/avisos.js';
import { comprobar, seccion, terminar } from './ayuda.mjs';

seccion('Solo se enseña lo que pide algo');
{
  comprobar('un cero no se enseña',
    avisosDelFichero({ FueraDeLasCifras: '0', DobleEspecialidad: '0' }).length === 0);
  /* CANDADO. Un cuadro que siempre tiene algo dentro se aprende a ignorar en
     una semana: es la lección del aviso del buzón. */
  comprobar('CANDADO: y un aviso que FALTA tampoco se inventa',
    avisosDelFichero({}).length === 0,
    'un fichero de un libro antiguo no trae estas claves');
  comprobar('lo que trae número sí sale',
    avisosDelFichero({ FueraDeLasCifras: '4' }).map((a) => a.clave).join() === 'FueraDeLasCifras');
}

seccion('El orden es el de la gravedad, no el del fichero');
{
  const a = avisosDelFichero({ DobleEspecialidad: '4', FueraDeLasCifras: '2',
                               ExtraordinariaSinOrdinaria: '1' });
  comprobar('primero lo que está mal, después lo que hay que tener en cuenta',
    a.map((x) => x.nivel).join() === 'malo,malo,ojo', a.map((x) => x.nivel).join());
  comprobar('y cada uno lleva su cifra', a.map((x) => x.n).join() === '2,1,4',
    a.map((x) => `${x.clave}=${x.n}`).join(' '));
}

seccion('Hasta dónde miró el libro');
{
  /* CANDADO. La celda del libro dice la última FILA de la hoja, y la primera
     es la cabecera. Devolverla tal cual sería decir que hay un registro más
     de los que hay. */
  comprobar('CANDADO: 1.940 filas de hoja son 1.939 registros',
    filasLeidas({ FilasConDatos: '1940' }) === 1939,
    String(filasLeidas({ FilasConDatos: '1940' })));
  comprobar('sin el dato devuelve null, no cero', filasLeidas({}) === null);
  comprobar('y una hoja vacía no da un número negativo',
    filasLeidas({ FilasConDatos: '0' }) === 0);
}

seccion('Los números llegan como texto del CSV');
{
  comprobar('con coma decimal también', avisosDelFichero({ FueraDeLasCifras: '2,0' }).length === 1);
  comprobar('lo que no es número se ignora', avisosDelFichero({ FueraDeLasCifras: '—' }).length === 0);
  comprobar('cada aviso declara su mensaje',
    AVISOS.every((a) => a.mensaje && a.nivel && a.clave));
}

terminar('los avisos del fichero: se enseña lo que pide algo, y solo eso.');
