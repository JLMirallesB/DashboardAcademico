/* Lint mínimo, y con un objetivo concreto.
 *
 * No está aquí para imponer un estilo: está para cazar la familia de fallos que
 * ya nos mordió una vez —un hook importado y nunca usado, con un arreglo dentro
 * que jamás llegó a la pantalla— y las dependencias de hooks mal declaradas,
 * que dan cifras viejas sin error ninguno.
 *
 * Por eso casi todo va como AVISO y solo lo que rompe de verdad va como error:
 * un lint que grita por todo se aprende a ignorar en una semana, y entonces ya
 * no sirve para lo que se puso.
 */
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'pruebas/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      /* Lo que de verdad importa aquí. */
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^React$' }],
      'react-hooks/exhaustive-deps': 'warn',
      /* Y lo que sí es un error: dejarse un log de depuración en producción,
         usar algo que no existe, o repetir una clave de traducción —eso último
         no da error en ningún sitio y hace que un rótulo enseñe el texto de
         otro, que es como se descubrió que «Motivo» decía «Análisis
         Detallado»—. */
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-undef': 'error',
      'no-dupe-keys': 'error',

      /* Las tres reglas estrictas de react-hooks 7 van como AVISO, no como
         error, y conviene saber por qué: señalan catorce sitios reales del
         componente grande —refs leídas durante el render, setState dentro de
         un efecto— que no se arreglan con un cambio de línea, sino partiendo
         ese componente de 4.000 líneas. Ponerlas como error hoy dejaría el
         lint en rojo permanente, y un lint que siempre está rojo no lo mira
         nadie. Están apuntadas para cuando se toque esa parte. */
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/use-memo': 'warn'
    }
  }
];
