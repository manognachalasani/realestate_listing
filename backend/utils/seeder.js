require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Property = require('../models/Property');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear existing data
  await User.deleteMany({});
  await Property.deleteMany({});
  console.log('Cleared existing data');

  // Create agents and buyer with hashed password
  const salt = await bcrypt.genSalt(12);
  const hashedPw = await bcrypt.hash('password123', salt);

  const agents = await User.insertMany([
    {
      firstName: 'Sarah', 
      lastName: 'Mitchell',
      email: 'sarah@estatehub.com', 
      password: hashedPw, 
      role: 'agent', 
      phone: '555-0101',
      isActive: true,
      agentProfile: {
        licenseNumber: 'RE-001-2019', 
        agency: 'EstateHub Realty',
        bio: 'Specializing in luxury homes and waterfront properties for 10+ years.',
        specializations: ['residential', 'luxury', 'land'],
        yearsOfExperience: 10, 
        verified: true, 
        rating: 4.9, 
        reviewCount: 87,
      },
    },
    {
      firstName: 'James', 
      lastName: 'Thornton',
      email: 'james@estatehub.com', 
      password: hashedPw, 
      role: 'agent', 
      phone: '555-0102',
      isActive: true,
      agentProfile: {
        licenseNumber: 'RE-002-2020', 
        agency: 'Prime Properties',
        bio: 'First-time buyer specialist with a passion for finding perfect homes.',
        specializations: ['residential', 'rental', 'new-development'],
        yearsOfExperience: 6, 
        verified: true, 
        rating: 4.7, 
        reviewCount: 52,
      },
    },
  ]);

  // Create buyer
  await User.create({
    firstName: 'Emma', 
    lastName: 'Clarke',
    email: 'emma@example.com', 
    password: hashedPw, 
    role: 'buyer', 
    phone: '555-0201',
    isActive: true,
  });

  console.log('Users created');

  // Create properties
  const propertyData = [
    {
      title: 'Stunning Modern Villa with Ocean Views',
      description: 'Experience coastal living at its finest in this architecturally designed villa. Floor-to-ceiling windows frame breathtaking ocean views from every room. The open-plan living area flows seamlessly to an expansive deck with infinity pool.',
      propertyType: 'villa', 
      listingType: 'sale', 
      price: 2850000,
      bedrooms: 5, 
      bathrooms: 4, 
      garages: 2, 
      area: 4200, 
      yearBuilt: 2020, 
      floors: 2,
      furnished: 'fully-furnished',
      address: { 
        street: '1 Ocean Drive', 
        city: 'Malibu', 
        state: 'CA', 
        zipCode: '90265', 
        country: 'USA' 
      },
      location: { 
        type: 'Point', 
        coordinates: [-118.7798, 34.0259] // [longitude, latitude]
      },
      neighborhood: 'Carbon Beach',
      amenities: ['Swimming Pool', 'Home Theater', 'Smart Home', 'Wine Cellar', 'Gym', 'Beach Access'],
      features: ['Ocean View', 'Infinity Pool', 'Smart Home System'],
      virtualTourUrl: 'https://my.matterport.com/show/?m=example1',
      photos: [
        { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200', isPrimary: true, caption: 'Front Exterior' },
        { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200', caption: 'Living Room' },
        { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200', caption: 'Master Bedroom' },
      ],
      agent: agents[0]._id, 
      status: 'active',
    },
    {
      title: 'Downtown Manhattan Penthouse',
      description: 'Iconic penthouse living in the heart of Manhattan. This exceptional residence spans the entire top floor with 360-degree city views. Features include a private rooftop terrace, bespoke chef\'s kitchen, and concierge service.',
      propertyType: 'apartment', 
      listingType: 'sale', 
      price: 4500000,
      bedrooms: 3, 
      bathrooms: 3, 
      garages: 2, 
      area: 3100, 
      yearBuilt: 2018,
      furnished: 'fully-furnished',
      address: { 
        street: '432 Park Avenue, PH', 
        city: 'New York', 
        state: 'NY', 
        zipCode: '10022', 
        country: 'USA' 
      },
      location: { 
        type: 'Point', 
        coordinates: [-73.9713, 40.7614] // [longitude, latitude]
      },
      neighborhood: 'Midtown East',
      amenities: ['Concierge', 'Rooftop Terrace', 'Gym', 'Spa', 'Valet Parking'],
      features: ['360 Views', 'Private Elevator', 'Wine Storage'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1560448075-bb485b067938?w=1200', isPrimary: true, caption: 'Living Area' },
        { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200', caption: 'Kitchen' },
      ],
      agent: agents[0]._id, 
      status: 'active',
    },
    {
      title: 'Charming Craftsman Bungalow',
      description: 'Beautifully restored 1920s craftsman bungalow blending original character with modern updates. Original hardwood floors, built-in bookshelves, and a craftsman fireplace create a warm and inviting atmosphere.',
      propertyType: 'house', 
      listingType: 'sale', 
      price: 895000,
      bedrooms: 3, 
      bathrooms: 2, 
      garages: 1, 
      area: 1850, 
      yearBuilt: 1924, 
      floors: 1,
      furnished: 'unfurnished',
      address: { 
        street: '742 Maple Street', 
        city: 'Pasadena', 
        state: 'CA', 
        zipCode: '91101', 
        country: 'USA' 
      },
      location: { 
        type: 'Point', 
        coordinates: [-118.1445, 34.1478] // [longitude, latitude]
      },
      neighborhood: 'Old Town Pasadena',
      amenities: ['Hardwood Floors', 'Fireplace', 'Garden', 'Porch', 'Updated Kitchen'],
      features: ['Original Details', 'Updated Systems', 'Landscaped Garden'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200', isPrimary: true, caption: 'Front Exterior' },
        { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200', caption: 'Living Room' },
      ],
      agent: agents[1]._id, 
      status: 'active',
    },
    {
      title: 'Contemporary City Apartment for Rent',
      description: 'Sleek, modern apartment in a premium downtown building. High ceilings, designer finishes, and an open-plan layout make this the perfect urban retreat. Walking distance to restaurants, galleries, and transit.',
      propertyType: 'apartment', 
      listingType: 'rent', 
      price: 3800,
      bedrooms: 2, 
      bathrooms: 2, 
      garages: 1, 
      area: 1100, 
      yearBuilt: 2021,
      furnished: 'semi-furnished',
      address: { 
        street: '55 West Loop Drive', 
        city: 'Chicago', 
        state: 'IL', 
        zipCode: '60601', 
        country: 'USA' 
      },
      location: { 
        type: 'Point', 
        coordinates: [-87.6298, 41.8827] // [longitude, latitude]
      },
      neighborhood: 'The Loop',
      amenities: ['Rooftop Deck', 'Gym', 'Doorman', 'Pet Friendly', 'In-unit Laundry'],
      features: ['City View', 'Modern Finishes', 'Transit Access'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200', isPrimary: true, caption: 'Living Area' },
      ],
      agent: agents[1]._id, 
      status: 'active',
    },
    {
      title: 'Lakefront Family Home with Dock',
      description: 'Exceptional waterfront property offering serene lake living. This spacious family home features a private dock, boat garage, and wraparound porch with stunning lake views. Fully updated kitchen and bathrooms.',
      propertyType: 'house', 
      listingType: 'sale', 
      price: 1250000,
      bedrooms: 4, 
      bathrooms: 3, 
      garages: 2, 
      area: 3200, 
      yearBuilt: 1998, 
      floors: 2,
      furnished: 'unfurnished',
      address: { 
        street: '88 Lakeview Lane', 
        city: 'Lake Geneva', 
        state: 'WI', 
        zipCode: '53147', 
        country: 'USA' 
      },
      location: { 
        type: 'Point', 
        coordinates: [-88.4334, 42.5917] // [longitude, latitude]
      },
      neighborhood: 'Lakeshore',
      amenities: ['Private Dock', 'Boat Garage', 'Wraparound Porch', 'Lake Views', 'Fireplace', 'Mudroom'],
      features: ['Lakefront', 'Private Dock', 'Boat Access'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200', isPrimary: true, caption: 'Lakeside View' },
      ],
      agent: agents[0]._id, 
      status: 'active',
    },
    {
      title: 'Modern Townhouse in Historic District',
      description: 'Newly built townhouse in one of the city\'s most sought-after historic neighborhoods. Three levels of thoughtfully designed living space with rooftop access, private courtyard, and high-end finishes throughout.',
      propertyType: 'townhouse', 
      listingType: 'sale', 
      price: 780000,
      bedrooms: 3, 
      bathrooms: 2, 
      garages: 1, 
      area: 2000, 
      yearBuilt: 2022, 
      floors: 3,
      furnished: 'unfurnished',
      address: { 
        street: '22 Beacon Street', 
        city: 'Boston', 
        state: 'MA', 
        zipCode: '02108', 
        country: 'USA' 
      },
      location: { 
        type: 'Point', 
        coordinates: [-71.0699, 42.3576] // [longitude, latitude]
      },
      neighborhood: 'Beacon Hill',
      amenities: ['Rooftop Access', 'Private Courtyard', 'Smart Home', 'EV Charging', 'Bike Storage'],
      features: ['New Construction', 'Historic District', 'Green Building'],
      photos: [
        { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200', isPrimary: true, caption: 'Front Entrance' },
      ],
      agent: agents[1]._id, 
      status: 'active',
    },
  ];

  const properties = await Property.insertMany(propertyData);
  console.log('Properties created');

  // Ensure geospatial index exists
  try {
    await Property.collection.createIndex({ 'location.coordinates': '2dsphere' });
    console.log('✅ Geospatial index ensured');
  } catch (error) {
    console.warn('⚠️  Geospatial index might already exist:', error.message);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Database Seeded Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👤 ${agents.length + 1} users created`);
  console.log(`   - 2 Agents: sarah@estatehub.com, james@estatehub.com`);
  console.log(`   - 1 Buyer: emma@example.com`);
  console.log(`🏠 ${properties.length} properties created`);
  console.log(`🔑 All passwords: password123`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});