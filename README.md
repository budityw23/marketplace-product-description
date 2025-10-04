# AI-Powered Marketplace Product Helper

An intelligent web application that helps online sellers generate professional product descriptions, SEO keywords, and categories using Google Gemini AI.

## 🚀 Features

- **User Authentication**: Secure JWT-based login and registration
- **Product Management**: Full CRUD operations for marketplace products
- **AI Content Generation**: Powered by Google Gemini API for:
  - Professional product descriptions
  - SEO-optimized keywords
  - Smart category suggestions
- **Multi-language Support**: English and Indonesian content generation
- **CSV Export**: Download product data with AI-generated content
- **Rate Limiting**: 5 AI generations per user per day
- **Responsive Design**: Mobile-first UI built with Next.js and Tailwind CSS

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Express.js, TypeScript, Prisma ORM, PostgreSQL
- **AI**: Google Gemini API (@google/generative-ai)
- **Authentication**: JWT with bcrypt password hashing
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Docker containerization

### Database Schema
```sql
User (id, email, passwordHash, role, createdAt, updatedAt)
Product (id, userId, title, price, attributes, imageUrl, category, createdAt, updatedAt)
AIContent (id, productId, description, keywords, category, model, language, createdAt)
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (via Docker)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd marketplace-product-description
   ```

2. **Start development environment**
   ```bash
   # Start PostgreSQL database
   docker-compose up -d postgres

   # Install backend dependencies and start server
   cd backend
   npm install
   npm run dev

   # Install frontend dependencies and start server (in new terminal)
   cd ../frontend
   npm install
   npm run dev
   ```

3. **Database setup**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   ```

4. **Environment variables**
   - Backend: Copy `.env.example` to `.env` and configure:
     ```
     DATABASE_URL="postgresql://user:password@localhost:5432/marketplace"
     GEMINI_API_KEY="your_gemini_api_key"
     JWT_SECRET="your_jwt_secret"
     ```
   - Frontend: `.env.local`:
     ```
     NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"
     ```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432
- **Prisma Studio**: `npx prisma studio --port 5555`

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Manual Testing

#### Authentication Flow
```bash
# Register new user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Product Management
```bash
# Set JWT token from login response
TOKEN="your_jwt_token_here"

# Create product
curl -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Wireless Headphones",
    "price": 99.99,
    "attributes": {"brand": "Sony", "color": "Black"},
    "category": "Electronics"
  }'

# List products
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/products

# Generate AI content
curl -X POST http://localhost:3001/ai/generate/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"language": "en"}'
```

#### Export Data
```bash
# Export products as CSV
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/export/products.csv \
  --output products.csv
```

## 📡 API Reference

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Products
- `GET /products` - List user's products (pagination, search)
- `POST /products` - Create new product
- `GET /products/:id` - Get single product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### AI Generation
- `POST /ai/generate` - Generate content from scratch
- `POST /ai/generate/:productId` - Generate content for existing product

### Export
- `GET /export/products.csv` - Download products as CSV

### Health
- `GET /health` - Health check endpoint

## 🚀 Production Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build individual services
docker build -t marketplace-backend ./backend
docker build -t marketplace-frontend ./frontend
```

### Environment Variables for Production
```bash
# Backend
DATABASE_URL="postgresql://user:password@host:5432/db"
GEMINI_API_KEY="your_production_gemini_key"
JWT_SECRET="strong_random_secret"
NODE_ENV="production"

# Frontend
NEXT_PUBLIC_BACKEND_URL="https://your-api-domain.com"
```

## 🔧 Development Guidelines

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Husky for git hooks

### Database Migrations
```bash
cd backend
npx prisma migrate dev --name migration_name
npx prisma generate
```

### Adding New Features
1. Update database schema if needed
2. Add backend API endpoints
3. Create frontend components and hooks
4. Add tests for new functionality
5. Update documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Google Gemini AI for content generation
- Next.js and Tailwind CSS communities
- Open source contributors

---

**Built with ❤️ for marketplace sellers worldwide**