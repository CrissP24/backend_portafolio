const { resetAdminUser } = require('../config/database');

async function setupAdmin() {
  try {
    console.log('🚀 Configurando usuario admin...');
    
    const result = await resetAdminUser();
    
    console.log('\n✅ Usuario admin configurado correctamente!');
    console.log('📧 Email:', result.email);
    console.log('🔑 Password:', result.password);
    console.log('\n🌐 Puedes acceder al panel admin en: http://localhost:3000/admin/login');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al configurar usuario admin:', error);
    process.exit(1);
  }
}

setupAdmin();
