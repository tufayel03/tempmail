# Setup & Deployment Guide on Oracle VPS

This guide provides step-by-step instructions to configure and deploy your **Temporary Email Service** on an **Oracle Cloud Infrastructure (OCI) Ubuntu VPS** integrated with **Cloudflare Email Routing**.

---

## Architecture Overview
1. **Email Ingress**: An email is sent to `any_address@yourdomain.com`.
2. **Cloudflare Routing**: Cloudflare Email Routing catches all emails (`*@yourdomain.com`) and triggers your **Cloudflare Worker**.
3. **Cloudflare Worker**: Parses the raw email stream into structured JSON (using `postal-mime`) and POSTs it to `https://yourdomain.com/api/incoming-email` with a secret key header (`X-Webhook-Secret`).
4. **Backend API (Express.js)**: Runs on the Oracle VPS under **PM2**. Authenticates the webhook, stores the email in **MongoDB**, and serves client requests.
5. **Database (MongoDB)**: Stores emails with a TTL index of 3600 seconds (1 hour). MongoDB automatically deletes them when expired.
6. **Frontend (React)**: Served statically by **Nginx**, which also acts as a reverse proxy forwarding `/api` calls to the local Express server on port `3000` and handles SSL (Let's Encrypt).

---

## Step 1: Cloudflare Email Routing & Worker Configuration

1. **Activate Email Routing**:
   - Log into your **Cloudflare Dashboard** and select your custom domain.
   - Go to **Email** > **Email Routing** and click **Get started**.
   - Cloudflare will automatically configure your DNS records (MX and TXT spf records).

2. **Deploy the Worker**:
   - Create a new Cloudflare Worker (e.g. named `tempmail-receiver`).
   - Copy the content of `/cloudflare-worker.js` from this project into the Worker code editor.
   - Click **Save and Deploy**.

3. **Configure Worker Environment Variables**:
   - In your Worker page, go to **Settings** > **Variables**.
   - Under **Environment Variables**, add:
     - `EXPRESS_API_URL`: `https://yourdomain.com/api/incoming-email` (or your raw VPS public IP `http://<YOUR_VPS_IP>:3000/api/incoming-email` if SSL is not set up yet).
     - `CF_WEBHOOK_SECRET`: A secure, randomly generated string (e.g. `MySuperSecureSecretKey123!`). Make sure it matches the `CF_WEBHOOK_SECRET` in your VPS `.env` file.

4. **Link Email Routing to the Worker**:
   - Go back to your domain's **Email Routing** tab.
   - Click **Routes** > **Catch-all address**.
   - Edit the Catch-all route:
     - **Action**: Forward to Worker.
     - **Destination**: Select your `tempmail-receiver` worker.
     - Click **Save**.

---

## Step 2: VPS Security Rules (Oracle Cloud Console)

By default, Oracle Cloud blocks all incoming traffic to VM instances. You must open port `80` (HTTP) and `443` (HTTPS) inside the Oracle Dashboard.

1. In the Oracle Cloud Console, navigate to your instance details page.
2. Click on the **Primary VNIC Subnet**.
3. Click on the **Security List** for the subnet.
4. Click **Add Ingress Rules** and add these two rules:
   - **Rule 1 (HTTP)**: Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port Range `80`.
   - **Rule 2 (HTTPS)**: Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port Range `443`.
5. (Optional) If you want to access the Express API directly without Nginx during testing, open port `3000`.

---

## Step 3: Install Node.js, MongoDB, and Nginx on VPS

Connect to your Oracle VPS via SSH (`ssh ubuntu@<vps-ip>`) and run the following commands:

### 1. Update Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (Node LTS - v20+)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
# Verify installations
node -v
npm -v
```

### 3. Install and Configure MongoDB
Install the official MongoDB Community Edition:
```bash
sudo apt-get install gnupg curl

curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg --o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor --yes

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### 4. Install Nginx and Git
```bash
sudo apt-get install -y nginx git
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 4: Configure and Run Backend & Frontend

### 1. Clone your project code onto the VPS
```bash
cd /var/www
sudo git clone <YOUR_REPOSITORY_URL> temp-mail
sudo chown -R ubuntu:ubuntu temp-mail
cd temp-mail
```

### 2. Install dependencies & build React app
```bash
npm install
npm run build
```
This builds your React production bundle into `/var/www/temp-mail/dist` and compiles your server to `dist/server.cjs`.

### 3. Configure `.env` file on VPS
Create a `.env` file inside `/var/www/temp-mail/`:
```bash
nano .env
```
Paste and fill out the details:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/tempmail
CF_WEBHOOK_SECRET=MySuperSecureSecretKey123!
APP_URL=https://yourdomain.com
```
Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit nano.

### 4. Install PM2 and Start the Server
PM2 is a production process manager that keeps your Express app running 24/7 and restarts it if it crashes.
```bash
sudo npm install -g pm2

# Start the Express server compiled to CommonJS bundle
pm2 start dist/server.cjs --name "tempmail-backend"

# Ensure PM2 restarts on system boot
pm2 startup
# (Copy and execute the exact command outputted by the startup command)
pm2 save
```

To view logs:
```bash
pm2 logs tempmail-backend
```

---

## Step 5: Configure Nginx and SSL (Certbot)

Nginx will serve your frontend React static files instantly, handle incoming SSL requests, and forward `/api/*` calls to the local Node process.

### 1. Configure VPS Firewall (iptables / ufw)
Oracle Ubuntu instances sometimes have strict internal iptables rules. Open ports 80 and 443 locally:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 'Nginx Full'
sudo ufw reload
```
*(If UFW is not installed, open them using iptables)*:
```bash
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### 2. Create Nginx Site Configuration
Create a site configuration file:
```bash
sudo nano /etc/nginx/sites-available/tempmail
```
Paste the following configuration (replace `yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # React Static Frontend files
    root /var/www/temp-mail/dist;
    index index.html;

    # General SEO & static assets cache
    location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|eot|ttf|otf|txt|xml)$ {
        expires 6M;
        access_log off;
        add_header Cache-Control "public, max-age=15552000, immutable";
    }

    # Route frontend requests to index.html for React Router compatibility
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls directly to Node.js backend
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Save and exit.

### 3. Enable the Nginx site
```bash
# Link to sites-enabled
sudo ln -s /etc/nginx/sites-available/tempmail /etc/nginx/sites-enabled/

# Remove default configuration if present
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 4. Install Let's Encrypt SSL (Certbot)
```bash
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Obtain and configure SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Follow the interactive prompts. Certbot will automatically obtain the SSL certificates, modify your Nginx site configuration to enforce HTTPS redirection, and set up a systemd timer for automatic renewals!

### 5. Verify Setup
Visit `https://yourdomain.com` in your browser. Send an email to any address (e.g. `test-vps@yourdomain.com`) from your personal account, and watch it show up instantly in your mailbox logs and UI!

---

## Step 6: Troubleshooting & Maintenance

- **View Live Webhook logs on Express**:
  ```bash
  pm2 logs tempmail-backend
  ```
- **Check Nginx Access/Error logs**:
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```
- **Verify TTL Index is working in MongoDB**:
  Connect to MongoDB shell:
  ```bash
  mongosh
  ```
  Switch to the database and inspect indexes:
  ```javascript
  use tempmail;
  db.emails.getIndexes();
  ```
  You should see an index named `created_at_1` with `expireAfterSeconds: 3600`.
