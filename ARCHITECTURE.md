# Split-Smartly Architecture & Implementation Guide

## 📋 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                      │
│                   Port: 8080                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pages (React Components)                            │   │
│  │  ├─ Auth: Login.jsx, Signup.jsx                      │   │
│  │  ├─ Dashboard.jsx                                    │   │
│  │  ├─ Groups.jsx, CreateGroup.jsx, GroupDetail.jsx    │   │
│  │  ├─ Balances.jsx, AddExpense.jsx                    │   │
│  │  ├─ Profile.jsx                                     │   │
│  │  └─ Notifications.jsx                               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  UI Components (Shadcn/Radix)                        │   │
│  │  - Button, Input, Card, Dialog, etc.               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Utilities & Hooks                                   │   │
│  │  ├─ lib/api.js (authApiRequest, apiRequest)         │   │
│  │  ├─ hooks/use-auth.jsx                              │   │
│  │  └─ hooks/use-notifications-count.jsx               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/CORS ↓
┌─────────────────────────────────────────────────────────────┐
│                SERVER (Express.js)                            │
│                   Port: 5001                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes                                              │   │
│  │  ├─ /api/auth (signup, login)                       │   │
│  │  ├─ /api/groups (CRUD, expenses)                    │   │
│  │  ├─ /api/users (profile, me)                        │   │
│  │  ├─ /api/notifications (read, clear)                │   │
│  │  └─ /api/dashboard (summary, balances)              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware                                          │   │
│  │  ├─ CORS (from http://localhost:8080)              │   │
│  │  ├─ JSON parsing (express.json())                   │   │
│  │  ├─ Auth (requireAuth - JWT verification)           │   │
│  │  └─ Error handling                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Models (Mongoose)                                   │   │
│  │  ├─ User (name, email, password, upiId)            │   │
│  │  ├─ Group (members, expenses, code, status)         │   │
│  │  ├─ Expense (splits, amount, category)              │   │
│  │  └─ Notification (type, read status)                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Utilities                                           │   │
│  │  └─ finance.js (DTO converters, balance calc)       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ Network ↓
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (MongoDB Atlas)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Collections                                         │   │
│  │  ├─ users (user accounts)                           │   │
│  │  ├─ groups (expense groups)                         │   │
│  │  ├─ expenses (individual expenses)                  │   │
│  │  └─ notifications (activity log)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication Flow

```
1. SIGNUP:
   ┌──────────────┐
   │ User fills   │
   │ signup form  │
   └──────┬───────┘
          │
          ↓
   ┌────────────────────────┐
   │ POST /api/auth/signup  │
   │ { name, email, pwd }   │
   └──────┬─────────────────┘
          │
          ↓
   ┌───────────────────────────────┐
   │ Server: Hash pwd with bcryptjs│
   │ Store in MongoDB              │
   │ Create JWT token              │
   └──────┬────────────────────────┘
          │
          ↓
   ┌──────────────────────────┐
   │ Return: token + user     │
   │ Store in localStorage    │
   └──────┬───────────────────┘
          │
          ↓
   ┌──────────────────────┐
   │ Redirect to Dashboard│
   └──────────────────────┘

2. LOGIN:
   Similar flow but:
   - Compare provided password with hashed pwd
   - Return same token + user
   - Update localStorage

3. PROTECTED ROUTES:
   Every API request adds:
   Authorization: Bearer {token}
   
   Server:
   - Extract token from header
   - Verify JWT signature
   - Load user from database
   - Attach to req.user
   - Continue to route handler
```

## 💾 Data Models

### User Schema
```javascript
{
  _id: ObjectId,
  name: String,              // User's full name
  email: String,             // Unique email
  password: String,          // Bcrypt hashed
  upiId: String,             // For payments (optional)
  createdAt: Date,
  updatedAt: Date
}
```

### Group Schema
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  category: String,          // trip, vacation, family, etc.
  code: String,              // Unique invite code
  status: String,            // active, archived
  createdBy: ObjectId,       // User who created
  members: [
    {
      user: ObjectId,        // Reference to User
      role: String,          // admin, member
      balance: Number        // How much they're owed/owe
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Expense Schema
```javascript
{
  _id: ObjectId,
  group: ObjectId,           // Which group
  title: String,             // "Dinner"
  amount: Number,            // 1500
  paidBy: ObjectId,          // Who paid
  date: Date,
  category: String,          // Food, Transport, etc.
  notes: String,
  splitType: String,         // equal or custom
  splits: [
    {
      user: ObjectId,        // Who owes/is owed
      amount: Number,        // Amount for this person
      settled: Boolean       // Paid back? Default: false
    }
  ],
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### Notification Schema
```javascript
{
  _id: ObjectId,
  user: ObjectId,            // Who gets notified
  type: String,              // expense_added, payment_received
  message: String,
  read: Boolean,             // Default: false
  group: ObjectId,           // Related group
  createdAt: Date
}
```

## 🔄 API Endpoints Reference

### Authentication
```
POST /api/auth/signup
  Request: { name, email, password, upiId? }
  Response: { token, user: {id, name, email, upiId} }

POST /api/auth/login
  Request: { email, password }
  Response: { token, user: {id, name, email, upiId} }
```

### Groups
```
GET /api/groups
  Auth: Required
  Response: { groups: [{id, name, members, myBalance, ...}] }

POST /api/groups
  Auth: Required
  Request: { name, description?, category? }
  Response: { group: {...} }

GET /api/groups/:id
  Auth: Required
  Response: { group: {...}, expenses: [...] }

POST /api/groups/:id/expenses
  Auth: Required
  Request: { title, amount, paidBy, category, date, notes, splits }
  Response: { expense: {...} }
```

### Users
```
GET /api/users/me
  Auth: Required
  Response: { user: {id, name, email, upiId}, stats: {groups, youOwe, youAreOwed} }

PUT /api/users/me
  Auth: Required
  Request: { name?, email?, upiId?, password? }
  Response: { user: {...} }
```

### Notifications
```
GET /api/notifications
  Auth: Required
  Response: { notifications: [...] }

PATCH /api/notifications/:id/read
  Auth: Required
  Response: { notification: {...} }

PATCH /api/notifications/read-all
  Auth: Required
  Response: { count: N }

DELETE /api/notifications/clear
  Auth: Required
  Response: { cleared: N }
```

### Dashboard
```
GET /api/dashboard
  Auth: Required
  Response: {
    user: {...},
    summary: {totalOwed, totalOwedToYou, totalNet, activeGroups, unreadNotifications},
    groups: [...],
    recentExpenses: [...]
  }
```

## 📊 Balance Calculation Logic

### Formula
For each group:
```
myBalance = (amount I paid) - (my shares of expenses)

Positive Balance = People owe me
Negative Balance = I owe people
```

### Example
```
Group: Pizza Night
Total: 3000 rupees

Tom paid: 3000
Shares:
  - Tom: 1000
  - You: 1000
  - Jerry: 1000

Your Balance = 1000 (paid) - 1000 (share) = 0
Tom's Balance = 3000 (paid) - 1000 (share) = +2000 (owed)
Jerry's Balance = 0 (paid) - 1000 (share) = -1000 (owes)

Settlement:
You: Pay Jerry 1000
Tom: Pay Jerry 1000 (gets 2000 back essentially)
Result: Everyone paid fair share
```

## 🎯 Key Implementation Details

### 1. Token Storage
```javascript
// Stored in localStorage
localStorage.setItem("token", "eyJhbGc...")
localStorage.setItem("user", JSON.stringify({id, name, email, upiId}))

// Sent with every API request
headers: {
  "Authorization": "Bearer eyJhbGc...",
  "Content-Type": "application/json"
}
```

### 2. Error Handling
```javascript
try {
  const response = await authApiRequest(url, options);
  // response is already parsed JSON
  // if not ok, error is thrown
} catch (err) {
  // err.message contains the error
  toast.error(err.message);
}
```

### 3. Form Validation Pattern
```javascript
// 1. Validate input
if (!value || !value.trim()) {
  setErrors({field: "Required"});
  return;
}

// 2. Make API call
try {
  const response = await authApiRequest(url, {
    method: "POST",
    body: JSON.stringify({...})
  });
  
  // 3. Validate response
  if (!response || !response.data) {
    throw new Error("Invalid response");
  }
  
  // 4. Update state
  setAuthSession({...response.data});
  
  // 5. Redirect/Notify
  navigate("/");
  toast.success("Success!");
} catch (err) {
  setErrors({submit: err.message});
  toast.error(err.message);
}
```

### 4. Loading States
```javascript
const [isLoading, setIsLoading] = useState(false);

// During form submission
<Input disabled={isLoading} />
<Button disabled={isLoading}>{isLoading ? "Loading..." : "Submit"}</Button>
```

## 🚀 Performance Considerations

### Current Bundle
- Total: 548.74 KB (minified)
- Gzipped: 169.53 KB (network transfer)

### Optimization Opportunities
1. **Code Splitting** - Lazy load route components
2. **Caching** - Implement Service Workers
3. **Image Optimization** - Use WebP for icons
4. **Tree Shaking** - Remove unused code
5. **Minification** - Already enabled

### Database Optimization
1. **Indexes** - Added on userId, groupId, date
2. **Lean Queries** - Use .lean() for read-only
3. **Pagination** - Implement for large result sets
4. **Aggregation** - Pre-calculate balances

## 🔒 Security Measures

### Implemented
- ✅ Password hashing (bcryptjs)
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ Input validation
- ✅ Protected routes (requireAuth middleware)
- ✅ User-scoped data queries

### Recommended (Production)
- [ ] HTTPS enforcement
- [ ] Rate limiting
- [ ] Environment variables (.env)
- [ ] SQL injection prevention (using MongoDB)
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Regular security audits

## 🧪 Testing Scenarios

### Happy Path
1. Sign up → Dashboard
2. Create group → Group detail
3. Add expense → Balance updated
4. Settle payment → Settlement processed

### Error Cases
1. Invalid email → Show error
2. Weak password → Show error
3. Duplicate email → Show error
4. Network failure → Show error with retry

### Edge Cases
1. Empty groups list
2. Zero balance
3. Custom split validation
4. Concurrent updates
5. Session expiration

## 📱 Mobile Responsiveness

All pages are responsive using:
- Tailwind CSS responsive classes (sm:, md:, lg:)
- Grid layouts (grid-cols-1, sm:grid-cols-2)
- Flexible spacing and font sizes
- Touch-friendly button sizes (h-11 = 44px)

## 🔄 Data Flow Example: Create Group

```
1. User fills form
   ├─ name: "Trip"
   └─ category: "trip"

2. Form submission (handleSubmit)
   ├─ Validate inputs
   └─ Disable form

3. API Call
   POST /api/groups {name, category}
   ├─ Headers: {Authorization: "Bearer token"}
   └─ Body: JSON

4. Server Processing
   ├─ requireAuth middleware verifies JWT
   ├─ Extract userId from token
   ├─ Validate group data
   ├─ Generate unique invite code
   ├─ Create group in MongoDB
   ├─ Add user as admin
   └─ Return DTO (with id field)

5. Client Response
   ├─ Parse response JSON
   ├─ Validate response.group exists
   ├─ Show toast success
   └─ Navigate to /groups/{id}

6. UI Update
   └─ New group appears in groups list
```

---

**This architecture provides a scalable, maintainable, and user-friendly expense splitting application.**
