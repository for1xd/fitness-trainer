/// <reference types="nativewind/types" />

declare module "*.css";
declare module "*.ttf" {
  const font: number | string;
  export default font;
}
