const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shadchanit';

async function deleteClientsExceptBatEl() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const ClientSchema = new mongoose.Schema({}, { strict: false });
        const ClientModel = mongoose.models.Client || mongoose.model('Client', ClientSchema);

        // Delete all clients except those with fullName containing "בת אל"
        const result = await ClientModel.deleteMany({
            fullName: { $not: /בת אל/ }
        });

        console.log(`Successfully deleted ${result.deletedCount} clients.`);
        console.log(`Kept clients with "בת אל" in their name.`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deleteClientsExceptBatEl();
