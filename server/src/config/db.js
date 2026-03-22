import mongoose from "mongoose";

export async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Set it in server/.env.");
  }

  mongoose.set("bufferCommands", false);

  await mongoose.connect(mongoUri, {
    dbName: "splitsmartly",
    serverSelectionTimeoutMS: 5000,
  });
}
