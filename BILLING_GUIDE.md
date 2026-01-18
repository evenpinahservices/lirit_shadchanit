# Twilio WhatsApp Billing Guide

## 📊 How to Check Your Twilio Billing

### 1. **Twilio Console Dashboard**

1. Log into [Twilio Console](https://console.twilio.com/)
2. Go to **Billing** → **Usage**
3. Filter by:
   - **Service**: WhatsApp
   - **Time Period**: Current month, last month, or custom range
   - **Category**: Messages, Media, Templates

### 2. **View Message Logs**

1. In Twilio Console, go to **Monitor** → **Logs** → **Messaging**
2. Filter by:
   - **Service**: WhatsApp
   - **Direction**: Inbound/Outbound
   - **Date Range**: Select your period
3. Each message shows:
   - Message SID
   - Cost (if available)
   - Status
   - Direction

### 3. **Usage Records API** (Programmatic)

You can query Twilio's Usage Records API to get detailed billing:

```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Usage/Records.json?Category=whatsapp-inbound&StartDate=2024-01-01&EndDate=2024-01-31" \
  -u "{AccountSid}:{AuthToken}"
```

### 4. **Set Up Usage Alerts**

1. Go to **Monitor** → **Usage Triggers**
2. Create a trigger for:
   - **Category**: WhatsApp messages
   - **Threshold**: Set your budget limit
   - **Alert Email**: Your email

## 💰 Cost Breakdown Per Profile/Resume

Based on your current implementation, here's what each profile upload typically costs:

### Typical Flow:
1. **User sends images** (3-5 images average)
   - Cost: 3-5 × $0.005 = **$0.015 - $0.025**
2. **User sends "yes" or "done"**
   - Cost: 1 × $0.005 = **$0.005**
3. **System sends acknowledgments** (2-3 messages)
   - Cost: 2-3 × $0.005 = **$0.010 - $0.015**
4. **System sends success message**
   - Cost: 1 × $0.005 = **$0.005**

### **Total per Profile: ~$0.035 - $0.050**

*Note: Prices vary by country. US pricing shown above.*

## 📈 Calculate Your Monthly Costs

### Formula:
```
Monthly Cost = (Profiles per Month) × (Average Cost per Profile)
```

### Examples:
- **10 profiles/month**: 10 × $0.04 = **$0.40/month**
- **50 profiles/month**: 50 × $0.04 = **$2.00/month**
- **100 profiles/month**: 100 × $0.04 = **$4.00/month**
- **500 profiles/month**: 500 × $0.04 = **$20.00/month**

## 🔍 Using the Cost Calculator API

Your app includes a cost calculator endpoint:

### Get Estimated Cost Per Profile:
```bash
GET /api/whatsapp/cost-calculator
```

### Get Cost for Specific Profile:
```bash
GET /api/whatsapp/cost-calculator?profileId=xxx
```

### Get All Costs:
```bash
GET /api/whatsapp/cost-calculator?all=true&startDate=2024-01-01&endDate=2024-01-31
```

## 📝 Tracking Costs in Your App

To track actual costs, you'll need to:

1. **Log message costs when sending/receiving** (requires Twilio webhook callbacks)
2. **Query Twilio API for message pricing** after sending
3. **Store costs in database** using the `TwilioCost` model

### Example: Log Cost After Sending Message

```typescript
// After sending WhatsApp message
const message = await client.messages.create({...});
const messageDetails = await client.messages(message.sid).fetch();

// Store cost
await TwilioCostModel.create({
    messageSid: message.sid,
    profileId: pendingClientId,
    sender: to,
    direction: "outbound",
    messageType: "text",
    cost: parseFloat(messageDetails.price || "0.005"), // Default if not available
    currency: messageDetails.priceUnit || "USD",
    date: new Date(),
});
```

## 🌍 Country-Specific Pricing

WhatsApp pricing varies by country. Check your pricing:

1. Go to [Twilio Pricing Page](https://www.twilio.com/en-us/whatsapp/pricing)
2. Select your country
3. View WhatsApp message pricing

Common countries:
- **US**: $0.005/message
- **UK**: £0.0035/message (~$0.004)
- **Israel**: ₪0.018/message (~$0.005)
- **Canada**: $0.005/message

## ⚠️ Additional Costs to Consider

1. **Media Storage** (if using Twilio Conversations)
   - ~$0.25/GB/month
   - Your app uses Cloudinary, so this may not apply

2. **Template Messages** (if outside 24-hour window)
   - Varies by category (utility, authentication, marketing)
   - Typically $0.005 - $0.01 per message

3. **Phone Number** (WhatsApp Business API)
   - Usually included in WhatsApp setup
   - Check your Twilio plan

## 💡 Cost Optimization Tips

1. **Batch Messages**: Combine multiple updates into one message
2. **Use Free Tier**: Twilio offers free credits for new accounts
3. **Monitor Usage**: Set up alerts to avoid surprises
4. **Optimize Media**: Compress images before sending (you're already doing this!)

## 📞 Need Help?

- **Twilio Support**: https://support.twilio.com/
- **Twilio Pricing Docs**: https://www.twilio.com/docs/whatsapp/pricing
- **Usage API Docs**: https://www.twilio.com/docs/usage/api
