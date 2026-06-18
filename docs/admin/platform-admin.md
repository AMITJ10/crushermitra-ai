# Platform Admin

CrusherMitra AI platform administration is separate from tenant owner accounts.
Self-service signup creates an organisation owner only; it never grants platform
admin access.

## Create Or Rotate The Platform Admin

Run the idempotent script after PostgreSQL migrations:

```powershell
$env:PLATFORM_ADMIN_EMAIL = "amitjadhav7383@gmail.com"
$env:PLATFORM_ADMIN_NAME = "Amit Jadhav"
$secure = Read-Host "Platform admin password" -AsSecureString
$env:PLATFORM_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
pnpm db:create-platform-admin
Remove-Item Env:\PLATFORM_ADMIN_PASSWORD
```

The script:

- hashes the password with PBKDF2 before storing it,
- creates or updates the user,
- ensures the global platform admin role exists,
- keeps only one row in `platform_admins`,
- writes an audit event.

Do not commit passwords, password hashes, or provider secrets.

## Login

Use `/admin/login`. The admin login API checks the PostgreSQL-backed
`platform_admins` table. Organisation owners are intentionally blocked from
the platform admin area.
