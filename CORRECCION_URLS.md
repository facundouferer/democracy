# ✅ CORRECCIÓN CRÍTICA - URLs de Proyectos

## ❌ Problema Identificado
Las URLs que estaba usando eran completamente incorrectas:

**URLs INCORRECTAS (anteriores):**
```
https://www.hcdn.gob.ar/proyectos/buscador/avanzado.php?trata=LEY&firmante=sacevedo
https://www.hcdn.gob.ar/proyectos/buscador/avanzado.php?trata=LEY&cofirmante=sacevedo
```

**URLs CORRECTAS (implementadas):**
```
https://www.hcdn.gob.ar/diputados/sacevedo/listado-proyectos.html?tipoFirmante=firmante
https://www.hcdn.gob.ar/diputados/sacevedo/listado-proyectos.html?tipoFirmante=cofirmante
```

## ✅ Corrección Implementada

### **1. Estrategia Principal - Texto del Paginador**
Ahora busco directamente el texto `"50 Proyectos Encontrados"` en `.textoPaginador`:

```javascript
const textoPaginador = $('.textoPaginador').text();
const match = textoPaginador.match(/(\d+)\s+Proyectos?\s+Encontrados?/i);
if (match) {
  proyectos = parseInt(match[1], 10); // ¡50 proyectos!
}
```

### **2. Fallback - Conteo de Tabla**
Si no encuentra el paginador, cuenta las filas de la tabla:

```javascript
const filasTabla = $('table tbody tr').length;
```

### **3. Headers Mejorados**
Referer corregido para parecer navegación interna:

```javascript
'Referer': linkDiputado, // Viene desde el perfil del diputado
```

## 🧪 Cómo Verificar la Corrección

### **Test 1: Endpoint Individual**
```bash
curl "http://localhost:3000/api/test-proyectos?apikey=dev-997e7e8d-982bd538-63c9431c&slug=sacevedo"
```

**Esperado:**
```json
{
  "success": true,
  "slug": "sacevedo",
  "resultado": {
    "proyectosLeyFirmante": 50,  // ¡NO más 0!
    "proyectosLeyCofirmante": 0,
    "debug": {
      "urlFirmante": "https://www.hcdn.gob.ar/diputados/sacevedo/listado-proyectos.html?tipoFirmante=firmante",
      "estrategias": {
        "paginador": 50,  // ¡Método que funcionó!
        "tabla": 20
      },
      "metodoUsado": "paginador",
      "textoPaginadorCompleto": "50 Proyectos Encontrados | Página 1 de 3"
    }
  }
}
```

### **Test 2: Sync Completo**
```bash
curl "http://localhost:3000/api/sync-diputados?apikey=dev-997e7e8d-982bd538-63c9431c"
```

**Logs esperados:**
```
[PROYECTOS] URLs corregidas: 
- Firmante: https://www.hcdn.gob.ar/diputados/sacevedo/listado-proyectos.html?tipoFirmante=firmante
- Cofirmante: https://www.hcdn.gob.ar/diputados/sacevedo/listado-proyectos.html?tipoFirmante=cofirmante
[PROYECTOS] Firmante - Encontrados por paginador: 50 proyectos
[PROYECTOS] Cofirmante - No se encontraron proyectos o estructura desconocida
[PROYECTOS] RESUMEN para sacevedo: Firmante=50, Cofirmante=0
```

### **Test 3: Verificar en BD**
```bash
curl "http://localhost:3000/api/diputados-bd?apikey=dev-997e7e8d-982bd538-63c9431c&limit=5"
```

**Esperado después del sync:**
```json
{
  "data": [
    {
      "nombre": "ACEVEDO, Sergio Alejandro",
      "proyectosLeyFirmante": 50,  // ¡YA NO ES 0!
      "proyectosLeyCofirmante": 0
    }
  ]
}
```

## 🎯 URLs de Ejemplo para Verificar Manualmente

Puedes verificar directamente en el navegador:

1. **Firmante:** https://www.hcdn.gob.ar/diputados/sacevedo/listado-proyectos.html?tipoFirmante=firmante
   - Debería mostrar: "50 Proyectos Encontrados | Página 1 de 3"

2. **Cofirmante:** https://www.hcdn.gob.ar/diputados/sacevedo/listado-proyectos.html?tipoFirmante=cofirmante
   - Probablemente muestre: "0 Proyectos Encontrados" (normal)

## 📊 Resultado Final Esperado

### **Antes (con URLs incorrectas):**
```json
{
  "proyectosLeyFirmante": 0,
  "proyectosLeyCofirmante": 0
}
```

### **Después (con URLs corregidas):**
```json
{
  "proyectosLeyFirmante": 50,  // Número real del paginador
  "proyectosLeyCofirmante": 0   // Correcto si no es cofirmante
}
```

## 🚀 Próximo Paso

**Ejecutar el sync completo para actualizar todos los contadores en la BD:**

```bash
curl "http://localhost:3000/api/sync-diputados?apikey=dev-997e7e8d-982bd538-63c9431c"
```

¡Ahora los contadores de proyectos deberían funcionar correctamente! 🎉
