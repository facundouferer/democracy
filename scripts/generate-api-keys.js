#!/usr/bin/env node

const crypto = require('crypto');

/**
 * Generador de API Keys seguras para Democracy API
 * 
 * Uso:
 *   node scripts/generate-api-keys.js
 *   node scripts/generate-api-keys.js --count 5
 *   node scripts/generate-api-keys.js --prefix "democracy"
 */

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);
const countIndex = args.indexOf('--count');
const prefixIndex = args.indexOf('--prefix');

const count = countIndex !== -1 ? parseInt(args[countIndex + 1]) || 3 : 3;
const prefix = prefixIndex !== -1 ? args[prefixIndex + 1] || 'api' : 'api';

console.log('🔑 Generador de API Keys Seguras\n');
console.log(`Generando ${count} API Key(s) con prefijo "${prefix}"\n`);

const apiKeys = [];

for (let i = 0; i < count; i++) {
  // Generar 32 bytes aleatorios y convertir a hexadecimal
  const randomBytes = crypto.randomBytes(32).toString('hex');

  // Crear API Key con prefijo y sufijo legible
  const apiKey = `${prefix}-${randomBytes.substring(0, 8)}-${randomBytes.substring(8, 16)}-${randomBytes.substring(16, 24)}`;

  apiKeys.push(apiKey);
  console.log(`${i + 1}. ${apiKey}`);
}

console.log('\n📋 Para usar en variables de entorno:');
console.log(`API_KEYS=${apiKeys.join(',')}`);

console.log('\n🚀 Para despliegue:');
console.log('1. Copia las API Keys generadas');
console.log('2. Configúralas en tu plataforma de despliegue (Vercel, Railway, etc.)');
console.log('3. Comparte las keys de forma segura con los usuarios autorizados');

console.log('\n⚠️  IMPORTANTE:');
console.log('- Nunca commitees las API Keys al repositorio');
console.log('- Guarda las keys en un lugar seguro');
console.log('- Rota las keys periódicamente');
console.log('- Usa HTTPS siempre en producción');
