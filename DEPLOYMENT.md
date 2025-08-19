# 🚀 Guía de Despliegue - Democracy API

## 📋 Resumen

Esta guía te muestra cómo desplegar la Democracy API de forma segura en producción, incluyendo la configuración de API Keys y variables de entorno.

## 🔐 Configuración de API Keys

### 1. Generación de API Keys Seguras

```bash
# Generar 3 API Keys por defecto
node scripts/generate-api-keys.js

# Generar 5 API Keys personalizadas
node scripts/generate-api-keys.js --count 5 --prefix "democracy"
```

### 2. Variables de Entorno Requeridas

```bash
API_KEYS=your-key-1,your-key-2,your-key-3
```

## 🌐 Despliegue por Plataforma

### Vercel (Recomendado)

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Configurar variables de entorno:**
   ```bash
   # Método 1: Via CLI
   vercel env add API_KEYS
   # Pega tus API Keys cuando se solicite

   # Método 2: Via Dashboard
   # Ir a https://vercel.com/dashboard
   # Seleccionar tu proyecto > Settings > Environment Variables
   # Agregar: API_KEYS = your-generated-keys
   ```

3. **Desplegar:**
   ```bash
   vercel --prod
   ```

### Railway

1. **Conectar repositorio:**
   - Ir a https://railway.app
   - Conectar tu repositorio de GitHub

2. **Configurar variables:**
   - Variables tab > New Variable
   - Nombre: `API_KEYS`
   - Valor: `your-generated-keys`

3. **Deploy automático:** Se despliega automáticamente

### Netlify

1. **Configurar build:**
   ```bash
   # Crear netlify.toml
   echo '[build]
   command = "npm run build"
   publish = ".next"

   [build.environment]
   NODE_VERSION = "18"' > netlify.toml
   ```

2. **Variables de entorno:**
   - Site settings > Environment variables
   - Agregar `API_KEYS`

### DigitalOcean App Platform

1. **Crear app.yaml:**
   ```yaml
   name: democracy-api
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/democracy
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: API_KEYS
       value: your-generated-keys
   ```

## 🔧 Configuración de Desarrollo vs Producción

### Desarrollo Local
```bash
# .env.local
API_KEYS=your-dev-key-1,your-dev-key-2,your-dev-key-3
```

### Producción
```bash
# Variables de entorno del servidor
API_KEYS=prod-a1b2c3d4-e5f67890-12345678,admin-9876543210-fedcba09-87654321,user-abcdef123456-7890abcd-ef123456
```

## 📡 Testing del Despliegue

### 1. Verificar autenticación:
```bash
# Sin API Key (debe fallar)
curl https://your-app.vercel.app/api/diputados

# Con API Key válida
curl -H "Authorization: Bearer your-api-key" https://your-app.vercel.app/api/diputados
```

### 2. Verificar endpoints:
```bash
# Info de autenticación (público)
curl https://your-app.vercel.app/api/auth/info

# Lista de diputados
curl -H "X-API-Key: your-api-key" https://your-app.vercel.app/api/diputados

# Diputado específico
curl https://your-app.vercel.app/api/diputados/apellido-nombre?apikey=your-api-key
```

## 🛡️ Seguridad en Producción

### Mejores Prácticas

1. **Rotación de Keys:**
   ```bash
   # Generar nuevas keys mensualmente
   node scripts/generate-api-keys.js --count 5 --prefix "democracy-$(date +%Y%m)"
   ```

2. **Logging de acceso:**
   - Monitorear uso de API Keys
   - Alertas por intentos no autorizados

3. **Rate Limiting:**
   - Implementar límites por API Key
   - Prevenir abuso del scraping

4. **HTTPS Obligatorio:**
   - Todas las comunicaciones cifradas
   - Headers de seguridad apropiados

### Variables de Entorno Adicionales (Opcionales)

```bash
# Límites de rate limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_REQUESTS_PER_HOUR=1000

# Configuración de CORS
ALLOWED_ORIGINS=https://your-frontend.com,https://your-admin-panel.com

# Logging
LOG_LEVEL=info
LOG_API_REQUESTS=true
```

## 📞 Distribución de API Keys

### Para Usuarios Finales

1. **Crear documentación de API:**
   ```markdown
   ## Obtener API Key
   
   1. Contacta a: admin@your-domain.com
   2. Proporciona: nombre, organización, uso previsto
   3. Recibirás tu API Key por email seguro
   
   ## Uso
   
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://your-api.com/api/diputados
   ```
   ```

2. **Email template para nuevos usuarios:**
   ```
   Asunto: Tu API Key para Democracy API
   
   Hola [NOMBRE],
   
   Tu API Key: [GENERATED_KEY]
   
   Documentación: https://your-api.com/docs
   Soporte: support@your-domain.com
   
   ⚠️ Mantén esta key segura y no la compartas.
   ```

## 🔍 Monitoreo

### Logs importantes a monitorear:

1. **Intentos de acceso no autorizados**
2. **Uso excesivo por API Key**
3. **Errores de scraping del sitio HCDN**
4. **Performance de endpoints**

### Herramientas recomendadas:

- **Vercel Analytics:** Métricas de uso automáticas
- **Sentry:** Monitoreo de errores
- **LogRocket:** Debugging de requests fallidas

## 🆘 Troubleshooting

### Error: "API_KEYS no configurado"
```bash
# Verificar variable de entorno
echo $API_KEYS

# Configurar en tu plataforma de deploy
vercel env add API_KEYS
```

### Error: "Acceso no autorizado"
```bash
# Verificar formato de API Key
curl -H "Authorization: Bearer YOUR_KEY" /api/diputados

# Verificar que la key esté en la lista
node -e "console.log(process.env.API_KEYS.split(','))"
```

### Rendimiento lento
```bash
# Verificar rate limiting
# Implementar caché para requests frecuentes
# Optimizar scraping con concurrencia controlada
```

---

## 📋 Checklist de Despliegue

- [ ] API Keys generadas con script seguro
- [ ] Variables de entorno configuradas en plataforma
- [ ] HTTPS configurado y funcionando
- [ ] Testing de endpoints con authentication
- [ ] Documentación de API actualizada
- [ ] Plan de distribución de API Keys
- [ ] Monitoreo y alertas configurados
- [ ] Backup de API Keys en lugar seguro
- [ ] Plan de rotación de keys establecido

¡Tu Democracy API está lista para producción! 🎉
