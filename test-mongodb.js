// Test de conexión MongoDB
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://facundouferer:YsGCSm0ibByivoYW@cluster0.p0tiuea.mongodb.net/monitor?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔌 Probando conexión a MongoDB Atlas...');
console.log('📍 Database: monitor');
console.log('👤 Usuario: facundouferer');
console.log('🌐 IP configurada: 181.168.55.182/32');
console.log('');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ ¡CONEXIÓN EXITOSA A MONGODB!');
    console.log('🎉 La base de datos "monitor" está lista para usar');

    // Test básico: crear una colección temporal
    const testSchema = new mongoose.Schema({ test: String });
    const TestModel = mongoose.model('Test', testSchema);

    return TestModel.create({ test: 'conexion-exitosa' });
  })
  .then(() => {
    console.log('✅ Test de escritura exitoso');
    return mongoose.connection.close();
  })
  .then(() => {
    console.log('🔐 Conexión cerrada correctamente');
    console.log('');
    console.log('🚀 ¡TODO LISTO! Puedes ejecutar:');
    console.log('   npm run dev');
    console.log('   curl "http://localhost:3000/api/sync-diputados?apikey=dev-997e7e8d-982bd538-63c9431c"');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ ERROR DE CONEXIÓN:');
    console.error('');

    if (error.message.includes('IP')) {
      console.error('🚫 PROBLEMA DE IP:');
      console.error('   Tu IP actual no está en la whitelist de MongoDB Atlas');
      console.error('   IP reportada en el error vs IP configurada:');
      console.error('   - Configurada: 181.168.55.182/32');
      console.error('   - Verifica que coincida con tu IP actual');
      console.error('');
      console.error('💡 SOLUCIÓN:');
      console.error('   1. Ve a https://cloud.mongodb.com/');
      console.error('   2. Network Access → Add IP Address → "Add Current IP"');
      console.error('   3. O cambia a "Allow Access from Anywhere" (0.0.0.0/0) para desarrollo');
    } else if (error.message.includes('authentication')) {
      console.error('🔐 PROBLEMA DE AUTENTICACIÓN:');
      console.error('   Username o password incorrectos');
      console.error('   - Username: facundouferer');
      console.error('   - Password: YsGCSm0ibByivoYW');
      console.error('');
      console.error('💡 SOLUCIÓN:');
      console.error('   1. Ve a https://cloud.mongodb.com/');
      console.error('   2. Database Access → Verificar que el usuario existe');
      console.error('   3. Resetear password si es necesario');
    } else {
      console.error('📋 ERROR GENERAL:');
      console.error('   ' + error.message);
    }

    console.error('');
    console.error('🔍 ERROR COMPLETO:');
    console.error(error);
    process.exit(1);
  });
