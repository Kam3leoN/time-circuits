/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
declare module '*.scss?inline' {
  const css: string;
  export default css;
}
