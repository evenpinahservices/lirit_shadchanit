# WhatsApp Integration on Vercel - Setup Guide

## ✅ What's Been Created

Your WhatsApp integration now runs entirely on Vercel as Next.js API routes:

- **`/api/whatsapp/webhook`** - Main webhook endpoint for Twilio
- **`/api/whatsapp/notify`** - Send notifications when clients approve
- **`/api/whatsapp/reminders`** - Daily reminder endpoint

## 🔧 Environment Variables Needed

Add these to your Vercel project settings:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+17658856001
ADMIN_NUMBER=whatsapp:+972584171094

# Gemini API (already configured)
GEMINI_API_KEY=your_gemini_key

# MongoDB (already configured)
MONGODB_URI=your_mongodb_uri

# Web App URL (for generating links)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
# OR
WEB_APP_URL=https://your-app.vercel.app
```

## 📍 Twilio Webhook Configuration

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to your WhatsApp number settings
3. Set webhook URL to: `https://your-app.vercel.app/api/whatsapp/webhook`
4. Method: **POST** (or POST + GET)
5. Save

## 🚀 How It Works

### Flow:
1. User sends images via WhatsApp → Twilio
2. Twilio calls `/api/whatsapp/webhook` → Next.js API route
3. Images stored in session (in-memory)
4. User types "YES" → Images processed with Gemini
5. Data saved to MongoDB as PendingClient
6. User receives WhatsApp confirmation with edit link

### Features:
- ✅ Receives WhatsApp messages and images
- ✅ Processes images with Gemini AI (same as web form)
- ✅ Saves to MongoDB (same database as web app)
- ✅ Sends WhatsApp replies
- ✅ Handles "JOIN" command for signup links
- ✅ Session management for multiple images

## 🔄 Migration from Flask

**You no longer need:**
- ❌ Flask service (port 5000)
- ❌ Separate hosting for Python services
- ❌ localtunnel/ngrok for local testing

**Everything now runs on:**
- ✅ Vercel (Next.js API routes)

## 📝 API Endpoints

### POST `/api/whatsapp/webhook`
Main Twilio webhook endpoint. Handles:
- Image uploads
- Text commands ("YES", "DONE", "JOIN")
- Profile generation

### POST `/api/whatsapp/notify`
Call from your web app when a client approves:
```typescript
await fetch('/api/whatsapp/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: client.fullName,
    link: `${process.env.NEXT_PUBLIC_APP_URL}/inbox/${clientId}`
  })
});
```

### GET `/api/whatsapp/reminders`
Daily reminder endpoint. Set up a cron job:
```
# Run daily at 9 AM
0 9 * * * curl https://your-app.vercel.app/api/whatsapp/reminders
```

## ⚠️ Important Notes

### Session Storage
- Sessions are stored in-memory (resets on cold start)
- For production with high traffic, consider using Vercel KV or Redis
- Current implementation works fine for moderate usage

### Cold Starts
- First request after inactivity may be slower (serverless)
- Subsequent requests are fast
- This is normal for Vercel serverless functions

### Testing Locally
1. Run: `npm run dev`
2. Use ngrok/localtunnel to expose localhost:3000
3. Set Twilio webhook to: `https://your-tunnel-url.ngrok.io/api/whatsapp/webhook`

## 🎉 Benefits

- ✅ **Simpler**: One codebase, one deployment
- ✅ **Cheaper**: No separate hosting needed
- ✅ **Consistent**: Same pattern as your image extraction
- ✅ **Scalable**: Vercel handles scaling automatically

## 🐛 Troubleshooting

### "Twilio credentials not configured"
- Check environment variables in Vercel dashboard
- Ensure all Twilio variables are set

### "No images found to process"
- User needs to send images first, then type "YES"
- Check Twilio logs for webhook delivery

### Sessions resetting
- Normal behavior on cold starts
- For persistent sessions, use Vercel KV

### Webhook not receiving messages
- Verify webhook URL in Twilio Console
- Check Vercel function logs
- Ensure webhook method is POST
