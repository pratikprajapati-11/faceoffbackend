// Assuming you're using Mongoose as the ODM library for MongoDB

import mongoose, { Schema, Document } from 'mongoose';

// Define interface for the document
interface ResetToken extends Document {
  email: string;
  token: string;
}

// Define schema for the collection
const ResetTokenSchema: Schema = new Schema({
  email: { type: String, required: true },
  token: { type: String, required: true },
});

// Define and export the model
 const ResetTokenModel = mongoose.model<ResetToken>('ResetToken', ResetTokenSchema);

 export default ResetTokenModel;
