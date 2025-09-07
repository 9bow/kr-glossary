/**
 * Vite plugin to update HTML file paths based on base URL
 */

export function htmlBasePath() {
  return {
    name: 'html-base-path',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const base = context.server?.config?.base || context.bundle?.config?.base || '/';
        
        if (base === '/') {
          return html;
        }
        
        // Update favicon and icon paths
        return html
          .replace(/href="\/favicon\./g, `href="${base}favicon.`)
          .replace(/href="\/manifest\.json"/g, `href="${base}manifest.json"`)
          .replace(/content="https:\/\/glossary\.kr\//g, `content="https://9bow.github.io${base}`)
          .replace(/href="https:\/\/aiml-glossary\.github\.io\/kr-glossary\/"/g, `href="https://9bow.github.io${base}"`)
          .replace(/src="\/favicon\./g, `src="${base}favicon.`)
          .replace(/href="\/vite\.svg"/g, `href="${base}vite.svg"`);
      }
    }
  };
}