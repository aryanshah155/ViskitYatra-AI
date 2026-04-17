# 🧠 Intelligent Route Planning System
The Intelligent Route Planning System is a comprehensive platform designed to provide users with the most efficient and safe routes between two points. The system utilizes machine learning algorithms, natural language processing, and geospatial data to optimize route planning. The project consists of a backend API built with Express.js, a frontend application built with React, and a machine learning service built with FastAPI.

## 🚀 Features
* **Route Optimization**: The system provides the most efficient routes between two points, taking into account traffic, road conditions, and other factors.
* **Natural Language Processing**: The system uses natural language processing to parse user queries and determine their intent and preferences.
* **Machine Learning**: The system utilizes machine learning algorithms to predict traffic and route information.
* **Geospatial Data**: The system uses geospatial data to provide accurate and up-to-date information about roads, traffic, and other factors that affect route planning.
* **User Authentication**: The system provides user authentication and authorization to ensure that only authorized users can access the system.

## 🛠️ Tech Stack
* **Backend**: Express.js, Node.js, PostgreSQL
* **Frontend**: React, React Router, React Hot Toast
* **Machine Learning**: FastAPI, Pydantic, Scikit-learn
* **Database**: PostgreSQL
* **APIs**: Google Generative AI API, Open Source Routing Machine (OSRM) API
* **Libraries**: Axios, Bcrypt, Jsonwebtoken, Dotenv
* **Tools**: Docker, Docker Compose

## 📦 Installation
To install the project, follow these steps:
1. Clone the repository: `git clone https://github.com/your-repo/intelligent-route-planning-system.git`
2. Install the dependencies: `npm install` or `yarn install`
3. Create a PostgreSQL database and update the `database.js` file with your database credentials.
4. Run the database initialization script: `psql -U your-username your-database < db/init.sql`
5. Start the backend API: `npm run start` or `yarn start`
6. Start the frontend application: `npm run start` or `yarn start` in the `frontend` directory

## 💻 Usage
To use the system, follow these steps:
1. Open the frontend application in your web browser: `http://localhost:3000`
2. Log in to the system using your username and password.
3. Enter your starting and ending points in the search bar.
4. Select your preferred route options, such as mode of transportation and route type.
5. Click the "Get Route" button to retrieve the optimized route.

## 📂 Project Structure
```markdown
.
├── backend
│   ├── src
│   │   ├── app.js
│   │   ├── routes
│   │   │   ├── auth.js
│   │   │   ├── multiModalRoute.js
│   │   │   └── ...
│   │   ├── services
│   │   │   ├── aiService.js
│   │   │   ├── mlService.js
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── frontend
│   ├── src
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components
│   │   │   ├── RoutePanel.jsx
│   │   │   ├── ResultsPage.jsx
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── db
│   ├── init.sql
│   └── ...
├── docker-compose.yml
└── ...
```

## 📸 Screenshots
<img width="1875" height="875" alt="image" src="https://github.com/user-attachments/assets/a814bd85-3696-4d92-8577-ea9bd804bc0e" />
<img width="1901" height="883" alt="image" src="https://github.com/user-attachments/assets/767968d8-53de-4139-be3e-6af400d59de3" />

