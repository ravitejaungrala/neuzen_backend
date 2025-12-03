// backend/db.js - Fixed version
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Parse MongoDB URI from environment variables
const getMongoDBUri = () => {
  // If MONGODB_URI is provided in env, use it
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  
  // Otherwise, construct it from individual components
  const username = process.env.MONGODB_USERNAME || 'unvraviteja_db_user';
  const password = process.env.MONGODB_PASSWORD || '7OvBWcpfd3Ch82xa';
  const cluster = process.env.MONGODB_CLUSTER || 'raviteja.qofofnp.mongodb.net';
  const database = process.env.MONGODB_DATABASE || 'ai-hire-platform';
  
  return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Raviteja`;
};

const MONGODB_URI = getMongoDBUri();

// Connection options for Mongoose 7.x (updated)
const options = {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5, // Maintain at least 5 socket connections
  
  // Remove these deprecated options for Mongoose 7.x:
  // useNewUrlParser: true, // REMOVED - No longer needed in Mongoose 7.x
  // useUnifiedTopology: true, // REMOVED - No longer needed in Mongoose 7.x
  
  // Newer options you might want:
  retryWrites: true,
  w: 'majority',
};

// Cache the connection
let cachedConnection = null;

// Connect to MongoDB
const connectDB = async () => {
  // If we already have a connection, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection');
    return cachedConnection;
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log('📝 Connection URI:', MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password in logs
    
    const connection = await mongoose.connect(MONGODB_URI, options);
    
    cachedConnection = connection;
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName || 'Unknown'}`);
    console.log(`👤 Host: ${mongoose.connection.host || 'Unknown'}`);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
    
    // Retry logic (optional)
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
    
    throw error;
  }
};

// Check connection status
const checkConnection = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    status: states[state] || 'unknown',
    readyState: state,
    connected: state === 1,
    host: mongoose.connection.host || 'Unknown',
    database: mongoose.connection.db?.databaseName || 'Unknown'
  };
};

export { connectDB, checkConnection, mongoose };