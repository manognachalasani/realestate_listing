const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create geospatial index on properties collection after connection
    mongoose.connection.once('open', async () => {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const hasProperties = collections.some(c => c.name === 'properties');
        if (hasProperties) {
          await mongoose.connection.db.collection('properties')
            .createIndex({ 'location.coordinates': '2dsphere' });
          console.log('📍 Geospatial index ensured on properties.location.coordinates');
        }
      } catch (err) {
        console.warn('Geospatial index setup note:', err.message);
      }
    });
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
