# Security Policy

## Supported Versions

The following versions of Solarch are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Solarch, please report it responsibly.

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainers directly at:

- **jay.suryawanshi@cogneoverse.in**

Please include:
- A description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Suggested fix (if you have one)

## Response Process

1. We will acknowledge receipt of your report within 48 hours
2. We will investigate and validate the vulnerability
3. We will work on a fix and coordinate a release
4. We will credit you in the release notes (unless you prefer to remain anonymous)
5. We will publish a security advisory once the fix is released

## Security Best Practices

When deploying Solarch:

- Keep your Node.js version up to date
- Use strong passwords for admin accounts
- Enable rate limiting in production
- Use HTTPS in production
- Keep your `pb_data/` directory secure and backed up
- Regularly update dependencies: `npm audit fix`
- Use environment variables for sensitive configuration
- Enable AES encryption for SMTP and S3 credentials

## Known Security Features

- **AES Encryption**: Sensitive settings (SMTP password, S3 secret, AI API key) are encrypted at rest
- **bcrypt**: Passwords are hashed with bcrypt
- **JWT**: Short-lived access tokens with refresh token rotation
- **Rate Limiting**: Configurable per-window request limits
- **Helmet**: Security headers middleware
- **Protected File Tokens**: Time-limited signed URLs for file access
- **API Rules**: Collection-level access control with filter expressions
