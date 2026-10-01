// Minimal types for nprogress (used directly only to set the bar's parent;
// nextjs-toploader drives start/done).
declare module "nprogress" {
  interface NProgressOptions {
    parent: string;
  }
  const NProgress: {
    configure(options: Partial<NProgressOptions>): typeof NProgress;
  };
  export default NProgress;
}
