/* Reenvío. El parser vive en `src/nucleo/csv.js`, que no depende de React y se
   puede ejercitar en node. Este archivo se conserva para no cambiar los
   imports de la aplicación en el mismo paso en que se movió el código. */
export { parseCSV } from '../nucleo/csv.js';
