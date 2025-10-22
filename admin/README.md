# LaundryPro Admin Dashboard

This is the admin dashboard for managing the LaundryPro laundry service application. The admin panel allows you to view and manage all customer orders.

## Features

### 📊 Dashboard Overview
- **Real-time Statistics**: View total orders, pending, processing, and completed orders at a glance
- **Order Management**: Access all customer orders in one centralized location
- **Status Filtering**: Filter orders by status (All, Pending, Processing, Ready, Delivered, Cancelled)

### 🛠️ Order Management
- **View All Orders**: See all orders from all customers with detailed information
- **Order Details**: 
  - Order ID and date
  - Customer information (name, email, phone, address)
  - Itemized list of laundry items with quantities and services
  - Total amount
  - Special instructions/notes
- **Update Order Status**: Change order status from the dashboard
  - Pending → Processing → Ready for Pickup → Delivered
  - Cancel orders when needed

### 🔐 Authentication
- Secure admin login
- Token-based authentication
- Automatic session management

## Getting Started

### Prerequisites
- Backend API running on `http://localhost:8080`
- Admin account created in the system

### Installation

1. **Start the Backend Server**
   ```bash
   cd ../backend
   go run main.go
   ```

2. **Open the Admin Dashboard**
   - Simply open `index.html` in your web browser
   - Or use a local server:
     ```bash
     # Using Python
     python -m http.server 3000
     
     # Or using Node.js http-server
     npx http-server -p 3000
     ```
   - Navigate to `http://localhost:3000`

### Admin Login

Use your admin credentials to log in:
- Email: Your admin email address
- Password: Your admin password

**Note**: Admin accounts should be created with the same registration endpoint, but you should add proper role-based access control in production.

## File Structure

```
admin/
├── index.html          # Main HTML file with admin interface
├── admin.js            # JavaScript for admin functionality
├── styles.css          # Custom CSS styles for admin panel
└── README.md           # This file
```

## API Endpoints Used

The admin dashboard communicates with the following backend endpoints:

### Authentication
- `POST /api/auth/login` - Admin login

### Order Management
- `GET /api/admin/orders` - Get all orders from all customers
- `PUT /api/admin/orders/{orderID}/status` - Update order status

## Order Status Workflow

1. **Pending** - New order placed by customer
2. **Processing** - Order is being processed (washing/dry cleaning)
3. **Ready** - Order is ready for pickup/delivery
4. **Delivered** - Order has been delivered to customer
5. **Cancelled** - Order has been cancelled

## Features in Detail

### Statistics Dashboard
The top of the dashboard shows key metrics:
- **Total Orders**: All orders in the system
- **Pending**: Orders waiting to be processed
- **In Progress**: Orders currently being processed
- **Completed**: Successfully delivered orders

### Order Table
- **Sortable**: Orders are sorted by date (newest first)
- **Filterable**: Use filter buttons to show specific statuses
- **Quick Actions**: View details or update status directly from table
- **Responsive**: Table adapts to different screen sizes

### Order Details Modal
Click "View" on any order to see:
- Complete order information
- Customer contact details
- All items in the order with services
- Special instructions
- Quick status update option

## Customization

### Changing API URL
Update the API base URL in `admin.js`:
```javascript
const API_BASE_URL = 'http://your-api-url:port/api';
```

### Styling
Modify `styles.css` to customize:
- Color scheme
- Table layout
- Button styles
- Modal appearance

## Security Considerations

⚠️ **Important for Production**:

1. **Add Role-Based Access Control**
   - Implement admin role in backend
   - Verify admin role on all admin endpoints
   - Separate admin and customer accounts

2. **Use HTTPS**
   - Always use HTTPS in production
   - Secure admin credentials

3. **Environment Variables**
   - Store API URLs in environment variables
   - Never commit sensitive credentials

4. **Rate Limiting**
   - Implement rate limiting on login endpoint
   - Add brute force protection

5. **Audit Logging**
   - Log all admin actions
   - Track status changes with admin ID and timestamp

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Cannot Login
- Ensure backend server is running
- Check that API URL is correct
- Verify admin credentials
- Check browser console for errors

### Orders Not Loading
- Verify backend is running on correct port
- Check CORS settings in backend
- Ensure you have admin permissions
- Check network tab in browser DevTools

### Status Update Fails
- Verify you're logged in
- Check token hasn't expired
- Ensure order ID is valid
- Check backend logs for errors

## Future Enhancements

Potential features to add:
- [ ] Real-time order updates with WebSockets
- [ ] Export orders to CSV/PDF
- [ ] Order search and advanced filtering
- [ ] Customer management
- [ ] Analytics and reporting
- [ ] Email notifications for status changes
- [ ] Bulk status updates
- [ ] Order assignment to staff
- [ ] Revenue tracking
- [ ] Item and service management

## Support

For issues or questions:
- Check backend logs: `backend/main.go`
- Check browser console for JavaScript errors
- Verify database connection
- Ensure all API endpoints are accessible

## License

This admin dashboard is part of the LaundryPro application.
