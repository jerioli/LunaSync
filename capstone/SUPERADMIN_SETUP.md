# LunaSync Superadmin Account Setup

This document explains how to set up and use the default superadmin account for LunaSync deployment.

## Quick Setup

### Automatic Setup (Recommended)

Run the deployment setup script to automatically create the superadmin account:

**Linux/macOS:**
```bash
cd /path/to/capstone
chmod +x setup_deployment.sh
./setup_deployment.sh
```

**Windows:**
```cmd
cd C:\path\to\capstone
setup_deployment.bat
```

### Manual Setup

You can also create the superadmin account manually using the Django management command:

```bash
# Basic usage with defaults
python manage.py create_superadmin

# Custom email and password
python manage.py create_superadmin --email admin@yourdomain.com --password YourSecurePassword123!

# Force update existing account
python manage.py create_superadmin --force
```

## Default Credentials

**Default Superadmin Account:**
- **Email:** `admin@lunasync.site`
- **Password:** `LunaSync2024!`
- **Username:** `admin@lunasync.site`
- **Role:** `superadmin`

## Superadmin Permissions

The superadmin account has all permissions enabled:

### Standard Permissions:
- ✅ Manage Appointments
- ✅ Manage Patients
- ✅ Manage Staff
- ✅ View Reports
- ✅ Manage Clinic Settings
- ✅ Manage Inventory

### Superadmin Exclusive Permissions:
- ✅ Manage Permissions
- ✅ Access Integrations
- ✅ View Audit Logs
- ✅ View Usage Reports
- ✅ Access Security Testing

## Security Best Practices

### 🔒 Immediate Actions After Deployment

1. **Change Default Password**
   - Log in with the default credentials
   - Navigate to user settings
   - Change the password to a strong, unique password

2. **Update Email Address**
   - Change the email to your actual administrator email
   - Ensure you have access to this email for password resets

3. **Enable Two-Factor Authentication** (if available)
   - Add an extra layer of security to the superadmin account

4. **Review and Restrict Access**
   - Only give superadmin access to trusted personnel
   - Consider creating regular admin accounts for day-to-day operations

### 🛡️ Environment Variables (Production)

For production deployments, set these environment variables instead of using defaults:

```bash
# In your production environment or .env.production file
SUPERADMIN_EMAIL=your-admin@yourdomain.com
SUPERADMIN_PASSWORD=YourVerySecurePassword123!
```

### 🔍 Monitoring and Auditing

- All superadmin actions are logged in the audit system
- Regularly review the audit logs for any suspicious activity
- Monitor login attempts and failed authentications

## Accessing the Admin Interface

### Web Interface
1. Navigate to your LunaSync application
2. Go to the login page
3. Use the superadmin credentials to log in
4. Access admin features through the user interface

### Django Admin Panel
1. Navigate to `https://lunasync.site/admin/` (or `http://localhost:8000/admin/` for development)
2. Log in with superadmin credentials
3. Manage users, permissions, and system settings

## User Management

As a superadmin, you can:

1. **Create New Users**
   - Add doctors, receptionists, and other staff
   - Assign appropriate roles and permissions

2. **Manage Existing Users**
   - Modify user permissions
   - Reset passwords
   - Activate/deactivate accounts

3. **Role Management**
   - `superadmin`: Full system access (use sparingly)
   - `admin`: Administrative access without superadmin privileges
   - `doctor`: Medical staff access
   - `receptionist`: Front desk and appointment management

## Troubleshooting

### Account Creation Issues

If the superadmin account creation fails:

1. **Check Database Connection**
   ```bash
   python manage.py check
   ```

2. **Run Migrations**
   ```bash
   python manage.py migrate
   ```

3. **Check for Existing Account**
   ```bash
   python manage.py shell
   >>> from accounts.models import CustomUser
   >>> CustomUser.objects.filter(role='superadmin')
   ```

### Password Reset

If you forget the superadmin password:

1. **Use the Management Command**
   ```bash
   python manage.py create_superadmin --force --password NewPassword123!
   ```

2. **Or Reset via Django Shell**
   ```bash
   python manage.py shell
   >>> from accounts.models import CustomUser
   >>> user = CustomUser.objects.get(email='admin@lunasync.site')
   >>> user.set_password('NewPassword123!')
   >>> user.save()
   ```

## Deployment Checklist

- [ ] Run deployment setup script
- [ ] Verify superadmin account creation
- [ ] Test login with default credentials
- [ ] Change default password
- [ ] Update email address
- [ ] Set up environment variables for production
- [ ] Create additional admin users as needed
- [ ] Test all admin functionalities
- [ ] Review security settings
- [ ] Document access credentials securely

## Support

For issues with the superadmin account setup:

1. Check the Django logs for error messages
2. Verify database connectivity
3. Ensure all required environment variables are set
4. Review the deployment setup script output

## Security Notes

⚠️ **Important Security Reminders:**

- Never use default credentials in production for extended periods
- Regularly audit superadmin account usage
- Use strong, unique passwords
- Keep access credentials secure and confidential
- Consider using environment variables for sensitive data
- Enable logging and monitoring for admin activities
- Regularly review and update security settings

---

*This documentation is part of the LunaSync healthcare management system.*