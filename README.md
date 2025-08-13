# Smart Study Planner

A full-stack web application for intelligent study planning and progress tracking.

## Features

- **User Authentication**: Secure JWT-based login/register system
- **Weekly Timetable**: Drag-and-drop study planner with visual scheduling
- **Daily To-Do Lists**: Auto-generated tasks from your study plan
- **Subject Management**: Organize subjects with goals and progress tracking
- **Progress Analytics**: Visual charts showing study progress per subject
- **Email Reminders**: Daily notifications via AWS SES
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## Tech Stack

### Frontend
- React.js with functional components
- Tailwind CSS for styling
- React DnD for drag-and-drop functionality
- Chart.js for progress visualization

### Backend
- Node.js with Express.js
- PostgreSQL database (AWS RDS compatible)
- JWT authentication with bcrypt
- AWS SES for email notifications

### Infrastructure
- Docker containerization
- AWS ECS Fargate deployment
- AWS ECR for container registry
- GitHub Actions CI/CD pipeline
- AWS CloudWatch logging

## Project Structure

```
smart-study-planner/
├── frontend/                 # React.js frontend application
├── backend/                  # Node.js Express.js backend
├── infrastructure/           # AWS deployment configurations
├── docker-compose.yml        # Local development setup
├── .github/                  # GitHub Actions workflows
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL database
- AWS account (for production deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-study-planner
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit the .env files with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Manual Setup

#### Backend Setup
```bash
cd backend
npm install
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Study Planning Endpoints
- `GET /api/subjects` - Get user subjects
- `POST /api/subjects` - Create new subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

- `GET /api/planner-slots` - Get planner slots
- `POST /api/planner-slots` - Create planner slot
- `PUT /api/planner-slots/:id` - Update planner slot
- `DELETE /api/planner-slots/:id` - Delete planner slot

- `GET /api/todos` - Get todos
- `POST /api/todos` - Create todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo

## Deployment

### AWS Deployment

1. **Set up AWS credentials**
2. **Configure environment variables**
3. **Deploy using GitHub Actions**

The application will be automatically deployed to AWS ECS Fargate when you push to the main branch.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License 