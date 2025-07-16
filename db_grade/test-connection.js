const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    await mongoose.connect('mongodb://localhost:27017/gradeanalyticsDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connection successful!');
    
    // Test if we can access the grades collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    console.log('✅ Connection test completed successfully!');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('\nTo fix this:');
    console.log('1. Make sure MongoDB is installed and running');
    console.log('2. Start MongoDB service: mongod');
    console.log('3. Or if using MongoDB Atlas, update the connection string');
  }
}

testConnection(); 