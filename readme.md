📱 FaceOff – Backend (Emotion Guessing Mobile App)

FaceOff is a backend service for a mobile emotion-guessing application, built using Node.js, Express, and TypeScript.
The application powers authentication, emotion data processing, file uploads, notifications, and admin management with a scalable and modular architecture.

This backend follows industry-standard folder structure and best practices to support mobile clients, admin dashboards, and third-party integrations.

🚀 Key Features

🔐 JWT-based Authentication & Authorization

👥 Role-based access (Admin / App / Shopify modules)

📦 Modular MVC-like Architecture

🗄️ MongoDB with Mongoose

☁️ AWS S3 File Uploads (Multer + S3)

📨 Email Notifications (Nodemailer & Templates)

📊 Centralized Logging (Winston + MongoDB)

📁 Validation using Joi

🔔 Push Notifications (FCM)

🧩 Reusable Services & Middleware

📱 Designed to support mobile application APIs

🛠️ Tech Stack

Backend

Node.js

Express.js

TypeScript

Database

MongoDB

Mongoose

Authentication & Security

JSON Web Token (JWT)

bcrypt

express-jwt

File & Media Handling

Multer

AWS S3

multer-s3

Utilities

Joi (validation)

Lodash

Moment.js

Email & Notifications

Nodemailer

Email Templates

Firebase Cloud Messaging (FCM)

Logging

Winston

Winston MongoDB Transport