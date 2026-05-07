# MongoDB Property Seed Script

Yes — adding sample/seed data to GitHub is actually good practice for college/demo projects.

It helps:

* teammates quickly populate the DB
* demos work immediately
* reviewers/testers see realistic data
* frontend pages look complete

---

# 1. Create folder

Inside backend:

```bash
mkdir -p seeds
```

---

# 2. Create file

Create:

```txt
backend/seeds/properties.js
```

Paste this:

```js
const mongoose = require('mongoose');
require('dotenv').config();

const Property = require('../models/Property');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const properties = [
  {
    title: 'Luxury Villa in Hyderabad',
    slug: 'luxury-villa-hyderabad',
    description: 'Modern luxury villa with premium interiors and pool.',
    price: 25000000,
    listingType: 'sale',
    propertyType: 'villa',
    status: 'active',
    bedrooms: 4,
    bathrooms: 3,
    area: 3200,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'
      }
    ],
    address: {
      city: 'Hyderabad',
      state: 'Telangana'
    },
    location: {
      type: 'Point',
      coordinates: [78.4867, 17.3850]
    },
    agent: {
      firstName: 'Arnav',
      lastName: 'Sheelvant'
    }
  },
  {
    title: 'Skyline Luxury Apartment',
    slug: 'skyline-luxury-apartment',
    description: 'Elegant high-rise apartment with panoramic skyline views.',
    price: 18500000,
    listingType: 'sale',
    propertyType: 'apartment',
    status: 'active',
    bedrooms: 3,
    bathrooms: 2,
    area: 1850,
    photos: [
      {
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'
      }
    ],
    address: {
      city: 'Bangalore',
      state: 'Karnataka'
    },
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716]
    },
    agent: {
      firstName: 'Riya',
      lastName: 'Sharma'
    }
  }
];

const seedDB = async () => {
  try {
    await Property.deleteMany();
    console.log('Old properties removed');

    await Property.insertMany(properties);
    console.log('Sample properties inserted');

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
  }
};

seedDB();
```

---

# 3. Run the seed script

Inside backend:

```bash
node seeds/properties.js
```

You should see:

```txt
MongoDB Connected
Old properties removed
Sample properties inserted
```

---

# 4. Push to GitHub

```bash
git add backend/seeds/properties.js
git commit -m "Add sample property seed data"
git push
```

---

# 5. Add usage note to README (optional but professional)

Add:

```md
## Seed Sample Properties

cd backend
node seeds/properties.js
```

This makes the project easier for teammates/reviewers to run.
