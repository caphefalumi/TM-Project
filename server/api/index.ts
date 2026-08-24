// Vercel compiles this entry to api/index.js. Relative imports must use .js
// specifiers so the Node bundler traces and compiles the TypeScript graph
// instead of leaving a runtime import of app.ts (which Node cannot load).
import app from '../app.js'

export default app
