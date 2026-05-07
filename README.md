# 🏠 Real Estate Listing Platform

A full-stack property listing platform built with the MERN stack.

---

## Project Structure

```bash
real-estate-platform/
├── backend/          # Node.js + Express + MongoDB API
├── frontend/         # React JS with Leaflet.js maps
└── jsp-brochure/     # Java JSP for print-ready PDF brochures
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB + Mongoose |
| Backend | Node.js + Express.js |
| Frontend | React JS + Leaflet.js |
| Maps | Leaflet.js |
| File Uploads | Cloudinary |
| Email | Nodemailer |
| PDF Brochures | JSP + iText |
| Auth | JWT |

---

# 📦 Prerequisites

Before running the project, install the following:

- Node.js
- npm
- MongoDB
- Java JDK 17+
- Maven

---

# 🖥️ Platform Notes

## Windows

### Installations
- [Node.js](https://nodejs.org?utm_source=chatgpt.com)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community?utm_source=chatgpt.com)
- [Java JDK](https://www.oracle.com/java/technologies/downloads/?utm_source=chatgpt.com)
- [Apache Maven](https://maven.apache.org/download.cgi?utm_source=chatgpt.com)

### Notes
Use:

```bash
copy .env.example .env
```

instead of:

```bash
cp .env.example .env
```

If Maven is not recognized:

- Add Maven to PATH
- Restart terminal/VS Code

To start MongoDB manually:

```bash
net start MongoDB
```

---

## macOS

### Recommended Installation Method

Install Homebrew:

[Homebrew](https://brew.sh?utm_source=chatgpt.com)

Then install dependencies:

```bash
brew install node
brew install mongodb-community
brew install maven
```

Start MongoDB:

```bash
brew services start mongodb-community
```

---

## Linux (Ubuntu/Debian)

Install dependencies:

```bash
sudo apt update
sudo apt install nodejs npm openjdk-17-jdk maven
```

MongoDB may require adding the official MongoDB repository separately.

---

# 🚀 Quick Start

## Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Windows Users

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

---

## Frontend

```bash
cd frontend
npm install
npm start
```

---

## JSP Brochure Server

```bash
cd jsp-brochure
mvn tomcat7:run
```

Visit:

```bash
http://localhost:8080/brochure?propertyId=PROPERTY_ID
```

### Alternative Maven Commands

If `tomcat7:run` does not work:

```bash
mvn clean package
```

or

```bash
mvn tomcat7:deploy
```

depending on your Maven/Tomcat configuration.

---

# 🔐 Environment Variables (backend/.env)

```env
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

---

# 📡 API Endpoints

## Auth

- `POST /api/auth/register` - Register agent/buyer
- `POST /api/auth/login` - Login

---

## Properties

- `GET /api/properties` - Search & filter properties
- `POST /api/properties` - Create listing (agent only)
- `GET /api/properties/:id` - Property detail
- `PUT /api/properties/:id` - Update listing (agent only)
- `DELETE /api/properties/:id` - Delete listing (agent only)
- `GET /api/properties/nearby` - Geospatial nearby search

---

## Enquiries

- `POST /api/enquiries` - Submit enquiry
- `GET /api/enquiries/agent` - Agent's received enquiries
- `PATCH /api/enquiries/:id/status` - Update status

---

## Upload

- `POST /api/upload/photos` - Upload property photos
- `POST /api/upload/floorplan` - Upload floor plan

---

## JSP Brochure

- `GET /brochure?propertyId=ID` - Print-ready HTML/PDF brochure

---

# ✨ Features

- User authentication with JWT
- Agent & buyer roles
- Property listing management
- Property image uploads via Cloudinary
- Interactive maps using Leaflet.js
- Nearby property search
- Email enquiry system
- Printable PDF brochures using JSP + iText
- Responsive frontend UI

---

# 🛠️ Future Improvements

- Property wishlist/favorites
- Payment integration
- Advanced analytics dashboard
- Real-time chat between buyers and agents
- AI-based property recommendations
- Multi-language support

---
