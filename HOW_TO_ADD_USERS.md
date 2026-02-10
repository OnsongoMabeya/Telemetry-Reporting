# How to Add New Users - Quick Guide

## 🎯 Step-by-Step Instructions

### Step 1: Login as BSI Admin

- Navigate to `http://localhost:3010`
- Username: `BSI`
- Password: `Reporting2026`

### Step 2: Find the User Menu Icon

Look at the **top-right corner** of the navigation bar. You should see:

- A sun/moon icon (dark mode toggle)
- **A circular purple button with a person icon (👤)** ← Click this!

### Step 3: Open User Management

After clicking the user icon, a dropdown menu will appear showing:

- **Signed in as**
- **BSI**
- **Administrator**
- **User Management** ← Click this option
- Logout

### Step 4: Add New User

Once in User Management page:

1. Click the **"Add User"** button (top-right, blue button with + icon)
2. Fill in the user details:
   - Username (required, unique)
   - Email (required, unique)
   - Password (required, min 8 characters)
   - First Name (optional)
   - Last Name (optional)
   - Role (select: Admin, Manager, or Viewer)
3. Click **"Create"** button

### Step 5: Assign Nodes to User (Optional)

After creating a user, you can assign specific nodes:

1. Find the user in the list
2. Click the **Assignment icon** (📋) next to their name
3. Either:
   - Toggle **"Access to All Nodes"** ON for full access, OR
   - Select specific nodes from the checkbox list
4. Add optional notes
5. Click **"Save Assignments"**

## 🔍 Troubleshooting

### Can't see the user icon?

- Make sure you're logged in as BSI
- Check the top-right corner of the navbar
- Try refreshing the page (Cmd+R or Ctrl+R)

### Can't see "User Management" option?

- Verify you're logged in as admin (BSI)
- Check the browser console for errors (F12)
- Make sure the database migration was run successfully

### User Management page is empty?

- Check that the backend server is running (`npm run dev`)
- Verify database connection in backend/.env
- Check browser console for API errors

## 🎨 What the User Icon Looks Like

The user menu icon is:

- **Location**: Top-right corner of navbar
- **Shape**: Circular button
- **Color**: Purple/blue gradient background
- **Icon**: White person/user icon (👤)
- **Position**: Right next to the dark/light mode toggle

## ✅ Quick Checklist

Before adding users, ensure:

- [ ] Backend server is running (port 5000)
- [ ] Frontend is running (port 3010)
- [ ] Database migrations are complete
- [ ] You're logged in as BSI (admin)
- [ ] You can see the navbar at the top

## 🆘 Still Having Issues?

If you still can't find the User Management option:

1. **Check browser console** (Press F12):
   - Look for any red error messages
   - Check if API calls are failing

2. **Verify user role in console**:

   ```javascript
   // Open browser console (F12) and type:
   localStorage.getItem('token')
   // This should show your JWT token
   ```

3. **Check backend logs**:
   - Look at the terminal running the backend
   - Check for authentication errors

4. **Restart the application**:

   ```bash
   # Stop the app (Ctrl+C)
   npm run dev
   ```

## 📞 Need Help?

If you're still unable to access User Management:

- Check that you're using the correct URL: `http://localhost:3010`
- Ensure you're logged in with the BSI account
- Verify the user role is 'admin' in the database
- Check the browser's Network tab (F12) for failed API requests
