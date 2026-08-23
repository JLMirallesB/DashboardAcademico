/* El idioma en curso, accesible desde fuera del árbol de React.
 *
 * El estado del idioma vive dentro de `DashboardAcademico`, y hay una cosa que
 * queda POR ENCIMA de ese componente: la red de seguridad que captura los
 * errores del render. Cuando salta, el componente ya no está montado, así que
 * no hay forma de pedirle su `t`.
 *
 * Esto es lo mínimo para que el mensaje de error salga en el idioma en que
 * estaba trabajando la persona, y no siempre en castellano. Nada más debería
 * usarlo: para todo lo demás, el idioma se pasa por props como siempre.
 */
let actual = 'es';

export const recordarIdioma = (i) => { if (i) actual = i; };
export const idiomaActual = () => actual;
