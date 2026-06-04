# Nginx Configuration

Nginx reverse proxy configuration for BSI Telemetry Reporting System.

## Configuration Files

- `nginx.conf` - Linux/macOS production configuration
- `nginx-windows.conf` - Windows production configuration

## Quick Setup

See the **[Detailed Guide](../DETAILED_GUIDE.md#production-deployment)** for complete deployment instructions.

## Architecture

```
External Users → nginx:3010 → Frontend (static)
                        ↓
                   Backend:5000 (internal network)
```

## SSL Certificates

Place certificates in this directory:
- `ssl/bsi-telemetry.crt` - Certificate
- `ssl/bsi-telemetry.key` - Private key

See the **[Detailed Guide](../DETAILED_GUIDE.md#ssltls-setup)** for SSL setup options.

