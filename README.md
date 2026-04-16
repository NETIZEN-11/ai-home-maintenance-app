# 🏠 AI Home Maintenance Assistant

An intelligent mobile application that leverages AI to help homeowners maintain their appliances and home systems efficiently. Upload images of your appliances, get AI-powered diagnostics, maintenance recommendations, and track your home maintenance history.

## 📱 Features

### 🤖 AI-Powered Analysis
- Upload images of appliances or home systems
- Get instant AI-powered diagnostics and recommendations
- Receive maintenance tips and troubleshooting guidance
- Identify potential issues before they become major problems

### 📋 Appliance Management
- Add and manage all your home appliances
- Track purchase dates, warranty information, and maintenance schedules
- Set reminders for regular maintenance tasks
- View complete maintenance history for each appliance

### 📊 Smart Dashboard
- Overview of all appliances and their status
- Upcoming maintenance reminders
- Recent AI analysis reports
- Quick access to frequently used features

### 🔔 Notifications
- Maintenance reminders
- Warranty expiration alerts
- AI analysis completion notifications
- Custom alerts for important updates

### 📄 Reports & History
- Generate detailed maintenance reports
- Export reports as PDF
- Track maintenance costs over time
- View complete appliance lifecycle data

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express.js** - RESTful API server
- **MongoDB** - Database for storing user data and appliance information
- **OpenAI API** - AI-powered image analysis and recommendations
- **JWT** - Secure authentication
- **Multer** - File upload handling
- **Bcrypt** - Password hashing

### Mobile App
- **React Native** - Cross-platform mobile development
- **Expo** - Development and build tooling
- **React Navigation** - Navigation management
- **Axios** - HTTP client for API calls
- **AsyncStorage** - Local data persistence
- **Expo Camera** - Camera integration for image capture

## 🚀 Deployment

### Deploy Backend to Render

1. **Create MongoDB Atlas Cluster** (free tier available):
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free cluster
   - Get your connection string

2. **Deploy on Render**:
   - Go to [render.com](https://render.com) and sign up
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder as root
   - Set environment variables:
     - `MONGO_URI` - Your MongoDB Atlas connection string
     - `JWT_SECRET` - At least 32 characters
     - `GEMINI_API_KEY` - (Optional) For AI features
     - `NODE_ENV` = `production`
   - Click "Deploy"

3. **Environment Variables on Render**:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/ai-hma
   JWT_SECRET=your-super-secret-key-at-least-32-characters-long
   NODE_ENV=production
   ```

### Important Notes

- **Uploads are ephemeral**: On Render's free tier, files uploaded to the server are deleted on each deploy. For production, consider using Cloudinary or AWS S3 for file storage.
- **Health Check**: Backend has `/health` endpoint at root path.
- **CORS**: Render domain is already configured in CORS settings.

## 📁 Project Structure

```
ai-home-maintenance-app/
├── backend/
│   ├── controllers/       # Request handlers
│   ├── models/           # Database schemas
│   ├── routes/           # API routes
│   ├── middleware/       # Authentication, validation, etc.
│   ├── services/         # Business logic (AI service)
│   ├── utils/            # Helper functions
│   └── server.js         # Entry point
│
└── mobile-app/
    ├── screens/          # App screens
    ├── components/       # Reusable UI components
    ├── navigation/       # Navigation configuration
    ├── services/         # API and Firebase services
    ├── context/          # React Context (Auth)
    ├── utils/            # Helper functions
    ├── constants/        # Theme and constants
    └── App.js            # Entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Expo CLI
- OpenAI API key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
```

4. Start the server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

### Mobile App Setup

1. Navigate to mobile-app directory:
```bash
cd mobile-app
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
API_URL=http://localhost:5000/api
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
```

4. Start Expo:
```bash
npx expo start
```

5. Scan QR code with Expo Go app (iOS/Android) or run on emulator

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Appliances
- `GET /api/appliances` - Get all user appliances
- `POST /api/appliances` - Add new appliance
- `PUT /api/appliances/:id` - Update appliance
- `DELETE /api/appliances/:id` - Delete appliance

### Media & AI Analysis
- `POST /api/media/upload` - Upload appliance image
- `POST /api/ai/analyze` - Get AI analysis for uploaded image

### Reports
- `GET /api/reports` - Get user reports
- `POST /api/reports/generate` - Generate new report

## 🎨 Screenshots

*Coming soon...*

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure file upload handling
- Environment variable protection

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**NETIZEN-11**

- GitHub: [@NETIZEN-11](https://github.com/NETIZEN-11)



---

⭐ **Star this repo if you find it helpful!** ⭐
