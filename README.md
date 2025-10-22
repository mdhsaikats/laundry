# LaundryPro - Premium Laundry Service Application

A modern, full-stack laundry service management application built with pure HTML5, Tailwind CSS, JavaScript on the frontend and Go (Golang) on the backend.

## 🚀 Features

### Customer Portal
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Item Management**: Browse various laundry items with pricing
- **Service Selection**: Choose from multiple service types (Wash, Dry Clean, Iron, etc.)
- **Order Management**: Create and track laundry orders
- **Order History**: View complete order history with status tracking
- **Responsive Design**: Beautiful dark-themed UI with Tailwind CSS

### Admin Dashboard
- **Order Management**: View and manage all customer orders
- **Real-time Statistics**: Dashboard with order counts and status breakdown
- **Status Updates**: Update order status (Pending → Processing → Ready → Delivered)
- **Customer Information**: Access customer details for each order
- **Order Filtering**: Filter orders by status
- **Order Details Modal**: Detailed view of each order with all items and services

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup
- **Tailwind CSS**: Utility-first CSS framework (via CDN)
- **Pure JavaScript**: No frameworks, vanilla JS for complete control

### Backend
- **Go (Golang)**: High-performance backend server
- **Chi Router**: Lightweight HTTP router
- **JWT**: JSON Web Tokens for authentication
- **bcrypt**: Secure password hashing
- **PostgreSQL**: Robust relational database

## 📁 Project Structure

```
laundry/
├── index.html              # Main customer-facing HTML file
├── styles.css             # Custom CSS styles
├── app.js                 # Frontend JavaScript application
├── admin/                 # Admin dashboard
│   ├── index.html         # Admin panel HTML
│   ├── admin.js           # Admin JavaScript
│   ├── styles.css         # Admin styles
│   └── README.md          # Admin documentation
├── database/
│   └── schema.sql         # Database schema
├── backend/
│   ├── main.go            # Go backend server
│   ├── go.mod             # Go module file
│   ├── go.sum             # Go dependencies checksum
│   ├── .env.example       # Environment variables example
│   └── README.md          # Backend documentation
└── README.md              # This file
```

## 🚦 Getting Started

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 12 or higher
- A modern web browser
- A simple HTTP server for frontend (optional, for development)

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb laundry
```

2. Run the schema:
```bash
psql -d laundry -f database/schema.sql
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Copy the environment variables:
```bash
copy .env.example .env
```

3. Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=laundry
JWT_SECRET=your-super-secret-jwt-key
PORT=8080
```

4. Install Go dependencies:
```bash
go mod download
```

5. Run the backend server:
```bash
go run main.go
```

The backend will start on `http://localhost:8080`

### Frontend Setup

You can serve the frontend files using any static file server. Here are a few options:

**Option 1: Python**
```bash
# Python 3
python -m http.server 3000
```

**Option 2: Node.js (http-server)**
```bash
npx http-server -p 3000
```

**Option 3: PHP**
```bash
php -S localhost:3000
```

Then open your browser to:
- Customer Portal: `http://localhost:3000`
- Admin Dashboard: `http://localhost:3000/admin`

## 📡 API Endpoints

### Public Endpoints

- `POST /api/auth/register` - Register a new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe"
  }
  ```

- `POST /api/auth/login` - Login user (works for both customers and admins)
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Protected Endpoints (Require JWT Token)

#### Customer Endpoints
- `GET /api/items` - Get all laundry items
- `GET /api/services` - Get all services
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create a new order

#### Admin Endpoints
- `GET /api/admin/orders` - Get all orders from all customers
- `PUT /api/admin/orders/:orderID/status` - Update order status
  ```json
  {
    "status": "processing"
  }
  ```
  Valid statuses: `pending`, `processing`, `ready`, `delivered`, `cancelled`

## 🎨 Design Features

- **Dark Theme**: Modern black and zinc color scheme
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Smooth Transitions**: Polished animations and interactions
- **Custom Scrollbars**: Styled scrollbars for better UX
- **Loading States**: Visual feedback during operations
- **Error Handling**: User-friendly error messages

## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Secure HTTP headers
- CORS configuration
- SQL injection prevention with parameterized queries

## 🏗️ Building for Production

### Backend

Build the Go binary:
```bash
cd backend
go build -o laundry-server main.go
```

Run the binary:
```bash
./laundry-server
```

### Frontend

The frontend is already optimized as it uses:
- Tailwind CSS via CDN
- Pure JavaScript (no build step needed)

Simply serve the HTML, CSS, and JS files using any web server (Nginx, Apache, etc.)

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | postgres |
| `DB_NAME` | Database name | laundry |
| `JWT_SECRET` | Secret key for JWT | (required) |
| `PORT` | Backend server port | 8080 |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🆕 Recent Updates

### Version 2.0 - Enhanced Admin Features

**New Features:**
- ✅ **Role-Based Access Control**: Admin, customer, and staff roles
- ✅ **Advanced Search**: Search orders by customer name, email, or ID
- ✅ **Enhanced Statistics**: Real-time business metrics dashboard
- ✅ **Order History Tracking**: Audit trail for all status changes
- ✅ **Performance Optimizations**: Database indexes for faster queries
- ✅ **Admin Middleware**: Secure admin-only endpoints

**See `IMPLEMENTATION_SUMMARY.md` for complete details!**

## 📖 Documentation

- **README.md** - Main project documentation (this file)
- **IMPLEMENTATION_SUMMARY.md** - Detailed feature implementation guide
- **admin/README.md** - Admin dashboard documentation
- **admin/QUICKSTART.md** - Quick start guide for admin panel
- **database/MIGRATION_GUIDE.md** - Database migration instructions
- **backend/README.md** - Backend API documentation

## 👨‍💻 Author

Built with ❤️ for modern laundry service management
