import 'i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    /** See https://github.com/i18next/react-i18next/issues/1483#issuecomment-1827603003 */
    allowObjectInHTMLChildren: true;
  }
}
