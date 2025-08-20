# API de Scraping - Diputados Argentina 🔐

Esta aplicación realiza scraping al sitio web oficial de la Cámara de Diputados de Argentina (https://www.hcdn.gob.ar/diputados/) para obtener información actualizada de todos los diputados.

> ⚠️ **SEGURIDAD:** Este repositorio NO contiene API Keys reales. Debes generar tus propias keys antes de usar la aplicación.

## 🚀 Enlaces Rápidos

- **🔧 [Guía de Despliegue](./DEPLOYMENT.md)** - Configuración completa para producción
- **🔑 [Generar API Keys](./scripts/generate-api-keys.js)** - Script para crear keys seguras
- **📊 Demo Local:** http://localhost:3001 (después de `npm run dev`)

## 🔑 Autenticación

**IMPORTANTE:** Todos los endpoints están protegidos y requieren una API Key válida.

### Métodos de Autenticación

1. **Header Authorization (Recomendado)**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3001/api/diputados
   ```

2. **Header X-API-Key**
   ```bash
   curl -H "X-API-Key: YOUR_API_KEY" http://localhost:3001/api/diputados
   ```

3. **Query Parameter**
   ```bash
   curl "http://localhost:3001/api/diputados?apikey=YOUR_API_KEY"
   ```

### Generación de API Keys

```bash
# Generar API Keys seguras para desarrollo/producción
node scripts/generate-api-keys.js --count 3 --prefix "your-app"

# Esto generará keys como:
# your-app-a1b2c3d4-e5f67890-12345678
```

### Respuesta de Error de Autenticación

```json
{
  "success": false,
  "error": "API Key requerida",
  "message": "Acceso no autorizado. Proporciona una API Key válida.",
  "instructions": {
    "methods": [
      "Header: Authorization: Bearer YOUR_API_KEY",
      "Header: X-API-Key: YOUR_API_KEY", 
      "Query param: ?apikey=YOUR_API_KEY"
    ],
    "demoKeys": ["Genera keys con: node scripts/generate-api-keys.js"]
  }
}
```

## 📡 Endpoints

### 1. GET `/api/diputados` (Scraping en Tiempo Real)

Obtiene la lista completa de diputados con información detallada mediante scraping directo.

**Parámetros de consulta opcionales:**
- `limit`: Número de diputados con detalles completos (por defecto: 10)
- `details`: "false" para obtener solo información básica sin detalles individuales

### 2. GET `/api/sync-diputados` (Sincronización a Base de Datos)

**⚠️ IMPORTANTE: Proceso intensivo que puede tomar varios minutos**

Realiza scraping completo de todos los diputados y guarda la información en MongoDB. Este endpoint:
- Extrae información de TODOS los diputados
- Obtiene detalles individuales de cada uno
- Guarda/actualiza datos en base de datos
- Marca como inactivos los diputados que ya no están

**Respuesta:**
```json
{
  "success": true,
  "message": "Sincronización completada exitosamente",
  "estadisticas": {
    "totalEncontrados": 257,
    "totalProcesados": 257,
    "insertados": 12,
    "actualizados": 245,
    "inactivados": 3,
    "errores": 0,
    "tiempoFinalizacion": "2025-08-19T23:30:00.000Z"
  }
}
```

### 3. GET `/api/diputados-bd` (Consulta desde Base de Datos)

Consulta los datos almacenados en MongoDB (más rápido que scraping en tiempo real).

**Parámetros de consulta opcionales:**
- `limit`: Número de resultados por página
- `page`: Número de página (default: 1)
- `distrito`: Filtrar por distrito (búsqueda parcial)
- `bloque`: Filtrar por bloque político (búsqueda parcial)
- `estado`: "activo" o "inactivo" (default: "activo")
- `sort`: Campo para ordenar (default: "nombre")
- `direction`: "asc" o "desc" (default: "asc")

**Ejemplos:**
```bash
# Todos los diputados activos
GET /api/diputados-bd?apikey=YOUR_API_KEY

# Diputados de Buenos Aires, paginado
GET /api/diputados-bd?apikey=YOUR_API_KEY&distrito=Buenos&limit=20&page=1

# Diputados del Frente de Todos, ordenados por nombre desc
GET /api/diputados-bd?apikey=YOUR_API_KEY&bloque=Frente&sort=nombre&direction=desc
```

### 4. GET `/api/diputados/[slug]` (Diputado Individual)

**Ejemplos con autenticación:**
```bash
# Con header Authorization
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "http://localhost:3001/api/diputados?limit=5"

# Con header X-API-Key  
curl -H "X-API-Key: YOUR_API_KEY" \
     "http://localhost:3001/api/diputados?details=false"

# Con query parameter
curl "http://localhost:3001/api/diputados?apikey=YOUR_API_KEY&limit=10"
```

**Ejemplos:**
```
GET /api/diputados?apikey=YOUR_API_KEY                    # 10 diputados con detalles + resto básico
GET /api/diputados?apikey=YOUR_API_KEY&limit=5            # 5 diputados con detalles + resto básico  
GET /api/diputados?apikey=YOUR_API_KEY&limit=50           # 50 diputados con detalles + resto básico
GET /api/diputados?apikey=YOUR_API_KEY&details=false      # Todos los diputados solo info básica (rápido)
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Datos obtenidos con éxito",
  "count": 257,
  "detailedCount": 10,
  "data": [
    {
      "foto": "https://www.hcdn.gob.ar/fotos/diputados/...",
      "nombre": "ACEVEDO, Sergio Alejandro",
      "link": "https://www.hcdn.gob.ar/diputados/sacevedo",
      "distrito": "Catamarca",
      "mandato": "2021-2025",
      "inicioMandato": "2021-12-10",
      "finMandato": "2025-12-09", 
      "bloque": "Frente de Todos",
      "fotoCompleta": "https://www.hcdn.gob.ar/fotos/diputados/...",
      "profesion": "Abogado",
      "fechaNacimiento": "1962-05-30",
      "email": "sacevedo@diputados.gob.ar",
      "proyectosLeyFirmante": 15,
      "proyectosLeyCofirmante": 28
    }
  ]
### Respuesta de Scraping en Tiempo Real:

```json
{
  "success": true,
  "message": "Datos obtenidos con éxito",
  "count": 257,
  "detailedCount": 10,
  "data": [
    {
      "foto": "https://www.hcdn.gob.ar/fotos/diputados/...",
      "nombre": "ACEVEDO, Sergio Alejandro",
      "link": "https://www.hcdn.gob.ar/diputados/sacevedo",
      "distrito": "Catamarca",
      "mandato": "2021-2025",
      "inicioMandato": "2021-12-10",
      "finMandato": "2025-12-09", 
      "bloque": "Frente de Todos",
      "fotoCompleta": "https://www.hcdn.gob.ar/fotos/diputados/...",
      "profesion": "Abogado",
      "fechaNacimiento": "1962-05-30",
      "email": "sacevedo@diputados.gob.ar",
      "proyectosLeyFirmante": 15,
      "proyectosLeyCofirmante": 28
    }
  ]
}
```

Obtiene información detallada de un diputado específico usando su slug (identificador único).

**Parámetros:**
- `slug`: Identificador del diputado (ej: "sacevedo")

**Ejemplo:**
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
     "http://localhost:3001/api/diputados/sacevedo"
```

## 🚀 Instalación y Desarrollo

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   # Generar API Keys seguras para desarrollo
   node scripts/generate-api-keys.js --count 3 --prefix "dev"
   
   # Crear archivo de configuración local
   cp .env.local.example .env.local
   
   # Editar .env.local con tus credenciales:
   ```
   
   ```env
   # API Keys (separadas por comas) - usa las generadas arriba
   API_KEYS=dev-a1b2c3d4-e5f67890-12345678,dev-9876543210-fedcba09-87654321
   
   # MongoDB Connection - IMPORTANTE: database name = "monitor" (tu DB real)
   # ANTES de usar, configura en MongoDB Atlas:
   # 1. Network Access → Add IP → "Allow Access from Anywhere" (para desarrollo)
   # 2. Database Access → Add User → username/password
   # 3. Reemplaza: username, password, y asegúrate que termine en "/monitor"
   MONGODB_URI=mongodb+srv://democracy-user:tu_password_real@cluster0.p0tiuea.mongodb.net/monitor?retryWrites=true&w=majority&appName=Cluster0
   ```

3. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

4. **Probar la aplicación:**
   - **Frontend:** http://localhost:3000
   - **API Scraping:** http://localhost:3000/api/diputados?apikey=YOUR_KEY&limit=5
   - **API Base de Datos:** http://localhost:3000/api/diputados-bd?apikey=YOUR_KEY&limit=5
   - **Sincronización:** http://localhost:3000/api/sync-diputados?apikey=YOUR_KEY
   - **Info de autenticación:** http://localhost:3000/api/auth/info

5. **Primera vez - Poblar la base de datos:**
   ```bash
   # Esto toma 10-15 minutos pero solo se hace una vez
   curl "http://localhost:3000/api/sync-diputados?apikey=dev-a1b2c3d4-e5f67890-12345678"
   ```

## 🏗️ Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── diputados/
│   │   │   ├── route.ts          # Scraping directo
│   │   │   └── [slug]/route.ts   # Endpoint individual
│   │   ├── diputados-bd/
│   │   │   └── route.ts          # Consulta desde MongoDB
│   │   ├── sync-diputados/
│   │   │   └── route.ts          # Sincronización completa BD
│   │   └── auth/
│   │       └── info/route.ts     # Info de autenticación
│   ├── page.tsx                  # Interfaz frontend
│   └── layout.tsx
├── lib/
│   ├── auth.ts                   # Middleware de autenticación
│   └── mongodb.ts                # Conexión MongoDB
├── models/
│   └── Diputado.ts               # Schema Mongoose
└── scripts/
    └── generate-api-keys.js      # Generador de API Keys
```

## 📊 Comparación de Endpoints

| Característica | `/api/diputados` | `/api/diputados-bd` |
|----------------|------------------|---------------------|
| **Fuente de datos** | Scraping directo | Base de datos MongoDB |
| **Tiempo de respuesta** | 30-60 segundos | < 1 segundo |
| **Datos** | Siempre actualizados | Actualizados por sync |
| **Uso recomendado** | Datos críticos actuales | Consultas frecuentes |
| **Filtros** | Limitados | Avanzados con paginación |
| **Estadísticas** | No incluye | Estadísticas completas |

## 🔄 Flujo de Trabajo Recomendado

1. **Primera vez:** Ejecutar `/api/sync-diputados` para poblar la BD (10-15 min)
2. **Uso diario:** Consultar `/api/diputados-bd` para obtener datos rápidos
3. **Datos críticos:** Usar `/api/diputados` cuando necesites información actualizada al minuto
4. **Mantenimiento:** Ejecutar sync periódicamente (semanal/mensual)

## 🔍 Características

### Datos Básicos (de la tabla principal)
- `foto`: URL de la imagen del diputado (pequeña)
- `nombre`: Nombre completo del diputado
- `link`: URL al perfil individual del diputado
- `distrito`: Provincia o distrito que representa
- `mandato`: Período del mandato (ej: "2021-2025")
- `inicioMandato`: Fecha de inicio del mandato
- `finMandato`: Fecha de finalización del mandato
- `bloque`: Bloque político al que pertenece

### Detalles Individuales (del perfil personal)
- `fotoCompleta`: Imagen en tamaño completo desde el perfil
- `profesion`: Profesión del diputado
- `fechaNacimiento`: Fecha de nacimiento
- `email`: Correo electrónico oficial

### Actividad Legislativa (de las páginas de proyectos)
- `proyectosLeyFirmante`: Cantidad de proyectos de LEY como firmante principal
- `proyectosLeyCofirmante`: Cantidad de proyectos de LEY como cofirmante

## 🚀 Despliegue en Producción

### Configuración Rápida

1. **Generar API Keys seguras:**
   ```bash
   node scripts/generate-api-keys.js --count 3 --prefix "democracy"
   ```

2. **Configurar variables de entorno:**
   ```bash
   # En tu plataforma de deploy (Vercel, Railway, etc.)
   API_KEYS=your-generated-key-1,your-generated-key-2,your-generated-key-3
   ```

3. **Desplegar:**
   ```bash
   # Vercel
   vercel --prod
   
   # Railway
   # Deploy automático desde GitHub
   
   # Netlify
   npm run build && netlify deploy --prod
   ```

### Plataformas Compatibles

- ✅ **Vercel** (Recomendado) - Deploy automático, fácil configuración de env vars
- ✅ **Railway** - Perfecto para APIs, buena performance 
- ✅ **Netlify** - Funciona bien con Next.js
- ✅ **DigitalOcean App Platform** - Control total del servidor
- ✅ **AWS Amplify** - Integración con AWS services

### 📖 Documentación Completa

Ver **[DEPLOYMENT.md](./DEPLOYMENT.md)** para guía detallada que incluye:

- 🔐 Generación de API Keys seguras
- 🌐 Configuración por plataforma de deploy
- 🛡️ Mejores prácticas de seguridad
- 📊 Monitoreo y alertas
- 🔄 Rotación de keys
- 🆘 Troubleshooting común

### Testing del Deploy

```bash
# Verificar que funciona
curl -H "Authorization: Bearer YOUR_API_KEY" https://your-app.vercel.app/api/diputados

# Endpoint público de info
curl https://your-app.vercel.app/api/auth/info
```

---

**⚠️ Recuerda:** En producción, nunca uses las API Keys de desarrollo. Genera keys seguras y configúralas como variables de entorno.
