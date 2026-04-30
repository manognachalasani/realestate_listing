# 🏠 Real Estate Listing Platform

A full-stack property listing platform built with the MERN stack.

## Project Structure

```
real-estate-platform/
├── backend/          # Node.js + Express + MongoDB API
├── frontend/         # React JS with Leaflet.js maps
└── jsp-brochure/     # Java JSP for print-ready PDF brochures
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB + Mongoose |
| Backend | Node.js + Express.js |
| Frontend | React JS + Leaflet.js |
| File Uploads | Cloudinary |
| Email | Nodemailer |
| PDF Brochures | JSP + iText |
| Auth | JWT |

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # Fill in your credentials
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### JSP Brochure Server
```bash
cd jsp-brochure
mvn tomcat7:run
# Visit http://localhost:8080/brochure?propertyId=PROPERTY_ID
```

## Environment Variables (backend/.env)

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/realestate
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:3000
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register agent/buyer
- `POST /api/auth/login` - Login

### Properties
- `GET /api/properties` - Search & filter properties
- `POST /api/properties` - Create listing (agent only)
- `GET /api/properties/:id` - Property detail
- `PUT /api/properties/:id` - Update listing (agent only)
- `DELETE /api/properties/:id` - Delete listing (agent only)
- `GET /api/properties/nearby` - Geospatial nearby search

### Enquiries
- `POST /api/enquiries` - Submit enquiry
- `GET /api/enquiries/agent` - Agent's received enquiries
- `PATCH /api/enquiries/:id/status` - Update status

### Upload
- `POST /api/upload/photos` - Upload property photos
- `POST /api/upload/floorplan` - Upload floor plan

### JSP Brochure
- `GET /brochure?propertyId=ID` - Print-ready HTML/PDF brochure
