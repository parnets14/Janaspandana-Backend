import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function migrateAttachments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('complaints');

    // Find all complaints
    const complaints = await collection.find({}).toArray();
    console.log(`Found ${complaints.length} total complaints`);

    let migratedCount = 0;

    for (const complaint of complaints) {
      let needsUpdate = false;
      const update = {};

      // Fix officerAttachments
      if (complaint.officerAttachments) {
        if (Array.isArray(complaint.officerAttachments)) {
          const fixed = complaint.officerAttachments.map(att => {
            if (typeof att === 'string') return att;
            if (typeof att === 'object' && att.file) return att.file;
            return String(att);
          });
          
          // Check if any were objects
          if (fixed.some((att, i) => typeof complaint.officerAttachments[i] === 'object')) {
            update.officerAttachments = fixed;
            needsUpdate = true;
          }
        }
      } else {
        update.officerAttachments = [];
        needsUpdate = true;
      }

      // Initialize adminAttachments if missing
      if (!complaint.adminAttachments) {
        update.adminAttachments = [];
        needsUpdate = true;
      }

      // Initialize officerNotes if missing
      if (!complaint.officerNotes) {
        update.officerNotes = [];
        needsUpdate = true;
      }

      if (needsUpdate) {
        await collection.updateOne({ _id: complaint._id }, { $set: update });
        migratedCount++;
        console.log(`✓ Migrated complaint ${complaint._id}`);
      }
    }

    console.log(`\nMigration complete! Updated ${migratedCount} complaints`);
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateAttachments();
