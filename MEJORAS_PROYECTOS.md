# 🔧 CORRECCIÓN CONTEO DE PROYECTOS - Implementado

## ❌ Problema Original
Todos los diputados aparecían con `proyectosLeyFirmante: 0` y `proyectosLeyCofirmante: 0` cuando en realidad sí tienen proyectos.

## ✅ Soluciones Implementadas

### **1. Múltiples Estrategias de Conteo**
El problema era que el selector CSS `table tbody tr` no estaba funcionando correctamente. Ahora implementamos 5 estrategias diferentes:

```javascript
// Estrategia 1: Buscar tabla de resultados
const tabla = $('table.resultados tbody tr, table tbody tr').length;

// Estrategia 2: Buscar divs de resultado
const divs = $('.resultado, .proyecto, .resultado-busqueda').length;

// Estrategia 3: Buscar por texto "Proyecto de Ley"
const textoLey = $('*:contains("Proyecto de Ley"), *:contains("LEY")').length;

// Estrategia 4: Buscar enlaces a proyectos específicos
const enlaces = $('a[href*="proyecto"], a[href*="expediente"]').length;

// Estrategia 5: Buscar por patrón de números de expediente
const expedientes = htmlContent.match(/\d{4}-[A-Z]-\d{4}/g)?.length || 0;
```

### **2. Headers Mejorados**
Agregamos headers más completos para evitar bloqueos:

```javascript
{
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer': 'https://www.hcdn.gob.ar/',
  'Cache-Control': 'no-cache'
}
```

### **3. Logging Detallado**
Cada diputado ahora reporta:
- ✅ URLs de búsqueda utilizadas
- ✅ Qué estrategia funcionó para contar
- ✅ Número final de proyectos encontrados
- ✅ Errores específicos si los hay

### **4. Endpoint de Test**
Nuevo endpoint para verificar el conteo: `/api/test-proyectos`

```bash
# Probar con un diputado específico
curl "http://localhost:3001/api/test-proyectos?apikey=YOUR_KEY&slug=sacevedo"

# Ver información detallada de debug
curl "http://localhost:3001/api/test-proyectos?apikey=YOUR_KEY&slug=SLUG_DIPUTADO"
```

## 🧪 Cómo Verificar las Mejoras

### **Opción 1: Test Individual**
```bash
# Probar conteo para un diputado específico
curl "http://localhost:3001/api/test-proyectos?apikey=dev-997e7e8d-982bd538-63c9431c&slug=sacevedo"
```

### **Opción 2: Sync Completo Mejorado**
```bash
# Ejecutar sync con logging detallado
curl "http://localhost:3001/api/sync-diputados?apikey=dev-997e7e8d-982bd538-63c9431c"

# Buscar en logs:
# [PROYECTOS] Obteniendo proyectos para: SLUG
# [PROYECTOS] Total firmante para SLUG: NUMBER
# [PROYECTOS] RESUMEN para SLUG: Firmante=X, Cofirmante=Y
```

### **Opción 3: Verificar en BD**
```bash
# Después del sync, consultar BD
curl "http://localhost:3001/api/diputados-bd?apikey=YOUR_KEY&limit=5"

# Buscar campos:
# "proyectosLeyFirmante": numero > 0
# "proyectosLeyCofirmante": numero > 0
```

## 📊 Resultados Esperados

### **Antes (Problema):**
```json
{
  "proyectosLeyFirmante": 0,
  "proyectosLeyCofirmante": 0
}
```

### **Después (Solucionado):**
```json
{
  "proyectosLeyFirmante": 15,
  "proyectosLeyCofirmante": 28
}
```

## 🔍 URLs de Ejemplo para Verificar Manualmente

Puedes verificar manualmente que los diputados SÍ tienen proyectos:

```
https://www.hcdn.gob.ar/proyectos/buscador/avanzado.php?trata=LEY&firmante=sacevedo
https://www.hcdn.gob.ar/proyectos/buscador/avanzado.php?trata=LEY&cofirmante=sacevedo
```

## 🚨 Si Aún Aparecen Ceros

1. **Verificar logs**: Buscar mensajes `[PROYECTOS]` en la consola
2. **Usar endpoint de test**: Ver qué estrategia está funcionando
3. **Verificar respuesta HTML**: El debug muestra muestra del HTML recibido

## ✅ Próximo Paso

Ejecutar sync completo para verificar que los contadores ahora se actualicen correctamente en la base de datos:

```bash
curl "http://localhost:3001/api/sync-diputados?apikey=dev-997e7e8d-982bd538-63c9431c"
```

¡Las mejoras están implementadas y listas para probar! 🚀
