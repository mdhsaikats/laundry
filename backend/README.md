# LaundryPro Backend

Go backend server for the LaundryPro laundry service application.

## Features

- RESTful API with Chi router
- JWT authentication
- Password hashing with bcrypt
- CORS support
- MySQL database

## Environment Variables

Create a `.env` file in the backend directory:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=laundry
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=8080
```

## Installation

1. Install Go dependencies:
```bash
go mod download
```

2. Set up MySQL database:
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE laundry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE laundry;

# Run schema
SOURCE ../database/schema.sql;

# Or from command line:
mysql -u root -p laundry < ../database/schema.sql
```

## Running the Server

```bash
go run main.go
```

The server will start on `http://localhost:8080`

## API Endpoints

### Public Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Protected Endpoints (require JWT token)

- `GET /api/items` - Get all laundry items
- `GET /api/services` - Get all services
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create a new order

## Building for Production

```bash
go build -o laundry-server main.go
```

Then run:
```bash
./laundry-server
```
