# Quick Start Guide - Split-Smartly

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- npm or bun
- MongoDB Atlas account with IP whitelisted
- VS Code (recommended)

## Step 1: Configure Environment Variables

### Backend Setup
Create `.env` file in `/server` directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/splitsmartly
JWT_SECRET=your-secret-key-change-in-production
PORT=5001
```

### Frontend Setup
No .env needed, but ensure backend URL is set correctly in Vite config:
```javascript
// vite.config.js already has:
proxy: {
  '/api': 'http://localhost:5001'
}
```

## Step 2: Start the Application

### Terminal 1 - Backend
```bash
cd server
npm install  # Only first time
npm start
```

Expected output:
```
Server running on http://localhost:5001
Database connected
```

### Terminal 2 - Frontend
```bash
cd client
npm install  # Only first time
npm run dev
```

Expected output:
```
  VITE v5.4.19  ready in 123 ms
  ➜  Local:   http://localhost:8080/
  ➜  press h to show help
```

## Step 3: Test the Application

### Complete User Flow Test

1. **Sign Up (NEW USER)**
   ```
   - Go to: http://localhost:8080
   - Click "Sign Up"
   - Fill in:
     • Full Name: John Doe
     • Email: john@example.com
     • Password: password123 (min 6 chars)
   - Click "Create Account"
   - Should redirect to Dashboard automatically
   ```

2. **Create a Group**
   ```
   - Click "Create Group" button
   - Fill in:
     • Group Name: Trip to Goa (REQUIRED)
     • Description: Summer vacation 2026
     • Category: Trip
   - Click "Create Group"
   - Should see group created with code
   ```

3. **Add Members (Invite)**
   ```
   - Copy group code
   - In another browser/incognito:
     • Sign up with different email
     • Go to Groups
     • Look for join option with code
   - Members can now see the group
   ```

4. **Add Expenses**
   ```
   - Click on group
   - Click "Add Expense"
   - Fill in:
     • Title: Dinner at restaurant
     • Amount: 1500
     • Paid by: Your name
     • Category: Food
     • Split: Equal (or custom)
   - Click "Add Expense"
   - Expense appears in group
   ```

5. **View Balances**
   ```
   - Click "Balances" in sidebar
   - See:
     • Total owed to you
     • Total you owe
     • Monthly breakdown
     • Pending settlements
   - Click "Pay" to settle via UPI
   ```

6. **Check Notifications**
   ```
   - Click bell icon
   - See unread count
   - View all notifications
   - Mark as read or clear all
   ```

7. **Update Profile**
   ```
   - Click profile icon
   - Edit name, email, UPI ID
   - Can change password
   - Click "Save Changes"
   - Should show success message
   ```

### Verification Checklist

- [ ] Signup creates account ✅
- [ ] Login with credentials ✅
- [ ] Create group succeeds ✅
- [ ] Add expense works ✅
- [ ] Balances calculate correctly ✅
- [ ] Notifications fetch ✅
- [ ] Profile updates save ✅
- [ ] Logout clears session ✅
- [ ] No console errors ✅
- [ ] Loading states show ✅
- [ ] Error messages display ✅

## Common Issues & Fixes

### Issue: "Database unavailable" Error
```
Solution:
1. Check MongoDB Atlas connection string
2. Whitelist your IP in Atlas Security → Network Access
3. Ensure password is correctly encoded in URI
```

### Issue: "Unauthorized" on protected routes
```
Solution:
1. Check token is saved in localStorage
2. Verify JWT_SECRET matches on server
3. Check Authorization header format: "Bearer {token}"
```

### Issue: Form says "field is not filled" but I typed something
```
Solution:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Check browser console for errors (F12)
3. Ensure Input component is receiving state updates
4. Try form submission again
```

### Issue: Profile changes don't save
```
Solution:
1. Verify email is valid (contains @)
2. Check name is at least 2 characters
3. Ensure no duplicate email in system
4. Look at browser DevTools → Network tab for API errors
```

### Issue: Group creation fails
```
Solution:
1. Group name must be 2+ characters
2. Category must be selected
3. Check backend is running (port 5001)
4. Verify auth token exists in localStorage
```

## API Response Examples

### Successful Group Creation
```json
{
  "group": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Trip to Goa",
    "code": "ABC123",
    "members": [
      {
        "user": {
          "id": "507f1f77bcf86cd799439012",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "role": "admin",
        "balance": 0
      }
    ],
    "totalExpenses": 0,
    "myBalance": 0
  }
}
```

### Login Response
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "upiId": ""
  }
}
```

## Development Tips

### Enable Debug Logging
Add to any page component:
```javascript
useEffect(() => {
  console.log("Auth user:", getStoredUser());
  console.log("Token:", getToken());
}, []);
```

### Check API Calls
```javascript
// Open DevTools → Network tab
// Watch for /api/* requests
// Check Response tab for JSON data
```

### Test Different Scenarios
```
1. One user creates group
2. Another user joins with code
3. First user adds expense
4. Check if second user sees it
5. Both users should see balances
```

## Database Reset (Development Only)

```bash
# Delete all data and start fresh:
1. Go to MongoDB Atlas → Collections
2. Select splitsmartly database
3. Delete all collections
4. Data will recreate on first signup
```

## Browser DevTools (F12)

Check:
1. **Console Tab** - Should have no errors
2. **Network Tab** - Should see /api/* requests with 200 status
3. **Application Tab** - Should see:
   - localStorage → token
   - localStorage → user (JSON)
   - Cookies (if any)

## Performance Optimization (Future)

- [ ] Implement React.lazy() for code splitting
- [ ] Add service workers for PWA
- [ ] Implement caching strategies
- [ ] Optimize bundle size (currently 169.53 KB gzipped)

## Support

For issues, check:
1. `/server/src` for backend logic
2. `/client/src` for frontend components
3. FIXES_APPLIED.md for what was changed
4. Package.json for dependencies

---

**Happy expense splitting! 🎉**
