# Sistema de Scraping de Diputados - Documentación de APIs

## Nuevos Endpoints Creados

### 1. `/api/sync-diputados-completo` - Sincronización Completa de Diputados
**Método:** GET  
**Descripción:** Obtiene TODOS los diputados desde la página oficial https://www.diputados.gov.ar/diputados/ y los sincroniza con la base de datos.

#### Características:
- Extrae todos los diputados de la tabla oficial
- Obtiene detalles individuales de cada diputado (profesión, fecha nacimiento, email, etc.)
- Manejo inteligente de rate limiting con delays variables
- Control de errores robusto con reintentos
- Actualiza diputados existentes y crea nuevos

#### Ejemplo de uso:
```bash
curl -X GET "http://localhost:3001/api/sync-diputados-completo" \
  -H "x-api-key: tu-api-key"
```

#### Respuesta:
```json
{
  "success": true,
  "message": "Sincronización completa de diputados finalizada",
  "data": {
    "diputadosEncontrados": 257,
    "diputadosCreados": 12,
    "diputadosActualizados": 245,
    "errores": 0,
    "totalEnDB": 257
  }
}
```

---

### 2. `/api/sync-proyectos-mejorado` - Scraping Mejorado de Proyectos
**Método:** POST  
**Descripción:** Versión mejorada del scraping de proyectos con manejo especial para diputados con muchos proyectos.

#### Características:
- Delays inteligentes basados en el número de páginas
- Timeout de 30 segundos por request
- Control de reintentos con backoff exponencial
- Procesamiento por lotes para casos extremos
- Manejo especial para diputados con +50 páginas

#### Parámetros del body:
```json
{
  "limiteDiputados": 5,           // Número máximo de diputados a procesar
  "soloActivos": true,            // Solo diputados activos
  "diputadoEspecifico": "mcampagnoli", // Procesar solo un diputado específico
  "maxPaginasPorDiputado": 100    // Límite de páginas por seguridad
}
```

#### Ejemplo de uso para mcampagnoli:
```bash
curl -X POST "http://localhost:3001/api/sync-proyectos-mejorado" \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key" \
  -d '{
    "diputadoEspecifico": "mcampagnoli",
    "maxPaginasPorDiputado": 95
  }'
```

---

### 3. `/api/diagnostico-diputado` - Diagnóstico Detallado
**Método:** GET  
**Descripción:** Realiza un diagnóstico completo de un diputado específico para identificar problemas de scraping.

#### Parámetros de query:
- `slug`: Slug del diputado (default: 'mcampagnoli')
- `pagina`: Página a probar (default: 1)

#### Ejemplo de uso:
```bash
curl -X GET "http://localhost:3001/api/diagnostico-diputado?slug=mcampagnoli&pagina=1" \
  -H "x-api-key: tu-api-key"
```

#### Respuesta detallada:
```json
{
  "diputado": {
    "nombre": "Campagnoli, Marcela",
    "slug": "mcampagnoli",
    "_id": "..."
  },
  "diagnostico": {
    "firmante": {
      "paginaPrueba": 1,
      "totalProyectos": 1884,
      "totalPaginas": 95,
      "muestraProyectos": [
        {
          "expediente": "0001-D-2023",
          "tipo": "LEY",
          "fecha": "2023-03-01T00:00:00.000Z"
        }
      ],
      "tiempoRespuesta": 2340,
      "estado": "exitoso"
    },
    "cofirmante": {
      "paginaPrueba": 1,
      "totalProyectos": 245,
      "totalPaginas": 13,
      "muestraProyectos": [...],
      "tiempoRespuesta": 1890,
      "estado": "exitoso"
    }
  },
  "proyectosEnBD": {
    "totalFirmante": 150,
    "totalCofirmante": 45,
    "totalGeneral": 195
  },
  "recomendaciones": [
    "⚠️ Muchas páginas como firmante (95) - considerar procesamiento por lotes",
    "🚨 Total de 108 páginas - usar delays largos (3-5 segundos) entre requests",
    "📊 Diferencia significativa con BD (1934 proyectos) - necesario sincronización completa"
  ]
}
```

---

## Mejoras Implementadas

### 1. **Rate Limiting Inteligente**
- Delays variables según el volumen de páginas:
  - ≤20 páginas: 1 segundo entre páginas
  - 21-50 páginas: 1.5 segundos
  - 51-80 páginas: 2 segundos  
  - >80 páginas: 3 segundos
- Delay adicional aleatorio (±500ms) para evitar patrones

### 2. **Manejo de Errores Robusto**
- Reintentos con backoff exponencial
- Timeout de 30 segundos por request
- Continuación automática en caso de error en páginas individuales
- Logs detallados para debugging

### 3. **Optimización de Memoria**
- Procesamiento página por página
- Liberación de memoria entre requests
- Límites de seguridad configurables

### 4. **Monitoreo y Diagnóstico**
- Logs detallados de progreso
- Métricas de rendimiento
- Diagnóstico automático de problemas
- Recomendaciones específicas por caso

---

## Casos de Uso Recomendados

### Para mcampagnoli (1884 proyectos, 95 páginas):
```bash
# 1. Primero hacer diagnóstico
curl -X GET "http://localhost:3001/api/diagnostico-diputado?slug=mcampagnoli" \
  -H "x-api-key: tu-api-key"

# 2. Luego scraping específico con configuración optimizada
curl -X POST "http://localhost:3001/api/sync-proyectos-mejorado" \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key" \
  -d '{
    "diputadoEspecifico": "mcampagnoli",
    "maxPaginasPorDiputado": 95
  }'
```

### Para sincronización masiva:
```bash
# 1. Sincronizar todos los diputados
curl -X GET "http://localhost:3001/api/sync-diputados-completo" \
  -H "x-api-key: tu-api-key"

# 2. Luego procesar proyectos por lotes pequeños
curl -X POST "http://localhost:3001/api/sync-proyectos-mejorado" \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key" \
  -d '{
    "limiteDiputados": 3,
    "maxPaginasPorDiputado": 50
  }'
```

---

## Monitoreo de Progreso

Los endpoints proporcionan logs detallados en tiempo real:

```
🚀 Iniciando scraping completo para Campagnoli, Marcela (mcampagnoli)
📋 Procesando firmante para Campagnoli, Marcela...
📊 Campagnoli, Marcela - firmante: 1884 proyectos en 95 páginas
⏳ Esperando 3000ms antes de página 2/95...
📈 Progreso firmante: 10/95 páginas, 200 proyectos
📈 Progreso firmante: 20/95 páginas, 400 proyectos
...
✅ Completado firmante para Campagnoli, Marcela: 1884 proyectos
🎉 Scraping completo para Campagnoli, Marcela: 2129 proyectos totales
```

Esta implementación resuelve específicamente los problemas de scraping para diputados con grandes volúmenes de proyectos como mcampagnoli, proporcionando herramientas de diagnóstico y configuración flexible para manejar diferentes casos de uso.
