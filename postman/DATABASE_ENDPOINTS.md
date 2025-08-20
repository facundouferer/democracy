# 📊 Nuevos Endpoints de Base de Datos - Postman

## 🆕 Requests Adicionales para la Colección

### **1. Sincronización Completa**
- **Name:** `Sync - Guardar Todos los Diputados en BD`
- **Method:** GET
- **URL:** `{{base_url}}/api/sync-diputados`
- **Headers:** `X-API-Key: {{api_key}}`
- **Description:** ⚠️ PROCESO INTENSIVO - Scraping completo y guardado en MongoDB (puede tardar 10-15 minutos)

### **2. Consulta desde Base de Datos - Básica**
- **Name:** `BD - Lista Básica de Diputados`
- **Method:** GET
- **URL:** `{{base_url}}/api/diputados-bd`
- **Headers:** `X-API-Key: {{api_key}}`
- **Description:** Lista todos los diputados activos desde la base de datos (rápido)

### **3. Consulta con Filtros**
- **Name:** `BD - Filtros y Paginación`
- **Method:** GET
- **URL:** `{{base_url}}/api/diputados-bd?distrito=Buenos&limit=10&page=1&sort=nombre&direction=asc`
- **Headers:** `X-API-Key: {{api_key}}`
- **Description:** Diputados con filtros avanzados

### **4. Estadísticas por Bloque**
- **Name:** `BD - Filtrar por Bloque Político`
- **Method:** GET
- **URL:** `{{base_url}}/api/diputados-bd?bloque=Frente&limit=50`
- **Headers:** `X-API-Key: {{api_key}}`
- **Description:** Diputados de un bloque específico

### **5. Diputados Inactivos**
- **Name:** `BD - Diputados Inactivos`
- **Method:** GET
- **URL:** `{{base_url}}/api/diputados-bd?estado=inactivo`
- **Headers:** `X-API-Key: {{api_key}}`
- **Description:** Ver diputados que ya no están activos

## 🔄 Flujo de Trabajo Recomendado

### **Primera Vez:**
1. **Ejecutar Sync:** `Sync - Guardar Todos los Diputados en BD`
   - ⏱️ Tiempo estimado: 10-15 minutos
   - 📊 Resultado: Todos los diputados en la BD

2. **Verificar Datos:** `BD - Lista Básica de Diputados`
   - ⚡ Rápido (< 1 segundo)
   - ✅ Confirmar que se guardaron correctamente

### **Uso Regular:**
- **Para consultas rápidas:** Usar endpoints `/api/diputados-bd`
- **Para datos actualizados:** Usar endpoints `/api/diputados` (scraping directo)
- **Para actualizar BD:** Ejecutar `/api/sync-diputados` periódicamente

## 📈 Comparación de Performance

| Endpoint | Tiempo | Datos | Uso Recomendado |
|----------|--------|-------|-----------------|
| `/api/diputados` | 30-60s | Tiempo real | Datos más actuales |
| `/api/diputados-bd` | <1s | Desde BD | Consultas frecuentes |
| `/api/sync-diputados` | 10-15min | Actualiza BD | Mantenimiento |

## 🧪 Scripts de Test para Postman

### **Test para Sincronización:**
```javascript
pm.test("Sync completed successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.estadisticas).to.have.property('totalProcesados');
    pm.expect(jsonData.estadisticas.totalProcesados).to.be.above(200);
});

// Guardar estadísticas para tests siguientes
const stats = pm.response.json().estadisticas;
pm.environment.set("total_diputados", stats.totalProcesados);
```

### **Test para Consulta BD:**
```javascript
pm.test("Data retrieved from database", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.be.an('array');
    pm.expect(jsonData.data.length).to.be.above(0);
});

pm.test("Response includes pagination", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.paginacion).to.have.property('total');
    pm.expect(jsonData.paginacion).to.have.property('pagina');
});

pm.test("Response includes statistics", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.estadisticas).to.have.property('totalActivos');
    pm.expect(jsonData.estadisticas).to.have.property('porDistrito');
    pm.expect(jsonData.estadisticas).to.have.property('porBloque');
});
```

## 🎯 Variables de Entorno Adicionales

Agrega estas variables a tu environment de Postman:

```json
{
  "sync_timeout": "900000",  // 15 minutos para sync
  "db_base_url": "{{base_url}}/api/diputados-bd",
  "sync_url": "{{base_url}}/api/sync-diputados"
}
```

## 🚨 Consideraciones Importantes

1. **Timeout para Sync:** El endpoint de sincronización puede tardar mucho
   - Aumenta el timeout en Postman: Settings > General > Request timeout = 900000ms (15 min)

2. **Rate Limiting:** Para ser respetuosos con el servidor HCDN
   - El sync procesa de a 5 diputados por lote
   - Pausa de 1 segundo entre lotes

3. **Manejo de Errores:** El sync continúa aunque algunos diputados fallen
   - Revisa el array `errores` en la respuesta
   - Los errores individuales no detienen el proceso completo

¡Listo para probar la nueva funcionalidad de base de datos! 🚀
