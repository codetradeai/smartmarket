// Jest roda em CommonJS, onde `import.meta` nao existe. Este plugin troca `import.meta`
// por um objeto com `env` apontando para process.env (usado em src/services/api.js).
function importMetaParaProcessEnv() {
  return {
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWithSourceString('({ env: process.env })')
        }
      },
    },
  }
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [importMetaParaProcessEnv],
}
