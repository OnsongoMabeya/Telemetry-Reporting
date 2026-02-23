# SSL/TLS Setup Guide for BSI Telemetry

This guide covers setting up SSL/TLS certificates for secure HTTPS access to the BSI Telemetry Reporting System.

## Option 1: Self-Signed Certificate (Development/Testing)

### On Windows Production Server

**Step 1: Install OpenSSL**

Download and install OpenSSL for Windows:
- Download from: https://slproweb.com/products/Win32OpenSSL.html
- Install to: `C:\OpenSSL-Win64`

**Step 2: Create SSL Directory**

```powershell
mkdir C:\nginx\ssl
cd C:\nginx\ssl
```

**Step 3: Generate Self-Signed Certificate**

```powershell
# Set OpenSSL path
$env:OPENSSL_CONF = "C:\OpenSSL-Win64\bin\openssl.cfg"

# Generate private key and certificate (valid for 365 days)
C:\OpenSSL-Win64\bin\openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout C:\nginx\ssl\bsi-telemetry.key `
  -out C:\nginx\ssl\bsi-telemetry.crt `
  -subj "/C=KE/ST=Nairobi/L=Nairobi/O=BSI/CN=197.156.145.121"
```

**Step 4: Verify Certificate**

```powershell
C:\OpenSSL-Win64\bin\openssl x509 -in C:\nginx\ssl\bsi-telemetry.crt -text -noout
```

**Step 5: Update Nginx Configuration**

Edit `C:\nginx\conf\nginx.conf`:
- Uncomment the HTTPS server block
- Uncomment the HTTP to HTTPS redirect
- Save and restart nginx

```powershell
nginx -s reload
```

**Note:** Browsers will show a security warning for self-signed certificates. Users must manually accept the certificate.

---

## Option 2: Let's Encrypt (Free, Production-Ready)

### Prerequisites

- Domain name pointing to 197.156.145.121 (e.g., telemetry.bsi.co.ke)
- Port 80 accessible from internet (for certificate validation)

### On Windows Production Server

**Step 1: Install Certbot**

Download and install Certbot for Windows:
- Download from: https://certbot.eff.org/instructions?ws=nginx&os=windows
- Or use Chocolatey:

```powershell
choco install certbot
```

**Step 2: Stop Nginx Temporarily**

```powershell
nginx -s stop
```

**Step 3: Obtain Certificate**

```powershell
# Replace telemetry.bsi.co.ke with your actual domain
certbot certonly --standalone -d telemetry.bsi.co.ke
```

Follow the prompts:
- Enter email address for renewal notifications
- Agree to Terms of Service
- Choose whether to share email with EFF

**Step 4: Copy Certificates to Nginx**

```powershell
# Certificates will be in C:\Certbot\live\telemetry.bsi.co.ke\
copy C:\Certbot\live\telemetry.bsi.co.ke\fullchain.pem C:\nginx\ssl\bsi-telemetry.crt
copy C:\Certbot\live\telemetry.bsi.co.ke\privkey.pem C:\nginx\ssl\bsi-telemetry.key
```

**Step 5: Update Nginx Configuration**

Edit `C:\nginx\conf\nginx.conf`:
- Update `server_name` to your domain name
- Uncomment HTTPS server block
- Uncomment HTTP to HTTPS redirect

**Step 6: Start Nginx**

```powershell
nginx
```

**Step 7: Set Up Auto-Renewal**

Create a scheduled task to renew certificates:

```powershell
# Test renewal
certbot renew --dry-run

# Create scheduled task (runs daily)
schtasks /create /tn "Certbot Renewal" /tr "certbot renew --quiet" /sc daily /st 03:00
```

---

## Option 3: Commercial SSL Certificate

### Purchase Certificate

Buy SSL certificate from:
- DigiCert
- GlobalSign
- Comodo
- GoDaddy

### Install on Windows

**Step 1: Generate CSR**

```powershell
C:\OpenSSL-Win64\bin\openssl req -new -newkey rsa:2048 -nodes `
  -keyout C:\nginx\ssl\bsi-telemetry.key `
  -out C:\nginx\ssl\bsi-telemetry.csr `
  -subj "/C=KE/ST=Nairobi/L=Nairobi/O=BSI/CN=197.156.145.121"
```

**Step 2: Submit CSR to Certificate Authority**

- Copy contents of `bsi-telemetry.csr`
- Submit to your SSL provider
- Complete domain validation

**Step 3: Download and Install Certificate**

- Download certificate files from provider
- Save as `C:\nginx\ssl\bsi-telemetry.crt`
- Keep the private key: `C:\nginx\ssl\bsi-telemetry.key`

**Step 4: Configure Nginx**

Update `C:\nginx\conf\nginx.conf` as described above.

---

## Testing SSL Configuration

### Test HTTPS Connection

```powershell
# From any computer
curl -I https://197.156.145.121
```

### Check SSL Certificate

```powershell
C:\OpenSSL-Win64\bin\openssl s_client -connect 197.156.145.121:443
```

### Online SSL Test

Visit: https://www.ssllabs.com/ssltest/
- Enter your domain/IP
- Wait for analysis
- Aim for A+ rating

---

## Troubleshooting

### Certificate Not Trusted

**Self-signed certificates:**
- Expected behavior
- Users must manually accept
- Not recommended for production

**Let's Encrypt certificates:**
- Check domain DNS points to correct IP
- Verify port 80 is accessible
- Check certificate expiry date

### Nginx Won't Start

```powershell
# Check configuration syntax
nginx -t

# View error logs
type C:\nginx\logs\error.log
```

### Mixed Content Warnings

Update frontend to use relative URLs:
```javascript
// Instead of http://197.156.145.121:5000/api
// Use /api (nginx will proxy)
```

---

## Security Best Practices

1. **Keep Certificates Secure**
   - Restrict access to private key files
   - Never commit certificates to Git

2. **Monitor Expiry**
   - Set up renewal reminders
   - Test renewal process regularly

3. **Use Strong Ciphers**
   - Already configured in nginx.conf
   - Disable TLS 1.0 and 1.1

4. **Enable HSTS**
   - Already configured in nginx.conf
   - Forces HTTPS for all connections

5. **Regular Updates**
   - Keep nginx updated
   - Update OpenSSL regularly

---

## Certificate Renewal

### Let's Encrypt (Auto-renewal)

```powershell
# Manual renewal
certbot renew

# Check next renewal date
certbot certificates
```

### Commercial Certificates

- Set calendar reminder 30 days before expiry
- Purchase renewal from provider
- Follow installation steps above

---

## Support

For SSL/TLS issues:
- Check nginx error logs
- Verify certificate validity
- Test with `openssl s_client`
- Contact your SSL provider for certificate issues
